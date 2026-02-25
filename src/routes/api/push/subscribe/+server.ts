import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { pushSubscriptions } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const subscription = await request.json();
	const userAgent = request.headers.get('user-agent') || 'unknown';

	if (!subscription || !subscription.endpoint || !subscription.keys) {
		return json({ error: 'Invalid subscription object' }, { status: 400 });
	}

	try {
		// Check if subscription already exists for this endpoint
		const existing = await db
			.select()
			.from(pushSubscriptions)
			.where(eq(pushSubscriptions.endpoint, subscription.endpoint));

		if (existing.length > 0) {
			// Update if necessary or just return success
			await db
				.update(pushSubscriptions)
				.set({
					userId: locals.user.id,
					userAgent,
					p256dh: subscription.keys.p256dh,
					auth: subscription.keys.auth
				})
				.where(eq(pushSubscriptions.endpoint, subscription.endpoint));
		} else {
			// Create new subscription
			await db.insert(pushSubscriptions).values({
				userId: locals.user.id,
				endpoint: subscription.endpoint,
				p256dh: subscription.keys.p256dh,
				auth: subscription.keys.auth,
				userAgent
			});
		}

		return json({ success: true });
	} catch (err) {
		console.error('Failed to save push subscription:', err);
		return json({ error: 'Database error' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { endpoint } = await request.json();

	if (!endpoint) {
		return json({ error: 'Endpoint required' }, { status: 400 });
	}

	try {
		await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
		return json({ success: true });
	} catch (err) {
		console.error('Failed to delete push subscription:', err);
		return json({ error: 'Database error' }, { status: 500 });
	}
};
