import { db } from '$lib/server/db';
import { attendanceLogs, people } from '$lib/server/db/schema';
import { eq, and, count } from 'drizzle-orm';
import { format } from 'date-fns';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { requirePermission } from '$lib/server/rbac';
import { notifyChange, notifyCheckIn, notifyCheckOut } from '$lib/server/events';
import { getAttendanceLogs } from '$lib/server/attendance-service';
import { createNotification } from '$lib/server/push';
import { getUniqueDepartments } from '$lib/server/db/department-utils';

export const load: PageServerLoad = async (event) => {
	requirePermission(event.locals, 'people.view');

	const query = (event.url.searchParams.get('q') || '').trim();
	const categoryId = event.url.searchParams.get('category') || '';
	const location = event.url.searchParams.get('location') || '';
	const department = event.url.searchParams.get('department') || '';
	const sortBy = (event.url.searchParams.get('sort') || 'recent') as 'recent' | 'duration';
	const page = parseInt(event.url.searchParams.get('page') || '1');
	// Default to 50 items for better performance with infinite scroll
	const limit = Math.min(2000, Math.max(1, parseInt(event.url.searchParams.get('limit') || '50')));

	const [result, [totalInsideRes], [yardCountRes], [shipCountRes], departments] = await Promise.all([
		getAttendanceLogs({
			page,
			limit,
			query,
			categoryId,
			location,
			department,
			sortBy
		}),
		db
			.select({ value: count() })
			.from(attendanceLogs)
			.where(eq(attendanceLogs.status, 'on_premises')),
		db
			.select({ value: count() })
			.from(attendanceLogs)
			.where(and(eq(attendanceLogs.status, 'on_premises'), eq(attendanceLogs.location, 'yard'))),
		db
			.select({ value: count() })
			.from(attendanceLogs)
			.where(and(eq(attendanceLogs.status, 'on_premises'), eq(attendanceLogs.location, 'ship'))),
		getUniqueDepartments()
	]);

	return {
		logs: result.logs,
		departments,
		filters: {
			query,
			categoryId,
			location,
			department,
			sortBy
		},
		summary: {
			total: totalInsideRes?.value || 0,
			yard: yardCountRes?.value || 0,
			ship: shipCountRes?.value || 0
		},
		pagination: result.pagination
	};
};

export const actions: Actions = {
	checkIn: async (event) => {
		requirePermission(event.locals, 'people.create');
		const data = await event.request.formData();
		const personId = data.get('personId') as string;
		const purpose = (data.get('purpose') as string) || null;
		const location = (data.get('location') as string) || null;

		if (!personId) return fail(400, { message: 'Person ID required' });
		if (!location) return fail(400, { message: 'Location (Ship/Yard) required' });

		try {
			// 1. Verify person exists
			const person = await db.query.people.findFirst({
				where: eq(people.id, personId)
			});
			if (!person) return fail(404, { message: 'Person not found' });

			// 2. Check if already on premises
			const activeLog = await db.query.attendanceLogs.findFirst({
				where: and(eq(attendanceLogs.personId, personId), eq(attendanceLogs.status, 'on_premises'))
			});

			if (activeLog) {
				return fail(400, { message: 'Person must exit before entering again' });
			}

			const logId = crypto.randomUUID();
			// 3. Create log
			const now = new Date();
			await db.insert(attendanceLogs).values({
				id: logId,
				personId,
				entryTime: now,
				verifyMethod: 'manual',
				status: 'on_premises',
				purpose,
				location,
				date: format(now, 'yyyy-MM-dd')
			});

			notifyCheckIn({
				personId,
				personName: person.name,
				verifyMethod: 'manual',
				photoUrl: person.photoUrl,
				logId,
				categoryId: person.categoryId,
				isTrained: person.isTrained
			});

			await createNotification({
				userId: event.locals.user?.id,
				type: 'checkin',
				title: 'Manual Check-In',
				message: `${event.locals.user?.username || 'Admin'} checked in ${person.name}`,
				link: `/people/${person.id}`
			});

			notifyChange();
			return { success: true };
		} catch (err) {
			console.error('Check-in error:', err);
			return fail(500, { message: 'Failed to process check-in' });
		}
	},

	checkOut: async (event) => {
		requirePermission(event.locals, 'people.create');
		const data = await event.request.formData();
		const logId = data.get('logId') as string;

		if (!logId) return fail(400, { message: 'Log ID required' });

		try {
			const log = await db.query.attendanceLogs.findFirst({
				where: eq(attendanceLogs.id, logId)
			});

			if (!log || log.status !== 'on_premises') {
				return fail(400, { message: 'Active log not found' });
			}

			// Fetch person for toast notification
			const checkedOutPerson = await db.query.people.findFirst({
				where: eq(people.id, log.personId)
			});

			await db
				.update(attendanceLogs)
				.set({
					exitTime: new Date(),
					status: 'checked_out'
				})
				.where(eq(attendanceLogs.id, logId));

			if (checkedOutPerson) {
				notifyCheckOut({
					personId: checkedOutPerson.id,
					personName: checkedOutPerson.name,
					verifyMethod: 'manual',
					photoUrl: checkedOutPerson.photoUrl,
					logId,
					categoryId: checkedOutPerson.categoryId
				});

				await createNotification({
					userId: event.locals.user?.id,
					type: 'checkout',
					title: 'Manual Check-Out',
					message: `${event.locals.user?.username || 'Admin'} checked out ${checkedOutPerson.name}`,
					link: `/people/${checkedOutPerson.id}`
				});
			}
			notifyChange();
			return { success: true };
		} catch (err) {
			console.error('Check-out error:', err);
			return fail(500, { message: 'Failed to process check-out' });
		}
	},

	updatePurpose: async (event) => {
		requirePermission(event.locals, 'people.create');
		const data = await event.request.formData();
		const logId = data.get('logId') as string;
		const purpose = (data.get('purpose') as string) || null;
		const location = (data.get('location') as string) || null;

		if (!logId) return fail(400, { message: 'Log ID required' });

		await db
			.update(attendanceLogs)
			.set({
				purpose,
				location
			})
			.where(eq(attendanceLogs.id, logId));

		// No notifyChange() — location/purpose updates are minor,
		// no need to trigger SSE re-fetch for all clients
		return { success: true };
	}
};
