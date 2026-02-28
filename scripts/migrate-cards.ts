import pg from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');

const client = new pg.Client({ connectionString: DATABASE_URL });

async function migrate() {
	await client.connect();
	console.log('Connected to database.');

	try {
		// 1. Ensure Card category exists
		console.log('Ensuring "Card" category exists...');
		await client.query(`
			INSERT INTO person_categories (id, name, slug, parent_id, sort_order)
			VALUES ($1, $2, $3, $4, $5)
			ON CONFLICT (id) DO NOTHING
		`, ['card', 'Card', 'card', null, 0]);

		// 2. Find people matching T-KRSL/001 to T-KRSL/050
		console.log('Migrating people matching "T-KRSL/%" pattern...');
		const result = await client.query(`
			UPDATE people
			SET category_id = 'card'
			WHERE name LIKE 'T-KRSL/%'
			RETURNING id, name
		`);

		console.log(`Successfully migrated ${result.rowCount} people to the "Card" category.`);
		
		if (result.rowCount > 0) {
			console.log('Migrated individuals:');
			result.rows.forEach(row => {
				console.log(` - ${row.name} (${row.id})`);
			});
		} else {
			console.log('No matching people found to migrate.');
		}

	} catch (error) {
		console.error('Migration failed:', error);
	} finally {
		await client.end();
		console.log('Database connection closed.');
	}
}

migrate();
