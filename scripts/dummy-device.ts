import readline from 'node:readline';

/**
 * ZKTeco Dummy Device Simulator (Interactive CLI)
 * Run with: node --env-file=.env --import=tsx scripts/dummy-device.ts [URL] [SN]
 */

const TARGET_URL = process.argv[2] || 'http://localhost:8080/iclock';
const SN = process.argv[3] || 'DUMMY_SN_123';

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

console.clear();
console.log('=========================================');
console.log(`   ZKTeco Device Simulator: ${SN}`);
console.log(`   Target: ${TARGET_URL}`);
console.log('=========================================');
console.log(' [H] Handshake & Register');
console.log(' [B] Send Heartbeat (Check Commands)');
console.log(' [P] Send Punch (Check-In/Out)');
console.log(' [Q] Quit');
console.log('-----------------------------------------');

async function handshake() {
	console.log(`\n[Action] Registering...`);
	try {
		const res = await fetch(`${TARGET_URL}/cdata?SN=${SN}`);
		const regRes = await fetch(`${TARGET_URL}/registry?SN=${SN}`, {
			method: 'POST',
			body: `SN=${SN}\tDeviceName=DummyDevice\tIPAddress=127.0.0.1`
		});
		console.log(`[Success] Registered: ${await regRes.text()}`);
	} catch (e: any) {
		console.error(`[Error] Failed: ${e.message}`);
	}
}

async function heartbeat() {
	console.log(`\n[Action] Heartbeat polling...`);
	try {
		const res = await fetch(`${TARGET_URL}/getrequest?SN=${SN}`);
		const text = await res.text();
		if (text.trim() === 'OK') {
			console.log(`[Status] Heartbeat OK (Idle)`);
		} else if (text.startsWith('C:')) {
			console.log(`[Command] Received: ${text}`);
			await handleCommand(text);
		}
	} catch (e: any) {
		console.error(`[Error] Heartbeat failed: ${e.message}`);
	}
}

async function handleCommand(cmdLine: string) {
	const firstColon = cmdLine.indexOf(':');
	const secondColon = cmdLine.indexOf(':', firstColon + 1);
	if (secondColon === -1) return;

	const id = cmdLine.substring(firstColon + 1, secondColon);
	const cmd = cmdLine.substring(secondColon + 1);

	console.log(`[Action] Executing CMD ${id}...`);
	await new Promise((r) => setTimeout(r, 1000));

	const body = new URLSearchParams({ ID: id, Return: '0', CMD: cmd });
	await fetch(`${TARGET_URL}/devicecmd?SN=${SN}`, {
		method: 'POST',
		body: body.toString(),
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
	});
	console.log(`[Success] CMD ${id} confirmed SUCCESS.`);
}

async function sendPunch() {
	rl.question('\n[Input] Enter PIN (biometricId) to punch: ', async (pin) => {
		if (!pin) return;
		const now = new Date();
		const timestamp = now.toISOString().replace('T', ' ').split('.')[0];
		const logLine = `${pin}\t${timestamp}\t0\t15`;

		console.log(`[Action] Punching for PIN ${pin}...`);
		try {
			const res = await fetch(`${TARGET_URL}/cdata?SN=${SN}&table=ATTLOG`, {
				method: 'POST',
				body: logLine
			});
			console.log(`[Success] Server replied: ${await res.text()}`);
		} catch (e: any) {
			console.error(`[Error] Punch failed: ${e.message}`);
		}
	});
}

// Start heartbeats every 10s automatically
setInterval(heartbeat, 10000);

// CLI Control
process.stdin.on('keypress', (str, key) => {
	if (key.ctrl && key.name === 'c') process.exit();
	switch (key.name) {
		case 'h':
			handshake();
			break;
		case 'b':
			heartbeat();
			break;
		case 'p':
			sendPunch();
			break;
		case 'q':
			process.exit();
			break;
	}
});

if (process.stdin.isTTY) process.stdin.setRawMode(true);
readline.emitKeypressEvents(process.stdin);
