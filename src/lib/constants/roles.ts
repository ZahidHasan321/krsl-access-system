export const ROLES = {
    ADMIN: 'admin',
    GUARD: 'guard'
} as const;

export type RoleId = typeof ROLES[keyof typeof ROLES];
