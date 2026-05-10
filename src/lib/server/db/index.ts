import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

let _db: ReturnType<typeof drizzle<typeof schema>>;

export function getDb() {
	if (!_db) {
		const databaseUrl = env.DATABASE_URL || process.env.DATABASE_URL;
		if (!databaseUrl) throw new Error('DATABASE_URL is not set');
		const pool = new pg.Pool({ connectionString: databaseUrl });
		_db = drizzle(pool, { schema });
	}
	return _db;
}

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
	get(_, prop) {
		return (getDb() as any)[prop];
	}
});
