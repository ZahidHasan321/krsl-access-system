import { db } from '$lib/server/db';
import { people, attendanceLogs } from '$lib/server/db/schema';
import { eq, and, gte, lt, inArray } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { CATEGORIES } from '$lib/constants/categories';

export const load: PageServerLoad = async ({ url }) => {
	let month = url.searchParams.get('month');
	if (!month) {
		const now = new Date();
		const y = now.getFullYear();
		const m = String(now.getMonth() + 1).padStart(2, '0');
		month = `${y}-${m}`;
	}

	// employee categories
	const employeeCategories = CATEGORIES.filter(
		(c) => c.id === 'employee' || c.parentId === 'employee'
	).map((c) => c.id);

	const employees = await db
		.select()
		.from(people)
		.where(inArray(people.categoryId, employeeCategories));

	const startDateStr = `${month}-01`;
	// get next month string
	const [yearStr, monthStr] = month.split('-');
	let nextYear = parseInt(yearStr);
	let nextMonth = parseInt(monthStr) + 1;
	if (nextMonth > 12) {
		nextMonth = 1;
		nextYear++;
	}
	const endDateStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

	let logs: any[] = [];
	if (employees.length > 0) {
		logs = await db
			.select()
			.from(attendanceLogs)
			.where(
				and(
					inArray(
						attendanceLogs.personId,
						employees.map((e) => e.id)
					),
					gte(attendanceLogs.date, startDateStr),
					lt(attendanceLogs.date, endDateStr)
				)
			);
	}

	const startD = new Date(`${month}-01T00:00:00`);
	const endD = new Date(`${endDateStr}T00:00:00`);

	let frontlineCount = 0;
	let managementCount = 0;
	let newRegistrationCount = 0;
	const designationCounts: Record<string, number> = {};

	const employeeStats = employees.map((emp) => {
		if (emp.categoryId === 'frontliner') frontlineCount++;
		if (emp.categoryId === 'management') managementCount++;

		const created = emp.joinDate || emp.createdAt;
		if (created && created >= startD && created < endD) {
			newRegistrationCount++;
		}

		const desig = emp.designation || 'Unknown';
		designationCounts[desig] = (designationCounts[desig] || 0) + 1;

		const empLogs = logs.filter((l) => l.personId === emp.id);
		let totalMs = 0;
		for (const log of empLogs) {
			if (log.exitTime && log.entryTime) {
				totalMs += log.exitTime.getTime() - log.entryTime.getTime();
			}
		}
		const totalHours = (totalMs / (1000 * 60 * 60)).toFixed(2);

		return {
			id: emp.id,
			name: emp.name,
			codeNo: emp.codeNo,
			categoryId: emp.categoryId,
			designation: emp.designation,
			totalHours: parseFloat(totalHours)
		};
	});

	// sort by total hours descending, or by name
	employeeStats.sort((a, b) => b.totalHours - a.totalHours || a.name.localeCompare(b.name));

	return {
		month,
		employees: employeeStats,
		frontlineCount,
		managementCount,
		newRegistrationCount,
		designationCounts
	};
};
