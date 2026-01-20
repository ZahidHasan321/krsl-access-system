import { db } from '$lib/server/db';
import { vehicles } from '$lib/server/db/schema';
import { desc, eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import { fail, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
    const activeVehicles = await db.query.vehicles.findMany({
        where: eq(vehicles.status, 'on_premises'),
        orderBy: [desc(vehicles.entryTime)]
    });
    return { activeVehicles };
};

export const actions: Actions = {
    checkIn: async ({ request }) => {
        const data = await request.formData();
        const vehicleNumber = data.get('vehicleNumber') as string;
        const type = data.get('type') as 'transport' | 'regular';
        const vendorName = data.get('vendorName') as string;
        const cargoDescription = data.get('cargoDescription') as string;
        const driverName = data.get('driverName') as string;
        const helperName = data.get('helperName') as string;
        const mobile = data.get('mobile') as string;
        const note = data.get('note') as string;

        if (!vehicleNumber || !type) {
            return fail(400, { message: 'Missing required fields' });
        }

        const now = new Date();
        const today = format(now, 'yyyy-MM-dd');

        try {
            await db.insert(vehicles).values({
                id: uuidv4(),
                vehicleNumber,
                type,
                vendorName,
                cargoDescription,
                driverName,
                helperName,
                mobile,
                note,
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
            await db.update(vehicles)
                .set({
                    exitTime: new Date(),
                    status: 'checked_out'
                })
                .where(eq(vehicles.id, id));
            return { success: true };
        } catch (error) {
            return fail(500, { message: 'Database error' });
        }
    }
};
