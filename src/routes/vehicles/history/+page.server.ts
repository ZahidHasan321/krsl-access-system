import { db } from '$lib/server/db';
import { vehicles } from '$lib/server/db/schema';
import { desc, like, or, and, eq, count } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { requirePermission } from '$lib/server/rbac';

export const load: PageServerLoad = async ({ url, locals }) => {
    requirePermission(locals, 'vehicles.view');
    const query = url.searchParams.get('q') || '';
    const date = url.searchParams.get('date') || '';
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('limit')) || 20));
    const offset = (page - 1) * pageSize;

    const conditions = [];

    if (query) {
        conditions.push(
            or(
                like(vehicles.vehicleNumber, `%${query}%`),
                like(vehicles.driverName, `%${query}%`),
                like(vehicles.vendorName, `%${query}%`),
                like(vehicles.cargoDescription, `%${query}%`),
                like(vehicles.mobile, `%${query}%`)
            )!
        );
    }

    if (date) {
        conditions.push(eq(vehicles.date, date));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Count Query
    const [totalCountResult] = await db
        .select({ count: count() })
        .from(vehicles)
        .where(whereClause);
    
    const totalCount = totalCountResult?.count || 0;
    const totalPages = Math.ceil(totalCount / pageSize);

    // Data Query
    const allVehicles = await db
        .select()
        .from(vehicles)
        .where(whereClause)
        .orderBy(desc(vehicles.date), desc(vehicles.entryTime))
        .limit(pageSize)
        .offset(offset);

    return { 
        vehicles: allVehicles, 
        query, 
        date,
        currentPage: page,
        totalPages,
        pageSize
    };
};