import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { designations } from '$lib/server/db/schema';
import { asc, like } from 'drizzle-orm';

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const q = url.searchParams.get('q') || '';

	try {
		const results = await db
			.select()
			.from(designations)
			.where(like(designations.name, `%${q}%`))
			.orderBy(asc(designations.name))
			.limit(20);

		return json(results);
	} catch (err) {
		return json({ error: 'Database error' }, { status: 500 });
	}
};
