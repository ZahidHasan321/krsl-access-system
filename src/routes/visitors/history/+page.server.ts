import { db } from '$lib/server/db';
import { visitorLogs, visitorProfiles } from '$lib/server/db/schema';
import { desc, eq, like, or } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
    const query = url.searchParams.get('q') || '';
    
    let logsQuery = db
        .select({
            id: visitorLogs.id,
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

    if (query) {
        // Unfortunately drizzle-orm with better-sqlite3 select() builder doesn't support easy complex filtering on joined tables in some versions
        // But we can try:
        logsQuery = logsQuery.where(
            or(
                like(visitorProfiles.name, `%${query}%`),
                like(visitorProfiles.company, `%${query}%`),
                like(visitorLogs.visitingCardNo, `%${query}%`)
            )
        ) as any;
    }

    const logs = await logsQuery.limit(100);

    return { logs, query };
};
