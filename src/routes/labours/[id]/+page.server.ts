import { db } from '$lib/server/db';
import { labours, labourLogs } from '$lib/server/db/schema';
import { desc, eq } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { requirePermission } from '$lib/server/rbac';

export const load: PageServerLoad = async ({ params, locals }) => {
    requirePermission(locals, 'labours.view');
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
    const currentStatus: 'on_premises' | 'checked_out' = logs.find(l => l.status === 'on_premises') ? 'on_premises' : 'checked_out';
    
    let totalHours = 0;
    const completedDays = new Set<string>();

    for (const log of logs) {
        if (log.exitTime && log.entryTime) {
            // duration in milliseconds
            const duration = log.exitTime.getTime() - log.entryTime.getTime();
            totalHours += duration / (1000 * 60 * 60); 
            completedDays.add(log.date);
        }
    }

    // Standard Average: Total Hours / Total Days Present (including today)
    // If you want average per "working" day, use completedDays.size
    // But if individual page is showing "wrongly", maybe the user wants it relative to totalPresentDays.
    const avgWorkingHours = totalPresentDays > 0 ? (totalHours / totalPresentDays).toFixed(1) : '0';

    return { labour, logs, stats: { totalPresentDays, avgWorkingHours, currentStatus } };
};
