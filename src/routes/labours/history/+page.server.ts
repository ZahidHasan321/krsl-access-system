
import { db } from '$lib/server/db';
import { labourLogs, labours } from '$lib/server/db/schema';
import { desc, eq } from 'drizzle-orm';
import { format } from 'date-fns';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
    const dateStr = url.searchParams.get('date') || format(new Date(), 'yyyy-MM-dd');

    const logs = await db
        .select({
            id: labourLogs.id,
            entryTime: labourLogs.entryTime,
            exitTime: labourLogs.exitTime,
            status: labourLogs.status,
            date: labourLogs.date,
            labourName: labours.name,
            labourCode: labours.codeNo,
            isTrained: labours.isTrained
        })
        .from(labourLogs)
        .innerJoin(labours, eq(labourLogs.labourId, labours.id))
        .where(eq(labourLogs.date, dateStr))
        .orderBy(desc(labourLogs.entryTime));

    return { date: dateStr, logs };
};
