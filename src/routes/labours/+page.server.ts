import { db } from '$lib/server/db';
import { labours } from '$lib/server/db/schema';
import { desc, eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { fail, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
    const allLabours = await db.query.labours.findMany({
        orderBy: [desc(labours.createdAt)]
    });
    return { labours: allLabours };
};

export const actions: Actions = {
    create: async ({ request }) => {
        const data = await request.formData();
        const name = data.get('name') as string;
        const codeNo = data.get('codeNo') as string;
        const type = data.get('type') as 'company' | 'contractor';
        const designation = data.get('designation') as string;
        const joinDateStr = data.get('joinDate') as string;
        const isTrained = data.has('isTrained');

        if (!name || !codeNo || !type) {
            return fail(400, { message: 'Missing required fields' });
        }

        try {
            await db.insert(labours).values({
                id: uuidv4(),
                name,
                codeNo,
                type,
                designation,
                joinDate: joinDateStr ? new Date(joinDateStr) : null,
                isTrained,
            });
            return { success: true };
        } catch (error: any) {
            if (error.message?.includes('UNIQUE constraint failed')) {
                return fail(400, { message: 'Code Number already exists' });
            }
            return fail(500, { message: 'Database error' });
        }
    },
    update: async ({ request }) => {
        const data = await request.formData();
        const id = data.get('id') as string;
        const name = data.get('name') as string;
        const codeNo = data.get('codeNo') as string;
        const type = data.get('type') as 'company' | 'contractor';
        const designation = data.get('designation') as string;
        const joinDateStr = data.get('joinDate') as string;
        const isTrained = data.has('isTrained');

        if (!id || !name || !codeNo || !type) {
            return fail(400, { message: 'Missing required fields' });
        }

        try {
            await db.update(labours).set({
                name,
                codeNo,
                type,
                designation,
                joinDate: joinDateStr ? new Date(joinDateStr) : null,
                isTrained,
            }).where(eq(labours.id, id));
            return { success: true };
        } catch (error: any) {
            return fail(500, { message: 'Database error' });
        }
    },
    delete: async ({ request }) => {
        const data = await request.formData();
        const id = data.get('id') as string;

        if (!id) return fail(400, { message: 'Missing ID' });

        try {
            await db.delete(labours).where(eq(labours.id, id));
            return { success: true };
        } catch (error: any) {
            if (error.message?.includes('FOREIGN KEY constraint failed')) {
                return fail(400, { message: 'Cannot delete labour with existing logs' });
            }
            return fail(500, { message: 'Database error' });
        }
    }
};
