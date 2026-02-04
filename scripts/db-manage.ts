/**
 * Database management script.
 *
 * Usage:
 *   pnpm db:seed           — Seed roles, permissions & create admin user
 *   pnpm db:reset          — Drop all data, re-seed, create admin user
 *
 * Env:
 *   DATABASE_URL  (defaults to "local.db")
 */

import Database from 'better-sqlite3';
import { hash } from '@node-rs/argon2';
import { encodeBase32LowerCase } from '@oslojs/encoding';
import { randomBytes } from 'crypto';

const DB_PATH = process.env.DATABASE_URL || 'local.db';
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

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
    { id: 'users.manage', description: 'Manage system users and roles (admin)' }
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

const ADMIN_USER = {
    username: 'admin',
    password: 'admin123',
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

function resetDatabase() {
    console.log('Dropping all data...');
    // We try-catch because tables might not exist yet if starting from true scratch
    try {
        db.exec(`
            DELETE FROM attendance_logs;
            DELETE FROM people;
            DELETE FROM person_categories;
            DELETE FROM vehicles;
            DELETE FROM session;
            DELETE FROM role_permissions;
            DELETE FROM user;
            DELETE FROM permissions;
            DELETE FROM roles;
        `);
    } catch (e) {
        console.warn('Warning: Some tables might not exist yet.', e.message);
    }
    console.log('All data cleared.');
}

async function seedDatabase() {
    console.log('Seeding roles...');
    // Delete roles that are no longer in the ROLES list (excluding those with users if you want safety, but here we go for clean sync)
    const validRoleIds = ROLES.map(r => r.id);
    const rolePlaceholders = validRoleIds.map(() => '?').join(',');
    db.prepare(`DELETE FROM roles WHERE id NOT IN (${rolePlaceholders})`).run(...validRoleIds);

    const insertRole = db.prepare(
        'INSERT OR REPLACE INTO roles (id, name, description) VALUES (?, ?, ?)'
    );
    for (const r of ROLES) {
        insertRole.run(r.id, r.name, r.description);
    }

    console.log('Syncing permissions...');
    // 1. Delete permissions that are no longer in the PERMISSIONS list
    const validPermIds = PERMISSIONS.map(p => p.id);
    const placeholders = validPermIds.map(() => '?').join(',');
    db.prepare(`DELETE FROM permissions WHERE id NOT IN (${placeholders})`).run(...validPermIds);

    // 2. Insert or update defined permissions
    const insertPerm = db.prepare('INSERT OR REPLACE INTO permissions (id, description) VALUES (?, ?)');
    for (const p of PERMISSIONS) {
        insertPerm.run(p.id, p.description);
    }

    console.log('Syncing role-permissions...');
    // Clear all existing role-permissions to ensure a clean sync
    db.prepare('DELETE FROM role_permissions').run();
    
    const insertRP = db.prepare(
        'INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)'
    );
    for (const [roleId, permIds] of Object.entries(ROLE_PERMISSIONS)) {
        for (const permId of permIds) {
            insertRP.run(roleId, permId);
        }
    }

    console.log('Creating admin user...');
    const existing = db
        .prepare('SELECT id FROM user WHERE username = ?')
        .get(ADMIN_USER.username) as { id: string } | undefined;

    if (existing) {
        console.log(`  User "${ADMIN_USER.username}" already exists, skipping.`);
    } else {
        const passwordHash = await hashPassword(ADMIN_USER.password);
        db.prepare(
            'INSERT INTO user (id, username, password_hash, role_id) VALUES (?, ?, ?, ?)'
        ).run(generateId(), ADMIN_USER.username, passwordHash, ADMIN_USER.roleId);
        console.log(`  Created user "${ADMIN_USER.username}" with password "${ADMIN_USER.password}"`);
    }

    console.log('Seeding default categories...');
    const insertCategory = db.prepare(
        'INSERT OR IGNORE INTO person_categories (id, name, slug, parent_id, sort_order) VALUES (?, ?, ?, ?, ?)'
    );
    for (const c of DEFAULT_CATEGORIES) {
        insertCategory.run(c.id, c.name, c.slug, c.parentId, c.sortOrder);
    }

    console.log('Done.');
}

// ── Main ─────────────────────────────────────────────────

async function main() {
    if (command === 'reset') {
        resetDatabase();
    } else if (command !== 'seed') {
        console.log('Usage: tsx scripts/db-manage.ts <seed|reset>');
        process.exit(1);
    }

    await seedDatabase();
    db.close();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});