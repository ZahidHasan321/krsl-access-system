import { db } from '$lib/server/db';
import { people, personCategories, attendanceLogs } from '$lib/server/db/schema';
import { eq, and, desc, sql, or, like, inArray } from 'drizzle-orm';
import { format } from 'date-fns';
import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { requirePermission } from '$lib/server/rbac';
import { notifyChange } from '$lib/server/events';
import { writeFileSync } from 'fs';
import { join } from 'path';

async function savePhoto(photo: FormDataEntryValue | null): Promise<string | null> {
    if (!photo || !(photo instanceof File) || photo.size === 0) return null;
    
    const ext = photo.name.split('.').pop() || 'jpg';
    const fileName = `${crypto.randomUUID()}.${ext}`;
    const filePath = join(process.cwd(), 'static', 'uploads', 'people', fileName);
    
    const buffer = Buffer.from(await photo.arrayBuffer());
    writeFileSync(filePath, buffer);
    
    return `/uploads/people/${fileName}`;
}

import { CATEGORIES } from '$lib/constants/categories';

function getDescendantIds(categoryId: string): string[] {
    const ids: string[] = [categoryId];
    const queue = [categoryId];
    while (queue.length > 0) {
        const parentId = queue.shift()!;
        for (const cat of CATEGORIES) {
            if (cat.parentId === parentId) {
                ids.push(cat.id);
                queue.push(cat.id);
            }
        }
    }
    return ids;
}

export const load: PageServerLoad = async (event) => {
    requirePermission(event.locals, 'people.view');

    const query = event.url.searchParams.get('q') || '';
    const categoryId = event.url.searchParams.get('category') || '';
    const page = parseInt(event.url.searchParams.get('page') || '1');
    const limit = 20;
    const offset = (page - 1) * limit;

    const whereClauses = [];
    if (query) {
        whereClauses.push(or(
            like(people.name, `%${query}%`),
            like(people.codeNo, `%${query}%`),
            like(people.company, `%${query}%`)
        ));
    }
    if (categoryId) {
        // Find all descendant category IDs so filtering by root includes subcategories
        const descendantIds = getDescendantIds(categoryId);
        whereClauses.push(inArray(people.categoryId, descendantIds));
    }

    const where = whereClauses.length > 0 ? and(...whereClauses) : undefined;

    const list = await db
        .select({
            id: people.id,
            name: people.name,
            codeNo: people.codeNo,
            company: people.company,
            contactNo: people.contactNo,
            designation: people.designation,
            notes: people.notes,
            isTrained: people.isTrained,
            categoryId: people.categoryId,
            category: {
                name: personCategories.name,
                slug: personCategories.slug
            },
            status: sql<string>`(SELECT status FROM attendance_logs WHERE person_id = ${people.id} AND status = 'on_premises' LIMIT 1)`
        })
        .from(people)
        .innerJoin(personCategories, eq(people.categoryId, personCategories.id))
        .where(where)
        .limit(limit)
        .offset(offset)
        .orderBy(desc(people.createdAt));

    const [totalCount] = await db
        .select({ value: sql<number>`count(*)` })
        .from(people)
        .where(where);

    return {
        people: list,
        totalCount: totalCount.value,
        pagination: {
            page,
            limit,
            totalPages: Math.ceil(totalCount.value / limit)
        }
    };
};

export const actions: Actions = {
    create: async (event) => {
        requirePermission(event.locals, 'people.create');
        const data = await event.request.formData();
        
        const name = data.get('name') as string;
        const categoryId = data.get('categoryId') as string;
        const codeNo = data.get('codeNo') as string || null;
        const cardNo = data.get('cardNo') as string || null;
        const company = data.get('company') as string || null;
        const contactNo = data.get('contactNo') as string || null;
        const designation = data.get('designation') as string || null;
        const isTrained = data.get('isTrained') === 'true';
        const notes = data.get('notes') as string || null;
        const photo = data.get('photo') as File | null;
        const purpose = data.get('purpose') as string || null;

        if (!name || !categoryId) {
            return fail(400, { message: 'Name and Category are required' });
        }

        try {
            const photoUrl = await savePhoto(photo);
            const id = crypto.randomUUID();
            await db.insert(people).values({
                id,
                name,
                categoryId,
                codeNo,
                cardNo,
                company,
                contactNo,
                designation,
                isTrained,
                notes,
                photoUrl,
                createdAt: new Date()
            });

            // Optional: Auto check-in if requested
            if (data.get('autoCheckIn') === 'true') {
                const now = new Date();
                await db.insert(attendanceLogs).values({
                    id: crypto.randomUUID(),
                    personId: id,
                    entryTime: now,
                    status: 'on_premises',
                    purpose,
                    date: format(now, 'yyyy-MM-dd')
                });
            }

            notifyChange();
            return { success: true };
        } catch (e: any) {
            if (e.message?.includes('UNIQUE constraint failed: people.code_no')) {
                return fail(400, { message: 'Code Number already exists' });
            }
            return fail(500, { message: 'Failed to create person' });
        }
    },

    update: async (event) => {
        requirePermission(event.locals, 'people.edit');
        const data = await event.request.formData();
        const id = data.get('id') as string;
        const name = data.get('name') as string;
        const categoryId = data.get('categoryId') as string;

        const designation = data.get('designation') as string || null;
        const isTrained = data.get('isTrained') === 'true';
        const notes = data.get('notes') as string || null;
        const photo = data.get('photo') as File | null;

        if (!id || !name) return fail(400, { message: 'ID and Name required' });

        const updates: Record<string, any> = {
            name,
            codeNo: data.get('codeNo') as string || null,
            company: data.get('company') as string || null,
            contactNo: data.get('contactNo') as string || null,
            designation,
            isTrained,
            notes
        };

        if (categoryId) {
            updates.categoryId = categoryId;
        }

        try {
            const photoUrl = await savePhoto(photo);
            if (photoUrl) {
                updates.photoUrl = photoUrl;
            }

            await db.update(people)
                .set(updates)
                .where(eq(people.id, id));

            notifyChange();
            return { success: true };
        } catch (e: any) {
            if (e.message?.includes('UNIQUE constraint failed: people.code_no')) {
                return fail(400, { message: 'Code Number already exists' });
            }
            return fail(500, { message: 'Failed to update person' });
        }
    },

    delete: async (event) => {
        requirePermission(event.locals, 'people.delete');
        const data = await event.request.formData();
        const id = data.get('id') as string;

        if (!id) return fail(400, { message: 'ID required' });

        try {
            await db.delete(people).where(eq(people.id, id));
            notifyChange();
            return { success: true };
        } catch (e) {
            return fail(500, { message: 'Cannot delete person with attendance history' });
        }
    }
};