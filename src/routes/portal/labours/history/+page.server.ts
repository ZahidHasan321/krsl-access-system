import { db } from '$lib/server/db';
import { labourLogs, labours } from '$lib/server/db/schema';
import { desc, eq, and, or, like, count } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { requirePermission } from '$lib/server/rbac';
import { transformLogs } from '$lib/server/portal-utils';

export const load: PageServerLoad = async ({ url, locals }) => {
    requirePermission(locals, 'labours.portal');
    const dateStr = url.searchParams.get('date') || '';
    const query = url.searchParams.get('q') || '';
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('limit')) || 20));
    const offset = (page - 1) * pageSize;

    const conditions = [];

    if (dateStr) {
        conditions.push(eq(labourLogs.date, dateStr));
    }

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

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Count Query
    const [totalCountResult] = await db
        .select({ count: count() })
        .from(labourLogs)
        .innerJoin(labours, eq(labourLogs.labourId, labours.id))
        .where(whereClause);

    const totalCount = totalCountResult?.count || 0;
    const totalPages = Math.ceil(totalCount / pageSize);

    // Data Query
    const rawLogs = await db
        .select({
            id: labourLogs.id,
            labourId: labourLogs.labourId,
            entryTime: labourLogs.entryTime,
            exitTime: labourLogs.exitTime,
            status: labourLogs.status,
            date: labourLogs.date,
            labourName: labours.name,
            labourCode: labours.codeNo,
            isTrained: labours.isTrained,
            designation: labours.designation,
            contractorName: labours.contractorName,
            labourType: labours.type
        })
        .from(labourLogs)
        .innerJoin(labours, eq(labourLogs.labourId, labours.id))
        .where(whereClause)
        .orderBy(desc(labourLogs.date), desc(labourLogs.entryTime))
        .limit(pageSize)
        .offset(offset);

    // Transform Logs for Portal
    const logs = transformLogs(rawLogs);

    return { 
        date: dateStr, 
        query,
        logs,
        currentPage: page,
        totalPages,
        pageSize
    };
};
