import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { notifications } from '$lib/server/db/schema';
import { desc, count } from 'drizzle-orm';
import { requirePermission } from '$lib/server/rbac';

export const load: PageServerLoad = async (event) => {
	requirePermission(event.locals, 'users.manage');

	const page = Number(event.url.searchParams.get('page')) || 1;
	const limit = 50;
	const offset = (page - 1) * limit;

	const [totalResult] = await db.select({ value: count() }).from(notifications);
	const total = totalResult.value;

	const history = await db
		.select()
		.from(notifications)
		.orderBy(desc(notifications.createdAt))
		.limit(limit)
		.offset(offset);

	return {
		history,
		pagination: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit)
		}
	};
};
