import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { notifications } from '$lib/server/db/schema';
import { desc } from 'drizzle-orm';
import { requirePermission } from '$lib/server/rbac';

export const load: PageServerLoad = async (event) => {
	requirePermission(event.locals, 'users.manage');

	const history = await db
		.select()
		.from(notifications)
		.orderBy(desc(notifications.createdAt))
		.limit(100);

	return {
		history
	};
};
