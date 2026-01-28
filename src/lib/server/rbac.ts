import { error } from '@sveltejs/kit';

/**
 * Ensures the user has the required permission.
 * Throws a 403 Forbidden error if they don't.
 */
export function requirePermission(locals: App.Locals, permission: string) {
    if (!locals.user) {
        error(401, 'Unauthorized');
    }
    if (!locals.user.permissions.includes(permission)) {
        error(403, 'Forbidden');
    }
}

/**
 * Checks if the user has the required permission.
 * Returns true if they do, false otherwise.
 */
export function hasPermission(locals: App.Locals, permission: string): boolean {
    return !!locals.user?.permissions.includes(permission);
}
