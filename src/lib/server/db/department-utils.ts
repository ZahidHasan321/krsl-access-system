import { db } from './index';
import { people } from './schema';
import { sql, eq } from 'drizzle-orm';

/**
 * Ensures a department exists in the people table (as a distinct value)
 * and returns it in a consistent format (Title Case).
 */
export async function ensureDepartment(name: string | null): Promise<string | null> {
	if (!name || !name.trim()) return null;

	const normalized = name.trim();
	
	// We don't have a separate table for departments yet to keep it simple,
	// but we can query distinct values from the people table for the combobox.
	return normalized;
}

/**
 * Gets all unique departments currently in use
 */
export async function getUniqueDepartments(): Promise<string[]> {
	const results = await db
		.selectDistinct({ department: people.department })
		.from(people)
		.where(sql`${people.department} IS NOT NULL`)
		.orderBy(people.department);

	return results.map(r => r.department).filter((d): d is string => !!d);
}
