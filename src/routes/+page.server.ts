import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { labourLogs, visitorLogs, vehicles } from '$lib/server/db/schema';
import { count, eq, sql, and, gte } from 'drizzle-orm';
import { format, subDays } from 'date-fns';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	if (!event.locals.user) {
		return redirect(302, '/login');
	}

	const today = format(new Date(), 'yyyy-MM-dd');
	const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');
	const monthStart = format(new Date(), 'yyyy-MM-01');

	// Current on-premises counts
	const [laboursCount] = await db
		.select({ value: count() })
		.from(labourLogs)
		.where(eq(labourLogs.status, 'on_premises'));

	const [visitorsCount] = await db
		.select({ value: count() })
		.from(visitorLogs)
		.where(eq(visitorLogs.status, 'on_premises'));

	const [vehiclesCount] = await db
		.select({ value: count() })
		.from(vehicles)
		.where(eq(vehicles.status, 'on_premises'));

	// Today's entry counts
	const [todayLabours] = await db
		.select({ value: count() })
		.from(labourLogs)
		.where(eq(labourLogs.date, today));

	const [todayVisitors] = await db
		.select({ value: count() })
		.from(visitorLogs)
		.where(eq(visitorLogs.date, today));

	const [todayVehicles] = await db
		.select({ value: count() })
		.from(vehicles)
		.where(eq(vehicles.date, today));

	// 30-day trends
	const labourTrends = await db
		.select({ date: labourLogs.date, value: count() })
		.from(labourLogs)
		.where(gte(labourLogs.date, thirtyDaysAgo))
		.groupBy(labourLogs.date);

	const visitorTrends = await db
		.select({ date: visitorLogs.date, value: count() })
		.from(visitorLogs)
		.where(gte(visitorLogs.date, thirtyDaysAgo))
		.groupBy(visitorLogs.date);

	const vehicleTrends = await db
		.select({ date: vehicles.date, value: count() })
		.from(vehicles)
		.where(gte(vehicles.date, thirtyDaysAgo))
		.groupBy(vehicles.date);

	// Build trend array for the last 30 days
	const labourMap = new Map(labourTrends.map((r) => [r.date, r.value]));
	const visitorMap = new Map(visitorTrends.map((r) => [r.date, r.value]));
	const vehicleMap = new Map(vehicleTrends.map((r) => [r.date, r.value]));

	const trends = [];
	for (let i = 30; i >= 0; i--) {
		const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
		trends.push({
			date,
			labours: labourMap.get(date) || 0,
			visitors: visitorMap.get(date) || 0,
			vehicles: vehicleMap.get(date) || 0
		});
	}

	// Current month traffic
	const [monthLabours] = await db
		.select({ value: count() })
		.from(labourLogs)
		.where(gte(labourLogs.date, monthStart));

	const [monthVisitors] = await db
		.select({ value: count() })
		.from(visitorLogs)
		.where(gte(visitorLogs.date, monthStart));

	const [monthVehicles] = await db
		.select({ value: count() })
		.from(vehicles)
		.where(gte(vehicles.date, monthStart));

	return {
		counts: {
			labours: laboursCount.value,
			visitors: visitorsCount.value,
			vehicles: vehiclesCount.value
		},
		today: {
			labours: todayLabours.value,
			visitors: todayVisitors.value,
			vehicles: todayVehicles.value
		},
		trends,
		monthlyTraffic: {
			labours: monthLabours.value,
			visitors: monthVisitors.value,
			vehicles: monthVehicles.value
		}
	};
};
