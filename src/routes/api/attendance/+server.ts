import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAttendanceLogs } from '$lib/server/attendance-service';
import { requirePermission } from '$lib/server/rbac';

export const GET: RequestHandler = async (event) => {
	requirePermission(event.locals, 'people.view');

	const query = event.url.searchParams.get('q') || '';
	const categoryId = event.url.searchParams.get('category') || '';
	const location = event.url.searchParams.get('location') || '';
	const page = parseInt(event.url.searchParams.get('page') || '1');
	const limit = Math.min(2000, Math.max(1, parseInt(event.url.searchParams.get('limit') || '50')));

	const result = await getAttendanceLogs({
		page,
		limit,
		query,
		categoryId,
		location
	});

	return json(result);
};
