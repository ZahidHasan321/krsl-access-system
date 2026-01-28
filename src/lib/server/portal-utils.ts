/**
 * Utility to generate deterministic "fake" times for the portal view.
 * 
 * Logic:
 * 1. If duration is <= 8h 15m (495 mins), keep REAL times.
 * 2. If duration is > 8h 15m:
 *    - For checked_out: Keep REAL Entry, set Fake Exit = Entry + (8h +/- 10m).
 *    - For on_premises: If duration so far > 8h 15m, Shift Entry forward so it looks like they entered ~7h ago.
 */

export function transformLog<T extends { id: string; entryTime: Date; exitTime: Date | null }>(log: T): T {
    const MAX_ALLOWED_MINS = 495; // 8h 15m
    const TARGET_BASE_MINS = 480; // 8h

    // 1. Generate deterministic offset (-10 to +10 mins)
    let seed = 0;
    for (let i = 0; i < log.id.length; i++) {
        seed = (seed << 5) - seed + log.id.charCodeAt(i);
        seed |= 0;
    }
    seed = Math.abs(seed);
    const offsetMinutes = (seed % 21) - 10;
    const deterministicCappedDurationMs = (TARGET_BASE_MINS + offsetMinutes) * 60 * 1000;

    const newLog = { ...log };

    if (log.exitTime) {
        const realDurationMins = (log.exitTime.getTime() - log.entryTime.getTime()) / (1000 * 60);
        
        if (realDurationMins > MAX_ALLOWED_MINS) {
            // Duration too long, cap it by changing EXIT time
            newLog.exitTime = new Date(log.entryTime.getTime() + deterministicCappedDurationMs);
        }
    } else {
        // on_premises
        const durationSoFarMins = (Date.now() - log.entryTime.getTime()) / (1000 * 60);
        
        if (durationSoFarMins > MAX_ALLOWED_MINS) {
            // They've been inside too long. 
            // Make it look like they entered ~7 hours ago (+/- deterministic offset)
            // We use a 7-hour base so they have about 1 hour "left" in the portal view.
            const fakeActiveDurationMins = 420 + (seed % 30); // 7h to 7h 30m
            const lookbackMs = fakeActiveDurationMins * 60 * 1000;
            
            // To maintain SOME consistency on refresh, we snap "now" to the nearest 15 minutes
            const snappedNow = Math.floor(Date.now() / (15 * 60 * 1000)) * (15 * 60 * 1000);
            newLog.entryTime = new Date(snappedNow - lookbackMs);
        }
    }

    return newLog;
}

/**
 * Transforms an array of logs
 */
export function transformLogs<T extends { id: string; entryTime: Date; exitTime: Date | null }>(logs: T[]): T[] {
    return logs.map(log => transformLog(log));
}
