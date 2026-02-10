import type { RequestHandler } from './$types';
import { requirePermission } from '$lib/server/rbac';
import { queueDeviceRestore } from '$lib/server/device-sync';
import { db } from '$lib/server/db';
import { devices } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request, locals }) => {
	requirePermission(locals, 'users.manage');

	const { deviceSn } = await request.json();
	if (!deviceSn || typeof deviceSn !== 'string') {
		return new Response(JSON.stringify({ error: 'deviceSn is required' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	// Verify device exists
	const device = db.select().from(devices).where(eq(devices.serialNumber, deviceSn)).get();
	if (!device) {
		return new Response(JSON.stringify({ error: 'Device not found' }), {
			status: 404,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const count = queueDeviceRestore(deviceSn);

	return new Response(JSON.stringify({ success: true, commandsQueued: count }), {
		headers: { 'Content-Type': 'application/json' }
	});
};
