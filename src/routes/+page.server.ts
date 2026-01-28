import { db } from '$lib/server/db';
import { labourLogs, visitorLogs, vehicles } from '$lib/server/db/schema';
import { count, eq, gte, sql } from 'drizzle-orm';
import { format, subDays, eachDayOfInterval, startOfMonth } from 'date-fns';
import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.user) {
        throw redirect(302, '/demo/lucia/login');
    }
    const today = format(new Date(), 'yyyy-MM-dd');
    const thirtyDaysAgo = format(subDays(new Date(), 29), 'yyyy-MM-dd');
    const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');

    // Current On-Premises Counts
    const [laboursInsideCount] = await db
        .select({ value: count() })
        .from(labourLogs)
        .where(eq(labourLogs.status, 'on_premises'));

    const [visitorsInsideCount] = await db
        .select({ value: count() })
        .from(visitorLogs)
        .where(eq(visitorLogs.status, 'on_premises'));

    const [vehiclesInsideCount] = await db
        .select({ value: count() })
        .from(vehicles)
        .where(eq(vehicles.status, 'on_premises'));

    // Today's Total Entries
    const [laboursToday] = await db
        .select({ value: count() })
        .from(labourLogs)
        .where(eq(labourLogs.date, today));

    const [visitorsToday] = await db
        .select({ value: count() })
        .from(visitorLogs)
        .where(eq(visitorLogs.date, today));

    const [vehiclesToday] = await db
        .select({ value: count() })
        .from(vehicles)
        .where(eq(vehicles.date, today));

    // Monthly Total Traffic
    const [labourMonthlyTraffic] = await db
        .select({ value: count() })
        .from(labourLogs)
        .where(gte(labourLogs.date, monthStart));

    const [visitorMonthlyTraffic] = await db
        .select({ value: count() })
        .from(visitorLogs)
        .where(gte(visitorLogs.date, monthStart));

    const [vehicleMonthlyTraffic] = await db
        .select({ value: count() })
        .from(vehicles)
        .where(gte(vehicles.date, monthStart));

    // 30 Day Trends
    const labourTrendsRaw = await db
        .select({ date: labourLogs.date, count: count() })
        .from(labourLogs)
        .where(gte(labourLogs.date, thirtyDaysAgo))
        .groupBy(labourLogs.date);

    const visitorTrendsRaw = await db
        .select({ date: visitorLogs.date, count: count() })
        .from(visitorLogs)
        .where(gte(visitorLogs.date, thirtyDaysAgo))
        .groupBy(visitorLogs.date);

    const vehicleTrendsRaw = await db
        .select({ date: vehicles.date, count: count() })
        .from(vehicles)
        .where(gte(vehicles.date, thirtyDaysAgo))
        .groupBy(vehicles.date);

    const dateInterval = eachDayOfInterval({
        start: subDays(new Date(), 29),
        end: new Date()
    }).map(d => format(d, 'yyyy-MM-dd'));

    const trends = dateInterval.map(date => ({
        date,
        labours: labourTrendsRaw.find(t => t.date === date)?.count || 0,
        visitors: visitorTrendsRaw.find(t => t.date === date)?.count || 0,
        vehicles: vehicleTrendsRaw.find(t => t.date === date)?.count || 0
    }));

    return {
        counts: {
            labours: laboursInsideCount.value,
            visitors: visitorsInsideCount.value,
            vehicles: vehiclesInsideCount.value
        },
        today: {
            labours: laboursToday.value,
            visitors: visitorsToday.value,
            vehicles: vehiclesToday.value
        },
        monthlyTraffic: {
            labours: labourMonthlyTraffic.value,
            visitors: visitorMonthlyTraffic.value,
            vehicles: vehicleMonthlyTraffic.value
        },
        trends
    };
};