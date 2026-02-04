import { db } from '$lib/server/db';
import { vehicles } from '$lib/server/db/schema';
import { eq, desc, like } from 'drizzle-orm';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
    const vehicleNumber = url.searchParams.get('vehicleNumber');

    if (!vehicleNumber || vehicleNumber.length < 3) {
        return json({ found: false, history: [] });
    }

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
            date: vehicles.date
        })
        .from(vehicles)
        .where(like(vehicles.vehicleNumber, `%${vehicleNumber}%`))
        .orderBy(desc(vehicles.entryTime))
        .limit(10);

    // Check if there's an exact match currently on premises
    const currentlyInside = history.find(
        v => v.vehicleNumber.toLowerCase() === vehicleNumber.toLowerCase() && v.status === 'on_premises'
    );

    // Get most recent entry for this vehicle (exact match)
    const exactMatches = history.filter(
        v => v.vehicleNumber.toLowerCase() === vehicleNumber.toLowerCase()
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
