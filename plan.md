# Plan: Generalized Role-Based Access Control (RBAC)

## Goal
Implement a flexible role-based login system where roles and permissions can be managed dynamically in the database. Users will be assigned a role, and roles will have specific permissions that control access to pages and features.

## 1. Database Schema Changes (`src/lib/server/db/schema.ts`)

We will introduce three new tables and modify the existing `user` table.

### New Tables

```typescript
// Roles Table
export const roles = sqliteTable('roles', {
    id: text('id').primaryKey(), // 'admin', 'guard' (or uuid, but slugs are easier for seeding)
    name: text('name').notNull().unique(), // Display name: "Administrator", "Security Guard"
    description: text('description')
});

// Permissions Table
export const permissions = sqliteTable('permissions', {
    id: text('id').primaryKey(), // 'labour.view', 'labour.create'
    description: text('description')
});

// Role <-> Permissions Join Table
export const rolePermissions = sqliteTable('role_permissions', {
    roleId: text('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
    permissionId: text('permission_id').notNull().references(() => permissions.id, { onDelete: 'cascade' }),
}, (t) => ({
    pk: primaryKey({ columns: [t.roleId, t.permissionId] })
}));
```

### Updates to `user` Table
We need to link users to the `roles` table.
*   **Current**: `role: text('role', { enum: ['admin', 'guard'] })`
*   **New**: `roleId: text('role_id').references(() => roles.id)`

**Migration Strategy (SQLite Safe):**
1.  Create `roles`, `permissions`, `role_permissions` tables.
2.  Add `role_id` column to `user` table (initially nullable).
3.  **Data Migration (Script):**
    *   Insert 'admin' and 'guard' into `roles`.
    *   Insert all defined permissions into `permissions`.
    *   Link permissions to roles in `role_permissions`.
    *   Update `user.role_id` based on the existing `user.role` value.
4.  (Optional for now) Drop `user.role` column. We will keep it but deprecate it in code to avoid complex SQLite table recreation issues during dev.

## 2. Defined Permissions List
We will use these specific keys for the initial seed:

*   **Labours**: `labours.view`, `labours.create`, `labours.edit`, `labours.delete`
*   **Vehicles**: `vehicles.view`, `vehicles.create`, `vehicles.edit`
*   **Visitors**: `visitors.view`, `visitors.create`, `visitors.edit`
*   **Admin**: `users.manage` (includes creating users, resetting passwords)

**Role Assignments:**
*   **Admin**: All permissions.
*   **Guard**: `*.view`, `*.create` (can view history and add new entries), but maybe restrict `*.edit`/`*.delete`.

## 3. Authentication Logic Updates (`src/lib/server/auth.ts`)

We need to fetch the role and permissions during session validation.

**Updated `validateSessionToken` Logic:**
Instead of just fetching `user` and `session`, we will perform a join.

```typescript
// Pseudocode for Drizzle Query
const result = await db
    .select({
        user: table.user,
        session: table.session,
        role: table.roles,
        permission: table.permissions.id // will get multiple rows
    })
    .from(table.session)
    .innerJoin(table.user, eq(table.session.userId, table.user.id))
    .leftJoin(table.roles, eq(table.user.roleId, table.roles.id))
    .leftJoin(table.rolePermissions, eq(table.roles.id, table.rolePermissions.roleId))
    .leftJoin(table.permissions, eq(table.rolePermissions.permissionId, table.permissions.id))
    .where(eq(table.session.id, sessionId));

// Post-processing
// Collapse multiple rows (due to permissions) into a single user object with a Set of permissions.
```

## 4. Type Definitions (`src/app.d.ts`)

Update the global namespace to include the permission set.

```typescript
// src/app.d.ts
declare global {
    namespace App {
        interface Locals {
            user: {
                id: string;
                username: string;
                roleId: string | null;
                roleName: string | null;
                permissions: Set<string>; 
            } | null;
            session: import("$lib/server/db/schema").Session | null;
        }
    }
}
```

## 5. Implementation Steps

### Step 1: Schema Update
1.  Modify `src/lib/server/db/schema.ts`:
    *   Import `primaryKey`.
    *   Define `roles`, `permissions`, `rolePermissions`.
    *   Add `roleId` to `user` table.
2.  Run `pnpm db:generate`.
3.  Run `pnpm db:migrate`.

### Step 2: Seeding & Migration Script
1.  Create `src/lib/server/db/seed_rbac.ts`.
2.  Script should:
    *   Check if roles exist. If not, create 'admin' ('Administrator') and 'guard' ('Security Guard').
    *   Upsert all defined permissions.
    *   Assign permissions to roles.
    *   **Crucial**: Select all users where `role_id` is NULL. Update them: `UPDATE user SET role_id = 'admin' WHERE role = 'admin'`, etc.

### Step 3: Auth Logic Update
1.  Modify `src/lib/server/auth.ts`:
    *   Update `validateSessionToken` to join with roles and permissions.
    *   Aggregate the results (since left join on permissions yields multiple rows per session).
    *   Return the enriched user object.
2.  Update `src/hooks.server.ts` if necessary (usually just passes the result to `locals`).

### Step 4: Enforcement
1.  Create `src/lib/server/rbac.ts` helper:
    ```typescript
    export function requirePermission(locals: App.Locals, permission: string) {
        if (!locals.user || !locals.user.permissions.has(permission)) {
            error(403, 'Forbidden');
        }
    }
    ```
2.  Apply to `+page.server.ts` load functions.
    *   Example: `src/routes/labours/+page.server.ts` -> `requirePermission(locals, 'labours.view')`.

### Step 5: UI Updates
1.  Update `src/routes/+layout.svelte` or `Navbar.svelte`.
2.  Use `page.data.user.permissions.has(...)` to conditionally render menu items.

## 6. Verification
1.  Login as existing Admin. Verify `role_id` is set and permissions are present.
2.  Login as existing Guard. Verify limited permissions.
3.  Try to access a restricted page as Guard (should 403).
