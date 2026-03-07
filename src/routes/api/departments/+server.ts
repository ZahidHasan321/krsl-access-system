import { json } from '@sveltejs/kit';
import { getUniqueDepartments } from '$lib/server/db/department-utils';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const departments = await getUniqueDepartments();
	return json(departments);
};
