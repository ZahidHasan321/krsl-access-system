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
		registeredByCategory,
		[totalPeopleCount],
		[vehiclesInsideCount],
		vehiclesByType,
		insideByLocation,
		insideByMethod,
		insideByDepartment,
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
		db
			.select({
				categoryId: people.categoryId,
				count: count()
			})
			.from(people)
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
				department: people.department,
				count: count()
			})
			.from(attendanceLogs)
			.innerJoin(people, eq(attendanceLogs.personId, people.id))
			.where(eq(attendanceLogs.status, 'on_premises'))
			.groupBy(people.department)
			.orderBy(desc(count())),
		db
			.select({
				id: attendanceLogs.id,
				entryTime: attendanceLogs.entryTime,
				exitTime: attendanceLogs.exitTime,
				status: attendanceLogs.status,
				verifyMethod: attendanceLogs.verifyMethod,
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

	const insideCountMap = new Map(insideByCategory.map((r) => [r.categoryId, r.count]));
	const registeredCountMap = new Map(registeredByCategory.map((r) => [r.categoryId, r.count]));

	// Build category tree with counts rolling up using hardcoded CATEGORIES
	const roots = CATEGORIES.filter((c) => !c.parentId);

	type CategoryNode = {
		id: string;
		name: string;
		slug: string;
		color: string;
		count: number; // Inside count
		registeredCount: number; // Total registered count
		directCount: number;
		directRegisteredCount: number;
		children: CategoryNode[];
	};

	function getDescendantCounts(catId: string): { inside: number; registered: number } {
		let inside = insideCountMap.get(catId) || 0;
		let registered = registeredCountMap.get(catId) || 0;
		for (const child of CATEGORIES.filter((c) => c.parentId === catId)) {
			const childCounts = getDescendantCounts(child.id);
			inside += childCounts.inside;
			registered += childCounts.registered;
		}
		return { inside, registered };
	}

	function buildChildren(parentId: string): CategoryNode[] {
		return CATEGORIES.filter((c) => c.parentId === parentId).map((c) => {
			const children = buildChildren(c.id);
			const directCount = insideCountMap.get(c.id) || 0;
			const directRegisteredCount = registeredCountMap.get(c.id) || 0;
			const totalCounts = getDescendantCounts(c.id);
			return {
				id: c.id,
				name: c.name,
				slug: c.slug,
				color: c.color,
				count: totalCounts.inside,
				registeredCount: totalCounts.registered,
				directCount,
				directRegisteredCount,
				children
			};
		});
	}

	const categoryTree: CategoryNode[] = roots.map((r) => {
		const children = buildChildren(r.id);
		const totalCounts = getDescendantCounts(r.id);
		const directCount = insideCountMap.get(r.id) || 0;
		const directRegisteredCount = registeredCountMap.get(r.id) || 0;
		return {
			id: r.id,
			name: r.name,
			slug: r.slug,
			color: r.color,
			count: totalCounts.inside,
			registeredCount: totalCounts.registered,
			directCount,
			directRegisteredCount,
			children
		};
	});

	const totalPeopleInside = categoryTree.reduce((acc, c) => acc + c.count, 0);
	const totalPeopleRegistered = categoryTree.reduce((acc, c) => acc + c.registeredCount, 0);

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
		finger: insideByMethod.filter((m) => m.method === 'finger').reduce((acc, m) => acc + m.count, 0),
		face: insideByMethod.filter((m) => m.method === 'face').reduce((acc, m) => acc + m.count, 0),
		card: insideByMethod.filter((m) => m.method === 'card').reduce((acc, m) => acc + m.count, 0),
		manual: insideByMethod.filter((m) => m.method === 'manual').reduce((acc, m) => acc + m.count, 0),
		unknown: insideByMethod
			.filter((m) => m.method === 'password' || m.method === 'finger_vein' || !m.method)
			.reduce((acc, m) => acc + m.count, 0)
	};

	return {
		currentlyInside: {
			totalPeople: totalPeopleInside,
			categoryTree,
			insideByDepartment,
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
