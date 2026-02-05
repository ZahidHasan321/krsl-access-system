# Comprehensive Code Review - KR Steel CRM

**Reviewed by:** Senior Developer
**Date:** 2026-02-05
**Framework:** SvelteKit 2.49 + Svelte 5 + Drizzle ORM + SQLite

---

## Executive Summary

This is a shipyard CRM/attendance management system built with modern technologies. While the codebase demonstrates good practices in many areas, there are several issues that need to be addressed before production deployment, particularly in security, consistency, and scalability.

**Priority Legend:**
- **CRITICAL** - Must fix before production
- **HIGH** - Should fix soon
- **MEDIUM** - Should address
- **LOW** - Nice to have

---

## 1. Security Issues

### 1.1 File Upload Vulnerability (CRITICAL)
**Location:** `src/routes/people/+page.server.ts:12-23`

```typescript
async function savePhoto(photo: FormDataEntryValue | null): Promise<string | null> {
    if (!photo || !(photo instanceof File) || photo.size === 0) return null;

    const ext = photo.name.split('.').pop() || 'jpg';  // ISSUE: Extension from filename
    const fileName = `${crypto.randomUUID()}.${ext}`;
    // ...
}
```

**Issues:**
- File type is determined only by filename extension which can be easily spoofed
- No MIME type validation
- No file size limit enforcement
- No image dimension limits
- Malicious files could be uploaded with fake extensions

**Recommendation:**
- Validate MIME type using magic bytes
- Enforce maximum file size (e.g., 5MB)
- Restrict to specific image types (jpeg, png, webp)
- Consider using a library like `sharp` to verify and re-encode images

### 1.2 Missing HttpOnly Cookie Flag (HIGH)
**Location:** `src/lib/server/auth.ts:92-98`

```typescript
event.cookies.set(sessionCookieName, token, {
    expires: expiresAt,
    path: '/',
    secure: !dev // Missing httpOnly
});
```

**Issue:** The `httpOnly` flag is not set, making cookies accessible via JavaScript and vulnerable to XSS attacks.

**Recommendation:** Add `httpOnly: true` and `sameSite: 'lax'` to cookie options.

### 1.3 API Route Missing Permission Check (MEDIUM)
**Location:** `src/routes/api/search/+server.ts`

The search API endpoint only checks for authentication but not specific permissions. Any authenticated user can search all people and vehicles.

**Recommendation:** Add `requirePermission(locals, 'people.view')` check.

### 1.4 No CSRF Token Validation (MEDIUM)
While SvelteKit has some built-in protection, there's no explicit CSRF token validation on forms. Consider using a CSRF protection library for sensitive operations.

### 1.5 Session Not Invalidated on Role Change (HIGH)
**Location:** `src/routes/admin/users/+page.server.ts:79-101`

When a user's role is updated, their existing session retains old permissions until they log out.

**Recommendation:** Invalidate all sessions for the user when their role changes:
```typescript
await db.delete(table.session).where(eq(table.session.userId, userId));
```

### 1.6 Hardcoded Admin Role ID (MEDIUM)
**Locations:** Multiple files use `roleId === 'admin'` as a hardcoded string.

**Recommendation:** Use a constant or environment variable for role identifiers.

---

## 2. Database Issues

### 2.1 SQLite Limitations (CRITICAL for Production)
SQLite is not suitable for production environments with concurrent users due to:
- Write locking (only one write at a time)
- No horizontal scaling
- Limited concurrent connection handling

**Recommendation:** Migrate to PostgreSQL for production.

### 2.2 Missing Database Migrations (HIGH)
The project only uses `db:push` for schema changes, not proper migrations.

**Issues:**
- No version history of schema changes
- Risky for production deployments
- No rollback capability

**Recommendation:** Use `drizzle-kit generate` and `drizzle-kit migrate` for proper migration workflow.

### 2.3 Cascade Delete on Categories (HIGH)
**Location:** `src/lib/server/db/schema.ts:46`

