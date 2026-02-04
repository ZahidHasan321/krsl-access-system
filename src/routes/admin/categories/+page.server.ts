import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
    // Categories are now hardcoded in src/lib/constants/categories.ts
    // This route is disabled.
    throw redirect(302, '/');
};