import { db } from '$lib/server/db';
import { labourLogs, labours } from '$lib/server/db/schema';
import { desc, eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import { fail, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    
    const logs = await db
        .select({
            id: labourLogs.id,
            entryTime: labourLogs.entryTime,
            exitTime: labourLogs.exitTime,
            status: labourLogs.status,
            date: labourLogs.date,
            labourName: labours.name,
            labourCode: labours.codeNo,
            labourId: labours.id,
            isTrained: labours.isTrained
        })
        .from(labourLogs)
        .innerJoin(labours, eq(labourLogs.labourId, labours.id))
        .where(eq(labourLogs.date, today))
        .orderBy(desc(labourLogs.entryTime));

    const allLabours = await db.query.labours.findMany({
        orderBy: [labours.name]
    });

    return { logs, labours: allLabours };
};

export const actions: Actions = {
    checkIn: async ({ request }) => {
        const data = await request.formData();
        const labourId = data.get('labourId') as string;
        
        if (!labourId) return fail(400, { message: 'Missing labour' });

        const now = new Date();
        const today = format(now, 'yyyy-MM-dd');

        // Check if already checked in TODAY (regardless of status)
        const existing = await db.query.labourLogs.findFirst({
            where: and(
                eq(labourLogs.labourId, labourId),
                eq(labourLogs.date, today)
            )
        });

        if (existing) {
            return fail(400, { message: 'Labour has already checked in today.' });
        }

        try {
            await db.insert(labourLogs).values({
                id: uuidv4(),
                labourId,
                entryTime: now,
                status: 'on_premises',
                date: today
            });
            return { success: true };
        } catch (error) {
            return fail(500, { message: 'Database error' });
        }
    },
    checkOut: async ({ request }) => {
        const data = await request.formData();
        const id = data.get('id') as string;

        if (!id) return fail(400, { message: 'Missing ID' });

        try {
            await db.update(labourLogs)
                .set({
                    exitTime: new Date(),
                    status: 'checked_out'
                })
                .where(eq(labourLogs.id, id));
            return { success: true };
        } catch (error) {
            return fail(500, { message: 'Database error' });
        }
    }
};
