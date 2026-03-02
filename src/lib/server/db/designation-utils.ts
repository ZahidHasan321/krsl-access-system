import { db } from './index';
import { designations } from './schema';
import { eq, ilike } from 'drizzle-orm';

/**
 * Ensures a designation exists in the master table.
 * If it doesn't exist, it's created.
 * Returns the properly capitalized existing designation if it exists.
 */
export async function ensureDesignation(name: string | null): Promise<string | null> {
	if (!name) return null;

	const trimmedName = name.trim();
	if (!trimmedName) return null;

	try {
		// First try exact case-insensitive match
		const existing = await db
			.select()
			.from(designations)
			.where(ilike(designations.name, trimmedName))
			.limit(1);

		if (existing.length > 0) {
			// Found it, return the canonical casing from DB
			return existing[0].name;
		}

		// Title Case fallback for new inserts: "clerk man" -> "Clerk Man"
		const titleCased = trimmedName
			.split(' ')
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
			.join(' ');

		await db.insert(designations).values({
			name: titleCased
		}).onConflictDoNothing();

		return titleCased;
	} catch (err) {
		console.error('Failed to ensure designation:', err);
		return trimmedName; // Fallback to raw input on DB error
	}
}
