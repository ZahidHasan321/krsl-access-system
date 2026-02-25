import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { people, designations } from '$lib/server/db/schema';
import { sql } from 'drizzle-orm';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		// Get all unique designations from the people table
		const existingDesignations = await db
			.select({ name: people.designation })
			.from(people)
			.where(sql`${people.designation} IS NOT NULL AND ${people.designation} != ''`)
			.groupBy(people.designation);

		let addedCount = 0;
		for (const d of existingDesignations) {
			if (d.name) {
				const trimmed = d.name.trim();
				if (trimmed) {
					await db.insert(designations)
						.values({ name: trimmed })
						.onConflictDoNothing();
					addedCount++;
				}
			}
		}

		return json({ success: true, addedCount });
	} catch (err: any) {
		console.error(err);
		return json({ error: err.message }, { status: 500 });
	}
};
