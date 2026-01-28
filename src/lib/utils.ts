import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { CalendarDate, parseDate } from '@internationalized/date';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

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

/**
 * Converts a YYYY-MM-DD string to a CalendarDate
 */
export function toCalendarDate(dateStr: string | null | undefined): CalendarDate | undefined {
    if (!dateStr) return undefined;
    try {
        return parseDate(dateStr.split('T')[0]);
    } catch {
        return undefined;
    }
}

/**
 * Converts a Date object to a CalendarDate
 */
export function fromDate(date: Date): CalendarDate {
    return new CalendarDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
}