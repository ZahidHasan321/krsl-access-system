
import Database from 'better-sqlite3';

const db = new Database('local.db');
try {
    const logs = db.prepare('SELECT id, entry_time, exit_time FROM labour_logs WHERE exit_time IS NOT NULL LIMIT 5').all();
    console.log('Raw Logs:', JSON.stringify(logs, null, 2));
    
    if (logs.length > 0) {
        const log = logs[0] as any;
        console.log('Entry Time Type:', typeof log.entry_time);
        console.log('Exit Time Type:', typeof log.exit_time);
        
        const diff = log.exit_time - log.entry_time;
        console.log('Difference:', diff);
        console.log('Difference in hours (if ms):', diff / (1000 * 60 * 60));
        console.log('Difference in hours (if seconds):', diff / (60 * 60));
    }
} catch (e) {
    console.error(e);
} finally {
    db.close();
}
