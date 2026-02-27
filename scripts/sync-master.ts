import pg from 'pg';
import { hash } from '@node-rs/argon2';
import { encodeBase32LowerCase } from '@oslojs/encoding';
import { randomBytes } from 'crypto';
import 'dotenv/config';

/**
 * Surgical script to sync ONLY the master user from .env to the database.
 * No other data is touched.
 */
async function main() {
	const { DATABASE_URL, MASTER_USERNAME, MASTER_PASSWORD } = process.env;

	if (!DATABASE_URL || !MASTER_USERNAME || !MASTER_PASSWORD) {
		console.error('Error: DATABASE_URL, MASTER_USERNAME, and MASTER_PASSWORD must be set in .env');
		process.exit(1);
	}

	console.log(`Syncing master user: ${MASTER_USERNAME}...`);

	const client = new pg.Client({ connectionString: DATABASE_URL });
	try {
		await client.connect();

		const username = MASTER_USERNAME.trim().toLowerCase();
		const passwordHash = await hash(MASTER_PASSWORD, {
			memoryCost: 19456,
			timeCost: 2,
			outputLen: 32,
			parallelism: 1
		});

		const res = await client.query('SELECT id FROM "user" WHERE username = $1', [username]);

		if (res.rows.length > 0) {
			// Update existing user
			await client.query(
				'UPDATE "user" SET password_hash = $1, role_id = $2 WHERE username = $3',
				[passwordHash, 'admin', username]
			);
			console.log(`Successfully updated password for master user: "${username}"`);
		} else {
			// Create new user
			const bytes = randomBytes(15);
			const id = encodeBase32LowerCase(new Uint8Array(bytes));
			
			await client.query(
				'INSERT INTO "user" (id, username, password_hash, role_id) VALUES ($1, $2, $3, $4)',
				[id, username, passwordHash, 'admin']
			);
			console.log(`Successfully created new master user: "${username}"`);
		}
	} catch (error) {
		console.error('Failed to sync master user:', error);
		process.exit(1);
	} finally {
		await client.end();
	}
}

main();
