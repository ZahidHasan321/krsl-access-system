import webpush from 'web-push';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { db } from '$lib/server/db';
import { pushSubscriptions, notifications } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { eventHub } from './event-hub';

// Initialize web-push with VAPID keys from environment
const publicVapidKey = publicEnv.PUBLIC_VAPID_KEY;
const privateVapidKey = env.PRIVATE_VAPID_KEY;
const vapidSubject = env.VAPID_SUBJECT || 'mailto:admin@example.com';

console.log('[Push Service] Checking VAPID keys:', {
	hasPublic: !!publicVapidKey,
	hasPrivate: !!privateVapidKey,
	subject: vapidSubject
});

if (publicVapidKey && privateVapidKey) {
	webpush.setVapidDetails(vapidSubject, publicVapidKey, privateVapidKey);
} else {
	console.warn('Push notification VAPID keys are missing from environment variables.');
}

/**
 * Creates a notification in the database for history
 */
export async function createNotification(data: {
	userId?: string | null;
	type: string;
	title: string;
	message: string;
	link?: string;
}) {
	try {
		await db.insert(notifications).values({
			userId: data.userId || null,
			type: data.type,
			title: data.title,
			message: data.message,
			link: data.link || null
		});
		
		// Notify connected clients to refresh their notification UI via SSE
		eventHub.emit('change');
	} catch (err) {
		console.error('[Push Service] Failed to create notification:', err);
	}
}

export async function sendPushNotification(userId: string, payload: any) {
	// Fetch all subscriptions for this user
	const subs = await db
		.select()
		.from(pushSubscriptions)
		.where(eq(pushSubscriptions.userId, userId));

	if (subs.length === 0) return;

	const payloadString = JSON.stringify(payload);

	const promises = subs.map(async (sub) => {
		try {
			await webpush.sendNotification(
				{
					endpoint: sub.endpoint,
					keys: {
						p256dh: sub.p256dh,
						auth: sub.auth
					}
				},
				payloadString
			);
		} catch (error: any) {
			// If subscription is expired or revoked, remove it from DB
			if (error.statusCode === 404 || error.statusCode === 410) {
				console.log(`[Push] Removing expired subscription id=${sub.id}`);
				await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
			} else {
				console.error('Error sending push notification:', error);
			}
		}
	});

	await Promise.allSettled(promises);
}

/**
 * Broadcast notification to all users and save to history
 */
export async function broadcastPushNotification(payload: any, type: string = 'system') {
	try {
		// Save to history first
		await createNotification({
			type,
			title: payload.title,
			message: payload.body,
			link: payload.url
		});

		const subs = await db.select().from(pushSubscriptions);
		
		const payloadString = JSON.stringify(payload);

		const promises = subs.map(async (sub) => {
			try {
				await webpush.sendNotification(
					{
						endpoint: sub.endpoint,
						keys: {
							p256dh: sub.p256dh,
							auth: sub.auth
						}
					},
					payloadString
				);
			} catch (error: any) {
				if (error.statusCode === 404 || error.statusCode === 410) {
					await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
				}
			}
		});

		await Promise.allSettled(promises);
	} catch (err) {
		console.error('[Push Service] Failed to broadcast notification:', err);
	}
}
