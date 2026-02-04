import { db } from '$lib/server/db';
import { people, personCategories, attendanceLogs } from '$lib/server/db/schema';
import { eq, and, desc, sql, count, avg } from 'drizzle-orm';
import { error, fail } from '@sveltejs/kit';
import { requirePermission } from '$lib/server/rbac';
import { notifyChange } from '$lib/server/events';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async (event) => {
    requirePermission(event.locals, 'people.view');
    const { id } = event.params;

    const person = await db
        .select({
            id: people.id,
            name: people.name,
            codeNo: people.codeNo,
            cardNo: people.cardNo,
            biometricId: people.biometricId,
            photoUrl: people.photoUrl,
            company: people.company,
            contactNo: people.contactNo,
            designation: people.designation,
            isTrained: people.isTrained,
            joinDate: people.joinDate,
            notes: people.notes,
            category: {
                id: personCategories.id,
                name: personCategories.name,
                slug: personCategories.slug
            }
        })
        .from(people)
        .innerJoin(personCategories, eq(people.categoryId, personCategories.id))
        .where(eq(people.id, id))
        .get();

    if (!person) {
        error(404, 'Person not found');
    }

    // Recent logs
    const recentLogs = await db
        .select()
        .from(attendanceLogs)
        .where(eq(attendanceLogs.personId, id))
        .orderBy(desc(attendanceLogs.entryTime))
        .limit(20);

    // Stats
    const [stats] = await db
        .select({
            totalVisits: count(),
            avgDuration: sql<number>`AVG(CASE WHEN ${attendanceLogs.exitTime} IS NOT NULL THEN (${attendanceLogs.exitTime} - ${attendanceLogs.entryTime}) ELSE NULL END)`
        })
        .from(attendanceLogs)
        .where(eq(attendanceLogs.personId, id));

    const isInside = await db.query.attendanceLogs.findFirst({
        where: and(
            eq(attendanceLogs.personId, id),
            eq(attendanceLogs.status, 'on_premises')
        )
    });

    return {
        person,
        recentLogs,
        stats,
        isInside: !!isInside,
        activeLog: isInside
    };
};

export const actions: Actions = {
    update: async (event) => {
        requirePermission(event.locals, 'people.edit');
        const { id } = event.params;
        const data = await event.request.formData();

        const name = data.get('name') as string;
        const categoryId = data.get('categoryId') as string;
        if (!name) return fail(400, { message: 'Name required' });

        const updates: Record<string, any> = {
            name,
            codeNo: data.get('codeNo') as string || null,
            company: data.get('company') as string || null,
            contactNo: data.get('contactNo') as string || null,
            designation: data.get('designation') as string || null,
            isTrained: data.get('isTrained') === 'true',
            notes: data.get('notes') as string || null
        };

        if (categoryId) {
            updates.categoryId = categoryId;
        }

        await db.update(people)
            .set(updates)
            .where(eq(people.id, id));

        notifyChange();
        return { success: true };
    },

    delete: async (event) => {
        requirePermission(event.locals, 'people.delete');
        const { id } = event.params;

        try {
            await db.delete(people).where(eq(people.id, id));
            notifyChange();
            return { success: true };
        } catch (e) {
            return fail(500, { message: 'Cannot delete person with attendance history' });
        }
    }
};
