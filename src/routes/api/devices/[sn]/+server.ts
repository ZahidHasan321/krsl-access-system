import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { devices, deviceCommands } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { requirePermission } from '$lib/server/rbac';

export async function DELETE({ locals, params }) {
	requirePermission(locals, 'users.manage');

	const { sn } = params;

	try {
        await db.delete(deviceCommands).where(eq(deviceCommands.deviceSn, sn));
		await db.delete(devices).where(eq(devices.serialNumber, sn));
		return json({ success: true });
	} catch (error: any) {
		console.error('Failed to delete device:', error);
		return json({ error: 'Failed to delete device' }, { status: 500 });
	}
}