import pg from 'pg';
import 'dotenv/config';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');

const client = new pg.Client({ connectionString: DATABASE_URL });

async function fixBiometricIds() {
	await client.connect();
	console.log('Connected to database.');

	try {
		// 1. Get current max biometric_id
		const maxRes = await client.query('SELECT MAX(CAST(biometric_id AS INTEGER)) as max_id FROM people WHERE biometric_id ~ '^[0-9]+$'');
		let currentMax = parseInt(maxRes.rows[0].max_id || '0');
		console.log(`Current max Biometric ID: ${currentMax}`);

		// 2. Find people missing biometric_id
		const missingRes = await client.query('SELECT id, name FROM people WHERE biometric_id IS NULL OR biometric_id = '' ORDER BY created_at ASC');
		
		if (missingRes.rowCount === 0) {
			console.log('All records already have Biometric IDs. Nothing to do.');
			return;
		}

		console.log(`Found ${missingRes.rowCount} people missing Biometric IDs. Assigning now...`);

		for (const row of missingRes.rows) {
			currentMax++;
			const newId = currentMax.toString();
			await client.query('UPDATE people SET biometric_id = $1 WHERE id = $2', [newId, row.id]);
			console.log(` - Assigned ID ${newId} to ${row.name}`);
		}

		console.log('Successfully updated all records.');

	} catch (error) {
		console.error('Migration failed:', error);
	} finally {
		await client.end();
		console.log('Database connection closed.');
	}
}

fixBiometricIds();
