import { db } from '$lib/server/db';
import { user, roles, session } from '$lib/server/db/schema';
import { fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { hash } from '@node-rs/argon2';
import { encodeBase32LowerCase } from '@oslojs/encoding';
import type { PageServerLoad, Actions } from './$types';
import { requirePermission } from '$lib/server/rbac';
import { ROLES } from '$lib/constants/roles';
import { env } from '$env/dynamic/private';

function isMasterUser(username: string): boolean {
    return !!env.MASTER_USERNAME && username === env.MASTER_USERNAME.trim().toLowerCase();
}

function isCurrentUserMaster(locals: App.Locals): boolean {
    return !!locals.user && isMasterUser(locals.user.username);
}

export const load: PageServerLoad = async (event) => {
    requirePermission(event.locals, 'users.manage');

    const allUsers = await db.select({
        id: user.id,
        username: user.username,
        roleId: user.roleId,
        createdAt: user.createdAt
    }).from(user);

    const usersWithMasterFlag = allUsers.map(u => ({
        ...u,
        isMaster: isMasterUser(u.username)
    }));

    const allRoles = await db.select().from(roles);

    return {
        users: usersWithMasterFlag,
        roles: allRoles,
        isMaster: isCurrentUserMaster(event.locals)
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

        if (password.length < 8 || password.length > 255 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
            return fail(400, { message: 'Password must be at least 8 characters with both letters and numbers' });
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
            if (e.message?.includes('duplicate key value violates unique constraint')) {
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
            const [targetUser] = await db.select().from(user).where(eq(user.id, userId));
            if (targetUser && isMasterUser(targetUser.username)) {
                return fail(400, { message: 'Cannot modify the master account' });
            }
            if (targetUser?.roleId === ROLES.ADMIN && roleId !== ROLES.ADMIN && !isCurrentUserMaster(locals)) {
                return fail(400, { message: 'Only the master account can demote an Administrator' });
            }

            await db.update(user).set({ 
                roleId
            }).where(eq(user.id, userId));

            // Invalidate all sessions for this user so they are forced to re-login with new permissions
            await db.delete(session).where(eq(session.userId, userId));
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
            const [targetUser] = await db.select().from(user).where(eq(user.id, id));
            if (targetUser && isMasterUser(targetUser.username)) {
                return fail(400, { message: 'Cannot delete the master account' });
            }
            if (targetUser?.roleId === ROLES.ADMIN && !isCurrentUserMaster(locals)) {
                return fail(400, { message: 'Only the master account can delete administrators' });
            }

            await db.delete(session).where(eq(session.userId, id));
            await db.delete(user).where(eq(user.id, id));
        } catch (e: any) {
            return fail(500, { message: e.message || 'Failed to delete user' });
        }
    }
};