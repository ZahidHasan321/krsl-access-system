/**
 * UI Seed Script for KR Steel CRM
 * Seeds devices, people, attendance, and vehicles for testing.
 */
import pg from 'pg';
import { format, subDays, startOfDay, addHours, addMinutes } from 'date-fns';
import crypto from 'node:crypto';
import { hash } from '@node-rs/argon2';
import { encodeBase32LowerCase } from '@oslojs/encoding';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');

const client = new pg.Client({ connectionString: DATABASE_URL });
await client.connect();

function generateId(): string {
	const bytes = crypto.randomBytes(15);
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

const CATEGORIES = [
	{ id: 'customer', name: 'Customer', slug: 'customer', parentId: null },
	{ id: 'vendor', name: 'Vendor', slug: 'vendor', parentId: null },
	{ id: 'employee', name: 'Employee', slug: 'employee', parentId: null },
	{ id: 'supplier', name: 'Supplier', slug: 'supplier', parentId: 'vendor' },
	{ id: '3rd-party', name: '3rd Party', slug: '3rd-party', parentId: 'vendor' },
	{ id: 'dokandari', name: 'Dokandari', slug: 'dokandari', parentId: 'customer' },
	{ id: 'rolling', name: 'Rolling', slug: 'rolling', parentId: 'customer' },
	{ id: 'outfitting', name: 'Outfitting', slug: 'outfitting', parentId: 'customer' },
	{ id: 'management', name: 'Management', slug: 'management', parentId: 'employee' },
	{ id: 'frontliner', name: 'Frontliner', slug: 'frontliner', parentId: 'employee' }
];

const NAMES = [
	'Zahid Hasan',
	'Abdur Rahman',
	'Sumon Ahmed',
	'Kamrul Islam',
	'Tanveer Hossain',
	'Mehedi Hasan',
	'Shoriful Islam',
	'Anisur Rahman',
	'Mahbub Alam',
	'Faruk Ahmed',
	'Sajidul Islam',
	'Rashed Khan',
	'Mizanur Rahman',
	'Asif Iqbal',
	'Saiful Islam',
	'Nurul Huda',
	'Ibrahim Khalil',
	'Mustafizur Rahman',
	'Jashim Uddin',
	'Arifur Rahman'
];

const COMPANIES = [
	'KR Steel Ltd',
	'Shipyard Corp',
	'Build Masters',
	'Steel Dynamics',
	'Industrial Hub'
];

async function run() {
	console.log('Starting UI Seed...');
	const now = new Date();

	console.log('Clearing old data (People, Attendance, Vehicles, Devices)...');
	await client.query(
		'DELETE FROM attendance_logs; DELETE FROM vehicles; DELETE FROM devices; DELETE FROM people; DELETE FROM person_categories; DELETE FROM device_commands; DELETE FROM bio_templates;'
	);

	// 1. Roles and Permissions
	console.log('Syncing roles and permissions...');
	const ROLES = [
		{ id: 'admin', name: 'Administrator', description: 'Full system access' },
		{ id: 'guard', name: 'Security Guard', description: 'View and create entries' }
	];
	for (const r of ROLES) {
		await client.query(
			'INSERT INTO roles (id, name, description) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET name = $2, description = $3',
			[r.id, r.name, r.description]
		);
	}

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
		{ id: 'devices.manage', description: 'Manage biometric devices (admin)' },
		{ id: 'checkin.view_details', description: 'Show verification dialog after check-in' }
	];
	for (const p of PERMISSIONS) {
		await client.query(
			'INSERT INTO permissions (id, description) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET description = $2',
			[p.id, p.description]
		);
	}

	// 2. Admin User
	const MASTER_USERNAME = process.env.MASTER_USERNAME || 'admin';
	const MASTER_PASSWORD = process.env.MASTER_PASSWORD || 'admin123';
	console.log(`Ensuring admin user: ${MASTER_USERNAME}`);
	const adminCheck = await client.query('SELECT id FROM "user" WHERE username = $1', [
		MASTER_USERNAME
	]);
	if (adminCheck.rows.length === 0) {
		const passwordHash = await hashPassword(MASTER_PASSWORD);
		await client.query(
			'INSERT INTO "user" (id, username, password_hash, role_id) VALUES ($1, $2, $3, $4)',
			[generateId(), MASTER_USERNAME, passwordHash, 'admin']
		);
	}

	// 3. Categories
	console.log('Syncing categories...');
	for (const c of CATEGORIES) {
		await client.query(
			'INSERT INTO person_categories (id, name, slug, parent_id) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING',
			[c.id, c.name, c.slug, c.parentId]
		);
	}

	// 4. Devices
	console.log('Seeding devices...');
	const devices = [
		{
			id: crypto.randomUUID(),
			serialNumber: 'ZK-MAIN-001',
			name: 'Main Gate In',
			location: 'Entrance',
			status: 'online'
		},
		{
			id: crypto.randomUUID(),
			serialNumber: 'ZK-MAIN-002',
			name: 'Main Gate Out',
			location: 'Entrance',
			status: 'online'
		}
	];
	for (const d of devices) {
		await client.query(
			`INSERT INTO devices (id, serial_number, name, location, status, last_heartbeat) 
             VALUES ($1, $2, $3, $4, $5, $6) 
             ON CONFLICT (serial_number) DO UPDATE SET name=$3, location=$4, status=$5, last_heartbeat=$6`,
			[d.id, d.serialNumber, d.name, d.location, d.status, now]
		);
	}

	// 5. People
	console.log('Seeding 20 people...');
	const people = [];
	for (let i = 0; i < 20; i++) {
		const cat = CATEGORIES[i % CATEGORIES.length];
		const p = {
			id: crypto.randomUUID(),
			name: NAMES[i],
			categoryId: cat.id,
			codeNo: `C-${1000 + i}`,
			company: cat.id.includes('employee') ? 'KR Steel Ltd' : COMPANIES[i % COMPANIES.length],
			designation: cat.id.toUpperCase()
		};
		await client.query(
			`INSERT INTO people (id, name, category_id, code_no, company, designation, is_trained, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
			[p.id, p.name, p.categoryId, p.codeNo, p.company, p.designation, true, subDays(now, 30)]
		);
		people.push(p);
	}

	// 6. Attendance Logs (last 7 days)
	console.log('Seeding attendance logs (last 7 days)...');
	for (let day = 0; day < 7; day++) {
		const currentDate = subDays(now, day);
		const dateStr = format(currentDate, 'yyyy-MM-dd');

		// Pick random 10-15 people for each day
		const dailyPeople = people
			.sort(() => 0.5 - Math.random())
			.slice(0, 10 + Math.floor(Math.random() * 6));

		for (const p of dailyPeople) {
			const entryTime = addHours(startOfDay(currentDate), 8 + Math.floor(Math.random() * 4));

			let exitTime = null;
			let status = 'on_premises';

			// If it's not today, they must have checked out
			if (day > 0 || Math.random() > 0.4) {
				exitTime = addHours(entryTime, 4 + Math.floor(Math.random() * 6));
				status = 'checked_out';
			}

			await client.query(
				`INSERT INTO attendance_logs (id, person_id, entry_time, exit_time, status, date)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
				[crypto.randomUUID(), p.id, entryTime, exitTime, status, dateStr]
			);
		}
	}

	// 7. Vehicles (last 7 days)
	console.log('Seeding vehicles (last 7 days)...');
	for (let i = 0; i < 15; i++) {
		const randomDay = Math.floor(Math.random() * 7);
		const currentDate = subDays(now, randomDay);
		const dateStr = format(currentDate, 'yyyy-MM-dd');
		const entryTime = addHours(startOfDay(currentDate), 7 + Math.floor(Math.random() * 15));

		let exitTime = null;
		let status = 'on_premises';

		if (randomDay > 0 || Math.random() > 0.3) {
			exitTime = addHours(entryTime, 1 + Math.floor(Math.random() * 4));
			status = 'checked_out';
		}

		const vNum = `DHA-METRO-${1000 + i}`;
		await client.query(
			`INSERT INTO vehicles (id, vehicle_number, type, driver_name, entry_time, exit_time, status, date)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
			[
				crypto.randomUUID(),
				vNum,
				i % 3 === 0 ? 'transport' : 'regular',
				NAMES[i],
				entryTime,
				exitTime,
				status,
				dateStr
			]
		);
	}

	console.log('UI Seed Completed Successfully!');
	await client.end();
}

run().catch(async (err) => {
	console.error(err);
	await client.end();
	process.exit(1);
});
