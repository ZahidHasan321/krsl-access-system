import { db } from '$lib/server/db';
import { user, roles } from '$lib/server/db/schema';
import { fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { hash } from '@node-rs/argon2';
import { encodeBase32LowerCase } from '@oslojs/encoding';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async () => {
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
    createUser: async ({ request }) => {
        const formData = await request.formData();
        const username = formData.get('username') as string;
        const password = formData.get('password') as string;
        const roleId = formData.get('roleId') as string;

        if (!username || !password || !roleId) {
            return fail(400, { message: 'Username, password and role are required' });
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
                role: (roleId === 'admin' ? 'admin' : 'guard'), // Sync legacy field
                roleId
            });
        } catch (e: any) {
            return fail(500, { message: e.message || 'Failed to create user' });
        }
    },

    updateUserRole: async ({ request }) => {
        const formData = await request.formData();
        const userId = formData.get('userId') as string;
        const roleId = formData.get('roleId') as string;

        if (!userId || !roleId) {
            return fail(400, { message: 'User ID and Role ID are required' });
        }

        try {
            // Check if the user being modified is an admin
            const targetUser = await db.select().from(user).where(eq(user.id, userId)).get();
            if (targetUser?.roleId === 'admin') {
                return fail(400, { message: 'Cannot change the role of an Administrator' });
            }

            await db.update(user).set({ 
                roleId,
                role: (roleId === 'admin' ? 'admin' : 'guard') // Sync legacy field
            }).where(eq(user.id, userId));
        } catch (e: any) {
            return fail(500, { message: e.message || 'Failed to update user role' });
        }
    },

    deleteUser: async ({ request }) => {
        const formData = await request.formData();
        const id = formData.get('id') as string;

        if (!id) return fail(400, { message: 'ID is required' });

        try {
            // Check if the user being deleted is an admin
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
