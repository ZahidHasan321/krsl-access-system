import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { devices } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { buildHandshakeResponse } from '$lib/zkteco';

/** POST — Device Registry / Handshake */
export const POST: RequestHandler = async ({ url, request }) => {
	const sn = url.searchParams.get('SN');
	if (!sn) return new Response('Missing SN', { status: 400 });

	console.log(`[ZK:Registry] Device ${sn} registering`);

	// Log the registry info sent by device
	try {
		const body = await request.text();
		console.log(`[ZK:Registry] Data from ${sn}:
${body.substring(0, 200)}...`);
	} catch (e) {
		console.error(`[ZK:Registry] Error reading body`, e);
	}

	// Upsert device (ensure it exists)
	const existing = db
		.select()
		.from(devices)
		.where(eq(devices.serialNumber, sn))
		.get();

	if (existing) {
		db.update(devices)
			.set({ lastHeartbeat: new Date(), status: 'online' })
			.where(eq(devices.serialNumber, sn))
			.run();
	} else {
		db.insert(devices)
			.values({
				id: crypto.randomUUID(),
				serialNumber: sn,
				name: `Device ${sn}`,
				lastHeartbeat: new Date(),
				status: 'online'
			})
			.run();
	}

	const response = buildHandshakeResponse(sn);
	console.log(`[ZK:Registry] Response to ${sn}:
${response.replace(/\n/g, ' | ')}`);

	return new Response(response, {
		headers: { 'Content-Type': 'text/plain' }
	});
};
