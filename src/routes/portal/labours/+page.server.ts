import { db } from '$lib/server/db';
import { labours } from '$lib/server/db/schema';
import { desc, count, or, like, eq } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { requirePermission } from '$lib/server/rbac';
import { v4 as uuidv4 } from 'uuid';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ url, locals }) => {
    requirePermission(locals, 'labours.portal'); // Restricted to portal permission
    const query = url.searchParams.get('q') || '';
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('limit')) || 20));
    const offset = (page - 1) * pageSize;

    const whereClause = query ? or(
        like(labours.name, `%${query}%`),
        like(labours.codeNo, `%${query}%`),
        like(labours.designation, `%${query}%`),
        like(labours.contractorName, `%${query}%`)
    ) : undefined;

    // Count Query
    const [totalCountResult] = await db
        .select({ count: count() })
        .from(labours)
        .where(whereClause);
    
    const totalCount = totalCountResult?.count || 0;
    const totalPages = Math.ceil(totalCount / pageSize);

    // Data Query
    const allLabours = await db
        .select()
        .from(labours)
        .where(whereClause)
        .orderBy(desc(labours.createdAt))
        .limit(pageSize)
        .offset(offset);

    return { 
        labours: allLabours, 
        query,
        currentPage: page,
        totalPages,
        pageSize
    };
};

export const actions: Actions = {
    create: async ({ request, locals }) => {
        requirePermission(locals, 'labours.create');
        const data = await request.formData();
        const name = data.get('name') as string;
        const codeNo = data.get('codeNo') as string;
        const type = data.get('type') as 'company' | 'contractor';
        const designation = data.get('designation') as string;
        const contractorName = data.get('contractorName') as string;
        const joinDateStr = data.get('joinDate') as string;
        const isTrained = data.has('isTrained');

        if (!name || !codeNo || !type) {
            return fail(400, { message: 'Missing required fields' });
        }

        try {
            await db.insert(labours).values({
                id: uuidv4(),
                name,
                codeNo,
                type,
                designation,
                contractorName: type === 'contractor' ? contractorName : null,
                joinDate: joinDateStr ? new Date(joinDateStr) : null,
                isTrained,
            });
            return { success: true };
        } catch (error: any) {
            if (error.message?.includes('UNIQUE constraint failed')) {
                return fail(400, { message: 'Code Number already exists' });
            }
            return fail(500, { message: 'Database error' });
        }
    },
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
    },
    delete: async ({ request, locals }) => {
        requirePermission(locals, 'labours.delete');
        const data = await request.formData();
        const id = data.get('id') as string;

        if (!id) return fail(400, { message: 'Missing ID' });

        try {
            await db.delete(labours).where(eq(labours.id, id));
            return { success: true };
        } catch (error: any) {
            if (error.message?.includes('FOREIGN KEY constraint failed')) {
                return fail(400, { message: 'Cannot delete labour with existing logs' });
            }
            return fail(500, { message: 'Database error' });
        }
    }
};
