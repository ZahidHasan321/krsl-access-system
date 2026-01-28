import { requirePermission } from '$lib/server/rbac';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
    requirePermission(locals, 'users.manage');
    return {};
};
