import { db } from '$lib/server/db';
import { labourLogs, visitorLogs, vehicles } from '$lib/server/db/schema';
import { count, eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
    const [laboursCount] = await db
        .select({ value: count() })
        .from(labourLogs)
        .where(eq(labourLogs.status, 'on_premises'));

    const [visitorsCount] = await db
        .select({ value: count() })
        .from(visitorLogs)
        .where(eq(visitorLogs.status, 'on_premises'));

    const [vehiclesCount] = await db
        .select({ value: count() })
        .from(vehicles)
        .where(eq(vehicles.status, 'on_premises'));

    return {
        counts: {
            labours: laboursCount.value,
            visitors: visitorsCount.value,
            vehicles: vehiclesCount.value
        }
    };
};
