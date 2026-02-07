import { db } from '$lib/server/db';
import { devices, deviceCommands } from '$lib/server/db/schema';
import { Commands } from '$lib/zkteco';
import { sql } from 'drizzle-orm';

/** Generate sequential integer command IDs (like Python's 1000, 1001, ...) */
function nextCommandId(): string {
	const [row] = db
		.select({ maxId: sql<number>`COALESCE(MAX(CAST(id AS INTEGER)), 999)` })
		.from(deviceCommands)
		.all();
	return String((row.maxId || 999) + 1);
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
