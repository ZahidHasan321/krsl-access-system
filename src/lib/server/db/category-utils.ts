import { db } from './index';
import { personCategories } from './schema';

export type CategoryWithLevel = typeof personCategories.$inferSelect & { level: number };

export async function getFlatCategoryList(): Promise<CategoryWithLevel[]> {
    const all = await db.select().from(personCategories).orderBy(personCategories.sortOrder);
    
    // Group by parentId
    const childrenMap = new Map<string, typeof all>();
    const roots: typeof all = [];

    for (const cat of all) {
        if (!cat.parentId) {
            roots.push(cat);
        } else {
            if (!childrenMap.has(cat.parentId)) {
                childrenMap.set(cat.parentId, []);
            }
            childrenMap.get(cat.parentId)!.push(cat);
        }
    }

    const flat: CategoryWithLevel[] = [];

    function traverse(node: typeof all[0], level: number) {
        flat.push({ ...node, level });
        const children = childrenMap.get(node.id) || [];
        children.forEach(child => traverse(child, level + 1));
    }

    roots.forEach(root => traverse(root, 0));

    return flat;
}
