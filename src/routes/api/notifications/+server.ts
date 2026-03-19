import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { notifications } from '$lib/server/db/schema';
import { desc, eq, or, isNull, and } from 'drizzle-orm';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		// Fetch last 20 notifications for this user (includes broadcasts where userId is null)
		const history = await db
			.select()
			.from(notifications)
			.where(or(eq(notifications.userId, locals.user.id), isNull(notifications.userId)))
			.orderBy(desc(notifications.createdAt))
			.limit(20);

		return json(history);
	} catch (err) {
		console.error('Failed to fetch notifications:', err);
		return json({ error: 'Database error' }, { status: 500 });
	}
};

/**
 * Mark all of the current user's notifications as read
 */
export const POST: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		await db
			.update(notifications)
			.set({ isRead: true })
			.where(
				and(
					eq(notifications.isRead, false),
					or(eq(notifications.userId, locals.user.id), isNull(notifications.userId))
				)
			);
		return json({ success: true });
	} catch (err) {
		return json({ error: 'Database error' }, { status: 500 });
	}
};
