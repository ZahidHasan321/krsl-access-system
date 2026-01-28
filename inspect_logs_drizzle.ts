
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './src/lib/server/db/schema';

const client = new Database('local.db');
const db = drizzle(client, { schema });

async function run() {
    const logs = await db.query.labourLogs.findFirst({
        where: (logs, { isNotNull }) => isNotNull(logs.exitTime)
    });
    
    console.log('Drizzle Log:', logs);
    if (logs) {
        console.log('Entry Time Type:', typeof logs.entryTime);
        console.log('Entry Time Instance of Date:', logs.entryTime instanceof Date);
        console.log('Entry Time Value (ms):', (logs.entryTime as any).getTime());
        console.log('Entry Time ISO:', (logs.entryTime as any).toISOString());
    }
}

run().catch(console.error).finally(() => client.close());
