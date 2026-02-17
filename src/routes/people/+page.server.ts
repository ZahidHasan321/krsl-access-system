import { db } from '$lib/server/db';
import { people, personCategories, attendanceLogs } from '$lib/server/db/schema';
import { eq, and, desc, sql, or, like, inArray } from 'drizzle-orm';
import { format } from 'date-fns';
import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { requirePermission } from '$lib/server/rbac';
import { notifyChange } from '$lib/server/events';
import { queueDeviceSync, queueDeviceDelete } from '$lib/server/device-sync';
import { writeFileSync, existsSync, mkdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import sharp from 'sharp';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

async function savePhoto(photo: FormDataEntryValue | null): Promise<string | null> {
    if (!photo || !(photo instanceof File) || photo.size === 0) return null;

    if (photo.size > MAX_FILE_SIZE) {
        throw new Error('File size exceeds 5MB limit');
    }

    const fileName = `${crypto.randomUUID()}.webp`;
    const uploadDir = join(process.cwd(), 'static', 'uploads', 'people');
    const filePath = join(uploadDir, fileName);

    if (!existsSync(uploadDir)) {
        mkdirSync(uploadDir, { recursive: true });
    }

    try {
        const buffer = Buffer.from(await photo.arrayBuffer());
        
        // Use sharp to validate and re-encode image
        // This also strips EXIF/malicious metadata
        const processedImage = sharp(buffer);
        const metadata = await processedImage.metadata();

        if (!metadata.format || !ALLOWED_MIME_TYPES.includes(`image/${metadata.format}`)) {
            throw new Error('Invalid file type. Only JPEG, PNG and WebP are allowed.');
        }

        await processedImage
            .webp({ quality: 80 })
            .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
            .toFile(filePath);

        return `/uploads/people/${fileName}`;
    } catch (e: any) {
        console.error('Photo processing error:', e);
        throw new Error(e.message || 'Failed to process photo');
    }
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
    const trained = event.url.searchParams.get('trained') || '';
    const page = parseInt(event.url.searchParams.get('page') || '1');
    const limit = Math.min(100, Math.max(1, parseInt(event.url.searchParams.get('limit') || '20')));
    const offset = (page - 1) * limit;

    const whereClauses = [];
    if (query) {
        whereClauses.push(or(
            like(people.name, `%${query}%`),
            like(people.codeNo, `%${query}%`),
            like(people.company, `%${query}%`),
            like(people.contactNo, `%${query}%`)
        ));
    }
    if (categoryId) {
        const descendantIds = getDescendantIds(categoryId);
        whereClauses.push(inArray(people.categoryId, descendantIds));
    }
    if (trained === 'yes') {
        whereClauses.push(eq(people.isTrained, true));
    } else if (trained === 'no') {
        whereClauses.push(eq(people.isTrained, false));
    }
    const where = whereClauses.length > 0 ? and(...whereClauses) : undefined;

    const [totalCountResult] = await db
        .select({ value: sql<number>`count(*)` })
        .from(people)
        .innerJoin(personCategories, eq(people.categoryId, personCategories.id))
        .where(where);

    const totalCount = totalCountResult.value;
    const totalPages = Math.ceil(totalCount / limit);
    const validatedPage = Math.max(1, Math.min(page, totalPages || 1));
    const validatedOffset = (validatedPage - 1) * limit;

    const list = await db
        .select({
            id: people.id,
            name: people.name,
            codeNo: people.codeNo,
            company: people.company,
            contactNo: people.contactNo,
            designation: people.designation,
            biometricId: people.biometricId,
            notes: people.notes,
            isTrained: people.isTrained,
            enrolledMethods: people.enrolledMethods,
            categoryId: people.categoryId,
            createdAt: people.createdAt,
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
        .offset(validatedOffset)
        .orderBy(desc(people.createdAt));

    const [summaryStats] = await db
        .select({
            total: sql<number>`count(*)`,
            trained: sql<number>`sum(case when ${people.isTrained} = true then 1 else 0 end)`,
            inside: sql<number>`count(distinct case when attendance_logs.status = 'on_premises' then people.id else null end)`
        })
        .from(people)
        .leftJoin(attendanceLogs, and(
            eq(people.id, attendanceLogs.personId),
            eq(attendanceLogs.status, 'on_premises')
        ))
        .where(where);

    return {
        people: list,
        summary: {
            total: summaryStats.total || 0,
            trained: summaryStats.trained || 0,
            untrained: (summaryStats.total || 0) - (summaryStats.trained || 0),
            inside: summaryStats.inside || 0
        },
        filters: {
            query,
            categoryId,
            trained
        },
        pagination: {
            page: validatedPage,
            limit,
            totalCount,
            totalPages
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

            // Auto-generate biometricId atomically
            const nextBiometricId = await db.transaction(async (tx) => {
                const [maxResult] = await tx
                    .select({ maxId: sql<number>`COALESCE(MAX(CAST(biometric_id AS INTEGER)), 0)` })
                    .from(people);
                const nextId = String((maxResult.maxId || 0) + 1);

                await tx.insert(people).values({
                    id,
                    name,
                    categoryId,
                    codeNo,
                    biometricId: nextId,
                    company,
                    contactNo,
                    designation,
                    isTrained,
                    notes,
                    photoUrl,
                    createdAt: new Date()
                });

                return nextId;
            });

            // No device sync during registration — user is synced to device
            // after enrollment succeeds (devicecmd handler) or when enrollment is skipped.

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
            return { success: true, personId: id, biometricId: nextBiometricId, personName: name };
        } catch (e: any) {
            if (e.message?.includes('duplicate key value violates unique constraint')) {
                return fail(400, { message: 'Code Number already exists' });
            }
            if (e.message?.includes('File size exceeds') || e.message?.includes('Invalid file type')) {
                return fail(400, { message: e.message });
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
                // Get old photo URL to delete it
                const [oldPerson] = await db.select({ photoUrl: people.photoUrl }).from(people).where(eq(people.id, id));
                if (oldPerson?.photoUrl) {
                    const oldPhotoPath = join(process.cwd(), 'static', oldPerson.photoUrl);
                    try {
                        if (existsSync(oldPhotoPath)) {
                            unlinkSync(oldPhotoPath);
                        }
                    } catch (err) {
                        console.error('Failed to delete old photo file:', err);
                    }
                }
                updates.photoUrl = photoUrl;
            }

            await db.update(people)
                .set(updates)
                .where(eq(people.id, id));

            // Auto-sync to device if person has biometricId
            const [person] = await db.select().from(people).where(eq(people.id, id));
            if (person?.biometricId) {
                const cardNo = person.cardNo;
                await queueDeviceSync(person.biometricId, name, cardNo);
            }

            notifyChange();
            return { success: true };
        } catch (e: any) {
            if (e.message?.includes('duplicate key value violates unique constraint')) {
                return fail(400, { message: 'Code Number already exists' });
            }
            if (e.message?.includes('File size exceeds') || e.message?.includes('Invalid file type')) {
                return fail(400, { message: e.message });
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
            // Look up person to get biometricId and photoUrl before deletion
            const [person] = await db.select().from(people).where(eq(people.id, id));

            if (person?.photoUrl) {
                const photoPath = join(process.cwd(), 'static', person.photoUrl);
                try {
                    if (existsSync(photoPath)) {
                        unlinkSync(photoPath);
                    }
                } catch (err) {
                    console.error('Failed to delete photo file:', err);
                }
            }

            if (person?.biometricId) {
                await queueDeviceDelete(person.biometricId);
            }

            await db.delete(people).where(eq(people.id, id));
            notifyChange();
            return { success: true };
        } catch (e) {
            return fail(500, { message: 'Failed to delete person' });
        }
    }
};
