import { db } from '$lib/server/db';
import { people, vehicles, personCategories, attendanceLogs } from '$lib/server/db/schema';
import { like, or, eq, and, inArray, sql } from 'drizzle-orm';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/** Given a root category ID, return all descendant IDs (inclusive). */
function getDescendantIds(categoryId: string, allCategories: { id: string; parentId: string | null }[]): string[] {
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

export const GET: RequestHandler = async ({ url }) => {
    const query = url.searchParams.get('q');
    const categoryId = url.searchParams.get('category') || url.searchParams.get('categoryId');

    if (!query || query.length < 2) {
        return json([]);
    }

    const searchPattern = `%${query}%`;

    // Get all categories for descendant resolution
    const allCategories = await db
        .select({ id: personCategories.id, parentId: personCategories.parentId })
        .from(personCategories);

    // Build category filter if specified
    let categoryFilter: string[] | null = null;
    if (categoryId) {
        categoryFilter = getDescendantIds(categoryId, allCategories);
    }

    // Build where clause for people
    const searchCondition = or(
        like(people.name, searchPattern),
        like(people.codeNo, searchPattern),
        like(people.company, searchPattern)
    );

    const whereCondition = categoryFilter
        ? and(inArray(people.categoryId, categoryFilter), searchCondition)
        : searchCondition;

    // Query people with their current status
    const foundPeople = await db
        .select({
            id: people.id,
            name: people.name,
            codeNo: people.codeNo,
            company: people.company,
            categoryId: people.categoryId,
            categoryName: personCategories.name,
            categorySlug: personCategories.slug,
            parentId: personCategories.parentId,
            // Subquery to check if currently on premises
            isOnPremises: sql<number>`(
                SELECT COUNT(*) FROM ${attendanceLogs}
                WHERE ${attendanceLogs.personId} = ${people.id}
                AND ${attendanceLogs.status} = 'on_premises'
            )`.as('is_on_premises')
        })
        .from(people)
        .innerJoin(personCategories, eq(people.categoryId, personCategories.id))
        .where(whereCondition)
        .limit(15);

    // Build a map for quick root slug lookup
    const catMap = new Map(allCategories.map(c => [c.id, c]));
    function getRootSlug(catId: string): string {
        let current: any = catMap.get(catId);
        while (current?.parentId) {
            current = catMap.get(current.parentId);
        }
        return current?.slug || '';
    }

    // If searching globally (no categoryId), also search vehicles
    const foundVehicles = categoryId ? [] : await db
        .select({
            id: vehicles.id,
            vehicleNumber: vehicles.vehicleNumber,
            driverName: vehicles.driverName,
            type: vehicles.type,
            status: vehicles.status
        })
        .from(vehicles)
        .where(or(
            like(vehicles.vehicleNumber, searchPattern),
            like(vehicles.driverName, searchPattern)
        ))
        .limit(5);

    const results = [
        ...foundPeople.map(p => ({
            id: p.id,
            type: 'person',
            title: p.name,
            subtitle: `${p.codeNo || ''} ${p.company ? '• ' + p.company : ''} (${p.categoryName})`,
            codeNo: p.codeNo,
            company: p.company,
            category: p.categoryName,
            categorySlug: p.categorySlug,
            rootCategorySlug: getRootSlug(p.categoryId),
            status: p.isOnPremises > 0 ? 'on_premises' : 'checked_out',
            url: `/people/${p.id}`
        })),
        ...foundVehicles.map(v => ({
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