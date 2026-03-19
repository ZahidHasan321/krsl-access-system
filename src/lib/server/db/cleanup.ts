import { db } from '$lib/server/db';
import { rawPunches, deviceCommands, notifications } from '$lib/server/db/schema';
import { and, eq, lt, inArray } from 'drizzle-orm';
import { subDays } from 'date-fns';

/** Track last cleanup time to avoid running on every request */
let lastCleanupTime = 0;
const CLEANUP_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

/**
 * Periodic cleanup of tables that grow unbounded.
 * Safe to call frequently — internally throttled to run at most once every 6 hours.
 * All operations only delete old, already-processed/completed records.
 */
export async function runPeriodicCleanup() {
	const now = Date.now();
	if (now - lastCleanupTime < CLEANUP_INTERVAL_MS) return;
	lastCleanupTime = now;

	try {
		const ninetyDaysAgo = subDays(new Date(), 90);
		const thirtyDaysAgo = subDays(new Date(), 30);

		// 1. Delete processed raw punches older than 90 days
		await db
			.delete(rawPunches)
			.where(and(eq(rawPunches.processed, true), lt(rawPunches.createdAt, ninetyDaysAgo)));

		// 2. Delete completed/failed device commands older than 30 days (never delete PENDING/SENT)
		await db
			.delete(deviceCommands)
			.where(
				and(
					lt(deviceCommands.createdAt, thirtyDaysAgo),
					inArray(deviceCommands.status, ['SUCCESS', 'FAILED'])
				)
			);

		// 3. Delete old notifications (older than 30 days)
		await db.delete(notifications).where(lt(notifications.createdAt, thirtyDaysAgo));

		console.log('[Cleanup] Periodic cleanup completed successfully');
	} catch (err) {
		console.error('[Cleanup] Periodic cleanup failed:', err);
	}
}
