import { db } from '$lib/server/db';
import { people } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { queueDeviceSync, queueDeviceEnroll } from '$lib/server/device-sync';
import { notifyChange } from '$lib/server/events';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
	}

	const { personId, method, cardNo, deviceSn } = await request.json();

	if (!personId || !method || !['face', 'finger', 'card'].includes(method)) {
		return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400 });
	}

	const [person] = await db.select().from(people).where(eq(people.id, personId));
	if (!person || !person.biometricId) {
		return new Response(JSON.stringify({ error: 'Person not found or has no biometric ID' }), { status: 404 });
	}

	if (method === 'card') {
		if (!cardNo) {
			return new Response(JSON.stringify({ error: 'Card number required' }), { status: 400 });
		}
		// Update person's cardNo
		await db.update(people).set({ cardNo }).where(eq(people.id, personId));
		// Queue setUser with card number (broadcast to all)
		await queueDeviceSync(person.biometricId, person.name, cardNo);
		// Update enrolledMethods
		let methods: string[] = [];
		try { methods = person.enrolledMethods ? JSON.parse(person.enrolledMethods) : []; } catch { methods = []; }
		if (!methods.includes('card')) {
			methods.push('card');
			await db.update(people).set({ enrolledMethods: JSON.stringify(methods) }).where(eq(people.id, personId));
		}
		notifyChange();
		return new Response(JSON.stringify({ success: true }));
	}

	if (!deviceSn && (method === 'face' || method === 'finger')) {
		return new Response(JSON.stringify({ error: 'Target device SN required' }), { status: 400 });
	}

	// Face or finger — queue enrollment command FIRST, then user creation follows on success.
	// Important: ZKTeco devices reject enrollment (-1002) if user already exists at that PIN.
	// The devicecmd handler will queue DATA UPDATE USERINFO after enrollment succeeds.
	await queueDeviceEnroll(person.biometricId, method as 'face' | 'finger', deviceSn);
	return new Response(JSON.stringify({ success: true }));
};
