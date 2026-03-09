import pg from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');

const client = new pg.Client({ connectionString: DATABASE_URL });

const DEVICE_SN = process.argv[2] || 'SYZ8250800834';

async function triggerSync() {
	await client.connect();
	console.log(`==> Queuing full sync commands for device ${DEVICE_SN}...`);

	// ZKTeco PUSH protocol query commands
	// These will force the device to upload its entire internal database
	const commands = [
		'DATA QUERY USERINFO',
		'DATA QUERY FINGERTMP',
		'DATA QUERY FACE'
	];

	for (const cmd of commands) {
		const res = await client.query(
			'INSERT INTO device_commands (device_sn, command_string, status, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW()) RETURNING id',
			[DEVICE_SN, cmd, 'PENDING']
		);
		console.log(`    Queued: ${cmd} (ID: ${res.rows[0].id})`);
	}

	console.log('\n==> Done. Commands are in the queue.');
	console.log('    The device will pick them up on its next heartbeat (usually every 10-30s).');
	console.log('    You can watch the logs to see the data arriving:');
	console.log('    docker logs -f krsl-access-system-device-service-1');
	
	await client.end();
}

triggerSync().catch(console.error);
