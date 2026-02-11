import { db } from '$lib/server/db';
import { devices, deviceCommands, bioTemplates, people } from '$lib/server/db/schema';
import { eq, sql, isNotNull } from 'drizzle-orm';
import { requirePermission } from '$lib/server/rbac';
import { isDeviceOnline } from '$lib/server/device-sync';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	requirePermission(locals, 'users.manage');

	const allDevices = db.select().from(devices).all();

	// Pending command count per device
	const pendingCounts = db
		.select({
			deviceSn: deviceCommands.deviceSn,
			count: sql<number>`COUNT(*)`.as('count')
		})
		.from(deviceCommands)
		.where(eq(deviceCommands.status, 'PENDING'))
		.groupBy(deviceCommands.deviceSn)
		.all();

	const pendingMap = Object.fromEntries(pendingCounts.map(r => [r.deviceSn, r.count]));

	// Template stats
	const templateCount = db
		.select({ count: sql<number>`COUNT(DISTINCT person_id)`.as('count') })
		.from(bioTemplates)
		.get();

	const totalTemplates = db
		.select({ count: sql<number>`COUNT(*)`.as('count') })
		.from(bioTemplates)
		.get();

	const peopleWithBiometric = db
		.select({ count: sql<number>`COUNT(*)`.as('count') })
		.from(people)
		.where(isNotNull(people.biometricId))
		.get();

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
