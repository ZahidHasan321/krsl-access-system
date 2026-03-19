import { db } from '$lib/server/db';
import { devices, deviceCommands, people, bioTemplates } from '$lib/server/db/schema';
import { Commands } from '$lib/zkteco';
import { eq, isNotNull } from 'drizzle-orm';

/** Device is considered online if last heartbeat was within this threshold */
const ONLINE_THRESHOLD_MS = 15 * 1000; // 15 seconds (device polls every ~2s)

/** Check if a device is online based on its last heartbeat */
export function isDeviceOnline(lastHeartbeat: Date | null): boolean {
	return !!lastHeartbeat && Date.now() - lastHeartbeat.getTime() < ONLINE_THRESHOLD_MS;
}

/** Insert a device command, letting PostgreSQL's serial sequence auto-generate the ID */
async function insertCommand(deviceSn: string, commandString: string) {
	return db.insert(deviceCommands).values({
		deviceSn,
		commandString,
		status: 'PENDING'
	});
}

export async function queueDeviceSync(biometricId: string, name: string, cardNo?: string | null) {
	const allDevices = await db.select().from(devices);
	const commandString = Commands.setUser(biometricId, name, cardNo ?? undefined);
	await Promise.all(
		allDevices.map((device) => insertCommand(device.serialNumber, commandString))
	);
}

export async function queueDeviceEnroll(biometricId: string, method: 'face' | 'finger') {
	const allDevices = await db.select().from(devices);
	const commandString =
		method === 'face' ? Commands.enrollFace(biometricId) : Commands.enrollFinger(biometricId);
	await Promise.all(
		allDevices.map((device) => insertCommand(device.serialNumber, commandString))
	);
}

/** Queue DELETE USERINFO on all devices */
export async function queueDeviceDelete(biometricId: string) {
	const allDevices = await db.select().from(devices);
	const commandString = Commands.deleteUser(biometricId);
	await Promise.all(
		allDevices.map((device) => insertCommand(device.serialNumber, commandString))
	);
}

/** Queue all user data + biometric templates to a specific device (for restore/sync) */
export async function queueDeviceRestore(deviceSn: string): Promise<number> {
	let commandCount = 0;

	// Get all people with a biometricId, along with their templates in one query
	const allPeople = await db.select().from(people).where(isNotNull(people.biometricId));

	for (const person of allPeople) {
		if (!person.biometricId) continue;

		// Queue USERINFO command
		await insertCommand(
			deviceSn,
			Commands.setUser(person.biometricId, person.name, person.cardNo ?? undefined)
		);
		commandCount++;

		// Queue all stored biometric templates for this person
		const templates = await db
			.select()
			.from(bioTemplates)
			.where(eq(bioTemplates.personId, person.id));

		for (const tmpl of templates) {
			await insertCommand(
				deviceSn,
				Commands.updateTemplate(tmpl.templateType, tmpl.templateData)
			);
			commandCount++;
		}
	}

	return commandCount;
}
