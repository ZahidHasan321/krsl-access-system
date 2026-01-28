import { db } from '$lib/server/db';
import { labourLogs, labours } from '$lib/server/db/schema';
import { eq, like, sql, desc, or, and } from 'drizzle-orm';
import { format } from 'date-fns';
import type { PageServerLoad } from './$types';
import { requirePermission } from '$lib/server/rbac';

export const load: PageServerLoad = async ({ url, locals }) => {
    requirePermission(locals, 'labours.view');
    const monthStr = url.searchParams.get('month') || format(new Date(), 'yyyy-MM');
    const query = url.searchParams.get('q') || '';
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('limit')) || 20));
    const offset = (page - 1) * pageSize;

    const conditions = [like(labourLogs.date, `${monthStr}%`)];
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
        .select({ count: sql<number>`count(distinct ${labourLogs.labourId})` })
        .from(labourLogs)
        .innerJoin(labours, eq(labourLogs.labourId, labours.id))
        .where(whereClause);

    const totalCount = totalCountResult?.count || 0;
    const totalPages = Math.ceil(totalCount / pageSize);

    // Data Query
    const results = await db
        .select({
            id: labours.id,
            name: labours.name,
            code: labours.codeNo,
            designation: labours.designation,
            isTrained: labours.isTrained,
            type: labours.type,
            contractorName: labours.contractorName,
            daysPresent: sql<number>`count(distinct ${labourLogs.date})`,
            // Total seconds for completed logs
            totalDurationSeconds: sql<number>`sum(case when ${labourLogs.exitTime} is not null then (${labourLogs.exitTime} - ${labourLogs.entryTime}) else 0 end)`,
            // Count of unique days that have at least one completed log
            completedDaysCount: sql<number>`count(distinct case when ${labourLogs.exitTime} is not null then ${labourLogs.date} else null end)`
        })
        .from(labourLogs)
        .innerJoin(labours, eq(labourLogs.labourId, labours.id))
        .where(whereClause)
        .groupBy(labours.id, labours.name, labours.codeNo, labours.isTrained, labours.designation, labours.type, labours.contractorName)
        .orderBy(desc(sql`count(distinct ${labourLogs.date})`))
        .limit(pageSize)
        .offset(offset);

    const monthlyReport = results.map(r => {
        const durationSeconds = Number(r.totalDurationSeconds || 0);
        const totalHours = durationSeconds / 3600;
        const daysWithWork = Number(r.completedDaysCount || 0);
        
        const avgWorkingHours = daysWithWork > 0 
            ? (totalHours / daysWithWork).toFixed(1) 
            : '0';
        
        return {
            ...r,
            avgWorkingHours
        };
    });

    return { 
        month: monthStr, 
        query,
        monthlyReport,
        currentPage: page,
        totalPages,
        pageSize
    };
};