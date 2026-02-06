import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './src/lib/server/db/schema';
import { desc, eq } from 'drizzle-orm';
import dotenv from 'dotenv';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL || 'local.db';
const client = new Database(databaseUrl);
const db = drizzle(client, { schema });

async function inspect() {
    console.log('--- Recent Attendance Logs ---');
    const logs = await db.select({
        id: schema.attendanceLogs.id,
        personName: schema.people.name,
        entryTime: schema.attendanceLogs.entryTime,
        date: schema.attendanceLogs.date,
        status: schema.attendanceLogs.status
    })
    .from(schema.attendanceLogs)
    .innerJoin(schema.people, eq(schema.attendanceLogs.personId, schema.people.id))
    .orderBy(desc(schema.attendanceLogs.entryTime))
    .limit(10);

    console.table(logs.map(l => ({
        ...l,
        entryTime: l.entryTime.toISOString()
    })));

    const countResult = await db.select({ count: schema.sql<number>`count(*)` }).from(schema.attendanceLogs);
    console.log('Total Logs:', countResult[0].count);
}

inspect().catch(console.error);