```typescript
parentId: text('parent_id').references((): any => personCategories.id, { onDelete: 'cascade' })
```

Deleting a parent category cascades to all child categories, which could accidentally delete people's associations.

**Recommendation:** Use `onDelete: 'restrict'` or handle category deletion more carefully.

### 2.4 Orphaned Files (MEDIUM)
When a person is deleted, their photo file remains in the filesystem at `/static/uploads/people/`.

**Recommendation:** Implement a cleanup mechanism to delete associated files when records are deleted.

### 2.5 Categories Dual Definition (MEDIUM)
**Locations:**
- `src/lib/constants/categories.ts` (TypeScript constants)
- Database `person_categories` table

Categories are defined both as hardcoded constants AND in the database, leading to potential sync issues.

**Recommendation:** Use only database-driven categories or only constants, not both.

---

## 3. Pagination Issues

### 3.1 Client-Side Filtering After Server Pagination (HIGH)
**Location:** `src/routes/attendance/+page.svelte:123-156`

```typescript
const filteredLogs = $derived(
    data.logs.filter(log => {
        // Filtering happens AFTER pagination
    })
);
```

The attendance page fetches paginated results (20 items) from the server, then filters them client-side. This can result in displaying fewer than 20 items even when more exist.

**Impact:** User sees incomplete data; pagination becomes unreliable.

**Recommendation:** Move all filtering to the server-side query.

### 3.2 Missing Page Bounds Validation (MEDIUM)
**Locations:** Multiple `+page.server.ts` files

```typescript
const page = parseInt(event.url.searchParams.get('page') || '1');
```

No validation that:
- Page is a positive integer
- Page doesn't exceed total pages

**Recommendation:** Add validation:
```typescript
const page = Math.max(1, Math.min(parseInt(param) || 1, totalPages || 1));
```

### 3.3 Inconsistent Pagination Implementation (LOW)
- `/people`: Uses URL search params with `goto()`
- `/vehicles`: Uses same pattern but different variable names (`currentPage` vs `page`)
- `/attendance`: Mixes server-side pagination with client-side filtering

**Recommendation:** Create a reusable pagination component/utility with consistent behavior.

---

## 4. UI Inconsistencies

### 4.1 Font Size Inconsistency (MEDIUM)
**Finding:** At least 8 different font sizes used across the application:

| Size | Usage |
|------|-------|
| `text-base` | Body text, some inputs |
| `text-sm` | Secondary text, labels |
| `text-xs` | Small labels, timestamps |
| `text-[10px]` | Category badges, uppercase labels |
| `text-[9px]` | Very small labels |
| `text-[8px]` | Micro text in dashboard |
| `text-lg` | Section headers |
| `text-xl`, `text-2xl`, `text-3xl` | Page titles |

**Recommendation:** Define a consistent typography scale in `layout.css`:
```css
--text-micro: 9px;
--text-tiny: 10px;
--text-xs: 12px;
--text-sm: 14px;
--text-base: 16px;
```

### 4.2 Button Height Inconsistency (MEDIUM)
**Finding:** Multiple button heights used:
- `h-7`, `h-8` - Icon buttons
- `h-10`, `h-11`, `h-12` - Standard buttons
- `h-14`, `h-16` - Large/CTA buttons

**Recommendation:** Standardize to 3 sizes: `h-8` (small), `h-10` (default), `h-12` (large).

### 4.3 Border Radius Inconsistency (LOW)
**Finding:** Mixed border-radius usage:
- `rounded-md`, `rounded-lg` - Inputs, small elements
- `rounded-xl`, `rounded-2xl` - Cards, dialogs
- `rounded-3xl` - Large containers
- `rounded-full` - Pills, avatars

**Recommendation:** Define consistent radius tokens.

### 4.4 Card Border Styles (LOW)
**Finding:** Cards use inconsistent border styles:
- Some: `border-2 border-slate-100`
- Some: `border` (default)
- Some: `border-l-4 border-l-emerald-500` (accent)

