import { db } from '$lib/server/db';
import { labourLogs, labours } from '$lib/server/db/schema';
import { eq, like, desc, or, and, count, sql, inArray } from 'drizzle-orm';
import { format } from 'date-fns';
import type { PageServerLoad } from './$types';
import { requirePermission } from '$lib/server/rbac';
import { transformLog } from '$lib/server/portal-utils';

export const load: PageServerLoad = async ({ url, locals }) => {
    requirePermission(locals, 'labours.portal');
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

    // Count distinct labours for pagination
    const [totalCountResult] = await db
        .select({ count: sql<number>`count(distinct ${labourLogs.labourId})` })
        .from(labourLogs)
        .innerJoin(labours, eq(labourLogs.labourId, labours.id))
        .where(whereClause);

    const totalCount = totalCountResult?.count || 0;
    const totalPages = Math.ceil(totalCount / pageSize);

    // Fetch labours in the list
    const labourList = await db
        .select({
            id: labours.id,
            name: labours.name,
            code: labours.codeNo,
            designation: labours.designation,
            isTrained: labours.isTrained,
            type: labours.type,
            contractorName: labours.contractorName,
        })
        .from(labourLogs)
        .innerJoin(labours, eq(labourLogs.labourId, labours.id))
        .where(whereClause)
        .groupBy(labours.id)
        .limit(pageSize)
        .offset(offset);

    const labourIds = labourList.map(l => l.id);

    // Fetch all logs for these labours in this month to calculate metrics manually with transformation
    const allRelevantLogs = labourIds.length > 0 ? await db.query.labourLogs.findMany({
        where: and(
            like(labourLogs.date, `${monthStr}%`),
            inArray(labourLogs.labourId, labourIds)
        )
    }) : [];

    const monthlyReport = labourList.map(labour => {
        const myLogs = allRelevantLogs.filter(l => l.labourId === labour.id);
        const transformedLogs = myLogs.map(l => transformLog(l));
        
        const daysPresent = new Set(transformedLogs.map(l => l.date)).size;
        
        let totalHours = 0;
        const completedDays = new Set<string>();

        for (const log of transformedLogs) {
            if (log.exitTime && log.entryTime) {
                const duration = log.exitTime.getTime() - log.entryTime.getTime();
                totalHours += duration / (1000 * 60 * 60); 
                completedDays.add(log.date);
            }
        }

        const avgWorkingHours = completedDays.size > 0 
            ? (totalHours / completedDays.size).toFixed(1) 
            : '0';

        return {
            ...labour,
            daysPresent,
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
