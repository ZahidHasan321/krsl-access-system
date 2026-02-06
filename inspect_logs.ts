import { db } from './src/lib/server/db';
import { attendanceLogs, people } from './src/lib/server/db/schema';
import { desc, eq } from 'drizzle-orm';

async function inspect() {
    console.log('--- Recent Attendance Logs ---');
    const logs = await db.select({
        id: attendanceLogs.id,
        personName: people.name,
        entryTime: attendanceLogs.entryTime,
        date: attendanceLogs.date,
        status: attendanceLogs.status
    })
    .from(attendanceLogs)
    .innerJoin(people, eq(attendanceLogs.personId, people.id))
    .orderBy(desc(attendanceLogs.entryTime))
    .limit(10);

    console.table(logs);

    const count = await db.select({ count: attendanceLogs.id }).from(attendanceLogs);
    console.log('Total Logs:', count.length);
}

inspect().catch(console.error);