**Recommendation:** Create card variants with consistent styling.

### 4.5 Color Inconsistency (MEDIUM)
**Finding:** Primary color shades used inconsistently:
- Buttons: `primary-600` mostly
- Shadows: `shadow-primary-100`, `shadow-primary-200`
- Text: `primary-500`, `primary-600`, `primary-700` mixed

**Recommendation:** Define semantic color tokens (e.g., `--color-button`, `--color-link`).

---

## 5. Logic/Bug Issues

### 5.1 Missing Delete Confirmation on List View (MEDIUM)
**Location:** `src/routes/people/+page.svelte:361-370`

People can be deleted directly from the list view without confirmation dialog. The confirmation exists only on the detail page.

**Recommendation:** Add `ConfirmModal` to list view delete action.

### 5.2 SSE Connection Handling (MEDIUM)
**Location:** `src/routes/+page.svelte:37-56`

```typescript
eventSource.onerror = () => {
    setTimeout(() => {
        if (eventSource.readyState === EventSource.CLOSED) {
            // No reconnection logic
        }
    }, 5000);
};
```

The error handler doesn't actually reconnect; it just checks the state.

**Recommendation:** Implement proper reconnection logic with exponential backoff.

### 5.3 Missing Error Handling (MEDIUM)
**Locations:** Multiple form submissions don't handle all error cases:
- Network failures
- Server errors (500)
- Validation errors

**Recommendation:** Add comprehensive error handling with user-friendly messages.

### 5.4 Debounce Timer Memory Leak (LOW)
**Location:** Multiple components use `setTimeout` without cleanup:

```typescript
let debounceTimer: any;
function handleSearch() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(...);
}
// No cleanup on component destroy
```

**Recommendation:** Clear timers on component unmount using `onDestroy` or `$effect.cleanup`.

---

## 6. Authentication & Authorization Review

