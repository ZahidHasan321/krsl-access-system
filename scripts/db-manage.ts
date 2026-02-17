/**
 * Database management script.
 *
 * Usage:
 *   pnpm db:seed           — Seed roles, permissions & create admin user
 *   pnpm db:reset          — Drop all data, re-seed, create admin user
 *
 * Env:
 *   DATABASE_URL  (e.g. "postgresql://krcrm:krcrm@localhost:5432/krcrm")
 */

import pg from 'pg';
import { hash } from '@node-rs/argon2';
import { encodeBase32LowerCase } from '@oslojs/encoding';
import { randomBytes } from 'crypto';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');

const client = new pg.Client({ connectionString: DATABASE_URL });
await client.connect();

const command = process.argv[2]; // 'seed' or 'reset'

// ── Helpers ──────────────────────────────────────────────

function generateId(): string {
    const bytes = randomBytes(15);
    return encodeBase32LowerCase(new Uint8Array(bytes));
}

async function hashPassword(password: string): Promise<string> {
    return hash(password, {
        memoryCost: 19456,
        timeCost: 2,
        outputLen: 32,
        parallelism: 1
    });
}

// ── Seed data ────────────────────────────────────────────

const ROLES = [
    { id: 'admin', name: 'Administrator', description: 'Full system access' },
    { id: 'guard', name: 'Security Guard', description: 'View and create entries' }
];

const PERMISSIONS = [
    { id: 'people.view', description: 'View people registry and attendance' },
    { id: 'people.create', description: 'Register new people / check in' },
    { id: 'people.edit', description: 'Edit people details' },
    { id: 'people.delete', description: 'Delete people records' },
    { id: 'vehicles.view', description: 'View vehicle logs' },
    { id: 'vehicles.create', description: 'Add vehicle entries' },
    { id: 'vehicles.edit', description: 'Edit vehicle entries' },
    { id: 'vehicles.delete', description: 'Delete vehicle entries' },
    { id: 'categories.manage', description: 'Manage person categories (admin)' },
    { id: 'users.manage', description: 'Manage system users and roles (admin)' },
    { id: 'devices.manage', description: 'Manage biometric devices (admin)' }
];

// admin gets everything, guard gets view + create only
const ROLE_PERMISSIONS: Record<string, string[]> = {
    admin: PERMISSIONS.map((p) => p.id),
    guard: [
        'people.view',
        'people.create',
        'vehicles.view',
        'vehicles.create'
    ]
};

const MASTER_USERNAME = process.env.MASTER_USERNAME;
const MASTER_PASSWORD = process.env.MASTER_PASSWORD;

if (!MASTER_USERNAME || !MASTER_PASSWORD) {
    throw new Error('MASTER_USERNAME and MASTER_PASSWORD must be set in .env');
}

const ADMIN_USER = {
    username: MASTER_USERNAME.trim().toLowerCase(),
    password: MASTER_PASSWORD,
    roleId: 'admin'
};

const DEFAULT_CATEGORIES = [
    { id: 'customer', name: 'Customer', slug: 'customer', parentId: null, sortOrder: 1 },
    { id: 'vendor', name: 'Vendor', slug: 'vendor', parentId: null, sortOrder: 2 },
    { id: 'employee', name: 'Employee', slug: 'employee', parentId: null, sortOrder: 3 },
    { id: 'dokandari', name: 'Dokandari', slug: 'dokandari', parentId: 'customer', sortOrder: 1 },
    { id: 'rolling', name: 'Rolling', slug: 'rolling', parentId: 'customer', sortOrder: 2 },
    { id: 'outfitting', name: 'Outfitting', slug: 'outfitting', parentId: 'customer', sortOrder: 3 },
    { id: 'supplier', name: 'Supplier', slug: 'supplier', parentId: 'vendor', sortOrder: 1 },
    { id: '3rd-party', name: '3rd Party', slug: '3rd-party', parentId: 'vendor', sortOrder: 2 },
    { id: 'management', name: 'Management', slug: 'management', parentId: 'employee', sortOrder: 1 },
    { id: 'frontliner', name: 'Frontliner', slug: 'frontliner', parentId: 'employee', sortOrder: 2 }
];

// ── Actions ──────────────────────────────────────────────

async function resetDatabase() {
    console.log('Dropping all data...');
    try {
        await client.query(`
            DELETE FROM raw_punches;
            DELETE FROM device_commands;
            DELETE FROM devices;
            DELETE FROM attendance_logs;
            DELETE FROM people;
            DELETE FROM person_categories;
            DELETE FROM vehicles;
            DELETE FROM session;
            DELETE FROM role_permissions;
            DELETE FROM "user";
            DELETE FROM permissions;
            DELETE FROM roles;
        `);
    } catch (e: any) {
        console.warn('Warning: Some tables might not exist yet.', e.message);
    }
    console.log('All data cleared.');
}

async function seedDatabase() {
    console.log('Seeding roles...');
    const validRoleIds = ROLES.map(r => r.id);
    await client.query(
        `DELETE FROM roles WHERE id != ALL($1)`,
        [validRoleIds]
    );

    for (const r of ROLES) {
        await client.query(
            `INSERT INTO roles (id, name, description) VALUES ($1, $2, $3)
             ON CONFLICT (id) DO UPDATE SET name = $2, description = $3`,
            [r.id, r.name, r.description]
        );
    }

    console.log('Syncing permissions...');
    const validPermIds = PERMISSIONS.map(p => p.id);
    await client.query(
        `DELETE FROM permissions WHERE id != ALL($1)`,
        [validPermIds]
    );

    for (const p of PERMISSIONS) {
        await client.query(
            `INSERT INTO permissions (id, description) VALUES ($1, $2)
             ON CONFLICT (id) DO UPDATE SET description = $2`,
            [p.id, p.description]
        );
    }

    console.log('Syncing role-permissions...');
    await client.query('DELETE FROM role_permissions');

    for (const [roleId, permIds] of Object.entries(ROLE_PERMISSIONS)) {
        for (const permId of permIds) {
            await client.query(
                'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)',
                [roleId, permId]
            );
        }
    }

    console.log('Creating admin user...');
    const result = await client.query(
        'SELECT id FROM "user" WHERE username = $1',
        [ADMIN_USER.username]
    );

    if (result.rows.length > 0) {
        console.log(`  User "${ADMIN_USER.username}" already exists, skipping.`);
    } else {
        const passwordHash = await hashPassword(ADMIN_USER.password);
        await client.query(
            'INSERT INTO "user" (id, username, password_hash, role_id) VALUES ($1, $2, $3, $4)',
            [generateId(), ADMIN_USER.username, passwordHash, ADMIN_USER.roleId]
        );
        console.log(`  Created user "${ADMIN_USER.username}" with password "${ADMIN_USER.password}"`);
    }

    console.log('Seeding default categories...');
    for (const c of DEFAULT_CATEGORIES) {
        await client.query(
            `INSERT INTO person_categories (id, name, slug, parent_id, sort_order) VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (id) DO NOTHING`,
            [c.id, c.name, c.slug, c.parentId, c.sortOrder]
        );
    }

    console.log('Done.');
}

// ── Main ─────────────────────────────────────────────────

async function main() {
    if (command === 'reset') {
        await resetDatabase();
    } else if (command !== 'seed') {
        console.log('Usage: tsx scripts/db-manage.ts <seed|reset>');
        process.exit(1);
    }

    await seedDatabase();
    await client.end();
}

main().catch(async (err) => {
    console.error(err);
    await client.end();
    process.exit(1);
});
