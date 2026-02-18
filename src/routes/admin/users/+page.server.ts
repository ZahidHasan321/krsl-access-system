import { db } from '$lib/server/db';
import { user, roles, session } from '$lib/server/db/schema';
import { fail } from '@sveltejs/kit';
import { eq, ne, and } from 'drizzle-orm';
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
        name: user.name,
        contact: user.contact,
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
        isMaster: isCurrentUserMaster(event.locals),
        currentUserRoleId: event.locals.user?.roleId
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
        const name = formData.get('name') as string;
        const contact = formData.get('contact') as string;
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
                name: name || null,
                contact: contact || null,
                passwordHash,
                roleId
            });
        } catch (e: any) {
            if (e.message?.includes('duplicate key value violates unique constraint')) {
                return fail(400, { message: 'Username already exists' });
            }
            return fail(500, { message: e.message || 'Failed to create user' });
        }
    },

    updateUser: async ({ request, locals }) => {
        requirePermission(locals, 'users.manage');
        const formData = await request.formData();
        const userId = formData.get('userId') as string;
        const rawUsername = formData.get('username') as string;
        const name = formData.get('name') as string;
        const contact = formData.get('contact') as string;
        const password = formData.get('password') as string;
        const roleId = formData.get('roleId') as string;

        if (!userId) {
            return fail(400, { message: 'User ID is required' });
        }

        try {
            const [targetUser] = await db.select().from(user).where(eq(user.id, userId));
            if (!targetUser) {
                return fail(404, { message: 'User not found' });
            }

            const isTargetMaster = isMasterUser(targetUser.username);
            const isTargetAdmin = targetUser.roleId === ROLES.ADMIN;
            const isCurrentMaster = isCurrentUserMaster(locals);
            const isCurrentAdmin = locals.user?.roleId === ROLES.ADMIN;

            // RBAC Logic
            if (isCurrentMaster) {
                if (isTargetMaster) {
                    // Master editing self
                    if (rawUsername && rawUsername.trim().toLowerCase() !== targetUser.username) {
                        return fail(403, { message: 'Master cannot change their own username' });
                    }
                    if (password && password.length > 0) {
                        return fail(403, { message: 'Master cannot change their own password via this form' });
                    }
                    if (roleId && roleId !== targetUser.roleId) {
                         return fail(403, { message: 'Master cannot change their own role' });
                    }
                }
            } else if (isCurrentAdmin) {
                if (isTargetMaster) {
                    return fail(403, { message: 'Admins cannot edit the Master account' });
                }
                if (isTargetAdmin) {
                    return fail(403, { message: 'Admins cannot edit other Administrators' });
                }
            } else {
                return fail(403, { message: 'Unauthorized' });
            }

            const updateData: any = {
                name: name || null,
                contact: contact || null,
            };

            if (rawUsername) {
                const username = rawUsername.trim().toLowerCase();
                if (username.length < 3 || username.length > 31) {
                    return fail(400, { message: 'Username must be between 3 and 31 characters' });
                }
                updateData.username = username;
            }

            if (roleId) {
                updateData.roleId = roleId;
            }

            if (password && password.length > 0) {
                if (password.length < 8 || password.length > 255 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
                    return fail(400, { message: 'Password must be at least 8 characters with both letters and numbers' });
                }
                updateData.passwordHash = await hash(password, {
                    memoryCost: 19456,
                    timeCost: 2,
                    outputLen: 32,
                    parallelism: 1
                });
            }

            await db.update(user).set(updateData).where(eq(user.id, userId));
            
            // If role or password changed, invalidate sessions
            if (roleId !== targetUser.roleId || (password && password.length > 0)) {
                await db.delete(session).where(eq(session.userId, userId));
            }

        } catch (e: any) {
            if (e.message?.includes('duplicate key value violates unique constraint')) {
                return fail(400, { message: 'Username already exists' });
            }
            return fail(500, { message: e.message || 'Failed to update user' });
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
