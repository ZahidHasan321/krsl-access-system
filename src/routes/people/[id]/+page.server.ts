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

async function savePhoto(photo: FormDataEntryValue | null): Promise<{ photoUrl: string; thumbUrl: string } | null> {
	if (!photo || !(photo instanceof File) || photo.size === 0) return null;

	if (photo.size > MAX_FILE_SIZE) {
		throw new Error('File size exceeds 5MB limit');
	}

	const uuid = crypto.randomUUID();
	const fileName = `${uuid}.webp`;
	const thumbName = `${uuid}_thumb.webp`;
	const uploadDir = join(process.cwd(), 'static', 'uploads', 'people');

	if (!existsSync(uploadDir)) {
		mkdirSync(uploadDir, { recursive: true });
	}

	const filePath = join(uploadDir, fileName);
	const thumbPath = join(uploadDir, thumbName);

	try {
		const buffer = Buffer.from(await photo.arrayBuffer());

		const processedImage = sharp(buffer);
		const metadata = await processedImage.metadata();

		if (!metadata.format || !ALLOWED_MIME_TYPES.includes(`image/${metadata.format}`)) {
			throw new Error('Invalid file type. Only JPEG, PNG and WebP are allowed.');
		}

		// Save full size
		await processedImage
			.webp({ quality: 80 })
			.resize(800, 800, { fit: 'inside', withoutEnlargement: true })
			.toFile(filePath);

		// Save thumbnail
		await sharp(buffer)
			.webp({ quality: 75 })
			.resize(80, 80, { fit: 'cover' })
			.toFile(thumbPath);

		return {
			photoUrl: `/uploads/people/${fileName}`,
			thumbUrl: `/uploads/people/${thumbName}`
		};
	} catch (e: any) {
		console.error('Photo processing error:', e);
		throw new Error(e.message || 'Failed to process photo');
	}
}

export const load: PageServerLoad = async (event) => {
	requirePermission(event.locals, 'people.view');
	const { id } = event.params;

	const [person] = await db
		.select({
			id: people.id,
			name: people.name,
			codeNo: people.codeNo,
			cardNo: people.cardNo,
			biometricId: people.biometricId,
			enrolledMethods: people.enrolledMethods,
			photoUrl: people.photoUrl,
			thumbUrl: people.thumbUrl,
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
		.where(eq(people.id, id));

	if (!person) {
		error(404, 'Person not found');
	}

	const recentLogs = await db
		.select()
		.from(attendanceLogs)
		.where(eq(attendanceLogs.personId, id))
		.orderBy(desc(sql`COALESCE(${attendanceLogs.exitTime}, ${attendanceLogs.entryTime})`))
		.limit(20);

	const [statsResult] = await db
		.select({
			totalVisits: count(),
			totalSeconds: sql<string>`COALESCE(SUM(
                CASE 
                    WHEN ${attendanceLogs.exitTime} IS NOT NULL 
                    THEN EXTRACT(EPOCH FROM (${attendanceLogs.exitTime} - ${attendanceLogs.entryTime}))
                    ELSE EXTRACT(EPOCH FROM (NOW() - ${attendanceLogs.entryTime}))
                END
            ), 0)`
		})
		.from(attendanceLogs)
		.where(eq(attendanceLogs.personId, id));

	const stats = {
		totalVisits: statsResult.totalVisits,
		totalDuration: Math.floor(parseFloat(statsResult.totalSeconds))
	};

	const isInside = await db.query.attendanceLogs.findFirst({
		where: and(eq(attendanceLogs.personId, id), eq(attendanceLogs.status, 'on_premises'))
	});

	const allCategories = await db.select().from(personCategories);

	const allCategoriesFlat: any[] = [];
	const catMap = new Map(allCategories.map((c) => [c.id, c]));

	function getRootSlug(catId: string): string {
		let current: any = catMap.get(catId);
		while (current?.parentId) {
			current = catMap.get(current.parentId);
		}
		return current?.slug || '';
	}

	function traverse(parentId: string | null, level = 0) {
		const children = allCategories.filter((c) => c.parentId === parentId);
		children.forEach((child) => {
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
		allCategoriesFlat,
		rootCategorySlug: getRootSlug(person.category.id)
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
		const cardNo = (data.get('cardNo') as string) || null;

		if (!name) return fail(400, { message: 'Name required' });

		const updates: Record<string, any> = {
			name,
			codeNo: (data.get('codeNo') as string) || null,
			cardNo,
			company: (data.get('company') as string) || null,
			contactNo: (data.get('contactNo') as string) || null,
			designation: (data.get('designation') as string) || null,
			isTrained: data.get('isTrained') === 'true',
			notes: (data.get('notes') as string) || null
		};

		if (categoryId) {
			updates.categoryId = categoryId;
		}

		try {
			const photoResult = await savePhoto(photo);
			if (photoResult) {
				// Get old photo URL to delete it
				const [oldPerson] = await db
					.select({ 
						photoUrl: people.photoUrl,
						thumbUrl: people.thumbUrl
					})
					.from(people)
					.where(eq(people.id, id));
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
				if (oldPerson?.thumbUrl) {
					const oldThumbPath = join(process.cwd(), 'static', oldPerson.thumbUrl);
					try {
						if (existsSync(oldThumbPath)) {
							unlinkSync(oldThumbPath);
						}
					} catch (err) {
						console.error('Failed to delete old thumbnail file:', err);
					}
				}
				updates.photoUrl = photoResult.photoUrl;
				updates.thumbUrl = photoResult.thumbUrl;
			}

			// If cardNo is provided, ensure 'card' is in enrolledMethods
			const [existing] = await db.select().from(people).where(eq(people.id, id));
			if (cardNo && existing) {
				let methods: string[] = [];
				try {
					methods = existing.enrolledMethods ? JSON.parse(existing.enrolledMethods) : [];
				} catch {
					methods = [];
				}
				if (!methods.includes('card')) {
					methods.push('card');
					updates.enrolledMethods = JSON.stringify(methods);
				}
			}

			await db.update(people).set(updates).where(eq(people.id, id));

			// Auto-sync to device if person has biometricId
			const [person] = await db.select().from(people).where(eq(people.id, id));
			if (person?.biometricId) {
				await queueDeviceSync(person.biometricId, name, person.cardNo);
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
		const { id } = event.params;

		try {
			// Look up person to get biometricId and photoUrl before deleting
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

			if (person?.thumbUrl) {
				const thumbPath = join(process.cwd(), 'static', person.thumbUrl);
				try {
					if (existsSync(thumbPath)) {
						unlinkSync(thumbPath);
					}
				} catch (err) {
					console.error('Failed to delete thumbnail file:', err);
				}
			}

			await db.delete(people).where(eq(people.id, id));

			// Remove user from all ZK devices so the PIN is fully cleared
			if (person?.biometricId) {
				await queueDeviceDelete(person.biometricId);
			}

			notifyChange();
			return { success: true };
		} catch (e) {
			return fail(500, { message: 'Cannot delete person with attendance history' });
		}
	}
};
