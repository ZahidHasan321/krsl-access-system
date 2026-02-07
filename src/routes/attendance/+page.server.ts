import { db } from '$lib/server/db';
import { attendanceLogs, people, personCategories } from '$lib/server/db/schema';
import { eq, and, desc, sql, or, like, inArray, gte, lte, count, type SQL } from 'drizzle-orm';
import { format } from 'date-fns';
import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { requirePermission } from '$lib/server/rbac';
import { notifyChange } from '$lib/server/events';

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

    const query = event.url.searchParams.get('q') || '';
    const categoryId = event.url.searchParams.get('category') || '';
    const page = parseInt(event.url.searchParams.get('page') || '1');
    const limit = Math.min(100, Math.max(1, parseInt(event.url.searchParams.get('limit') || '20')));
    const offset = (page - 1) * limit;

    const rootLookup = buildRootLookup();

    const whereClauses: (SQL | undefined)[] = [
        eq(attendanceLogs.status, 'on_premises')
    ];

    if (query) {
        whereClauses.push(or(
            like(people.name, `%${query}%`),
            like(people.codeNo, `%${query}%`),
            like(people.company, `%${query}%`),
            like(people.contactNo, `%${query}%`)
        ));
    }

    if (categoryId) {
        const descendantIds = getDescendantIds(categoryId);
        whereClauses.push(inArray(people.categoryId, descendantIds));
    }

    const where = and(...whereClauses.filter((c): c is SQL => !!c));

    // Load active entries (on_premises) only with filtering
    const logs = await db
        .select({
            id: attendanceLogs.id,
            entryTime: attendanceLogs.entryTime,
            exitTime: attendanceLogs.exitTime,
            status: attendanceLogs.status,
            verifyMethod: attendanceLogs.verifyMethod,
            purpose: attendanceLogs.purpose,
            person: {
                id: people.id,
                name: people.name,
                codeNo: people.codeNo,
                company: people.company,
                categoryId: people.categoryId,
                photoUrl: people.photoUrl
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
        .orderBy(desc(attendanceLogs.entryTime))
        .limit(limit)
        .offset(offset);

    const [totalCountResult] = await db
        .select({ count: count() })
        .from(attendanceLogs)
        .innerJoin(people, eq(attendanceLogs.personId, people.id))
        .innerJoin(personCategories, eq(people.categoryId, personCategories.id))
        .where(where);
    
    const totalCount = totalCountResult?.count || 0;

    // Add root category info to each log
    const logsWithRoot = logs.map(log => {
        const root = rootLookup.get(log.person.categoryId);
        return {
            ...log,
            rootCategory: root ? { id: root.id, name: root.name, slug: root.slug } : log.category
        };
    });

    return {
        logs: logsWithRoot,
        filters: {
            query,
            categoryId
        },
        pagination: {
            page,
            limit,
            totalPages: Math.ceil(totalCount / limit),
            totalCount
        }
    };
};

export const actions: Actions = {
    checkIn: async (event) => {
        requirePermission(event.locals, 'people.create');
        const data = await event.request.formData();
        const personId = data.get('personId') as string;
        const purpose = data.get('purpose') as string || null;

        if (!personId) return fail(400, { message: 'Person ID required' });

        // 1. Verify person exists
        const person = await db.query.people.findFirst({
            where: eq(people.id, personId)
        });
        if (!person) return fail(404, { message: 'Person not found' });

        // 2. Check if already on premises
        const activeLog = await db.query.attendanceLogs.findFirst({
            where: and(
                eq(attendanceLogs.personId, personId),
                eq(attendanceLogs.status, 'on_premises')
            )
        });

        if (activeLog) {
            return fail(400, { message: 'Person must exit before entering again' });
        }

        // 3. Create log
        const now = new Date();
        await db.insert(attendanceLogs).values({
            id: crypto.randomUUID(),
            personId,
            entryTime: now,
            status: 'on_premises',
            purpose,
            date: format(now, 'yyyy-MM-dd')
        });

        notifyChange();
        return { success: true };
    },

    checkOut: async (event) => {
        requirePermission(event.locals, 'people.create');
        const data = await event.request.formData();
        const logId = data.get('logId') as string;

        if (!logId) return fail(400, { message: 'Log ID required' });

        const log = await db.query.attendanceLogs.findFirst({
            where: eq(attendanceLogs.id, logId)
        });

        if (!log || log.status !== 'on_premises') {
            return fail(400, { message: 'Active log not found' });
        }

        await db.update(attendanceLogs)
            .set({
                exitTime: new Date(),
                status: 'checked_out'
            })
            .where(eq(attendanceLogs.id, logId));

        notifyChange();
        return { success: true };
    }
};
