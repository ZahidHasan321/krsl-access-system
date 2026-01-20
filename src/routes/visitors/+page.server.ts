import { db } from '$lib/server/db';
import { visitorLogs, visitorProfiles } from '$lib/server/db/schema';
import { desc, eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import { fail, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
    const activeLogs = await db
        .select({
            id: visitorLogs.id,
            entryTime: visitorLogs.entryTime,
            exitTime: visitorLogs.exitTime,
            purpose: visitorLogs.purpose,
            visitingCardNo: visitorLogs.visitingCardNo,
            status: visitorLogs.status,
            visitorName: visitorProfiles.name,
            visitorCompany: visitorProfiles.company,
            visitorContact: visitorProfiles.contactNo,
            visitorType: visitorProfiles.visitorType,
            visitorId: visitorProfiles.id
        })
        .from(visitorLogs)
        .innerJoin(visitorProfiles, eq(visitorLogs.visitorId, visitorProfiles.id))
        .where(eq(visitorLogs.status, 'on_premises'))
        .orderBy(desc(visitorLogs.entryTime));

    const allProfiles = await db.query.visitorProfiles.findMany({
        orderBy: [visitorProfiles.name]
    });

    return { activeLogs, profiles: allProfiles };
};

export const actions: Actions = {
    createVisitor: async ({ request }) => {
        const data = await request.formData();
        const name = data.get('name') as string;
        const company = data.get('company') as string;
        const contactNo = data.get('contactNo') as string;
        const visitorType = data.get('visitorType') as 'vendor' | 'guest';

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

            return { success: true, message: 'Visitor registered successfully' };
        } catch (error: any) {
            if (error.message?.includes('UNIQUE constraint failed')) {
                return fail(400, { message: 'Contact Number already exists' });
            }
            return fail(500, { message: 'Database error' });
        }
    },
    checkIn: async ({ request }) => {
        const data = await request.formData();
        const isNewVisitor = data.get('isNewVisitor') === 'true';
        const purpose = data.get('purpose') as string;
        const visitingCardNo = data.get('visitingCardNo') as string;
        
        let visitorId = data.get('visitorId') as string;

        try {
            if (isNewVisitor) {
                const name = data.get('name') as string;
                const company = data.get('company') as string;
                const contactNo = data.get('contactNo') as string;
                const visitorType = data.get('visitorType') as 'vendor' | 'guest';

                if (!name || !visitorType) return fail(400, { message: 'Missing new visitor details' });

                visitorId = uuidv4();
                await db.insert(visitorProfiles).values({
                    id: visitorId,
                    name,
                    company,
                    contactNo,
                    visitorType
                });
            } else {
                if (!visitorId) return fail(400, { message: 'Missing visitor profile' });
            }

            const now = new Date();
            const today = format(now, 'yyyy-MM-dd');

            // Check if already checked in
            const existing = await db.query.visitorLogs.findFirst({
                where: and(
                    eq(visitorLogs.visitorId, visitorId),
                    eq(visitorLogs.status, 'on_premises')
                )
            });

            if (existing) {
                return fail(400, { message: 'Visitor already checked in' });
            }

            await db.insert(visitorLogs).values({
                id: uuidv4(),
                visitorId,
                purpose,
                visitingCardNo,
                entryTime: now,
                status: 'on_premises',
                date: today
            });
            return { success: true };
        } catch (error: any) {
            console.error(error);
            if (error.message?.includes('UNIQUE constraint failed')) {
                return fail(400, { message: 'Contact Number already exists' });
            }
            return fail(500, { message: 'Database error' });
        }
    },
    checkOut: async ({ request }) => {
        const data = await request.formData();
        const id = data.get('id') as string;

        if (!id) return fail(400, { message: 'Missing ID' });

        try {
            await db.update(visitorLogs)
                .set({
                    exitTime: new Date(),
                    status: 'checked_out'
                })
                .where(eq(visitorLogs.id, id));
            return { success: true };
        } catch (error) {
            return fail(500, { message: 'Database error' });
        }
    }
};
