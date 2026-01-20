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

    return { labour, logs };
};
