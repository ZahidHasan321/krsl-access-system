import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

let _db: ReturnType<typeof drizzle<typeof schema>>;

export function getDb() {
	if (!_db) {
		if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
		const client = new Database(env.DATABASE_URL);
		client.pragma('foreign_keys = ON');
		_db = drizzle(client, { schema });
	}
	return _db;
}

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
	get(_, prop) {
		return (getDb() as any)[prop];
	}
});
