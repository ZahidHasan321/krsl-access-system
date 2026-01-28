import { db } from '$lib/server/db';
import { labours, labourLogs } from '$lib/server/db/schema';
import { desc, eq } from 'drizzle-orm';
import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { requirePermission } from '$lib/server/rbac';
import { transformLogs } from '$lib/server/portal-utils';

export const load: PageServerLoad = async ({ params, locals }) => {
    requirePermission(locals, 'labours.portal');
    const labour = await db.query.labours.findFirst({
        where: eq(labours.id, params.id)
    });

    if (!labour) throw error(404, 'Labour not found');

    const rawLogs = await db.query.labourLogs.findMany({
        where: eq(labourLogs.labourId, params.id),
        orderBy: [desc(labourLogs.date), desc(labourLogs.entryTime)]
    });

    // 1. Transform Logs for Portal
    const logs = transformLogs(rawLogs);

    // 2. Calculate metrics based on TRANSFORMED logs
    const totalPresentDays = new Set(logs.map(l => l.date)).size;
    const currentStatus: 'on_premises' | 'checked_out' = logs.find(l => l.status === 'on_premises') ? 'on_premises' : 'checked_out';
    
    let totalHours = 0;

    for (const log of logs) {
        if (log.exitTime && log.entryTime) {
            const duration = log.exitTime.getTime() - log.entryTime.getTime();
            totalHours += duration / (1000 * 60 * 60); 
        }
    }

    const avgWorkingHours = totalPresentDays > 0 ? (totalHours / totalPresentDays).toFixed(1) : '0';

    return { labour, logs, stats: { totalPresentDays, avgWorkingHours, currentStatus } };
};

export const actions: Actions = {
    update: async ({ request, locals }) => {
        requirePermission(locals, 'labours.edit');
        const data = await request.formData();
        const id = data.get('id') as string;
        const name = data.get('name') as string;
        const codeNo = data.get('codeNo') as string;
        const type = data.get('type') as 'company' | 'contractor';
        const designation = data.get('designation') as string;
        const contractorName = data.get('contractorName') as string;
        const joinDateStr = data.get('joinDate') as string;
        const isTrained = data.has('isTrained');

        if (!id || !name || !codeNo || !type) {
            return fail(400, { message: 'Missing required fields' });
        }

        try {
            await db.update(labours).set({
                name,
                codeNo,
                type,
                designation,
                contractorName: type === 'contractor' ? contractorName : null,
                joinDate: joinDateStr ? new Date(joinDateStr) : null,
                isTrained,
            }).where(eq(labours.id, id));
            return { success: true };
        } catch (error: any) {
            return fail(500, { message: 'Database error' });
        }
    }
};
