import { db } from '$lib/server/db';
import { auditEntries, attendanceLogs, people, personCategories } from '$lib/server/db/schema';
import { eq, and, like, or, inArray, type SQL } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { CATEGORIES } from '$lib/constants/categories';

function buildRootLookup() {
	const byId = new Map(CATEGORIES.map((c) => [c.id, c]));
	const rootOf = new Map<string, { id: string; name: string; slug: string }>();
	for (const cat of CATEGORIES) {
		let current = cat;
		while (current.parentId) {
			const parent = byId.get(current.parentId);
			if (!parent) break;
			current = parent;
		}
		rootOf.set(cat.id, { id: current.id, name: current.name, slug: current.slug });
	}
	return rootOf;
}

function randomizeTime(rangeStart: Date, rangeEnd: Date): Date {
	const startMs = rangeStart.getTime();
	const endMs = rangeEnd.getTime();
	const randomMs = startMs + Math.random() * (endMs - startMs);
	return new Date(Math.round(randomMs / 1000) * 1000);
}

function getTodayDate(): string {
	// Bangladesh time (UTC+6)
	const now = new Date();
	const bd = new Date(now.getTime() + 6 * 60 * 60 * 1000);
	return bd.toISOString().slice(0, 10);
}

function getDescendantIds(categoryId: string): string[] {
	const ids: string[] = [categoryId];
	const queue = [categoryId];
	while (queue.length > 0) {
		const parentId = queue.shift()!;
		for (const cat of CATEGORIES) {
			if (cat.parentId === parentId) {
				ids.push(cat.id);
				queue.push(cat.id);
			}
		}
	}
	return ids;
}

export const load: PageServerLoad = async (event) => {
	// Permission check inherited from /admin/+layout.server.ts (users.manage)

	const date = event.url.searchParams.get('date') || getTodayDate();
	const query = event.url.searchParams.get('q') || '';

	const rootLookup = buildRootLookup();

	// Fetch audit entries for this date
	const entriesWhere: (SQL | undefined)[] = [eq(auditEntries.date, date)];

	if (query) {
		entriesWhere.push(
			or(
				like(people.name, `%${query}%`),
				like(auditEntries.identityNo, `%${query}%`)
			)
		);
	}

	const entries = await db
		.select({
			id: auditEntries.id,
			entryTime: auditEntries.entryTime,
			exitTime: auditEntries.exitTime,
			purpose: auditEntries.purpose,
			location: auditEntries.location,
			isTrained: auditEntries.isTrained,
			identityNo: auditEntries.identityNo,
			date: auditEntries.date,
			person: {
				id: people.id,
				name: people.name,
				codeNo: people.codeNo,
				company: people.company,
				categoryId: people.categoryId,
				isTrained: people.isTrained
			},
			category: {
				id: personCategories.id,
				parentId: personCategories.parentId,
				name: personCategories.name,
				slug: personCategories.slug
			}
		})
		.from(auditEntries)
		.innerJoin(people, eq(auditEntries.personId, people.id))
		.innerJoin(personCategories, eq(people.categoryId, personCategories.id))
		.where(and(...entriesWhere.filter((c): c is SQL => !!c)))
		.orderBy(auditEntries.entryTime);

	const entriesWithRoot = entries.map((entry) => {
		const root = rootLookup.get(entry.person.categoryId);
		return {
			...entry,
			rootCategory: root ? { id: root.id, name: root.name, slug: root.slug } : entry.category
		};
	});

	// Fetch all people for the generation panel
	const allPeople = await db
		.select({
			id: people.id,
			name: people.name,
			codeNo: people.codeNo,
			company: people.company,
			categoryId: people.categoryId,
			isTrained: people.isTrained
		})
		.from(people)
		.orderBy(people.name);

	// Fetch real attendance logs for this date (for non-employees)
	const realLogs = await db
		.select({
			personId: attendanceLogs.personId,
			entryTime: attendanceLogs.entryTime,
			location: attendanceLogs.location
		})
		.from(attendanceLogs)
		.where(eq(attendanceLogs.date, date))
		.orderBy(attendanceLogs.entryTime);

	const realLogMap: Record<string, { time: string; location: string | null }> = {};
	for (const log of realLogs) {
		if (!realLogMap[log.personId]) {
			realLogMap[log.personId] = {
				time: log.entryTime.toISOString(),
				location: log.location
			};
		}
	}

	return {
		entries: entriesWithRoot,
		allPeople,
		realLogMap,
		filters: {
			date,
			query
		}
	};
};

