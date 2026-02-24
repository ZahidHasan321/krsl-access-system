import { eventHub } from '$lib/server/events';
import type { RequestHandler } from './$types';

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'dev-secret';

/**
 * POST /api/internal/event
 * This endpoint allows external processes (like the device-service)
 * to trigger events in the SvelteKit memory space.
 */
export const POST: RequestHandler = async ({ request, url }) => {
	const auth = request.headers.get('Authorization');
	console.log(`[InternalEvent] Received request from device-service`);

	if (auth !== `Bearer ${INTERNAL_API_KEY}`) {
		console.warn(
			`[InternalEvent] Unauthorized: Expected "Bearer ${INTERNAL_API_KEY}", got "${auth}"`
		);
		return new Response('Unauthorized', { status: 401 });
	}

	try {
		const { type, data } = await request.json();
		console.log(`[InternalEvent] Triggering ${type} with data:`, JSON.stringify(data));

		switch (type) {
			case 'change':
				eventHub.emit('change');
				break;
			case 'checkin':
				eventHub.emit('checkin', data);
				break;
			case 'checkout':
				eventHub.emit('checkout', data);
				break;
			case 'enrollment':
				console.log(`[InternalEvent] Emitting enrollment for person ${data.personId}`);
				eventHub.emit('enrollment', data);
				break;
			case 'enrollment-failed':
				eventHub.emit('enrollment-failed', data);
				break;
			default:
				console.warn(`[InternalEvent] Unknown event type: ${type}`);
				return new Response('Unknown event type', { status: 400 });
		}

		return new Response('OK');
	} catch (e) {
		console.error('[InternalEvent] Error:', e);
		return new Response('Bad Request', { status: 400 });
	}
};
