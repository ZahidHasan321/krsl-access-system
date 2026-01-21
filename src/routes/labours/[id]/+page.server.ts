import { db } from '$lib/server/db';
import { labours, labourLogs } from '$lib/server/db/schema';
import { desc, eq } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
    const labour = await db.query.labours.findFirst({
        where: eq(labours.id, params.id)
    });

    if (!labour) throw error(404, 'Labour not found');

    const logs = await db.query.labourLogs.findMany({
        where: eq(labourLogs.labourId, params.id),
        orderBy: [desc(labourLogs.date), desc(labourLogs.entryTime)]
    });

    // Calculate metrics
    const totalPresentDays = new Set(logs.map(l => l.date)).size;
    const currentStatus = logs.find(l => l.status === 'on_premises') ? 'on_premises' : 'checked_out';
    
    let totalHours = 0;
    let daysWithHours = 0;

    for (const log of logs) {
        if (log.exitTime && log.entryTime) {
            const duration = log.exitTime.getTime() - log.entryTime.getTime();
            totalHours += duration / (1000 * 60 * 60); // Convert ms to hours
            daysWithHours++;
        }
    }

    const avgWorkingHours = daysWithHours > 0 ? (totalHours / daysWithHours).toFixed(1) : '0';

    return { labour, logs, stats: { totalPresentDays, avgWorkingHours, currentStatus } };
};
