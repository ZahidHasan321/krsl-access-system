import { db } from '$lib/server/db';
import { visitorLogs, visitorProfiles } from '$lib/server/db/schema';
import { desc, eq, like, or, and, count } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { requirePermission } from '$lib/server/rbac';

export const load: PageServerLoad = async ({ url, locals }) => {
    requirePermission(locals, 'visitors.view');
    const query = url.searchParams.get('q') || '';
    const date = url.searchParams.get('date') || '';
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('limit')) || 20));
    const offset = (page - 1) * pageSize;

    const conditions = [];

    if (query) {
        conditions.push(
            or(
                like(visitorProfiles.name, `%${query}%`),
                like(visitorProfiles.company, `%${query}%`),
                like(visitorLogs.visitingCardNo, `%${query}%`),
                like(visitorProfiles.contactNo, `%${query}%`),
                like(visitorLogs.purpose, `%${query}%`)
            )!
        );
    }

    if (date) {
        conditions.push(eq(visitorLogs.date, date));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Count Query
    const [totalCountResult] = await db
        .select({ count: count() })
        .from(visitorLogs)
        .innerJoin(visitorProfiles, eq(visitorLogs.visitorId, visitorProfiles.id))
        .where(whereClause);
    
    const totalCount = totalCountResult?.count || 0;
    const totalPages = Math.ceil(totalCount / pageSize);

    // Data Query
    const logs = await db
        .select({
            id: visitorLogs.id,
            visitorId: visitorLogs.visitorId,
            entryTime: visitorLogs.entryTime,
            exitTime: visitorLogs.exitTime,
            purpose: visitorLogs.purpose,
            visitingCardNo: visitorLogs.visitingCardNo,
            status: visitorLogs.status,
            date: visitorLogs.date,
            visitorName: visitorProfiles.name,
            visitorCompany: visitorProfiles.company,
            visitorContact: visitorProfiles.contactNo,
            visitorType: visitorProfiles.visitorType,
        })
        .from(visitorLogs)
        .innerJoin(visitorProfiles, eq(visitorLogs.visitorId, visitorProfiles.id))
        .where(whereClause)
        .orderBy(desc(visitorLogs.date), desc(visitorLogs.entryTime))
        .limit(pageSize)
        .offset(offset);

    return { 
        logs, 
        query, 
        date,
        currentPage: page,
        totalPages,
        pageSize
    };
};
