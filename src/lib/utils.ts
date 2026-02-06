import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export type WithElementRef<T> = T & {
	ref?: HTMLElement;
};

export type WithoutChildrenOrChild<T> = Omit<T, "children" | "child">;
export type WithoutChild<T> = Omit<T, "child">;
export type WithoutChildren<T> = Omit<T, "children">;

/**
 * Converts a Date or ISO string to a CalendarDate object (simplified for shadcn components)
 */
export function toCalendarDate(date: Date | string) {
    const d = typeof date === 'string' ? new Date(date) : date;
    return {
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        day: d.getDate()
    };
}

/**
 * Generates a range of page numbers for pagination with ellipsis support.
 */
export function getPageRange(current: number, total: number) {
    const delta = 1;
    const range = [];
    const rangeWithDots: (number | string)[] = [];
    let l;
    for (let i = 1; i <= total; i++) {
        if (i == 1 || i == total || (i >= current - delta && i <= current + delta)) {
            range.push(i);
        }
    }
    for (let i of range) {
        if (l) {
            if (i - l === 2) {
                rangeWithDots.push(l + 1);
            } else if (i - l !== 1) {
                rangeWithDots.push('...');
            }
        }
        rangeWithDots.push(i);
        l = i;
    }
    return rangeWithDots;
}

/**
 * High-contrast color mapping for category badges
 */
export function getCategoryBadgeClass(slug: string | undefined): string {
    switch (slug) {
        case 'employee':
            return "bg-blue-100 text-blue-700 border-blue-200";
        case 'vendor':
            return "bg-orange-100 text-orange-700 border-orange-200";
        case 'supplier':
            return "bg-amber-100 text-amber-700 border-amber-200";
        case '3rd-party':
            return "bg-orange-50 text-orange-600 border-orange-100";
        case 'customer':
            return "bg-emerald-100 text-emerald-700 border-emerald-200";
        default:
            return "bg-slate-100 text-slate-700 border-slate-200";
    }
}

/**
 * Status badge colors
 */
export const statusBadgeClasses = {
    on_premises: "bg-emerald-100 text-emerald-700 border-emerald-200 shadow-sm",
    checked_out: "bg-slate-100 text-slate-600 border-slate-200",
};

/**
 * Level-based color mapping for category depth
 */
export function getCategoryLevelClass(level: number): string {
    switch (level) {
        case 0: // Root Category
            return "bg-slate-100 text-slate-700 border-slate-200";
        case 1: // Subcategory
            return "bg-slate-50 text-slate-600 border-slate-100";
        default:
            return "bg-white text-slate-500 border-slate-100";
    }
}

/**
 * Color mapping based on category color name
 */
export function getCategoryColorClass(color: string): string {
    switch (color) {
        case 'blue': return "bg-blue-50 text-blue-700 border-blue-200";
        case 'orange': return "bg-orange-50 text-orange-700 border-orange-200";
        case 'amber': return "bg-amber-50 text-amber-700 border-amber-200";
        case 'emerald': return "bg-emerald-50 text-emerald-700 border-emerald-200";
        case 'sky': return "bg-sky-50 text-sky-700 border-sky-200";
        case 'indigo': return "bg-indigo-50 text-indigo-700 border-indigo-200";
        case 'cyan': return "bg-cyan-50 text-cyan-700 border-cyan-200";
        case 'teal': return "bg-teal-50 text-teal-700 border-teal-200";
        case 'green': return "bg-green-50 text-green-700 border-green-200";
        default: return "bg-slate-50 text-slate-700 border-slate-200";
    }
}