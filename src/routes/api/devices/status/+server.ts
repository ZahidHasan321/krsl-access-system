import { db } from '$lib/server/db';
import { devices } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ locals }) => {
	if (!locals.user) {
		return new Response('Unauthorized', { status: 401 });
	}

	const onlineDevices = db
		.select({ id: devices.id, name: devices.name, serialNumber: devices.serialNumber })
		.from(devices)
		.where(eq(devices.status, 'online'))
		.all();

	return new Response(JSON.stringify({
		online: onlineDevices.length > 0,
		count: onlineDevices.length,
		devices: onlineDevices
	}), {
		headers: { 'Content-Type': 'application/json' }
	});
};
