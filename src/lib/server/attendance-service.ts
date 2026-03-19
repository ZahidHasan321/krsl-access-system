import { db } from '$lib/server/db';
import { attendanceLogs, people, personCategories } from '$lib/server/db/schema';
import { eq, and, desc, asc, sql, or, ilike, inArray, count, type SQL } from 'drizzle-orm';
import { CATEGORIES } from '$lib/constants/categories';

/** Given a root category ID, return all descendant IDs (inclusive). */
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

/** Cached – CATEGORIES is a compile-time constant so the lookup never changes. */
const rootLookupCache = (() => {
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
})();

export interface GetAttendanceLogsParams {
	page?: number;
	limit?: number;
	query?: string;
	categoryId?: string;
	location?: string;
	department?: string;
	sortBy?: 'recent' | 'duration';
}

export async function getAttendanceLogs({
	page = 1,
	limit = 20,
	query = '',
	categoryId = '',
	location = '',
	department = '',
	sortBy = 'recent'
}: GetAttendanceLogsParams) {
	const trimmedQuery = query.trim();
	const rootLookup = rootLookupCache;

	const whereClauses: (SQL | undefined)[] = [eq(attendanceLogs.status, 'on_premises')];

	if (trimmedQuery) {
		whereClauses.push(
			or(
				sql`COALESCE(${people.name}, '') % ${trimmedQuery}`,
				sql`COALESCE(${people.codeNo}, '') % ${trimmedQuery}`,
				sql`COALESCE(${people.company}, '') % ${trimmedQuery}`,
				sql`COALESCE(${people.department}, '') % ${trimmedQuery}`,
				sql`COALESCE(${people.designation}, '') % ${trimmedQuery}`,
				ilike(people.name, `%${trimmedQuery}%`),
				ilike(people.codeNo, `%${trimmedQuery}%`),
				ilike(people.company, `%${trimmedQuery}%`),
				ilike(people.contactNo, `%${trimmedQuery}%`),
				ilike(people.department, `%${trimmedQuery}%`),
				ilike(people.designation, `%${trimmedQuery}%`)
			)
		);
	}

	if (categoryId) {
		const descendantIds = getDescendantIds(categoryId);
		whereClauses.push(inArray(people.categoryId, descendantIds));
	}

	if (location && location !== 'all') {
		whereClauses.push(eq(attendanceLogs.location, location));
	}

	if (department) {
		whereClauses.push(eq(people.department, department));
	}

	const where = and(...whereClauses.filter((c): c is SQL => !!c));

	const [totalCountResult] = await db
		.select({ count: count() })
		.from(attendanceLogs)
		.innerJoin(people, eq(attendanceLogs.personId, people.id))
		.innerJoin(personCategories, eq(people.categoryId, personCategories.id))
		.where(where);

	const totalCount = totalCountResult?.count || 0;
	const totalPages = Math.ceil(totalCount / limit);
	const validatedPage = Math.max(1, Math.min(page, totalPages || 1));
	const validatedOffset = (validatedPage - 1) * limit;

	const orderBy =
		sortBy === 'duration'
			? [asc(attendanceLogs.entryTime), asc(attendanceLogs.id)]
			: [desc(attendanceLogs.entryTime), desc(attendanceLogs.id)];

	// Load active entries (on_premises) only with filtering
	const logs = await db
		.select({
			id: attendanceLogs.id,
			entryTime: attendanceLogs.entryTime,
			exitTime: attendanceLogs.exitTime,
			status: attendanceLogs.status,
			verifyMethod: attendanceLogs.verifyMethod,
			purpose: attendanceLogs.purpose,
			location: attendanceLogs.location,
			person: {
				id: people.id,
				name: people.name,
				codeNo: people.codeNo,
				company: people.company,
				department: people.department,
				categoryId: people.categoryId,
				photoUrl: people.photoUrl,
				thumbUrl: people.thumbUrl,
				isTrained: people.isTrained
			},
			category: {
				id: personCategories.id,
				parentId: personCategories.parentId,
				name: personCategories.name,
				slug: personCategories.slug
			}
		})
		.from(attendanceLogs)
		.innerJoin(people, eq(attendanceLogs.personId, people.id))
		.innerJoin(personCategories, eq(people.categoryId, personCategories.id))
		.where(where)
		.orderBy(...orderBy)
		.limit(limit)
		.offset(validatedOffset);

	const now = new Date();

	// Add root category info and duration to each log
	const logsWithExtras = logs.map((log) => {
		const root = rootLookup.get(log.person.categoryId);
		const durationSeconds = Math.floor((now.getTime() - log.entryTime.getTime()) / 1000);

		return {
			...log,
			durationSeconds,
			rootCategory: root ? { id: root.id, name: root.name, slug: root.slug } : log.category
		};
	});

	return {
		logs: logsWithExtras,
		pagination: {
			page: validatedPage,
			limit,
			totalPages,
			totalCount
		}
	};
}
