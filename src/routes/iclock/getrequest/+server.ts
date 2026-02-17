import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { devices, deviceCommands } from '$lib/server/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { formatCommand } from '$lib/zkteco';

/** GET — Heartbeat + command dispatch */
export const GET: RequestHandler = async ({ url }) => {
	const sn = url.searchParams.get('SN');
	if (!sn) return new Response('Missing SN', { status: 400 });

	// Update heartbeat
	await db.update(devices)
		.set({ lastHeartbeat: new Date(), status: 'online' })
		.where(eq(devices.serialNumber, sn));

	// Find oldest pending command for this device
	const [cmd] = await db
		.select()
		.from(deviceCommands)
		.where(
			and(
				eq(deviceCommands.deviceSn, sn),
				eq(deviceCommands.status, 'PENDING')
			)
		)
		.orderBy(asc(deviceCommands.createdAt))
		.limit(1);

	if (cmd) {
		// Mark as SENT
		await db.update(deviceCommands)
			.set({ status: 'SENT', updatedAt: new Date() })
			.where(eq(deviceCommands.id, cmd.id));

		console.log(`[ZK:Command] Sending command to ${sn}: ${cmd.commandString}`);

		const responseBody = formatCommand(cmd.id, cmd.commandString);
		return new Response(responseBody, {
			headers: { 
				'Content-Type': 'text/plain',
				'Content-Length': responseBody.length.toString(),
				'X-Accel-Buffering': 'no',
				'Cache-Control': 'no-cache, no-store, must-revalidate',
				'Connection': 'close'
			}
		});
	}

	const okBody = 'OK\r\n';
	return new Response(okBody, { 
		headers: { 
			'Content-Type': 'text/plain',
			'Content-Length': okBody.length.toString(),
			'X-Accel-Buffering': 'no'
		} 
	});
};
