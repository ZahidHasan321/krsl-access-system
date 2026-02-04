import { db } from '$lib/server/db';
import { vehicles } from '$lib/server/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { error, fail } from '@sveltejs/kit';
import { requirePermission } from '$lib/server/rbac';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async (event) => {
    requirePermission(event.locals, 'vehicles.view');
    const { id } = event.params;

    const entry = await db.query.vehicles.findFirst({
        where: eq(vehicles.id, id)
    });

    if (!entry) {
        error(404, 'Vehicle entry not found');
    }

    // History for the same vehicle number
    const history = await db
        .select()
        .from(vehicles)
        .where(eq(vehicles.vehicleNumber, entry.vehicleNumber))
        .orderBy(desc(vehicles.entryTime))
        .limit(20);

    return {
        entry,
        history
    };
};
