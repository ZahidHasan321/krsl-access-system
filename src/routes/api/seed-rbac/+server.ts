import { db } from '$lib/server/db';
import { roles, permissions, rolePermissions, user } from '$lib/server/db/schema';
import { eq, isNull } from 'drizzle-orm';
import { json } from '@sveltejs/kit';

export async function GET() {
    try {
        // 1. Seed Roles
        const rolesToSeed = [
            { id: 'admin', name: 'Administrator', description: 'Full system access' },
            { id: 'guard', name: 'Security Guard', description: 'Entry/Exit management' }
        ];

        for (const role of rolesToSeed) {
            await db.insert(roles).values(role).onConflictDoUpdate({
                target: roles.id,
                set: { name: role.name, description: role.description }
            });
        }

        // 2. Seed Permissions
        const permissionsToSeed = [
            { id: 'labours.view', description: 'View labour registry and history' },
            { id: 'labours.create', description: 'Add new labours' },
            { id: 'labours.edit', description: 'Edit labour details' },
            { id: 'labours.delete', description: 'Delete labour records' },
            { id: 'vehicles.view', description: 'View vehicle logs' },
            { id: 'vehicles.create', description: 'Add vehicle entries' },
            { id: 'vehicles.edit', description: 'Edit vehicle entries' },
            { id: 'vehicles.delete', description: 'Delete vehicle entries' },
            { id: 'visitors.view', description: 'View visitor profiles and logs' },
            { id: 'visitors.create', description: 'Add visitor entries' },
            { id: 'visitors.edit', description: 'Edit visitor entries' },
            { id: 'visitors.delete', description: 'Delete visitor entries' },
            { id: 'users.manage', description: 'Manage system users and roles' }
        ];

        for (const permission of permissionsToSeed) {
            await db.insert(permissions).values(permission).onConflictDoUpdate({
                target: permissions.id,
                set: { description: permission.description }
            });
        }

        // 3. Assign Permissions to Roles
        const adminPermissions = permissionsToSeed.map(p => ({
            roleId: 'admin',
            permissionId: p.id
        }));

        const guardPermissions = [
            'labours.view', 'labours.create',
            'vehicles.view', 'vehicles.create',
            'visitors.view', 'visitors.create'
        ].map(pId => ({
            roleId: 'guard',
            permissionId: pId
        }));

        const allRolePermissions = [...adminPermissions, ...guardPermissions];

        for (const rp of allRolePermissions) {
            await db.insert(rolePermissions).values(rp).onConflictDoNothing();
        }

        return json({ message: 'RBAC seeding completed successfully' });
    } catch (e: any) {
        console.error('RBAC Seed Error:', e);
        return json({ error: e.message }, { status: 500 });
    }
}
