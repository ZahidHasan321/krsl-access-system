import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { toast } from 'svelte-sonner';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

/**
 * Enhanced toast utility for specific application contexts
 */
export const appToast = {
	checkIn: (message: string) =>
		toast.success(message, {
			style:
				'background-color: #ecfdf5; border: 1px solid #10b981; color: #065f46; font-weight: 700; border-radius: 1rem;'
		}),
	checkOut: (message: string) =>
		toast.success(message, {
			style:
				'background-color: #fff1f2; border: 1px solid #f43f5e; color: #9f1239; font-weight: 700; border-radius: 1rem;'
		}),
	success: (message: string) =>
		toast.success(message, {
			style:
				'background-color: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; font-weight: 600; border-radius: 1rem;'
		}),
	error: (message: string) =>
		toast.error(message, {
			style:
				'background-color: #fef2f2; border: 1px solid #fecaca; color: #991b1b; font-weight: 600; border-radius: 1rem;'
		}),
	warning: (message: string) =>
		toast.error(message, {
			style:
				'background-color: #fffbeb; border: 1px solid #fef3c7; color: #92400e; font-weight: 700; border-radius: 1rem;'
		}),
	info: (message: string) =>
		toast.info(message, {
			style:
				'background-color: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; font-weight: 600; border-radius: 1rem;'
		})
};

export type WithElementRef<T> = T & {
	ref?: HTMLElement | null;
};

export type WithoutChildrenOrChild<T> = Omit<T, 'children' | 'child'>;
export type WithoutChild<T> = Omit<T, 'child'>;
export type WithoutChildren<T> = Omit<T, 'children'>;

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
		// Root Categories
		case 'card':
			return 'bg-purple-100 text-purple-700 border-purple-200 shadow-sm';
		case 'employee':
			return 'bg-blue-100 text-blue-700 border-blue-200 shadow-sm';
		case 'vendor':
			return 'bg-orange-100 text-orange-700 border-orange-200 shadow-sm';
		case 'customer':
			return 'bg-emerald-100 text-emerald-700 border-emerald-200 shadow-sm';

		// Subcategories - Employee
		case 'management':
			return 'bg-teal-100 text-teal-700 border-teal-200';
		case 'frontliner':
			return 'bg-green-100 text-green-700 border-green-200';

		// Subcategories - Vendor
		case 'supplier':
			return 'bg-amber-100 text-amber-700 border-amber-200';
		case '3rd-party':
			return 'bg-orange-50 text-orange-600 border-orange-100';

		// Subcategories - Customer
		case 'dokandari':
			return 'bg-sky-100 text-sky-700 border-sky-200';
		case 'rolling':
			return 'bg-indigo-100 text-indigo-700 border-indigo-200';
		case 'outfitting':
			return 'bg-cyan-100 text-cyan-700 border-cyan-200';

		default:
			return 'bg-slate-100 text-slate-700 border-slate-200';
	}
}

/**
 * Status badge colors
 */
export const statusBadgeClasses = {
	on_premises: 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm',
	checked_out: 'bg-slate-50 text-slate-500 border-slate-200'
};

/**
 * Level-based color mapping for category depth
 */
export function getCategoryLevelClass(level: number): string {
	switch (level) {
		case 0: // Root Category
			return 'bg-slate-100 text-slate-800 border-slate-300 font-black';
		case 1: // Subcategory
			return 'bg-white text-slate-600 border-slate-200 font-bold';
		default:
			return 'bg-white text-slate-400 border-slate-100';
	}
}

/**
 * Color mapping based on category color name
 */
export function getCategoryColorClass(color: string): string {
	switch (color) {
		case 'purple':
			return 'bg-purple-50 text-purple-700 border-purple-200';
		case 'blue':
			return 'bg-blue-50 text-blue-700 border-blue-200';
		case 'orange':
			return 'bg-orange-50 text-orange-700 border-orange-200';
		case 'amber':
			return 'bg-amber-50 text-amber-700 border-amber-200';
		case 'emerald':
			return 'bg-emerald-50 text-emerald-700 border-emerald-200';
		case 'sky':
			return 'bg-sky-50 text-sky-700 border-sky-200';
		case 'indigo':
			return 'bg-indigo-50 text-indigo-700 border-indigo-200';
		case 'cyan':
			return 'bg-cyan-50 text-cyan-700 border-cyan-200';
		case 'teal':
			return 'bg-teal-50 text-teal-700 border-teal-200';
		case 'green':
			return 'bg-green-50 text-green-700 border-green-200';
		default:
			return 'bg-slate-50 text-slate-700 border-slate-200';
	}
}
