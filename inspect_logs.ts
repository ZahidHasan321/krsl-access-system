import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { attendanceLogs, people } from './src/lib/server/db/schema';
import * as schema from './src/lib/server/db/schema';
import { desc, eq, or, ilike } from 'drizzle-orm';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');

const pool = new pg.Pool({ connectionString: DATABASE_URL });
const db = drizzle(pool, { schema });

async function inspect() {
    const today = '2026-04-08'; // Hardcoded for today's context
    console.log(`\n--- Searching for ID: 522 ---`);
    
    const person = await db.select().from(people).where(
        or(
            eq(people.id, '522'),
            eq(people.codeNo, '522'),
            eq(people.biometricId, '522')
        )
    );
    console.table(person);

    if (person.length > 0) {
        for (const p of person) {
            console.log(`\n--- Logs for ${p.name} (Code: ${p.codeNo}) for ${today} ---`);
            const logs = await db.select().from(attendanceLogs)
                .where(
                    eq(attendanceLogs.personId, p.id)
                )
                .orderBy(desc(attendanceLogs.entryTime));
            console.table(logs);

            console.log(`\n--- Today's Logs for ${p.name} ---`);
            const todayLogs = logs.filter(l => l.date === today);
            console.table(todayLogs);
            
            if (todayLogs.length === 0) {
                console.log('NO LOGS FOUND FOR TODAY');
            }
        }
    } else {
        console.log('Person with ID 522 not found in id, codeNo, or biometricId');
        
        // Let's also check if there's any name match just in case
        const nameMatch = await db.select().from(people).where(ilike(people.name, '%Nurzzaman%'));
        console.log('Name match search results:');
        console.table(nameMatch);
    }

    await pool.end();
}

inspect().catch(console.error);
