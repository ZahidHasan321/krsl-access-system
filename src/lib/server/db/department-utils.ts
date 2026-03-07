import { db } from './index';
import { people, departments } from './schema';
import { sql, eq, ilike } from 'drizzle-orm';

/**
 * Ensures a department exists in the master table.
 * If it doesn't exist, it's created.
 * Returns the properly capitalized existing department if it exists.
 */
export async function ensureDepartment(name: string | null): Promise<string | null> {
	if (!name) return null;

	const trimmedName = name.trim();
	if (!trimmedName) return null;

	try {
		// First try exact case-insensitive match
		const existing = await db
			.select()
			.from(departments)
			.where(ilike(departments.name, trimmedName))
			.limit(1);

		if (existing.length > 0) {
			return existing[0].name;
		}

		// Title Case fallback for new inserts
		const titleCased = trimmedName
			.split(' ')
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
			.join(' ');

		await db.insert(departments).values({
			name: titleCased
		}).onConflictDoNothing();

		return titleCased;
	} catch (err) {
		console.error('Failed to ensure department:', err);
		return trimmedName;
	}
}

/**
 * Gets all unique departments from the master table
 */
export async function getUniqueDepartments(): Promise<string[]> {
	const results = await db
		.select({ name: departments.name })
		.from(departments)
		.orderBy(departments.name);

	return results.map(r => r.name);
}
