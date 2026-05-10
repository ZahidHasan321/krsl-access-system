import { db } from '$lib/server/db';
import { attendanceLogs } from '$lib/server/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requirePermission } from '$lib/server/rbac';

function parsePositiveIntParam(
	value: string | null,
	fallback: number,
	min: number,
	max: number
): number {
	const parsed = Number.parseInt(value ?? '', 10);
	if (!Number.isFinite(parsed)) return fallback;
	return Math.min(max, Math.max(min, parsed));
}

export const GET: RequestHandler = async (event) => {
	requirePermission(event.locals, 'people.view');
	const { id } = event.params;
	const limit = parsePositiveIntParam(event.url.searchParams.get('limit'), 20, 1, 200);
	const offset = parsePositiveIntParam(event.url.searchParams.get('offset'), 0, 0, 1000000);

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
