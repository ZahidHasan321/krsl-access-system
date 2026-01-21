export function formatDuration(entry: Date | number, exit: Date | number | null) {
    const entryTime = typeof entry === 'number' ? entry : entry.getTime();
    const exitTime = exit ? (typeof exit === 'number' ? exit : exit.getTime()) : Date.now();
    
    const diffMs = exitTime - entryTime;
    if (diffMs < 0) return '0m';
    
    const totalMinutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    if (hours === 0) return `${minutes}m`;
    return `${hours}h ${minutes}m`;
}
