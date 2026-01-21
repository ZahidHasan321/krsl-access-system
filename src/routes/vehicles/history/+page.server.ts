import { db } from '$lib/server/db';
import { vehicles } from '$lib/server/db/schema';
import { desc, like, or, and, eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
    const query = url.searchParams.get('q') || '';
    const date = url.searchParams.get('date') || '';
    
    let vehiclesQuery = db
        .select()
        .from(vehicles)
        .orderBy(desc(vehicles.date), desc(vehicles.entryTime));

    const conditions = [];

    if (query) {
        conditions.push(
            or(
                like(vehicles.vehicleNumber, `%${query}%`),
                like(vehicles.driverName, `%${query}%`),
                like(vehicles.vendorName, `%${query}%`)
            )
        );
    }

    if (date) {
        conditions.push(eq(vehicles.date, date));
    }

    if (conditions.length > 0) {
        vehiclesQuery = vehiclesQuery.where(and(...conditions)) as any;
    }

    const allVehicles = await vehiclesQuery.limit(100);

    return { vehicles: allVehicles, query, date };
};
