import { db } from '$lib/server/db';
import { devices, deviceCommands, people, bioTemplates } from '$lib/server/db/schema';
import { Commands } from '$lib/zkteco';
import { sql, eq, isNotNull } from 'drizzle-orm';

/** Device is considered online if last heartbeat was within this threshold */
const ONLINE_THRESHOLD_MS = 15 * 1000; // 15 seconds (device polls every ~2s)

/** Check if a device is online based on its last heartbeat */
export function isDeviceOnline(lastHeartbeat: Date | null): boolean {
	return !!lastHeartbeat && (Date.now() - lastHeartbeat.getTime()) < ONLINE_THRESHOLD_MS;
}

/** Generate sequential integer command IDs (like Python's 1000, 1001, ...) */
async function nextCommandId(): Promise<number> {
	const [row] = await db
		.select({ maxId: sql<number>`COALESCE(MAX(id), 999)` })
		.from(deviceCommands);
	return (row.maxId || 999) + 1;
}

export async function queueDeviceSync(biometricId: string, name: string, cardNo?: string | null) {
	const allDevices = await db.select().from(devices);
	for (const device of allDevices) {
		await db.insert(deviceCommands)
			.values({
				id: await nextCommandId(),
				deviceSn: device.serialNumber,
				commandString: Commands.setUser(biometricId, name, cardNo ?? undefined),
				status: 'PENDING'
			});
	}
}

export async function queueDeviceEnroll(biometricId: string, method: 'face' | 'finger', deviceSn: string) {
	const commandString = method === 'face'
		? Commands.enrollFace(biometricId)
		: Commands.enrollFinger(biometricId);
	
	await db.insert(deviceCommands)
		.values({
			id: await nextCommandId(),
			deviceSn: deviceSn,
			commandString,
			status: 'PENDING'
		});
}

/** Queue DELETE USERINFO on all devices */
export async function queueDeviceDelete(biometricId: string) {
	const allDevices = await db.select().from(devices);
	for (const device of allDevices) {
		await db.insert(deviceCommands)
			.values({
				id: await nextCommandId(),
				deviceSn: device.serialNumber,
				commandString: Commands.deleteUser(biometricId),
				status: 'PENDING'
			});
	}
}

/** Queue all user data + biometric templates to a specific device (for restore/sync) */
export async function queueDeviceRestore(deviceSn: string): Promise<number> {
	let commandCount = 0;

	// Get all people with a biometricId
	const allPeople = await db
		.select()
		.from(people)
		.where(isNotNull(people.biometricId));

	for (const person of allPeople) {
		if (!person.biometricId) continue;

		// Queue USERINFO command
		await db.insert(deviceCommands)
			.values({
				id: await nextCommandId(),
				deviceSn,
				commandString: Commands.setUser(person.biometricId, person.name, person.cardNo ?? undefined),
				status: 'PENDING'
			});
		commandCount++;

		// Queue all stored biometric templates for this person
		const templates = await db
			.select()
			.from(bioTemplates)
			.where(eq(bioTemplates.personId, person.id));

		for (const tmpl of templates) {
			await db.insert(deviceCommands)
				.values({
					id: await nextCommandId(),
					deviceSn,
					commandString: Commands.updateTemplate(tmpl.templateType, tmpl.templateData),
					status: 'PENDING'
				});
			commandCount++;
		}
	}

	return commandCount;
}