export const actions: Actions = {
	generate: async (event) => {
		const data = await event.request.formData();
		const date = data.get('date') as string;
		const entryRangeStart = data.get('entryRangeStart') as string;
		const entryRangeEnd = data.get('entryRangeEnd') as string;
		const exitRangeStart = data.get('exitRangeStart') as string;
		const exitRangeEnd = data.get('exitRangeEnd') as string;
		const personIdsRaw = data.get('personIds') as string;
		const useRealEntry = data.get('useRealEntry') === 'true';
		const realLogMapRaw = data.get('realLogMap') as string;
		const location = data.get('location') as string;

		if (
			!date ||
			!entryRangeStart ||
			!entryRangeEnd ||
			!exitRangeStart ||
			!exitRangeEnd ||
			!personIdsRaw
		) {
			return fail(400, { message: 'Missing required fields' });
		}

		const personIds: string[] = JSON.parse(personIdsRaw);
		const realLogMap: Record<string, { time: string; location: string | null }> = realLogMapRaw
			? JSON.parse(realLogMapRaw)
			: {};

		if (personIds.length === 0) {
			return fail(400, { message: 'No people selected' });
		}

		// Parse time ranges - combine date with time
		const entryStart = new Date(`${date}T${entryRangeStart}:00`);
		const entryEnd = new Date(`${date}T${entryRangeEnd}:00`);
		const exitStart = new Date(`${date}T${exitRangeStart}:00`);
		const exitEnd = new Date(`${date}T${exitRangeEnd}:00`);

		// Delete existing audit entries for these people on this date
		for (const personId of personIds) {
			await db
				.delete(auditEntries)
				.where(and(eq(auditEntries.personId, personId), eq(auditEntries.date, date)));
		}

		// Fetch people details for isTrained status and default identityNo
		const peopleList = await db
			.select({ id: people.id, isTrained: people.isTrained, codeNo: people.codeNo })
			.from(people)
			.where(inArray(people.id, personIds));
		const peopleMap = Object.fromEntries(peopleList.map((p) => [p.id, p]));

		// Generate entries
		const newEntries = [];
		for (const personId of personIds) {
			let entryTime: Date;
			let entryLocation: string | null = location;

			if (useRealEntry && realLogMap[personId]) {
				entryTime = new Date(realLogMap[personId].time);
				entryLocation = realLogMap[personId].location || location;
			} else {
				entryTime = randomizeTime(entryStart, entryEnd);
			}

			const exitTime = randomizeTime(exitStart, exitEnd);
			const person = peopleMap[personId];

			const entry = {
				id: crypto.randomUUID(),
				personId,
				entryTime,
				exitTime,
				purpose: null as string | null,
				location: entryLocation,
				isTrained: person?.isTrained ?? false,
				identityNo: person?.codeNo ?? null,
				date
			};
			newEntries.push(entry);
		}

		// Insert all entries
		if (newEntries.length > 0) {
			await db.insert(auditEntries).values(newEntries);
		}

		return { success: true, generated: newEntries.length };
	},

	update: async (event) => {
		const data = await event.request.formData();
		const id = data.get('id') as string;
		const field = data.get('field') as string;
		const value = data.get('value') as string;
		const date = data.get('date') as string; // Current reporting date

		if (!id || !field) return fail(400, { message: 'ID and Field required' });

		const updateData: any = {};

		if (field === 'entryTime' || field === 'exitTime') {
			if (!value) {
				updateData[field] = null;
			} else {
				updateData[field] = new Date(`${date}T${value}:00`);
			}
		} else if (field === 'isTrained') {
			updateData[field] = value === 'true';
		} else if (field === 'identityNo') {
			updateData[field] = value;
		} else {
			updateData[field] = value;
		}

		await db.update(auditEntries).set(updateData).where(eq(auditEntries.id, id));

		return { success: true };
	},

	remove: async (event) => {
		const data = await event.request.formData();
		const entryId = data.get('entryId') as string;

		if (!entryId) return fail(400, { message: 'Entry ID required' });

		await db.delete(auditEntries).where(eq(auditEntries.id, entryId));

		return { success: true };
	},

	clear: async (event) => {
		const data = await event.request.formData();
		const date = data.get('date') as string;

		if (!date) return fail(400, { message: 'Date required' });

		await db.delete(auditEntries).where(eq(auditEntries.date, date));

		return { success: true };
	}
};
