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
	{ id: 'labours.view', description: 'View labours' },
	{ id: 'labours.create', description: 'Create labours' },
	{ id: 'labours.edit', description: 'Edit labours' },
	{ id: 'labours.delete', description: 'Delete labours' },
	{ id: 'vehicles.view', description: 'View vehicles' },
	{ id: 'vehicles.create', description: 'Create vehicles' },
	{ id: 'vehicles.edit', description: 'Edit vehicles' },
	{ id: 'visitors.view', description: 'View visitors' },
	{ id: 'visitors.create', description: 'Create visitors' },
	{ id: 'visitors.edit', description: 'Edit visitors' },
	{ id: 'visitors.delete', description: 'Delete visitors' },
	{ id: 'users.manage', description: 'Manage users, reset passwords' },
	{ id: 'labours.portal', description: 'Access the Portal (faked times) view' }
];

// admin gets everything, guard gets view + create only
const ROLE_PERMISSIONS: Record<string, string[]> = {
	admin: PERMISSIONS.map((p) => p.id),
	guard: [
		'labours.view',
		'labours.create',
		'vehicles.view',
		'vehicles.create',
		'visitors.view',
		'visitors.create'
	]
};

const ADMIN_USER = {
	username: 'admin',
	password: 'admin123',
	role: 'admin' as const,
	roleId: 'admin'
};

// ── Actions ──────────────────────────────────────────────

function resetDatabase() {
	console.log('Dropping all data...');
	db.exec(`
		DELETE FROM labour_logs;
		DELETE FROM labours;
		DELETE FROM visitor_logs;
		DELETE FROM visitor_profiles;
		DELETE FROM vehicles;
		DELETE FROM session;
		DELETE FROM role_permissions;
		DELETE FROM user;
		DELETE FROM permissions;
		DELETE FROM roles;
	`);
	console.log('All data cleared.');
}

async function seedDatabase() {
	console.log('Seeding roles...');
	const insertRole = db.prepare(
		'INSERT OR IGNORE INTO roles (id, name, description) VALUES (?, ?, ?)'
	);
	for (const r of ROLES) {
		insertRole.run(r.id, r.name, r.description);
	}

	console.log('Seeding permissions...');
	const insertPerm = db.prepare('INSERT OR IGNORE INTO permissions (id, description) VALUES (?, ?)');
	for (const p of PERMISSIONS) {
		insertPerm.run(p.id, p.description);
	}

	console.log('Seeding role-permissions...');
	const insertRP = db.prepare(
		'INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)'
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
			'INSERT INTO user (id, username, password_hash, role, role_id) VALUES (?, ?, ?, ?, ?)'
		).run(generateId(), ADMIN_USER.username, passwordHash, ADMIN_USER.role, ADMIN_USER.roleId);
		console.log(`  Created user "${ADMIN_USER.username}" with password "${ADMIN_USER.password}"`);
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
