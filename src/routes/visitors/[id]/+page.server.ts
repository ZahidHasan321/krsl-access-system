import { db } from '$lib/server/db';
import { visitorProfiles, visitorLogs } from '$lib/server/db/schema';
import { desc, eq } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
    const visitor = await db.query.visitorProfiles.findFirst({
        where: eq(visitorProfiles.id, params.id)
    });

    if (!visitor) throw error(404, 'Visitor not found');

    const logs = await db.query.visitorLogs.findMany({
        where: eq(visitorLogs.visitorId, params.id),
        orderBy: [desc(visitorLogs.date), desc(visitorLogs.entryTime)]
    });

    const totalVisits = logs.length;
    // Calculate last visit (if any)
    const lastVisit = logs.length > 0 ? logs[0].date : null;
    const currentStatus = logs.find(l => l.status === 'on_premises') ? 'on_premises' : 'checked_out';

    return { visitor, logs, stats: { totalVisits, lastVisit, currentStatus } };
};
