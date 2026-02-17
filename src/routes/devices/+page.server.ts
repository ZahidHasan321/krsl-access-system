import { db } from '$lib/server/db';
import { devices, deviceCommands, bioTemplates, people } from '$lib/server/db/schema';
import { eq, sql, isNotNull } from 'drizzle-orm';
import { requirePermission } from '$lib/server/rbac';
import { isDeviceOnline } from '$lib/server/device-sync';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	requirePermission(locals, 'users.manage');

	const allDevices = await db.select().from(devices);

	// Pending command count per device
	const pendingCounts = await db
		.select({
			deviceSn: deviceCommands.deviceSn,
			count: sql<number>`COUNT(*)`.as('count')
		})
		.from(deviceCommands)
		.where(eq(deviceCommands.status, 'PENDING'))
		.groupBy(deviceCommands.deviceSn);

	const pendingMap = Object.fromEntries(pendingCounts.map(r => [r.deviceSn, r.count]));

	// Template stats
	const [templateCount] = await db
		.select({ count: sql<number>`COUNT(DISTINCT person_id)`.as('count') })
		.from(bioTemplates);

	const [totalTemplates] = await db
		.select({ count: sql<number>`COUNT(*)`.as('count') })
		.from(bioTemplates);

	const [peopleWithBiometric] = await db
		.select({ count: sql<number>`COUNT(*)`.as('count') })
		.from(people)
		.where(isNotNull(people.biometricId));

	return {
		devices: allDevices.map(d => ({
			...d,
			status: isDeviceOnline(d.lastHeartbeat) ? 'online' : 'offline',
			pendingCommands: pendingMap[d.serialNumber] || 0
		})),
		templateStats: {
			peopleWithTemplates: templateCount?.count || 0,
			totalTemplates: totalTemplates?.count || 0,
			peopleWithBiometric: peopleWithBiometric?.count || 0
		}
	};
};
