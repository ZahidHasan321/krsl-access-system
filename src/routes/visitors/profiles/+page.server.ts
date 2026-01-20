import { db } from '$lib/server/db';
import { visitorProfiles, visitorLogs } from '$lib/server/db/schema';
import { desc, eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import { fail, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
    const allProfiles = await db.query.visitorProfiles.findMany({
        orderBy: [desc(visitorProfiles.createdAt)]
    });
    return { profiles: allProfiles };
};

export const actions: Actions = {
    create: async ({ request }) => {
        const data = await request.formData();
        const name = data.get('name') as string;
        const company = data.get('company') as string;
        const contactNo = data.get('contactNo') as string;
        const visitorType = data.get('visitorType') as 'vendor' | 'transport' | 'guest';
        const shouldCheckIn = data.get('checkIn') === 'on';

        if (!name || !visitorType) {
            return fail(400, { message: 'Missing required fields' });
        }

        try {
            const visitorId = uuidv4();
            await db.insert(visitorProfiles).values({
                id: visitorId,
                name,
                company,
                contactNo,
                visitorType
            });

            if (shouldCheckIn) {
                const now = new Date();
                const today = format(now, 'yyyy-MM-dd');
                await db.insert(visitorLogs).values({
                    id: uuidv4(),
                    visitorId,
                    entryTime: now,
                    status: 'on_premises',
                    date: today,
                    purpose: 'Initial Visit' // Default purpose
                });
            }

            return { success: true };
        } catch (error: any) {
            if (error.message?.includes('UNIQUE constraint failed')) {
                return fail(400, { message: 'Contact Number already exists' });
            }
            return fail(500, { message: 'Database error' });
        }
    },
    update: async ({ request }) => {
        const data = await request.formData();
        const id = data.get('id') as string;
        const name = data.get('name') as string;
        const company = data.get('company') as string;
        const contactNo = data.get('contactNo') as string;
        const visitorType = data.get('visitorType') as 'vendor' | 'transport' | 'guest';

        if (!id || !name || !visitorType) {
            return fail(400, { message: 'Missing required fields' });
        }

        try {
            await db.update(visitorProfiles).set({
                name,
                company,
                contactNo,
                visitorType
            }).where(eq(visitorProfiles.id, id));
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
            await db.delete(visitorProfiles).where(eq(visitorProfiles.id, id));
            return { success: true };
        } catch (error: any) {
            if (error.message?.includes('FOREIGN KEY constraint failed')) {
                return fail(400, { message: 'Cannot delete visitor with existing logs' });
            }
            return fail(500, { message: 'Database error' });
        }
    }
};
