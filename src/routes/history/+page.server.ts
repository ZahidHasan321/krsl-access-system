import { db } from '$lib/server/db';
import { attendanceLogs, people, personCategories } from '$lib/server/db/schema';
import { eq, and, desc, sql, gte, lte, or, like, count, inArray, type SQL } from 'drizzle-orm';
import { format, subDays } from 'date-fns';
import { requirePermission } from '$lib/server/rbac';
import { getFlatCategoryList } from '$lib/server/db/category-utils';
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
    const byId = new Map(CATEGORIES.map(c => [c.id, c]));
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

    const rawView = event.url.searchParams.get('view') || 'detailed';
    const view = ['detailed', 'daily', 'monthly'].includes(rawView) ? rawView : 'detailed';
    const startDate = event.url.searchParams.get('startDate') || format(subDays(new Date(), 30), 'yyyy-MM-dd');
    const endDate = event.url.searchParams.get('endDate') || format(new Date(), 'yyyy-MM-dd');
    const categoryId = event.url.searchParams.get('category') || '';
    const query = event.url.searchParams.get('q') || '';
    const page = parseInt(event.url.searchParams.get('page') || '1');
    const limit = Math.min(100, Math.max(1, parseInt(event.url.searchParams.get('limit') || '20')));
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

    if (query) {
        whereClauses.push(or(
            like(people.name, `%${query}%`),
            like(people.codeNo, `%${query}%`),
            like(people.company, `%${query}%`),
            like(people.contactNo, `%${query}%`)
        ));
    }

    const where = and(...whereClauses.filter((c): c is SQL => !!c));

    let data: any[] = [];
    let totalCount = 0;

    if (view === 'detailed') {
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
                    categoryId: people.categoryId
                },
                category: {
                    name: personCategories.name
                }
            })
            .from(attendanceLogs)
            .innerJoin(people, eq(attendanceLogs.personId, people.id))
            .innerJoin(personCategories, eq(people.categoryId, personCategories.id))
            .where(where)
            .limit(limit)
            .offset(offset)
            .orderBy(desc(sql`COALESCE(${attendanceLogs.exitTime}, ${attendanceLogs.entryTime})`));

        // Add root category name to each row
        data = rows.map(row => {
            const root = rootLookup.get(row.person.categoryId);
            return {
                ...row,
                rootCategory: root ? { name: root.name } : row.category
            };
        });

        const [countResult] = await db
            .select({ value: sql<number>`count(*)` })
            .from(attendanceLogs)
            .innerJoin(people, eq(attendanceLogs.personId, people.id))
            .where(where);
        totalCount = countResult.value;

    } else if (view === 'daily') {
        const summary = await db
            .select({
                date: attendanceLogs.date,
                totalEntries: count(attendanceLogs.id),
                uniquePeople: sql<number>`COUNT(DISTINCT ${attendanceLogs.personId})`,
                totalDuration: sql<number>`SUM(CASE WHEN ${attendanceLogs.exitTime} IS NOT NULL THEN (${attendanceLogs.exitTime} - ${attendanceLogs.entryTime}) ELSE 0 END)`
            })
            .from(attendanceLogs)
            .innerJoin(people, eq(attendanceLogs.personId, people.id))
            .where(where)
            .groupBy(attendanceLogs.date)
            .orderBy(desc(attendanceLogs.date))
            .limit(limit)
            .offset(offset);

        data = summary;

        const [countResult] = await db
            .select({ value: sql<number>`COUNT(DISTINCT ${attendanceLogs.date})` })
            .from(attendanceLogs)
            .innerJoin(people, eq(attendanceLogs.personId, people.id))
            .where(where);
        totalCount = countResult.value;

    } else if (view === 'monthly') {
        const summary = await db
            .select({
                month: sql<string>`strftime('%Y-%m', ${attendanceLogs.date})`,
                totalEntries: count(attendanceLogs.id),
                uniquePeople: sql<number>`COUNT(DISTINCT ${attendanceLogs.personId})`,
                activeDays: sql<number>`COUNT(DISTINCT ${attendanceLogs.date})`
            })
            .from(attendanceLogs)
            .innerJoin(people, eq(attendanceLogs.personId, people.id))
            .where(where)
            .groupBy(sql`strftime('%Y-%m', ${attendanceLogs.date})`)
            .orderBy(desc(sql`strftime('%Y-%m', ${attendanceLogs.date})`))
            .limit(limit)
            .offset(offset);

        data = summary;

        const [countResult] = await db
            .select({ value: sql<number>`COUNT(DISTINCT strftime('%Y-%m', ${attendanceLogs.date}))` })
            .from(attendanceLogs)
            .innerJoin(people, eq(attendanceLogs.personId, people.id))
            .where(where);
        totalCount = countResult.value;
    }

    // Summary stats for the filtered range
    const [summaryStats] = await db
        .select({
            totalEntries: count(attendanceLogs.id),
            uniquePeople: sql<number>`COUNT(DISTINCT ${attendanceLogs.personId})`,
            totalDuration: sql<number>`SUM(CASE WHEN ${attendanceLogs.exitTime} IS NOT NULL THEN (${attendanceLogs.exitTime} - ${attendanceLogs.entryTime}) ELSE 0 END)`,
            activeDays: sql<number>`COUNT(DISTINCT ${attendanceLogs.date})`
        })
        .from(attendanceLogs)
        .innerJoin(people, eq(attendanceLogs.personId, people.id))
        .where(where);

    return {
        view,
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
            query
        },
        pagination: {
            page,
            limit,
            totalPages: Math.ceil(totalCount / limit),
            totalCount
        }
    };
};
