import { db } from '$lib/server/db';
import { people, vehicles, personCategories, attendanceLogs } from '$lib/server/db/schema';
import { like, or, eq, and, inArray, sql, desc } from 'drizzle-orm';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requirePermission } from '$lib/server/rbac';

/** Given a root category ID, return all descendant IDs (inclusive). */
function getDescendantIds(
	categoryId: string,
	allCategories: { id: string; parentId: string | null }[]
): string[] {
	const ids: string[] = [categoryId];
	const queue = [categoryId];
	while (queue.length > 0) {
		const parentId = queue.shift()!;
		for (const cat of allCategories) {
			if (cat.parentId === parentId) {
				ids.push(cat.id);
				queue.push(cat.id);
			}
		}
	}
	return ids;
}

export const GET: RequestHandler = async ({ url, locals }) => {
	requirePermission(locals, 'people.view');
	const query = url.searchParams.get('q') || '';
	const categoryId = url.searchParams.get('category') || url.searchParams.get('categoryId');
	const type = url.searchParams.get('type');
	const limit = Math.min(1000, parseInt(url.searchParams.get('limit') || '15'));
	const offset = parseInt(url.searchParams.get('offset') || '0');

	// Get all categories for descendant resolution
	const allCategories = await db
		.select({ id: personCategories.id, parentId: personCategories.parentId })
		.from(personCategories);

	// Build category filter if specified
	let categoryFilter: string[] | null = null;
	if (categoryId) {
		categoryFilter = getDescendantIds(categoryId, allCategories);
	}

	let whereCondition;
	if (query && query.length >= 2) {
		const searchPattern = `%${query}%`;
		const searchCondition = or(
			sql`COALESCE(${people.name}, '') % ${query}`,
			sql`COALESCE(${people.codeNo}, '') % ${query}`,
			sql`COALESCE(${people.company}, '') % ${query}`,
			like(people.name, searchPattern),
			like(people.codeNo, searchPattern)
		);
		whereCondition = categoryFilter
			? and(inArray(people.categoryId, categoryFilter), searchCondition)
			: searchCondition;
	} else if (categoryFilter) {
		whereCondition = inArray(people.categoryId, categoryFilter);
	}

	// Query people if type is not 'vehicle'
	let foundPeople: any[] = [];
	if (type !== 'vehicle') {
		// Define rank and order
		const rankSql = query && query.length >= 2
			? sql<number>`GREATEST(
				similarity(COALESCE(${people.name}, ''), ${query}),
				similarity(COALESCE(${people.codeNo}, ''), ${query}),
				similarity(COALESCE(${people.company}, ''), ${query})
			)`
			: sql<number>`0`;

		const orderBy = query && query.length >= 2 ? sql`search_rank DESC` : desc(people.createdAt);

		foundPeople = await db
			.select({
				id: people.id,
				name: people.name,
				codeNo: people.codeNo,
				company: people.company,
				photoUrl: people.photoUrl,
				categoryId: people.categoryId,
				categoryName: personCategories.name,
				categorySlug: personCategories.slug,
				parentId: personCategories.parentId,
				isTrained: people.isTrained,
				// Subquery to check if currently on premises
				isOnPremises: sql<number>`(
					SELECT COUNT(*) FROM ${attendanceLogs}
					WHERE ${attendanceLogs.personId} = ${people.id}
					AND ${attendanceLogs.status} = 'on_premises'
				)`.as('is_on_premises'),
				search_rank: rankSql
			})
			.from(people)
			.innerJoin(personCategories, eq(people.categoryId, personCategories.id))
			.where(whereCondition)
			.orderBy(orderBy)
			.limit(limit)
			.offset(offset);
	}

	console.log(`[Search API] query="${query}", category="${categoryId}", limit=${limit}, offset=${offset}, found=${foundPeople.length} people`);

	// Build a map for quick root slug lookup
	const catMap = new Map(allCategories.map((c) => [c.id, c]));
	function getRootSlug(catId: string): string {
		let current: any = catMap.get(catId);
		while (current?.parentId) {
			current = catMap.get(current.parentId);
		}
		return current?.slug || '';
	}

	// If searching globally (no categoryId), also search vehicles
	let foundVehicles: any[] = [];
	if (!categoryId && type !== 'person') {
		const vehicleOrderBy = query && query.length >= 2 ? sql`search_rank DESC` : desc(vehicles.entryTime);
		let vehicleWhere = undefined;

		if (query && query.length >= 2) {
			const searchPattern = `%${query}%`;
			vehicleWhere = or(
				sql`COALESCE(${vehicles.vehicleNumber}, '') % ${query}`,
				sql`COALESCE(${vehicles.driverName}, '') % ${query}`,
				like(vehicles.vehicleNumber, searchPattern),
				like(vehicles.driverName, searchPattern),
				like(vehicles.mobile, searchPattern)
			);
		}

		foundVehicles = await db
			.select({
				id: vehicles.id,
				vehicleNumber: vehicles.vehicleNumber,
				driverName: vehicles.driverName,
				type: vehicles.type,
				status: vehicles.status,
				search_rank:
					query && query.length >= 2
						? sql<number>`GREATEST(
						similarity(COALESCE(${vehicles.vehicleNumber}, ''), ${query}),
						similarity(COALESCE(${vehicles.driverName}, ''), ${query}),
						similarity(COALESCE(${vehicles.vendorName}, ''), ${query})
					)`
						: sql<number>`0`
			})
			.from(vehicles)
			.where(vehicleWhere)
			.orderBy(vehicleOrderBy)
			.limit(5);
	}

	const results = [
		...foundPeople.map((p) => ({
			id: p.id,
			type: 'person',
			title: p.name,
			subtitle: `${p.codeNo || ''} ${p.company ? '• ' + p.company : ''} (${p.categoryName})`,
			codeNo: p.codeNo,
			company: p.company,
			photoUrl: p.photoUrl,
			category: p.categoryName,
			categorySlug: p.categorySlug,
			rootCategorySlug: getRootSlug(p.categoryId),
			isTrained: p.isTrained,
			status: p.isOnPremises > 0 ? 'on_premises' : 'checked_out',
			url: `/people/${p.id}`
		})),
		...foundVehicles.map((v) => ({
			id: v.id,
			type: 'vehicle',
			title: v.vehicleNumber,
			subtitle: `${v.driverName || ''} (${v.type})`,
			status: v.status,
			url: `/vehicles`
		}))
	];

	return json(results);
};
