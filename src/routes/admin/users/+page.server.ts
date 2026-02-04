import { db } from '$lib/server/db';
import { user, roles } from '$lib/server/db/schema';
import { fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { hash } from '@node-rs/argon2';
import { encodeBase32LowerCase } from '@oslojs/encoding';
import type { PageServerLoad, Actions } from './$types';
import { requirePermission } from '$lib/server/rbac';

export const load: PageServerLoad = async (event) => {
    requirePermission(event.locals, 'users.manage');

    const allUsers = await db.select({
        id: user.id,
        username: user.username,
        roleId: user.roleId,
        createdAt: user.createdAt
    }).from(user);

    const allRoles = await db.select().from(roles);

    return {
        users: allUsers,
        roles: allRoles
    };
};

function generateUserId() {
    const bytes = crypto.getRandomValues(new Uint8Array(15));
    const id = encodeBase32LowerCase(bytes);
    return id;
}

export const actions: Actions = {
    createUser: async ({ request, locals }) => {
        requirePermission(locals, 'users.manage');
        const formData = await request.formData();
        const rawUsername = formData.get('username') as string;
        const password = formData.get('password') as string;
        const roleId = formData.get('roleId') as string;

        if (!rawUsername || !password || !roleId) {
            return fail(400, { message: 'Username, password and role are required' });
        }

        const username = rawUsername.trim().toLowerCase();

        if (username.length < 3 || username.length > 31) {
            return fail(400, { message: 'Username must be between 3 and 31 characters' });
        }

        if (password.length < 6 || password.length > 255) {
            return fail(400, { message: 'Password must be between 6 and 255 characters' });
        }

        const passwordHash = await hash(password, {
            memoryCost: 19456,
            timeCost: 2,
            outputLen: 32,
            parallelism: 1
        });

        try {
            await db.insert(user).values({
                id: generateUserId(),
                username,
                passwordHash,
                roleId
            });
        } catch (e: any) {
            // Check for unique constraint violation (code 'SQLITE_CONSTRAINT_UNIQUE' or similar message)
            if (e.message?.includes('UNIQUE constraint failed')) {
                return fail(400, { message: 'Username already exists' });
            }
            return fail(500, { message: e.message || 'Failed to create user' });
        }
    },

    updateUserRole: async ({ request, locals }) => {
        requirePermission(locals, 'users.manage');
        const formData = await request.formData();
        const userId = formData.get('userId') as string;
        const roleId = formData.get('roleId') as string;

        if (!userId || !roleId) {
            return fail(400, { message: 'User ID and Role ID are required' });
        }

        try {
            const targetUser = await db.select().from(user).where(eq(user.id, userId)).get();
            if (targetUser?.roleId === 'admin' && roleId !== 'admin') {
                return fail(400, { message: 'Cannot demote an Administrator' });
            }

            await db.update(user).set({ 
                roleId
            }).where(eq(user.id, userId));
        } catch (e: any) {
            return fail(500, { message: e.message || 'Failed to update user role' });
        }
    },

    deleteUser: async ({ request, locals }) => {
        requirePermission(locals, 'users.manage');
        const formData = await request.formData();
        const id = formData.get('id') as string;

        if (!id) return fail(400, { message: 'ID is required' });

        try {
            const targetUser = await db.select().from(user).where(eq(user.id, id)).get();
            if (targetUser?.roleId === 'admin') {
                return fail(400, { message: 'Cannot delete an Administrator account' });
            }

            await db.delete(user).where(eq(user.id, id));
        } catch (e: any) {
            return fail(500, { message: e.message || 'Failed to delete user' });
        }
    }
};