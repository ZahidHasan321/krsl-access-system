import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { departments } from '$lib/server/db/schema';
import { asc, sql, desc, or, ilike } from 'drizzle-orm';

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const q = url.searchParams.get('q') || '';

	try {
		const results = await db
			.select()
			.from(departments)
			.where(q ? or(sql`${departments.name} % ${q}`, ilike(departments.name, `%${q}%`)) : undefined)
			.orderBy(q ? desc(sql`similarity(${departments.name}, ${q})`) : asc(departments.name))
			.limit(100);

		return json(results);
	} catch (err) {
		return json({ error: 'Database error' }, { status: 500 });
	}
};
