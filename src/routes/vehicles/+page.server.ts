import { db } from '$lib/server/db';
import { vehicles } from '$lib/server/db/schema';
import { desc, eq, and, or, like, count, sql } from 'drizzle-orm';
import { format } from 'date-fns';
import { fail, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { requirePermission } from '$lib/server/rbac';
import { notifyChange } from '$lib/server/events';

export const load: PageServerLoad = async ({ url, locals }) => {
    requirePermission(locals, 'vehicles.view');
    const query = url.searchParams.get('q') || '';
    const typeFilter = url.searchParams.get('type') || 'all';
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('limit')) || 20));
    const offset = (page - 1) * pageSize;

    const conditions = [eq(vehicles.status, 'on_premises')];

    if (typeFilter !== 'all') {
        conditions.push(eq(vehicles.type, typeFilter as any));
    }

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

    const whereClause = and(...conditions);

    // Count Query
    const [totalCountResult] = await db
        .select({ count: count() })
        .from(vehicles)
        .where(whereClause);
    
    const totalCount = totalCountResult?.count || 0;
    const totalPages = Math.ceil(totalCount / pageSize);

    // Data Query
    const activeVehicles = await db
        .select()
        .from(vehicles)
        .where(whereClause)
        .orderBy(desc(vehicles.entryTime))
        .limit(pageSize)
        .offset(offset);

    // Summary stats for active vehicles
    const [summaryStats] = await db
        .select({
            total: count(),
            transport: sql<number>`sum(case when ${vehicles.type} = 'transport' then 1 else 0 end)`,
            regular: sql<number>`sum(case when ${vehicles.type} = 'regular' then 1 else 0 end)`
        })
        .from(vehicles)
        .where(whereClause);

    return { 
        activeVehicles, 
        summary: {
            total: summaryStats.total || 0,
            transport: summaryStats.transport || 0,
            regular: summaryStats.regular || 0
        },
        filters: {
            query,
            typeFilter
        },
        pagination: {
            page,
            limit: pageSize,
            totalCount,
            totalPages
        }
    };
};

export const actions: Actions = {
    checkIn: async ({ request, locals }) => {
        requirePermission(locals, 'vehicles.create');
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
                id: crypto.randomUUID(),
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
            notifyChange();
            return { success: true };
        } catch (error) {
            return fail(500, { message: 'Database error' });
        }
    },
    checkOut: async ({ request, locals }) => {
        requirePermission(locals, 'vehicles.create');
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
            notifyChange();
            return { success: true };
        } catch (error) {
            return fail(500, { message: 'Database error' });
        }
    }
};