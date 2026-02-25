import { db } from './index';
import { designations } from './schema';
import { eq } from 'drizzle-orm';

/**
 * Ensures a designation exists in the master table.
 * If it doesn't exist, it's created.
 */
export async function ensureDesignation(name: string | null) {
	if (!name) return;

	const trimmedName = name.trim();
	if (!trimmedName) return;

	try {
		// Check if it already exists (case-insensitive would be better but unique constraint is exact)
		// We'll use exact match for the unique constraint
		const existing = await db
			.select()
			.from(designations)
			.where(eq(designations.name, trimmedName))
			.limit(1);

		if (existing.length === 0) {
			await db.insert(designations).values({
				name: trimmedName
			}).onConflictDoNothing();
		}
	} catch (err) {
		console.error('Failed to ensure designation:', err);
	}
}
