import { db } from '$lib/server/db';
import { roles, permissions, rolePermissions } from '$lib/server/db/schema';
import { error, fail } from '@sveltejs/kit';
import { eq, and } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { requirePermission } from '$lib/server/rbac';
import { ROLES } from '$lib/constants/roles';

export const load: PageServerLoad = async (event) => {
	requirePermission(event.locals, 'users.manage');
	const allRoles = await db.select().from(roles);
	const allPermissions = await db.select().from(permissions);
	const allRolePermissions = await db.select().from(rolePermissions);

	// Map role permissions to each role
	const rolesWithPermissions = allRoles.map((role) => ({
		...role,
		permissions: allRolePermissions
			.filter((rp) => rp.roleId === role.id)
			.map((rp) => rp.permissionId)
	}));

	return {
		roles: rolesWithPermissions,
		allPermissions
	};
};

export const actions: Actions = {
	createRole: async ({ request }) => {
		const formData = await request.formData();
		const id = formData.get('id') as string;
		const name = formData.get('name') as string;
		const description = formData.get('description') as string;

		if (!id || !name) {
			return fail(400, { message: 'ID and Name are required' });
		}

		try {
			await db.insert(roles).values({ id, name, description });
		} catch (e: any) {
			return fail(500, { message: e.message || 'Failed to create role' });
		}
	},

	updatePermissions: async ({ request }) => {
		const formData = await request.formData();
		const roleId = formData.get('roleId') as string;
		const permissionIds = formData.getAll('permissions') as string[];

		if (!roleId) {
			return fail(400, { message: 'Role ID is required' });
		}

		try {
			await db.transaction(async (tx) => {
				let finalPermissionIds = [...permissionIds];

				// For administrator role, most permissions are protected/hardcoded
				// except for those specifically designed to be togglable (like checkin.view_details)
				if (roleId === ROLES.ADMIN) {
					const allPerms = await tx.select({ id: permissions.id }).from(permissions);
					const protectedPerms = allPerms
						.map((p) => p.id)
						.filter((id) => id !== 'checkin.view_details');

					// Combine protected perms with any optional perms (like checkin.view_details) selected in the form
					const optionalPerms = permissionIds.filter((id) => id === 'checkin.view_details');
					finalPermissionIds = [...new Set([...protectedPerms, ...optionalPerms])];
				}

				// Remove existing permissions
				await tx.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));

				// Add new permissions
				if (finalPermissionIds.length > 0) {
					await tx.insert(rolePermissions).values(
						finalPermissionIds.map((pId) => ({
							roleId,
							permissionId: pId
						}))
					);
				}
			});
		} catch (e: any) {
			return fail(500, { message: e.message || 'Failed to update permissions' });
		}
	},

	deleteRole: async ({ request }) => {
		const formData = await request.formData();
		const id = formData.get('id') as string;

		if (!id) return fail(400, { message: 'ID is required' });
		if (id === ROLES.ADMIN) return fail(400, { message: 'Cannot delete admin role' });

		try {
			await db.delete(roles).where(eq(roles.id, id));
		} catch (e: any) {
			return fail(500, { message: e.message || 'Failed to delete role' });
		}
	}
};
