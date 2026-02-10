import { db } from '$lib/server/db';
import { devices, deviceCommands, people, bioTemplates } from '$lib/server/db/schema';
import { Commands } from '$lib/zkteco';
import { sql, eq, isNotNull } from 'drizzle-orm';

/** Generate sequential integer command IDs (like Python's 1000, 1001, ...) */
function nextCommandId(): number {
	const [row] = db
		.select({ maxId: sql<number>`COALESCE(MAX(id), 999)` })
		.from(deviceCommands)
		.all();
	return (row.maxId || 999) + 1;
}

export function queueDeviceSync(biometricId: string, name: string, cardNo?: string | null) {
	const allDevices = db.select().from(devices).all();
	for (const device of allDevices) {
		db.insert(deviceCommands)
			.values({
				id: nextCommandId(),
				deviceSn: device.serialNumber,
				commandString: Commands.setUser(biometricId, name, cardNo ?? undefined),
				status: 'PENDING'
			})
			.run();
	}
}

export function queueDeviceEnroll(biometricId: string, method: 'face' | 'finger') {
	const allDevices = db.select().from(devices).all();
	for (const device of allDevices) {
		const commandString = method === 'face'
			? Commands.enrollFace(biometricId)
			: Commands.enrollFinger(biometricId);
		db.insert(deviceCommands)
			.values({
				id: nextCommandId(),
				deviceSn: device.serialNumber,
				commandString,
				status: 'PENDING'
			})
			.run();
	}
}

/** Queue DELETE USERINFO on all devices */
export function queueDeviceDelete(biometricId: string) {
	const allDevices = db.select().from(devices).all();
	for (const device of allDevices) {
		db.insert(deviceCommands)
			.values({
				id: nextCommandId(),
				deviceSn: device.serialNumber,
				commandString: Commands.deleteUser(biometricId),
				status: 'PENDING'
			})
			.run();
	}
}

/** Queue all user data + biometric templates to a specific device (for restore/sync) */
export function queueDeviceRestore(deviceSn: string): number {
	let commandCount = 0;

	// Get all people with a biometricId
	const allPeople = db
		.select()
		.from(people)
		.where(isNotNull(people.biometricId))
		.all();

	for (const person of allPeople) {
		if (!person.biometricId) continue;

		// Queue USERINFO command
		db.insert(deviceCommands)
			.values({
				id: nextCommandId(),
				deviceSn,
				commandString: Commands.setUser(person.biometricId, person.name, person.cardNo ?? undefined),
				status: 'PENDING'
			})
			.run();
		commandCount++;

		// Queue all stored biometric templates for this person
		const templates = db
			.select()
			.from(bioTemplates)
			.where(eq(bioTemplates.personId, person.id))
			.all();

		for (const tmpl of templates) {
			db.insert(deviceCommands)
				.values({
					id: nextCommandId(),
					deviceSn,
					commandString: Commands.updateTemplate(tmpl.templateType, tmpl.templateData),
					status: 'PENDING'
				})
				.run();
			commandCount++;
		}
	}

	return commandCount;
}
