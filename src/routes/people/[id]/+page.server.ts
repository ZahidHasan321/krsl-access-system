import { db } from '$lib/server/db';
import { people, personCategories, attendanceLogs } from '$lib/server/db/schema';
import { eq, and, desc, sql, count } from 'drizzle-orm';
import { error, fail } from '@sveltejs/kit';
import { requirePermission } from '$lib/server/rbac';
import { notifyChange } from '$lib/server/events';
import { queueDeviceSync, queueDeviceDelete } from '$lib/server/device-sync';
import type { PageServerLoad, Actions } from './$types';
import { writeFileSync, mkdirSync, existsSync, unlinkSync } from 'fs';
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

    if (!existsSync(uploadDir)) {
        mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = join(uploadDir, fileName);

    try {
        const buffer = Buffer.from(await photo.arrayBuffer());
        
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

export const load: PageServerLoad = async (event) => {
    requirePermission(event.locals, 'people.view');
    const { id } = event.params;

    const person = await db
        .select({
            id: people.id,
            name: people.name,
            codeNo: people.codeNo,
            cardNo: people.cardNo,
            biometricId: people.biometricId,
            enrolledMethods: people.enrolledMethods,
            photoUrl: people.photoUrl,
            company: people.company,
            contactNo: people.contactNo,
            designation: people.designation,
            isTrained: people.isTrained,
            joinDate: people.joinDate,
            notes: people.notes,
            createdAt: people.createdAt,
            category: {
                id: personCategories.id,
                name: personCategories.name,
                slug: personCategories.slug
            }
        })
        .from(people)
        .innerJoin(personCategories, eq(people.categoryId, personCategories.id))
        .where(eq(people.id, id))
        .get();

    if (!person) {
        error(404, 'Person not found');
    }

    const recentLogs = await db
        .select()
        .from(attendanceLogs)
        .where(eq(attendanceLogs.personId, id))
        .orderBy(desc(sql`COALESCE(${attendanceLogs.exitTime}, ${attendanceLogs.entryTime})`))
        .limit(20);

    const [stats] = await db
        .select({
            totalVisits: count(),
            avgDuration: sql<number>`AVG(CASE WHEN ${attendanceLogs.exitTime} IS NOT NULL THEN (${attendanceLogs.exitTime} - ${attendanceLogs.entryTime}) ELSE NULL END)`
        })
        .from(attendanceLogs)
        .where(eq(attendanceLogs.personId, id));

    const isInside = await db.query.attendanceLogs.findFirst({
        where: and(
            eq(attendanceLogs.personId, id),
            eq(attendanceLogs.status, 'on_premises')
        )
    });

    const allCategories = await db.select().from(personCategories);

    const allCategoriesFlat: any[] = [];

    function traverse(parentId: string | null, level = 0) {
        const children = allCategories.filter(c => c.parentId === parentId);
        children.forEach(child => {
            allCategoriesFlat.push({ ...child, level });
            traverse(child.id, level + 1);
        });
    }
    traverse(null);

    return {
        person,
        recentLogs,
        stats,
        isInside: !!isInside,
        activeLog: isInside,
        allCategoriesFlat
    };
};

export const actions: Actions = {
    update: async (event) => {
        requirePermission(event.locals, 'people.edit');
        const { id } = event.params;
        const data = await event.request.formData();

        const name = data.get('name') as string;
        const categoryId = data.get('categoryId') as string;
        const photo = data.get('photo') as File | null;

        if (!name) return fail(400, { message: 'Name required' });

        const updates: Record<string, any> = {
            name,
            codeNo: data.get('codeNo') as string || null,
            company: data.get('company') as string || null,
            contactNo: data.get('contactNo') as string || null,
            designation: data.get('designation') as string || null,
            isTrained: data.get('isTrained') === 'true',
            notes: data.get('notes') as string || null
        };

        if (categoryId) {
            updates.categoryId = categoryId;
        }

        try {
            const photoUrl = await savePhoto(photo);
            if (photoUrl) {
                // Get old photo URL to delete it
                const oldPerson = db.select({ photoUrl: people.photoUrl }).from(people).where(eq(people.id, id)).get();
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
            const person = db.select().from(people).where(eq(people.id, id)).get();
            if (person?.biometricId) {
                queueDeviceSync(person.biometricId, name, person.cardNo);
            }

            notifyChange();
            return { success: true };
        } catch (e: any) {
            if (e.message?.includes('UNIQUE constraint failed: people.code_no')) {
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
        const { id } = event.params;

        try {
            // Look up person to get biometricId and photoUrl before deleting
            const person = db.select().from(people).where(eq(people.id, id)).get();

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

            await db.delete(people).where(eq(people.id, id));

            // Remove user from all ZK devices so the PIN is fully cleared
            if (person?.biometricId) {
                queueDeviceDelete(person.biometricId);
            }

            notifyChange();
            return { success: true };
        } catch (e) {
            return fail(500, { message: 'Cannot delete person with attendance history' });
        }
    }
};
