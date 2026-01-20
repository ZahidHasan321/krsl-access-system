import { db } from '$lib/server/db';
import { vehicles } from '$lib/server/db/schema';
import { desc, like, or } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
    const query = url.searchParams.get('q') || '';
    
    let vehiclesQuery = db
        .select()
        .from(vehicles)
        .orderBy(desc(vehicles.date), desc(vehicles.entryTime));

    if (query) {
        vehiclesQuery = vehiclesQuery.where(
            or(
                like(vehicles.vehicleNumber, `%${query}%`),
                like(vehicles.driverName, `%${query}%`),
                like(vehicles.vendorName, `%${query}%`)
            )
        ) as any;
    }

    const allVehicles = await vehiclesQuery.limit(100);

    return { vehicles: allVehicles, query };
};
