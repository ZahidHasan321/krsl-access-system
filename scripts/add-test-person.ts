import pg from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;
const client = new pg.Client({ connectionString: DATABASE_URL });

async function addPerson() {
	await client.connect();
	const id = crypto.randomUUID();
	await client.query(
		'INSERT INTO people (id, name, biometric_id, category_id, created_at) VALUES ($1, $2, $3, $4, NOW())',
		[id, 'Local Test User', '1', 'employee']
	);
	console.log('Added Local Test User with biometricId: 1');
	await client.end();
}
addPerson();
