import pg from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');

const client = new pg.Client({ connectionString: DATABASE_URL });

async function inspect() {
	await client.connect();
	console.log('--- Biometric Templates ---');
	const res = await client.query('SELECT bt.*, p.name FROM bio_templates bt JOIN people p ON bt.person_id = p.id LIMIT 10');
	console.table(res.rows.map(r => ({
		name: r.name,
		type: r.template_type,
		fid: r.fid,
		no: r.template_no,
		data_len: r.template_data?.length
	})));

	console.log('\n--- Recent Raw Punches ---');
	const punches = await client.query('SELECT * FROM raw_punches ORDER BY punch_time DESC LIMIT 5');
	console.table(punches.rows.map(r => ({
		pin: r.pin,
		time: r.punch_time,
		verify: r.verify,
		raw: r.raw_line
	})));

	await client.end();
}

inspect().catch(console.error);
