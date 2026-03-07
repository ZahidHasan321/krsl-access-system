import { db } from '$lib/server/db';
import { departments, designations, people } from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { requirePermission } from '$lib/server/rbac';
import { notifyChange } from '$lib/server/events';

export const load: PageServerLoad = async (event) => {
	requirePermission(event.locals, 'users.manage');

	// Sync missing departments from people table
	const peopleDepts = await db
		.selectDistinct({ name: people.department })
		.from(people)
		.where(sql`${people.department} IS NOT NULL`);

	for (const d of peopleDepts) {
		if (d.name) {
			await db.insert(departments).values({ name: d.name }).onConflictDoNothing();
		}
	}

	// Sync missing designations from people table
	const peopleDesigs = await db
		.selectDistinct({ name: people.designation })
		.from(people)
		.where(sql`${people.designation} IS NOT NULL`);

	for (const d of peopleDesigs) {
		if (d.name) {
			await db.insert(designations).values({ name: d.name }).onConflictDoNothing();
		}
	}

	const [allDepartments, allDesignations] = await Promise.all([
		db.select().from(departments).orderBy(departments.name),
		db.select().from(designations).orderBy(designations.name)
	]);

	return {
		departments: allDepartments,
		designations: allDesignations
	};
};

export const actions: Actions = {
	updateDepartment: async (event) => {
		requirePermission(event.locals, 'users.manage');
		const data = await event.request.formData();
		const id = parseInt(data.get('id') as string);
		const newName = (data.get('name') as string)?.trim();

		if (!id || !newName) return fail(400, { message: 'ID and Name required' });

		try {
			const [oldDept] = await db.select().from(departments).where(eq(departments.id, id));
			if (!oldDept) return fail(404, { message: 'Department not found' });

			await db.transaction(async (tx) => {
				// 1. Update the master table
				await tx.update(departments).set({ name: newName }).where(eq(departments.id, id));
				// 2. Update all people using this department
				await tx.update(people).set({ department: newName }).where(eq(people.department, oldDept.name));
			});

			notifyChange();
			return { success: true };
		} catch (e: any) {
			if (e.message?.includes('unique constraint')) {
				return fail(400, { message: 'Department name already exists' });
			}
			return fail(500, { message: 'Failed to update department' });
		}
	},

	deleteDepartment: async (event) => {
		requirePermission(event.locals, 'users.manage');
		const data = await event.request.formData();
		const id = parseInt(data.get('id') as string);

		if (!id) return fail(400, { message: 'ID required' });

		try {
			const [dept] = await db.select().from(departments).where(eq(departments.id, id));
			if (!dept) return fail(404, { message: 'Department not found' });

			await db.transaction(async (tx) => {
				// 1. Set department to null for all people using this department
				await tx.update(people).set({ department: null }).where(eq(people.department, dept.name));
				// 2. Delete from master table
				await tx.delete(departments).where(eq(departments.id, id));
			});

			notifyChange();
			return { success: true };
		} catch (e) {
			return fail(500, { message: 'Failed to delete department' });
		}
	},

	updateDesignation: async (event) => {
		requirePermission(event.locals, 'users.manage');
		const data = await event.request.formData();
		const id = parseInt(data.get('id') as string);
		const newName = (data.get('name') as string)?.trim();

		if (!id || !newName) return fail(400, { message: 'ID and Name required' });

		try {
			const [oldDesig] = await db.select().from(designations).where(eq(designations.id, id));
			if (!oldDesig) return fail(404, { message: 'Designation not found' });

			await db.transaction(async (tx) => {
				await tx.update(designations).set({ name: newName }).where(eq(designations.id, id));
				await tx.update(people).set({ designation: newName }).where(eq(people.designation, oldDesig.name));
			});

			notifyChange();
			return { success: true };
		} catch (e: any) {
			if (e.message?.includes('unique constraint')) {
				return fail(400, { message: 'Designation name already exists' });
			}
			return fail(500, { message: 'Failed to update designation' });
		}
	},

	deleteDesignation: async (event) => {
		requirePermission(event.locals, 'users.manage');
		const data = await event.request.formData();
		const id = parseInt(data.get('id') as string);

		if (!id) return fail(400, { message: 'ID required' });

		try {
			const [desig] = await db.select().from(designations).where(eq(designations.id, id));
			if (!desig) return fail(404, { message: 'Designation not found' });

			await db.transaction(async (tx) => {
				await tx.update(people).set({ designation: null }).where(eq(people.designation, desig.name));
				await tx.delete(designations).where(eq(designations.id, id));
			});

			notifyChange();
			return { success: true };
		} catch (e) {
			return fail(500, { message: 'Failed to delete designation' });
		}
	}
};
