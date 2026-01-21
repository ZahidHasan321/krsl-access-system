import { db } from '$lib/server/db';
import { visitorLogs, visitorProfiles } from '$lib/server/db/schema';
import { desc, eq, like, or, and } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
    const query = url.searchParams.get('q') || '';
    const date = url.searchParams.get('date') || '';
    
    let logsQuery = db
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
        .orderBy(desc(visitorLogs.date), desc(visitorLogs.entryTime));

    const conditions = [];

    if (query) {
        conditions.push(
            or(
                like(visitorProfiles.name, `%${query}%`),
                like(visitorProfiles.company, `%${query}%`),
                like(visitorLogs.visitingCardNo, `%${query}%`)
            )
        );
    }

    if (date) {
        conditions.push(eq(visitorLogs.date, date));
    }

    if (conditions.length > 0) {
        logsQuery = logsQuery.where(and(...conditions)) as any;
    }

    const logs = await logsQuery.limit(100);

    return { logs, query, date };
};