### 6.1 Strengths
- Argon2 password hashing with good parameters
- Session-based authentication with secure token generation
- Permission-based access control
- Admin role protection (can't be demoted/deleted)

### 6.2 Issues to Address
1. **Missing httpOnly cookie flag** (see 1.2)
2. **Session not invalidated on role change** (see 1.5)
3. **No account lockout** after failed login attempts
4. **No password complexity requirements** beyond length
5. **No session listing/revocation UI** for users

### 6.3 Recommendation
Add:
- Account lockout after 5 failed attempts
- Password complexity validation
- Session management UI in admin panel
- Login activity logging

---

## 7. Mobile Responsiveness Issues

### 7.1 Tables Not Responsive (HIGH)
**Location:** `src/routes/people/+page.svelte:295-387`

The people list uses a `<Table>` component that doesn't adapt to mobile screens. On small screens, content gets cut off or requires horizontal scrolling.

**Recommendation:** Implement a card-based layout for mobile or use a responsive table solution.

### 7.2 Dialog Max-Width Issues (MEDIUM)
Several dialogs use fixed `sm:max-w-[600px]` which works but could be improved for tablet sizes.

### 7.3 Person Detail Page Image (MEDIUM)
**Location:** `src/routes/people/[id]/+page.svelte:107-113`

```html
<div class="size-48 rounded-3xl ...">
    <img src={data.person.photoUrl} ... class="w-full h-full object-cover" />
</div>
```

The image container has a fixed `size-48` (192px) which may be too small to view person photos clearly on desktop but proportionally large on mobile.

**Recommendation:** Make image size responsive and add click-to-zoom functionality.

---

## 8. Production Readiness Checklist

### Missing for Production:

| Item | Status | Priority |
|------|--------|----------|
| PostgreSQL migration | Missing | CRITICAL |
| Database migrations | Missing | CRITICAL |
| Environment variables | Partial | HIGH |
| Error boundary | Missing | HIGH |
| Logging system | Missing | HIGH |
| Health check endpoint | Missing | MEDIUM |
| Rate limiting | Missing | MEDIUM |
| Request validation | Partial | MEDIUM |
| Audit logging | Missing | MEDIUM |
| Backup strategy | Missing | MEDIUM |
| SSL/TLS setup | Unknown | CRITICAL |
| CORS configuration | Default | LOW |

---

## 9. Specific File Issues

### 9.1 `src/routes/people/[id]/+page.svelte`
- Image display is too small for clear viewing
- No way to view full-size image
- Missing loading state for image
- Edit form doesn't show current photo preview properly

### 9.2 `src/routes/attendance/+page.svelte`
- Client-side filtering defeats pagination purpose
- Category filter should be URL-persisted like search
- Missing loading state during page transitions

### 9.3 `src/routes/+page.svelte` (Dashboard)
- Good real-time updates with SSE
- Missing loading skeleton for initial load
- No error state handling for SSE failures

---

## 10. Recommendations Summary

### Immediate (Before Production)
1. Fix file upload security (MIME type validation, size limits)
2. Add `httpOnly` flag to session cookies
3. Plan database migration to PostgreSQL
4. Set up proper database migrations
5. Add error boundaries and logging

### Short-term
1. Standardize UI components (buttons, typography, spacing)
2. Fix pagination + filtering issue in attendance
3. Implement delete confirmations consistently
4. Add session invalidation on role change
5. Improve mobile responsiveness

### Medium-term
1. Create design system/component library
2. Add comprehensive input validation
3. Implement audit logging
4. Add rate limiting
5. Improve person detail page with better image viewing

### Long-term
1. Add automated tests
2. Implement CI/CD pipeline
3. Add performance monitoring
4. Consider PWA offline capabilities
5. Add data export functionality

---

## 11. Positive Observations

The codebase has several strengths:

1. **Modern stack** - Svelte 5 with runes, SvelteKit, TypeScript
2. **Good component organization** - Well-structured UI components
3. **Real-time updates** - SSE implementation for live data
4. **Internationalization ready** - i18n setup in place
5. **PWA setup** - Service worker and manifest configured
6. **Permission system** - Flexible RBAC implementation
7. **Consistent coding style** - Good formatting and naming
8. **Type safety** - Full TypeScript implementation

---

## 12. Appendix: Files Reviewed

- `src/lib/server/db/schema.ts` - Database schema
- `src/lib/server/auth.ts` - Authentication
- `src/lib/server/rbac.ts` - Role-based access control
- `src/hooks.server.ts` - Server hooks
- `src/routes/people/+page.server.ts` - People management API
- `src/routes/people/+page.svelte` - People list UI
- `src/routes/people/[id]/+page.svelte` - Person detail UI
- `src/routes/people/[id]/+page.server.ts` - Person detail API
- `src/routes/attendance/+page.server.ts` - Attendance API
- `src/routes/attendance/+page.svelte` - Attendance UI
- `src/routes/vehicles/+page.server.ts` - Vehicles API
- `src/routes/vehicles/+page.svelte` - Vehicles UI
- `src/routes/login/+page.server.ts` - Login API
- `src/routes/login/+page.svelte` - Login UI
- `src/routes/+page.svelte` - Dashboard UI
- `src/routes/+page.server.ts` - Dashboard API
- `src/routes/admin/users/+page.server.ts` - User management
- `src/routes/admin/roles/+page.server.ts` - Role management
- `src/routes/+layout.svelte` - Root layout
- `src/routes/layout.css` - Global styles
- `src/lib/utils.ts` - Utility functions
- `src/lib/constants/categories.ts` - Category definitions
- `src/routes/api/search/+server.ts` - Search API
- `src/routes/api/events/+server.ts` - SSE API
- `src/lib/components/Navbar.svelte` - Navigation
- `src/lib/components/CheckInDialog.svelte` - Check-in dialog
- `package.json` - Dependencies

---

*End of Review*
