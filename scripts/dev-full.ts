import { spawn } from 'node:child_process';

/**
 * Unified Development Runner
 * Run with: node --env-file=.env --import=tsx scripts/dev-full.ts
 */

const env = {
	...process.env,
	DEVICE_SERVICE_PORT: '8080',
	SVELTE_INTERNAL_URL: 'http://localhost:5173',
	INTERNAL_API_KEY: 'kr-steel-internal-secret-123',
	DATABASE_URL: process.env.DATABASE_URL || 'postgresql://krcrm:krcrm@127.0.0.1:5432/krcrm'
};

function log(name: string, data: any) {
	const prefix = `[\x1b[1m${name}\x1b[0m] `;
	process.stdout.write(
		data
			.toString()
			.split('\n')
			.map((l: string) => (l ? prefix + l : ''))
			.join('\n')
	);
}

console.log('\x1b[1mStarting Unified CRM Development Environment...\x1b[0m');

// 1. Start SvelteKit
const svelte = spawn('npm', ['run', 'dev'], { env });
svelte.stdout.on('data', (d) => log('\x1b[35mApp\x1b[0m', d));
svelte.stderr.on('data', (d) => log('\x1b[31mApp:Err\x1b[0m', d));

// 2. Start Device Service
const service = spawn('node', ['--env-file=.env', '--import=tsx', 'scripts/device-service.ts'], {
	env
});
service.stdout.on('data', (d) => log('\x1b[36mService\x1b[0m', d));
service.stderr.on('data', (d) => log('\x1b[31mService:Err\x1b[0m', d));

// 3. Start Interactive Dummy Device
// Wait 3 seconds for the others to boot
setTimeout(() => {
	const dummy = spawn(
		'node',
		[
			'--env-file=.env',
			'--import=tsx',
			'scripts/dummy-device.ts',
			'http://localhost:8080/iclock',
			'TEST_SN_001'
		],
		{
			env,
			stdio: 'inherit'
		}
	);

	dummy.on('exit', () => {
		console.log('\nShutting down everything...');
		svelte.kill();
		service.kill();
		process.exit();
	});
}, 3000);

process.on('SIGINT', () => {
	svelte.kill();
	service.kill();
	process.exit();
});
