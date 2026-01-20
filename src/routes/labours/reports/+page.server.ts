
import { db } from '$lib/server/db';
import { labourLogs, labours } from '$lib/server/db/schema';
import { eq, like } from 'drizzle-orm';
import { format } from 'date-fns';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
    const monthStr = url.searchParams.get('month') || format(new Date(), 'yyyy-MM');

    // SQLite trick for month matching: date like 'YYYY-MM%'
    const logs = await db
        .select({
            labourId: labours.id,
            labourName: labours.name,
            labourCode: labours.codeNo,
            isTrained: labours.isTrained,
            date: labourLogs.date
        })
        .from(labourLogs)
        .innerJoin(labours, eq(labourLogs.labourId, labours.id))
        .where(like(labourLogs.date, `${monthStr}%`));
    
    // Aggregate in JS
    const map = new Map();
    
    for (const log of logs) {
        if (!map.has(log.labourId)) {
                            map.set(log.labourId, {
                                id: log.labourId,
                                name: log.labourName,
                                code: log.labourCode,
                                isTrained: log.isTrained,
                                daysPresent: 0,
                                dates: []
                            });        }
        const entry = map.get(log.labourId);
        // Count unique days
        if (!entry.dates.includes(log.date)) {
            entry.dates.push(log.date);
            entry.daysPresent++;
        }
    }
    
    const monthlyReport = Array.from(map.values()).sort((a, b) => b.daysPresent - a.daysPresent);

    return { month: monthStr, monthlyReport };
};
