import { db } from '$lib/server/db';
import { labourLogs, labours } from '$lib/server/db/schema';
import { desc, eq, and, or, like, count } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import { fail, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { requirePermission } from '$lib/server/rbac';

export const load: PageServerLoad = async ({ url, locals }) => {
    requirePermission(locals, 'labours.view');
    const today = format(new Date(), 'yyyy-MM-dd');
    const query = url.searchParams.get('q') || '';
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('limit')) || 20));
    const offset = (page - 1) * pageSize;

    const conditions = [eq(labourLogs.date, today)];

    if (query) {
        conditions.push(
            or(
                like(labours.name, `%${query}%`),
                like(labours.codeNo, `%${query}%`),
                like(labours.designation, `%${query}%`),
                like(labours.contractorName, `%${query}%`)
            )!
        );
    }

    const whereClause = and(...conditions);

    // Count Query
    const [totalCountResult] = await db
        .select({ count: count() })
        .from(labourLogs)
        .innerJoin(labours, eq(labourLogs.labourId, labours.id))
        .where(whereClause);
    
    const totalCount = totalCountResult?.count || 0;
    const totalPages = Math.ceil(totalCount / pageSize);

    // Data Query
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
            isTrained: labours.isTrained,
            designation: labours.designation,
            contractorName: labours.contractorName,
            labourType: labours.type
        })
        .from(labourLogs)
        .innerJoin(labours, eq(labourLogs.labourId, labours.id))
        .where(whereClause)
        .orderBy(desc(labourLogs.entryTime))
        .limit(pageSize)
        .offset(offset);

    const allLabours = await db.query.labours.findMany({
        orderBy: [labours.name]
    });

    return { 
        logs, 
        labours: allLabours, 
        query,
        currentPage: page,
        totalPages,
        pageSize
    };
};

export const actions: Actions = {
    checkIn: async ({ request, locals }) => {
        requirePermission(locals, 'labours.create');
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
    checkOut: async ({ request, locals }) => {
        requirePermission(locals, 'labours.create');
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
