import { db } from '$lib/server/db';
import { vehicles } from '$lib/server/db/schema';
import { eq, desc, ilike, or, sql } from 'drizzle-orm';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const rawVehicleNumber = url.searchParams.get('vehicleNumber') || '';
	const vehicleNumber = rawVehicleNumber.trim();

	if (!vehicleNumber || vehicleNumber.length < 3) {
		return json({ found: false, history: [] });
	}

	const rankSql = sql<number>`GREATEST(
		similarity(COALESCE(${vehicles.vehicleNumber}, ''), ${vehicleNumber}),
		word_similarity(${vehicleNumber}, COALESCE(${vehicles.vehicleNumber}, ''))
	)`.as('search_rank');

	// Find exact or similar vehicle numbers
	const history = await db
		.select({
			id: vehicles.id,
			vehicleNumber: vehicles.vehicleNumber,
			type: vehicles.type,
			driverName: vehicles.driverName,
			mobile: vehicles.mobile,
			vendorName: vehicles.vendorName,
			cargoDescription: vehicles.cargoDescription,
			entryTime: vehicles.entryTime,
			exitTime: vehicles.exitTime,
			status: vehicles.status,
			date: vehicles.date,
			search_rank: rankSql
		})
		.from(vehicles)
		.where(
			or(
				sql`COALESCE(${vehicles.vehicleNumber}, '') % ${vehicleNumber}`,
				ilike(vehicles.vehicleNumber, `%${vehicleNumber}%`)
			)
		)
		.orderBy(desc(rankSql), desc(vehicles.entryTime))
		.limit(10);

	// Check if there's an exact match currently on premises
	const currentlyInside = history.find(
		(v) =>
			v.vehicleNumber.toLowerCase() === vehicleNumber.toLowerCase() && v.status === 'on_premises'
	);

	// Get most recent entry for this vehicle (exact match)
	const exactMatches = history.filter(
		(v) => v.vehicleNumber.toLowerCase() === vehicleNumber.toLowerCase()
	);

	const lastVisit = exactMatches.length > 0 ? exactMatches[0] : null;

	return json({
		found: exactMatches.length > 0,
		currentlyInside: !!currentlyInside,
		currentEntry: currentlyInside || null,
		lastVisit: lastVisit && !currentlyInside ? lastVisit : null,
		totalVisits: exactMatches.length,
		history: exactMatches.slice(0, 5) // Return last 5 visits
	});
};
