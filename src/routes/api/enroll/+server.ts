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

	const { personId, method, cardNo } = await request.json();

	if (!personId || !method || !['face', 'finger', 'card'].includes(method)) {
		return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400 });
	}

	const person = db.select().from(people).where(eq(people.id, personId)).get();
	if (!person || !person.biometricId) {
		return new Response(JSON.stringify({ error: 'Person not found or has no biometric ID' }), { status: 404 });
	}

	if (method === 'card') {
		if (!cardNo) {
			return new Response(JSON.stringify({ error: 'Card number required' }), { status: 400 });
		}
		// Update person's cardNo
		db.update(people).set({ cardNo }).where(eq(people.id, personId)).run();
		// Queue setUser with card number
		queueDeviceSync(person.biometricId, person.name, cardNo);
		// Update enrolledMethods
		let methods: string[] = [];
		try { methods = person.enrolledMethods ? JSON.parse(person.enrolledMethods) : []; } catch { methods = []; }
		if (!methods.includes('card')) {
			methods.push('card');
			db.update(people).set({ enrolledMethods: JSON.stringify(methods) }).where(eq(people.id, personId)).run();
		}
		notifyChange();
		return new Response(JSON.stringify({ success: true }));
	}

	// Face or finger — queue enrollment command FIRST, then user creation follows on success.
	// Important: ZKTeco devices reject enrollment (-1002) if user already exists at that PIN.
	// The devicecmd handler will queue DATA UPDATE USERINFO after enrollment succeeds.
	queueDeviceEnroll(person.biometricId, method as 'face' | 'finger');
	return new Response(JSON.stringify({ success: true }));
};
