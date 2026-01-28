
import { Database } from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { labourLogs } from './src/lib/server/db/schema';
import DatabaseConstructor from 'better-sqlite3';

const sqlite = new DatabaseConstructor('sqlite.db');
const db = drizzle(sqlite);

const logs = sqlite.prepare('SELECT id, entry_time, exit_time FROM labour_logs LIMIT 5').all();
console.log('Raw Logs:', logs);
