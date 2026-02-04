import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { attendanceLogs, people, personCategories, vehicles } from '$lib/server/db/schema';
import { count, eq, gte, lte, and, or, sql, desc } from 'drizzle-orm';
import { format, subDays } from 'date-fns';
import type { PageServerLoad } from './$types';
import { requirePermission } from '$lib/server/rbac';
import { CATEGORIES } from '$lib/constants/categories';

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

	// Currently inside people - grouped by their direct category
	const insideByCategory = await db
		.select({
			categoryId: people.categoryId,
			count: count()
		})
		.from(attendanceLogs)
		.innerJoin(people, eq(attendanceLogs.personId, people.id))
		.where(eq(attendanceLogs.status, 'on_premises'))
		.groupBy(people.categoryId);

	const countMap = new Map(insideByCategory.map(r => [r.categoryId, r.count]));

	// Build category tree with counts rolling up using hardcoded CATEGORIES
	const roots = CATEGORIES.filter(c => !c.parentId);

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
		for (const child of CATEGORIES.filter(c => c.parentId === catId)) {
			total += getDescendantCount(child.id);
		}
		return total;
	}

	function buildChildren(parentId: string): CategoryNode[] {
		return CATEGORIES
			.filter(c => c.parentId === parentId)
			.map(c => {
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

	const categoryTree: CategoryNode[] = roots.map(r => {
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

	// Total registered people
	const [totalPeopleCount] = await db
		.select({ value: count() })
		.from(people);

	// Currently Inside - Vehicles
	const [vehiclesInsideCount] = await db
		.select({ value: count() })
		.from(vehicles)
		.where(eq(vehicles.status, 'on_premises'));

	const vehiclesByType = await db
		.select({
			type: vehicles.type,
			count: count()
		})
		.from(vehicles)
		.where(eq(vehicles.status, 'on_premises'))
		.groupBy(vehicles.type);

	const vehicleStats = {
		total: vehiclesInsideCount.value,
		transport: vehiclesByType.find(v => v.type === 'transport')?.count || 0,
		regular: vehiclesByType.find(v => v.type === 'regular')?.count || 0
	};

	// Today's Activity
	const [todayEntries] = await db
		.select({ value: count() })
		.from(attendanceLogs)
		.where(eq(attendanceLogs.date, today));

	// Exits today: count logs where exitTime falls within today (handles cross-midnight)
	const [todayExits] = await db
		.select({ value: count() })
		.from(attendanceLogs)
		.where(and(
			eq(attendanceLogs.status, 'checked_out'),
			gte(attendanceLogs.exitTime, todayStart),
			lte(attendanceLogs.exitTime, todayEnd)
		));

	const [todayVehiclesIn] = await db
		.select({ value: count() })
		.from(vehicles)
		.where(eq(vehicles.date, today));

	const [todayVehiclesOut] = await db
		.select({ value: count() })
		.from(vehicles)
		.where(and(eq(vehicles.date, today), eq(vehicles.status, 'checked_out')));

	// 7-Day Trend with dates
	const trendData = await db
		.select({
			date: attendanceLogs.date,
			count: count()
		})
		.from(attendanceLogs)
		.where(gte(attendanceLogs.date, sevenDaysAgo))
		.groupBy(attendanceLogs.date)
		.orderBy(attendanceLogs.date);

	const trendMap = new Map(trendData.map(d => [d.date, d.count]));
	const trend7Day = Array.from({ length: 7 }, (_, i) => {
		const date = format(subDays(new Date(), 6 - i), 'yyyy-MM-dd');
		return { date, count: trendMap.get(date) || 0 };
	});

	// Recent activity: entries from today + cross-midnight (entered before today, exited today or still inside)
	const recentLogs = await db
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
		.where(or(
			// Entered today
			eq(attendanceLogs.date, today),
			// Still on premises (entered earlier, not yet checked out)
			eq(attendanceLogs.status, 'on_premises'),
			// Exited today but entered before today (cross-midnight)
			and(
				eq(attendanceLogs.status, 'checked_out'),
				gte(attendanceLogs.exitTime, todayStart),
				lte(attendanceLogs.exitTime, todayEnd)
			)
		))
		.orderBy(desc(attendanceLogs.entryTime))
		.limit(8);

	    return {
			currentlyInside: {
				totalPeople: totalPeopleInside,
				categoryTree,
				totalVehicles: vehiclesInsideCount.value,
				vehicleStats
			},
			totalPeople: totalPeopleCount.value,
			todayActivity: {
				entries: todayEntries.value,
				exits: todayExits.value,
				stillInside: totalPeopleInside,
				vehiclesIn: todayVehiclesIn.value,
				vehiclesOut: todayVehiclesOut.value
			},
			trend7Day,
			recentLogs
		};
	};

