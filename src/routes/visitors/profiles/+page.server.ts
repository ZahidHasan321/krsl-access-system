import { db } from '$lib/server/db';
import { visitorProfiles, visitorLogs } from '$lib/server/db/schema';
import { desc, eq, and, or, like, count } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import { fail, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { requirePermission } from '$lib/server/rbac';

export const load: PageServerLoad = async ({ url, locals }) => {
    requirePermission(locals, 'visitors.view');
    const query = url.searchParams.get('q') || '';
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('limit')) || 20));
    const offset = (page - 1) * pageSize;

    const whereClause = query ? or(
        like(visitorProfiles.name, `%${query}%`),
        like(visitorProfiles.company, `%${query}%`),
        like(visitorProfiles.contactNo, `%${query}%`)
    ) : undefined;

    // Count Query
    const [totalCountResult] = await db
        .select({ count: count() })
        .from(visitorProfiles)
        .where(whereClause);
    
    const totalCount = totalCountResult?.count || 0;
    const totalPages = Math.ceil(totalCount / pageSize);

    // Data Query
    const allProfiles = await db
        .select()
        .from(visitorProfiles)
        .where(whereClause)
        .orderBy(desc(visitorProfiles.createdAt))
        .limit(pageSize)
        .offset(offset);

    return { 
        profiles: allProfiles,
        query,
        currentPage: page,
        totalPages,
        pageSize
    };
};

export const actions: Actions = {
    create: async ({ request, locals }) => {
        requirePermission(locals, 'visitors.create');
        const data = await request.formData();
        const name = data.get('name') as string;
        const company = data.get('company') as string;
        const contactNo = data.get('contactNo') as string;
        const visitorType = data.get('visitorType') as 'vendor' | 'guest';
        const shouldCheckIn = data.get('checkIn') === 'on';

        if (!name || !visitorType) {
            return fail(400, { message: 'Missing required fields' });
        }

        try {
            const visitorId = uuidv4();
            await db.insert(visitorProfiles).values({
                id: visitorId,
                name,
                company,
                contactNo,
                visitorType
            });

            if (shouldCheckIn) {
                const now = new Date();
                const today = format(now, 'yyyy-MM-dd');
                await db.insert(visitorLogs).values({
                    id: uuidv4(),
                    visitorId,
                    entryTime: now,
                    status: 'on_premises',
                    date: today,
                    purpose: 'Initial Visit' // Default purpose
                });
            }

            return { success: true };
        } catch (error: any) {
            if (error.message?.includes('UNIQUE constraint failed')) {
                return fail(400, { message: 'Contact Number already exists' });
            }
            return fail(500, { message: 'Database error' });
        }
    },
    update: async ({ request, locals }) => {
        requirePermission(locals, 'visitors.create');
        const data = await request.formData();
        const id = data.get('id') as string;
        const name = data.get('name') as string;
        const company = data.get('company') as string;
        const contactNo = data.get('contactNo') as string;
        const visitorType = data.get('visitorType') as 'vendor' | 'guest';

        if (!id || !name || !visitorType) {
            return fail(400, { message: 'Missing required fields' });
        }

        try {
            await db.update(visitorProfiles).set({
                name,
                company,
                contactNo,
                visitorType
            }).where(eq(visitorProfiles.id, id));
            return { success: true };
        } catch (error: any) {
            return fail(500, { message: 'Database error' });
        }
    },
    delete: async ({ request, locals }) => {
        requirePermission(locals, 'visitors.create');
        const data = await request.formData();
        const id = data.get('id') as string;

        if (!id) return fail(400, { message: 'Missing ID' });

        try {
            await db.delete(visitorProfiles).where(eq(visitorProfiles.id, id));
            return { success: true };
        } catch (error: any) {
            if (error.message?.includes('FOREIGN KEY constraint failed')) {
                return fail(400, { message: 'Cannot delete visitor with existing logs' });
            }
            return fail(500, { message: 'Database error' });
        }
    }
};