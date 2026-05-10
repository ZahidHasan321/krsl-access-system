import { db } from '$lib/server/db';
import { attendanceLogs, people, personCategories } from '$lib/server/db/schema';
import { eq, and, desc, sql, count, gte, lte, or, ilike, inArray, type SQL } from 'drizzle-orm';
import { todayStringBD } from '$lib/zkteco';
import { requirePermission } from '$lib/server/rbac';
import { getUniqueDepartments } from '$lib/server/db/department-utils';
import type { PageServerLoad } from './$types';

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

export const load: PageServerLoad = async (event) => {
	requirePermission(event.locals, 'people.view');

	const startDateParam = event.url.searchParams.get('startDate');
	const endDateParam = event.url.searchParams.get('endDate');

	// If only one date is provided, use it as both (single-day view).
	// If neither is provided, default to today in BD time.
	const startDate = startDateParam || (endDateParam ?? todayStringBD());
	const endDate = endDateParam || (startDateParam ?? todayStringBD());
	const categoryId = event.url.searchParams.get('category') || '';
	const department = event.url.searchParams.get('department') || '';
	const query = (event.url.searchParams.get('q') || '').trim();
	const isPrint = event.url.searchParams.has('print');
	const page = parseInt(event.url.searchParams.get('page') || '1');
	const limit = isPrint
		? Math.min(5000, Math.max(1, parseInt(event.url.searchParams.get('limit') || '5000')))
		: Math.min(100, Math.max(1, parseInt(event.url.searchParams.get('limit') || '20')));
	const offset = (page - 1) * limit;

	const rootLookup = buildRootLookup();

	const whereClauses: (SQL | undefined)[] = [
		gte(attendanceLogs.date, startDate),
		lte(attendanceLogs.date, endDate)
	];

	if (categoryId) {
		// Find all descendant category IDs so filtering by root includes subcategories
		const descendantIds = getDescendantIds(categoryId);
		whereClauses.push(inArray(people.categoryId, descendantIds));
	}

	if (department) {
		whereClauses.push(eq(people.department, department));
	}

	if (query) {
		whereClauses.push(
			or(
				sql`COALESCE(${people.name}, '') % ${query}`,
				sql`COALESCE(${people.codeNo}, '') % ${query}`,
				sql`COALESCE(${people.company}, '') % ${query}`,
				ilike(people.name, `%${query}%`),
				ilike(people.codeNo, `%${query}%`),
				ilike(people.company, `%${query}%`),
				ilike(people.contactNo, `%${query}%`)
			)
		);
	}

	const where = and(...whereClauses.filter((c): c is SQL => !!c));

	const rows = await db
		.select({
			id: attendanceLogs.id,
			entryTime: attendanceLogs.entryTime,
			exitTime: attendanceLogs.exitTime,
			status: attendanceLogs.status,
			date: attendanceLogs.date,
			purpose: attendanceLogs.purpose,
			person: {
				id: people.id,
				name: people.name,
				codeNo: people.codeNo,
				company: people.company,
				department: people.department,
				designation: people.designation,
				categoryId: people.categoryId,
				isTrained: people.isTrained,
				auditJoinDate: people.auditJoinDate
			},
			category: {
				name: personCategories.name,
				slug: personCategories.slug
			}
		})
		.from(attendanceLogs)
		.innerJoin(people, eq(attendanceLogs.personId, people.id))
		.innerJoin(personCategories, eq(people.categoryId, personCategories.id))
		.where(where)
		.limit(limit)
		.offset(offset)
		.orderBy(desc(attendanceLogs.entryTime));

	const now = new Date();
	const data = rows.map((row) => {
		const root = rootLookup.get(row.person.categoryId);
		const durationSeconds = row.exitTime
			? Math.floor((row.exitTime.getTime() - row.entryTime.getTime()) / 1000)
			: Math.floor((now.getTime() - row.entryTime.getTime()) / 1000);
		return {
			...row,
			durationSeconds,
			rootCategory: root ? { id: root.id, name: root.name, slug: root.slug } : row.category
		};
	});

	const [countResult] = await db
		.select({ value: sql<number>`count(*)` })
		.from(attendanceLogs)
		.innerJoin(people, eq(attendanceLogs.personId, people.id))
		.innerJoin(personCategories, eq(people.categoryId, personCategories.id))
		.where(where);
	const totalCount = countResult.value;

	// Summary stats for the filtered range
	const [summaryStats] = await db
		.select({
			totalEntries: count(attendanceLogs.id),
			uniquePeople: sql<number>`COUNT(DISTINCT ${attendanceLogs.personId})`,
			totalDuration: sql<number>`SUM(CASE WHEN ${attendanceLogs.exitTime} IS NOT NULL THEN EXTRACT(EPOCH FROM (${attendanceLogs.exitTime} - ${attendanceLogs.entryTime})) ELSE 0 END)`,
			activeDays: sql<number>`COUNT(DISTINCT ${attendanceLogs.date})`
		})
		.from(attendanceLogs)
		.innerJoin(people, eq(attendanceLogs.personId, people.id))
		.innerJoin(personCategories, eq(people.categoryId, personCategories.id))
		.where(where);

	return {
		data,
		summary: {
			totalEntries: summaryStats.totalEntries,
			uniquePeople: summaryStats.uniquePeople,
			totalDuration: summaryStats.totalDuration || 0,
			activeDays: summaryStats.activeDays
		},
		filters: {
			startDate,
			endDate,
			categoryId,
			department,
			query
		},
		departments: await getUniqueDepartments(),
		pagination: {
			page,
			limit,
			totalPages: Math.ceil(totalCount / limit),
			totalCount
		}
	};
};
