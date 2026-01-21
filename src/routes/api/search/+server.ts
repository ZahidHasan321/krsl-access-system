import { db } from '$lib/server/db';
import { labours, visitorProfiles, vehicles } from '$lib/server/db/schema';
import { like, or } from 'drizzle-orm';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
    const query = url.searchParams.get('q');
    
    if (!query || query.length < 2) {
        return json([]);
    }

    const searchPattern = `%${query}%`;

    const [foundLabours, foundVisitors, foundVehicles] = await Promise.all([
        db.select({
            id: labours.id,
            name: labours.name,
            detail: labours.codeNo,
            type: labours.type
        })
        .from(labours)
        .where(or(
            like(labours.name, searchPattern),
            like(labours.codeNo, searchPattern)
        ))
        .limit(5),

        db.select({
            id: visitorProfiles.id,
            name: visitorProfiles.name,
            detail: visitorProfiles.contactNo,
            type: visitorProfiles.visitorType
        })
        .from(visitorProfiles)
        .where(or(
            like(visitorProfiles.name, searchPattern),
            like(visitorProfiles.contactNo, searchPattern),
            like(visitorProfiles.company, searchPattern)
        ))
        .limit(5),

        db.select({
            id: vehicles.id, // Note: vehicles table usually doesn't have a profile page, but we search logs directly here? 
                             // Wait, vehicles table in schema acts as log but maybe used as registry?
                             // Schema says 'vehicles' is for logs. There is no vehicle registry table. 
                             // So we search distinct vehicles from logs? 
                             // Or just search recent logs. 
                             // Let's look at schema again. 
            name: vehicles.vehicleNumber,
            detail: vehicles.driverName,
            type: vehicles.type
        })
        .from(vehicles)
        .where(or(
            like(vehicles.vehicleNumber, searchPattern),
            like(vehicles.driverName, searchPattern)
        ))
        .limit(5)
    ]);

    // Format results
    const results = [
        ...foundLabours.map(l => ({
            id: l.id,
            title: l.name,
            subtitle: `ID: ${l.detail}`,
            category: 'labours',
            url: `/labours/${l.id}`
        })),
        ...foundVisitors.map(v => ({
            id: v.id,
            title: v.name,
            subtitle: v.detail || v.type,
            category: 'visitors',
            url: `/visitors/${v.id}`
        })),
        ...foundVehicles.map(v => ({
            id: v.id,
            title: v.name,
            subtitle: v.detail || v.type,
            category: 'vehicles',
            url: `/vehicles` // No vehicle detail page yet, goes to list
        }))
    ];

    return json(results);
};
