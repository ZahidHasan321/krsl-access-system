import { db } from '$lib/server/db';
import { devices } from '$lib/server/db/schema';
import { isDeviceOnline } from '$lib/server/device-sync';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return new Response('Unauthorized', { status: 401 });
	}

	const allDevices = await db
		.select({ id: devices.id, name: devices.name, serialNumber: devices.serialNumber, lastHeartbeat: devices.lastHeartbeat })
		.from(devices);

	const onlineDevices = allDevices.map(d => ({
		...d,
		isOnline: isDeviceOnline(d.lastHeartbeat)
	}));

	return new Response(JSON.stringify({
		online: onlineDevices.some(d => d.isOnline),
		count: onlineDevices.filter(d => d.isOnline).length,
		devices: onlineDevices
	}), {
		headers: { 'Content-Type': 'application/json' }
	});
};
