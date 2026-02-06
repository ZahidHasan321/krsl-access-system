import { db } from '$lib/server/db';
import { vehicles } from '$lib/server/db/schema';
import { desc, like, or, and, eq, count, gte, lte, sql } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { requirePermission } from '$lib/server/rbac';

export const load: PageServerLoad = async ({ url, locals }) => {
    requirePermission(locals, 'vehicles.view');
    const query = url.searchParams.get('q') || '';
    const dateFrom = url.searchParams.get('from') || '';
    const dateTo = url.searchParams.get('to') || '';
    const typeFilter = url.searchParams.get('type') || 'all';
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('limit')) || 20));
    const offset = (page - 1) * pageSize;

    // Base conditions (without type filter) for summary
    const baseConditions = [];

    if (query) {
        baseConditions.push(
            or(
                like(vehicles.vehicleNumber, `%${query}%`),
                like(vehicles.driverName, `%${query}%`),
                like(vehicles.vendorName, `%${query}%`),
                like(vehicles.cargoDescription, `%${query}%`),
                like(vehicles.mobile, `%${query}%`)
            )!
        );
    }

    if (dateFrom) {
        baseConditions.push(gte(vehicles.date, dateFrom));
    }

    if (dateTo) {
        baseConditions.push(lte(vehicles.date, dateTo));
    }

    const baseWhereClause = baseConditions.length > 0 ? and(...baseConditions) : undefined;

    // Summary stats (always without type filter so user can see breakdown)
    const summaryResults = await db
        .select({
            type: vehicles.type,
            count: count()
        })
        .from(vehicles)
        .where(baseWhereClause)
        .groupBy(vehicles.type);

    // Add type filter for data query
    const conditions = [...baseConditions];
    if (typeFilter !== 'all') {
        conditions.push(eq(vehicles.type, typeFilter as 'transport' | 'regular'));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Count Query (with type filter)
    const [totalCountResult] = await db
        .select({ count: count() })
        .from(vehicles)
        .where(whereClause);

    const totalCount = totalCountResult?.count || 0;
    const totalPages = Math.ceil(totalCount / pageSize);

    const transportCount = summaryResults.find(r => r.type === 'transport')?.count || 0;
    const regularCount = summaryResults.find(r => r.type === 'regular')?.count || 0;
    const summary = {
        total: transportCount + regularCount,
        transport: transportCount,
        regular: regularCount
    };

    // Data Query
    const allVehicles = await db
        .select()
        .from(vehicles)
        .where(whereClause)
        .orderBy(desc(sql`COALESCE(${vehicles.exitTime}, ${vehicles.entryTime})`))
        .limit(pageSize)
        .offset(offset);

    return {
        vehicles: allVehicles,
        filters: {
            query,
            dateFrom,
            dateTo,
            typeFilter
        },
        summary,
        pagination: {
            page,
            limit: pageSize,
            totalCount,
            totalPages
        }
    };
};