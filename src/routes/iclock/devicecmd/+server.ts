import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { deviceCommands, people } from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';
import { Commands } from '$lib/zkteco';
import { notifyEnrollment, notifyEnrollmentFailed } from '$lib/server/events';

function nextCommandId(): number {
	const [row] = db
		.select({ maxId: sql<number>`COALESCE(MAX(id), 999)` })
		.from(deviceCommands)
		.all();
	return (row.maxId || 999) + 1;
}

/** POST — Command confirmation from device */
export const POST: RequestHandler = async ({ request, url }) => {
	const body = await request.text();
	const sn = url.searchParams.get('SN');

	// Parse: ID=<cmd_id>&Return=<code>&CMD=<string>
	const params = new URLSearchParams(body);
	const cmdIdRaw = params.get('ID');
	const cmdId = cmdIdRaw ? Number(cmdIdRaw) : null;
	const returnCode = params.get('Return');

	if (cmdId) {
		const newStatus = returnCode === '0' ? 'SUCCESS' : 'FAILED';
		console.log(`[ZK:Result] Command ${cmdId} finished with status ${newStatus} (Return=${returnCode})`);

		// Fetch the command to see what it was
		const cmd = db
			.select()
			.from(deviceCommands)
			.where(eq(deviceCommands.id, cmdId))
			.get();

		db.update(deviceCommands)
			.set({ status: newStatus as 'SUCCESS' | 'FAILED', updatedAt: new Date() })
			.where(eq(deviceCommands.id, cmdId))
			.run();

		// Handle enrollment command results
		const isEnrollCmd = cmd && (cmd.commandString.startsWith('ENROLL_FP') || cmd.commandString.startsWith('ENROLL_BIO') || cmd.commandString.startsWith('ENROLL_MF'));
		if (sn && isEnrollCmd) {
			const match = cmd.commandString.match(/PIN=(\w+)/);
			const pin = match ? match[1] : null;

			if (pin) {
				const person = db
					.select()
					.from(people)
					.where(eq(people.biometricId, pin))
					.get();

				if (newStatus === 'SUCCESS' && person) {
					// Enrollment succeeded — create/sync user on device
					db.insert(deviceCommands)
						.values({
							id: nextCommandId(),
							deviceSn: sn,
							commandString: Commands.setUser(pin, person.name),
							status: 'PENDING'
						})
						.run();

					// Determine method from command string
					const method = cmd.commandString.includes('FID=111') ? 'face'
						: cmd.commandString.includes('ENROLL_BIO') ? 'face'
						: 'finger';

					// Update enrolledMethods in DB
					let methods: string[] = [];
					try { methods = person.enrolledMethods ? JSON.parse(person.enrolledMethods) : []; } catch { methods = []; }
					if (!methods.includes(method)) {
						methods.push(method);
						db.update(people)
							.set({ enrolledMethods: JSON.stringify(methods) })
							.where(eq(people.id, person.id))
							.run();
					}

					// Notify UI — enrollment complete
					notifyEnrollment({ personId: person.id, method });
				} else if (newStatus === 'FAILED' && person) {
					// Enrollment failed — notify UI so it can stop spinning
					console.log(`[ZK:Enroll] Enrollment FAILED for ${person.name} (PIN=${pin}, Return=${returnCode})`);
					notifyEnrollmentFailed({ personId: person.id, returnCode: returnCode || 'unknown' });
				}
			}
		}
	}

	return new Response('OK', { headers: { 'Content-Type': 'text/plain' } });
};
