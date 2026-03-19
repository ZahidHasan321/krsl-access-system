import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAttendanceLogs } from '$lib/server/attendance-service';
import { requirePermission } from '$lib/server/rbac';
import { db } from '$lib/server/db';
import { attendanceLogs } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { notifyChange } from '$lib/server/events';

export const GET: RequestHandler = async (event) => {
	requirePermission(event.locals, 'people.view');

	const query = event.url.searchParams.get('q') || '';
	const categoryId = event.url.searchParams.get('category') || '';
	const location = event.url.searchParams.get('location') || '';
	const sortBy = (event.url.searchParams.get('sort') || 'recent') as 'recent' | 'duration';
	const page = parseInt(event.url.searchParams.get('page') || '1');
	const limit = Math.min(2000, Math.max(1, parseInt(event.url.searchParams.get('limit') || '50')));

	const result = await getAttendanceLogs({
		page,
		limit,
		query,
		categoryId,
		location,
		sortBy
	});

	return json(result);
};

export const PATCH: RequestHandler = async (event) => {
	requirePermission(event.locals, 'people.create');
	
	try {
		const { logId, purpose, location } = await event.request.json();

		if (!logId) {
			return json({ message: 'Log ID required' }, { status: 400 });
		}

		await db
			.update(attendanceLogs)
			.set({
				purpose: purpose || null,
				location: location || null
			})
			.where(eq(attendanceLogs.id, logId));

		notifyChange();
		return json({ success: true });
	} catch (e: any) {
		console.error('[API:Attendance:PATCH] Error:', e);
		return json({ message: e.message || 'Internal Server Error' }, { status: 500 });
	}
};
