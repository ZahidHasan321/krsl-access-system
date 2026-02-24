import { db } from '$lib/server/db';
import { attendanceLogs } from '$lib/server/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requirePermission } from '$lib/server/rbac';

export const GET: RequestHandler = async (event) => {
	requirePermission(event.locals, 'people.view');
	const { id } = event.params;
	const limit = parseInt(event.url.searchParams.get('limit') || '20');
	const offset = parseInt(event.url.searchParams.get('offset') || '0');

	if (!id) return json({ error: 'Missing ID' }, { status: 400 });

	const logs = await db
		.select()
		.from(attendanceLogs)
		.where(eq(attendanceLogs.personId, id))
		.orderBy(desc(sql`COALESCE(${attendanceLogs.exitTime}, ${attendanceLogs.entryTime})`))
		.limit(limit)
		.offset(offset);

	return json(logs);
};
