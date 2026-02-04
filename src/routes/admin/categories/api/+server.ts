import { db } from '$lib/server/db';
import { personCategories } from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
    const parentId = url.searchParams.get('parentId');
    
    const where = parentId 
        ? eq(personCategories.parentId, parentId)
        : sql`${personCategories.parentId} IS NULL`;

    const list = await db
        .select()
        .from(personCategories)
        .where(where)
        .orderBy(personCategories.sortOrder);

    return json(list);
};
