import { db } from '$lib/server/db';
import { people } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { queueDeviceSync } from '$lib/server/device-sync';
import type { RequestHandler } from './$types';

/** Sync user to device without enrollment (used when enrollment is skipped) */
export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
	}

	const { personId } = await request.json();
	if (!personId) {
		return new Response(JSON.stringify({ error: 'Missing personId' }), { status: 400 });
	}

	const person = db.select().from(people).where(eq(people.id, personId)).get();
	if (!person || !person.biometricId) {
		return new Response(JSON.stringify({ error: 'Person not found' }), { status: 404 });
	}

	queueDeviceSync(person.biometricId, person.name, person.cardNo);
	return new Response(JSON.stringify({ success: true }));
};
