import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { attendanceLogs, people, personCategories, vehicles, devices } from '$lib/server/db/schema';
import { count, eq, gte, lte, and, or, sql, desc } from 'drizzle-orm';
import { format, subDays } from 'date-fns';
import type { PageServerLoad } from './$types';
import { requirePermission } from '$lib/server/rbac';
import { CATEGORIES } from '$lib/constants/categories';
import { isDeviceOnline } from '$lib/server/device-sync';

export const load: PageServerLoad = async (event) => {
	if (!event.locals.user) {
		return redirect(302, '/login');
	}

	const now = new Date();
	const today = format(now, 'yyyy-MM-dd');
	const sevenDaysAgo = format(subDays(now, 7), 'yyyy-MM-dd');

	// Start/end of today as epoch seconds for exitTime comparisons (cross-midnight)
	const todayStart = new Date(now);
	todayStart.setHours(0, 0, 0, 0);
	const todayEnd = new Date(now);
	todayEnd.setHours(23, 59, 59, 999);

	// Execute all independent dashboard queries concurrently
	const [
		allDevices,
		insideByCategory,
		[totalPeopleCount],
		[vehiclesInsideCount],
		vehiclesByType,
		insideByLocation,
		insideByMethod,
		recentLogs
	] = await Promise.all([
		db.select({ lastHeartbeat: devices.lastHeartbeat }).from(devices),
		db
			.select({
				categoryId: people.categoryId,
				count: count()
			})
			.from(attendanceLogs)
			.innerJoin(people, eq(attendanceLogs.personId, people.id))
			.where(eq(attendanceLogs.status, 'on_premises'))
			.groupBy(people.categoryId),
		db.select({ value: count() }).from(people),
		db.select({ value: count() }).from(vehicles).where(eq(vehicles.status, 'on_premises')),
		db
			.select({
				type: vehicles.type,
				count: count()
			})
			.from(vehicles)
			.where(eq(vehicles.status, 'on_premises'))
			.groupBy(vehicles.type),
		db
			.select({
				location: attendanceLogs.location,
				count: count()
			})
			.from(attendanceLogs)
			.where(eq(attendanceLogs.status, 'on_premises'))
			.groupBy(attendanceLogs.location),
		db
			.select({
				method: attendanceLogs.verifyMethod,
				count: count()
			})
			.from(attendanceLogs)
			.where(eq(attendanceLogs.status, 'on_premises'))
			.groupBy(attendanceLogs.verifyMethod),
		db
			.select({
				id: attendanceLogs.id,
				entryTime: attendanceLogs.entryTime,
				exitTime: attendanceLogs.exitTime,
				status: attendanceLogs.status,
				personName: people.name,
				personId: people.id,
				categoryName: personCategories.name
			})
			.from(attendanceLogs)
			.innerJoin(people, eq(attendanceLogs.personId, people.id))
			.innerJoin(personCategories, eq(people.categoryId, personCategories.id))
			.orderBy(desc(attendanceLogs.entryTime))
			.limit(8)
	]);

	const anyDeviceOnline = allDevices.some((d) => isDeviceOnline(d.lastHeartbeat));

	const countMap = new Map(insideByCategory.map((r) => [r.categoryId, r.count]));

	// Build category tree with counts rolling up using hardcoded CATEGORIES
	const roots = CATEGORIES.filter((c) => !c.parentId);

	type CategoryNode = {
		id: string;
		name: string;
		slug: string;
		color: string;
		count: number;
		directCount: number;
		children: CategoryNode[];
	};

	function getDescendantCount(catId: string): number {
		let total = countMap.get(catId) || 0;
		for (const child of CATEGORIES.filter((c) => c.parentId === catId)) {
			total += getDescendantCount(child.id);
		}
		return total;
	}

	function buildChildren(parentId: string): CategoryNode[] {
		return CATEGORIES.filter((c) => c.parentId === parentId).map((c) => {
			const children = buildChildren(c.id);
			const directCount = countMap.get(c.id) || 0;
			const totalCount = getDescendantCount(c.id);
			return {
				id: c.id,
				name: c.name,
				slug: c.slug,
				color: c.color,
				count: totalCount,
				directCount,
				children
			};
		});
	}

	const categoryTree: CategoryNode[] = roots.map((r) => {
		const children = buildChildren(r.id);
		const totalCount = getDescendantCount(r.id);
		const directCount = countMap.get(r.id) || 0;
		return {
			id: r.id,
			name: r.name,
			slug: r.slug,
			color: r.color,
			count: totalCount,
			directCount,
			children
		};
	});

	const totalPeopleInside = categoryTree.reduce((acc, c) => acc + c.count, 0);

	const vehicleStats = {
		total: vehiclesInsideCount.value,
		transport: vehiclesByType.find((v) => v.type === 'transport')?.count || 0,
		regular: vehiclesByType.find((v) => v.type === 'regular')?.count || 0
	};

	const locationStats = {
		ship: insideByLocation.find((l) => l.location === 'ship')?.count || 0,
		yard: insideByLocation.find((l) => l.location === 'yard')?.count || 0,
		unknown: insideByLocation.find((l) => !l.location)?.count || 0
	};

	const methodStats = {
		finger: insideByMethod.find((m) => m.method === 'finger')?.count || 0,
		face: insideByMethod.find((m) => m.method === 'face')?.count || 0,
		card: insideByMethod.find((m) => m.method === 'card')?.count || 0,
		manual: insideByMethod.find((m) => m.method === 'manual')?.count || 0,
		unknown: insideByMethod.find((m) => m.method === 'password' || !m.method)?.count || 0
	};

	return {
		currentlyInside: {
			totalPeople: totalPeopleInside,
			categoryTree,
			totalVehicles: vehiclesInsideCount.value,
			vehicleStats
		},
		totalPeople: totalPeopleCount.value,
		locationStats,
		methodStats,
		recentLogs,
		anyDeviceOnline
	};
};
