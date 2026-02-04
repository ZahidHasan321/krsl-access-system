# Shipyard CRM - Complete Refactor Plan

## Overview
Refactor the shipyard access management system from a messy multi-page layout with hardcoded people types (labours, visitors) into a clean, extensible, category-based people management system with a simplified frontend.

---

## PHASE 0: UI Library Decision

**Recommendation: Use `shadcn-svelte`** (not overkill).

Rationale:
- You already use `bits-ui` (the headless layer shadcn-svelte builds on) and `tailwindcss`
- shadcn-svelte is NOT a heavy dependency - it's copy-pasted components into your project, no runtime cost
- Gives you accessible, consistent, themeable components (Dialog, Drawer, Command palette for fuzzy search, Tabs, etc.)
- Perfect for "simple but good looking" - the components are minimal by default
- You keep full control since the code lives in your repo
- Install: `npx shadcn-svelte@latest init` then add components as needed

Components to add: `button`, `input`, `select`, `dialog`, `drawer`, `command` (for fuzzy search), `card`, `badge`, `tabs`, `pagination`, `table`, `checkbox`, `separator`, `tooltip`, `sonner` (toast notifications)

**Action**: Replace existing `src/lib/components/ui/` with shadcn-svelte components. Keep custom components like `Navbar.svelte`.

---

## PHASE 1: Database Schema Refactoring

### 1.1 Remove Portal System Entirely
- **Delete**: `src/lib/server/portal-utils.ts`
- **Delete**: `src/routes/portal/` (entire directory)
- **Remove**: `labours.portal` permission from seed data

### 1.2 New People Category System (replaces labours + visitors)

Replace the hardcoded `labours` and `visitorProfiles` tables with a flexible, tree-based category system.

**New table: `person_categories`**
```sql
person_categories (
  id          TEXT PRIMARY KEY,        -- uuid
  name        TEXT NOT NULL,           -- e.g. "Customer", "Dokandari", "Employee"
  slug        TEXT NOT NULL UNIQUE,    -- url-safe: "customer", "dokandari"
  parent_id   TEXT REFERENCES person_categories(id) ON DELETE CASCADE,  -- null = root category
  sort_order  INTEGER DEFAULT 0,      -- ordering within siblings
  created_at  INTEGER DEFAULT (unixepoch())
)
-- INDEX on parent_id, slug
```

Root categories (parent_id = NULL):
- Customer
- Supplier / 3rd Party
- Employee

Sub-categories:
- Customer → Dokandari, Rolling, Outfitting
- Employee → Management, Frontliner
- (Outfitting can have further sub-categories later)

**GUIDELINE**: Admin manages these via a simple CRUD page. The tree can go N levels deep but the UI only shows root categories as selection cards during entry/registration (sub-categories shown after picking root).

### 1.3 New People Table (replaces labours + visitorProfiles)

```sql
people (
  id              TEXT PRIMARY KEY,      -- uuid
  name            TEXT NOT NULL,
  category_id     TEXT NOT NULL REFERENCES person_categories(id),

  -- Identification (for biometric/card systems)
  code_no         TEXT UNIQUE,           -- employee ID / visitor card number / any ID
  card_no         TEXT,                  -- RFID/NFC card number
  biometric_id    TEXT,                  -- face recognition / fingerprint device ID
  photo_url       TEXT,                  -- path to stored photo from registration device

  -- Contact & details
  company         TEXT,                  -- company/contractor name
  contact_no      TEXT,                  -- phone number
  designation     TEXT,                  -- job title (for employees)

  -- Training
  is_trained      INTEGER NOT NULL DEFAULT 0,  -- boolean; default true for employees (set in app logic)

  -- Metadata
  join_date       INTEGER,               -- timestamp (mainly for employees)
  notes           TEXT,
  created_at      INTEGER DEFAULT (unixepoch())
)
-- INDEXES: name, category_id, code_no, card_no, biometric_id, contact_no, company
```

**GUIDELINE for `is_trained` default**:
- When creating a person, check if their category (or any ancestor) has slug = `employee`
- If yes, default `is_trained` to `true`
- Otherwise default to `false`
- Always show the training checkbox in the form; just pre-check it for employees

**GUIDELINE for biometric/card fields**:
- `biometric_id`: The ID the face recognition or fingerprint machine assigns to a person
- `card_no`: The RFID/NFC card number for card-based entry
- `photo_url`: Store the photo file in `static/uploads/people/` or a configurable path. The registration device will POST the image; for now just have an upload endpoint ready
- A person can have all 3 (face + fingerprint + card) or any combination
- These fields are optional during manual registration but should be prominently shown in the form

### 1.4 New Attendance Logs Table (replaces labourLogs + visitorLogs)

```sql
attendance_logs (
  id          TEXT PRIMARY KEY,
  person_id   TEXT NOT NULL REFERENCES people(id) ON DELETE RESTRICT,
  entry_time  INTEGER NOT NULL,        -- timestamp
  exit_time   INTEGER,                 -- null = currently inside
  status      TEXT NOT NULL,           -- 'on_premises' | 'checked_out'
  date        TEXT NOT NULL,           -- 'YYYY-MM-DD' (derived from entry_time)
  notes       TEXT,                    -- optional note per entry
  created_at  INTEGER DEFAULT (unixepoch())
)
-- INDEXES: person_id, status, date, entry_time
-- COMPOSITE INDEX: (person_id, status) for "is this person inside?" queries
```

**KEY CHANGE - Multiple entries per day allowed**:
- Remove the "already checked in today" check
- Instead, check: "is this person currently on_premises?" (has a log with `status = 'on_premises'`)
- If on_premises → must exit first before entering again
- If not on_premises → can enter

**GUIDELINE for night duty / date assignment**:
- The `date` field should be derived from `entry_time` using `format(entryTime, 'yyyy-MM-dd')`
- Night duty workers who enter at 10 PM on Jan 5 get `date = '2025-01-05'`
- Their exit at 6 AM on Jan 6 still belongs to the Jan 5 log entry
- In history/reports, group by the `date` field (entry date), not exit date

### 1.5 Vehicles Table - Keep As-Is
The current `vehicles` table is fine. No changes needed.

### 1.6 Migration Strategy

**GUIDELINE**: Create a migration script (`scripts/migrate-to-v2.ts`) that:
1. Creates new tables (`person_categories`, `people`, `attendance_logs`)
2. Seeds default categories (Customer→Dokandari/Rolling/Outfitting, Supplier, Employee→Management/Frontliner)
3. Migrates existing `labours` → `people` (map type='company' to Employee→Frontliner, type='contractor' to Supplier)
4. Migrates existing `visitorProfiles` → `people` (map visitorType='vendor' to Supplier, 'guest' to Customer)
5. Migrates `labourLogs` → `attendance_logs`
6. Migrates `visitorLogs` → `attendance_logs`
7. Drops old tables ONLY after verification

**IMPORTANT**: Back up `local.db` before running migration.

---

## PHASE 2: Auth & Permission Fixes

### 2.1 Fix the Role/Permission Bug

**Root Cause Analysis**:
The bug is in user creation (`src/routes/admin/users/+page.server.ts:54`):
```ts
role: (roleId === 'admin' ? 'admin' : 'guard'), // Sync legacy field
```
If someone creates a role with a custom ID (not 'admin'), the legacy `role` field defaults to `'guard'`, but the `roleId` correctly points to the new role. The problem is the legacy `role` field still exists and might be checked somewhere, OR when creating users with custom roles, the roleId mapping doesn't work correctly because the role IDs in the DB might not match what's expected.

**But the actual deeper issue**: In `validateSessionToken()` (auth.ts:42-44), the permission join chain is:
```
session → user → roles (via user.roleId) → rolePermissions → permissions
```
If `user.roleId` is NULL or doesn't match any role in the `roles` table, the LEFT JOINs return null permissions, meaning the user gets an empty permissions array. But the user still passes authentication (they have a valid session), so they can access routes that don't have permission checks.

**Check**: The admin layout gate at `/admin/+layout.server.ts` should have `requirePermission(locals, 'users.manage')`. If it doesn't, that's the bug. Also check if the dashboard (`/+page.server.ts`) only checks `if (!event.locals.user)` but never checks permissions - this means ANY authenticated user sees everything.

**Fixes**:
1. Remove the legacy `role` column from the `user` table entirely
2. Make `roleId` NOT NULL (every user must have a role)
3. Ensure every route's `+page.server.ts` has proper `requirePermission()` calls
4. The admin layout server should gate on `users.manage`
5. Update the seed script to remove portal permission and add new people-related permissions

### 2.2 New Permission Set

Replace the old permissions with:
```
people.view        - View people registry and attendance
people.create      - Register new people / check in
people.edit        - Edit people details
people.delete      - Delete people records
vehicles.view      - View vehicle logs
vehicles.create    - Add vehicle entries
vehicles.edit      - Edit vehicle entries
vehicles.delete    - Delete vehicle entries
categories.manage  - Manage person categories (admin)
users.manage       - Manage system users and roles (admin)
```

### 2.3 Update RBAC Seed

- **admin**: All permissions
- **guard**: `people.view`, `people.create`, `vehicles.view`, `vehicles.create`

---

## PHASE 3: Backend API Refactoring

### 3.1 New API Endpoints

All form actions and server loads consolidated:

**People Management**:
- `GET /people` → `+page.server.ts` load: List/search people with category filter, pagination
- `POST /people` → action `create`: Register new person
- `POST /people` → action `update`: Update person details
- `POST /people` → action `delete`: Delete person
- `GET /people/[id]` → `+page.server.ts` load: Person detail + their attendance logs (paginated)

**Attendance**:
- `GET /attendance` → load: Today's active entries (on_premises + today's checked_out), filterable by category
- `POST /attendance` → action `checkIn`: Create attendance log (check person not already on_premises)
- `POST /attendance` → action `checkOut`: Set exit time + status
- `GET /history` → load: All attendance logs, filterable by date range, category, search query, with pagination
- `GET /history` → load should also support `mode=summary` for daily/monthly summary view

**Vehicles** (keep similar structure):
- `GET /vehicles` → Active vehicles
- `POST /vehicles` → Check in/out
- `GET /vehicles/history` → Vehicle history
- `GET /vehicles/[id]` → Vehicle detail page (NEW - currently missing)

**Categories (Admin)**:
- `GET /admin/categories` → List all categories as tree
- `POST /admin/categories` → CRUD actions (create, update, delete, reorder)

**Search API**:
- `GET /api/search?q=` → Search across people + vehicles (update to use new tables)

**Dashboard**:
- `GET /` → Dashboard data (update queries to use new tables)

### 3.2 Attendance Check-In Logic (Critical)

```
checkIn(personId):
  1. Verify person exists
  2. Check if person has ANY log with status = 'on_premises'
     - If yes → return error "Person must exit before entering again"
     - If no → proceed
  3. Create new attendance_log:
     - entry_time = now
     - status = 'on_premises'
     - date = format(now, 'yyyy-MM-dd')
  4. Return success
```

```
checkOut(logId):
  1. Find log by ID, verify status = 'on_premises'
  2. Update: exit_time = now, status = 'checked_out'
  3. Return success
```

### 3.3 History Summary Endpoint Logic

For daily summary:
```sql
SELECT date,
       COUNT(*) as total_entries,
       COUNT(DISTINCT person_id) as unique_people,
       SUM(CASE WHEN exit_time IS NOT NULL THEN exit_time - entry_time ELSE 0 END) as total_hours
FROM attendance_logs
WHERE date BETWEEN :start AND :end
GROUP BY date
ORDER BY date DESC
```

For monthly summary:
```sql
SELECT strftime('%Y-%m', date) as month,
       COUNT(*) as total_entries,
       COUNT(DISTINCT person_id) as unique_people,
       COUNT(DISTINCT date) as active_days
FROM attendance_logs
WHERE date BETWEEN :start AND :end
GROUP BY month
ORDER BY month DESC
```

---

## PHASE 4: Frontend Refactoring

### 4.1 New Route Structure

```
src/routes/
├── +layout.server.ts          # Auth check, pass user to all pages
├── +layout.svelte             # Shell: Navbar + main content area
├── +page.server.ts            # Dashboard data
├── +page.svelte               # Dashboard
├── login/
├── logout/
├── attendance/                # Single attendance page (replaces labours/attendance + visitors)
│   ├── +page.server.ts        # Today's entries + check in/out logic
│   └── +page.svelte           # Main attendance view with FABs
├── history/                   # Single unified history page
│   ├── +page.server.ts        # All logs with filters, pagination, summary mode
│   └── +page.svelte
├── people/                    # People registry
│   ├── +page.server.ts        # List people with filters
│   ├── +page.svelte           # People list
│   └── [id]/                  # Person detail
│       ├── +page.server.ts
│       └── +page.svelte
├── vehicles/                  # Keep similar structure
│   ├── +page.server.ts
│   ├── +page.svelte
│   ├── [id]/                  # NEW: Vehicle detail page
│   │   ├── +page.server.ts
│   │   └── +page.svelte
│   └── history/
│       ├── +page.server.ts
│       └── +page.svelte
├── admin/
│   ├── +layout.server.ts      # Gate: requirePermission('users.manage')
│   ├── users/
│   ├── roles/
│   └── categories/            # NEW: Manage person categories
│       ├── +page.server.ts
│       └── +page.svelte
└── api/
    ├── search/+server.ts      # Updated fuzzy search
    └── upload/+server.ts      # NEW: Photo upload endpoint for biometric device
```

**Delete these routes entirely**:
- `src/routes/labours/` (all)
- `src/routes/portal/` (all)
- `src/routes/visitors/` (all)
- `src/routes/api/seed-rbac/` (merge into migration script)

### 4.2 Dashboard Redesign (`/`)

**Current problem**: 3 stat cards + massive 30-day chart + 2 traffic summary cards = too cluttered.

**New design**:

```
┌─────────────────────────────────────────────────────────┐
│  Dashboard                          Today: Feb 1, 2026  │
│                                                         │
│  ┌─── Currently Inside ────────────────────────────┐    │
│  │                                                  │    │
│  │   👤 142 People    🚛 8 Vehicles                │    │
│  │                                                  │    │
│  │   [Customer: 45] [Employee: 82] [Supplier: 15]  │    │
│  │                                                  │    │
│  └──────────────────────────────────────────────────┘    │
│                                                         │
│  ┌─── Today's Activity ─────┐  ┌─── Quick Actions ───┐  │
│  │  Entries: 156            │  │  [▶ Check In]       │  │
│  │  Exits: 134              │  │  [+ Register]       │  │
│  │  Still Inside: 142       │  │  [🔍 Search]       │  │
│  │  Vehicles In: 12         │  └─────────────────────┘  │
│  │  Vehicles Out: 4         │                           │
│  └──────────────────────────┘                           │
│                                                         │
│  ┌─── 7-Day Trend (mini sparkline) ────────────────┐   │
│  │  ▁▃▅▇▅▃▁  (compact, not a massive chart)       │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

**GUIDELINES**:
- The "Currently Inside" section is the hero. Big number, always visible. Break down by root category using small colored badges/chips
- "Today's Activity" is a compact card with key numbers
- "Quick Actions" provides direct links to check-in and registration
- The 7-day trend is a small sparkline or mini bar chart, NOT a massive SVG. Use a simple inline SVG or even just CSS bars
- Remove: 30-day detailed chart (move to history page), monthly traffic card (redundant with history), percentage breakdowns
- The dashboard should fit on one screen without scrolling on desktop

### 4.3 Attendance Page (`/attendance`) - The Main Workhorse

This is where guards spend 90% of their time. It must be fast and simple.

**Layout**:
```
┌──────────────────────────────────────────────────────────┐
│  Attendance                          [🔍 Search bar]     │
│                                                          │
│  [Tabs: All | On Premises | Checked Out]                 │
│  [Filter chips: Customer | Employee | Supplier | Vehicle]│
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │ Person/Vehicle list with entry/exit times         │    │
│  │ Each row has [Check Out] button if on_premises    │    │
│  │ ...paginated...                                   │    │
│  └──────────────────────────────────────────────────┘    │
│                                                          │
│           [⊕ Register New] FAB    [▶ Check In] FAB       │
└──────────────────────────────────────────────────────────┘
```

**Two FAB buttons** (floating action buttons, bottom-right, stacked):
1. **Check In FAB** (primary color) → Opens a full-screen or large modal/drawer:
   - Step 1: Show category cards (Customer, Employee, Supplier) as large tappable cards
   - Step 2: After picking category, show searchable list of existing people in that category
   - Step 3: Select person → confirm check-in
   - Also allow typing name/ID to fuzzy-search across all people

2. **Register New FAB** (secondary color) → Opens registration flow:
   - Step 1: Show category cards (same as above)
   - Step 2: After picking category, show sub-categories if they exist (as cards again)
   - Step 3: Show registration form based on final category selection
   - Form fields: name, contact, company, code_no, card_no, biometric_id, photo upload, is_trained checkbox
   - For employees: `is_trained` pre-checked
   - After registration, optionally auto-check-in

**GUIDELINES for the attendance page**:
- The list should show: Name, Category (as badge), Entry Time, Exit Time (or "Inside" badge), Duration
- Each row should be clickable to go to `/people/[id]`
- Search bar does fuzzy search on name, code_no, company
- Filter chips filter by root category
- Use `shadcn-svelte` Command component for the fuzzy search in check-in flow
- The page auto-refreshes or uses SvelteKit's `invalidateAll()` after any action
- Keep vehicle entry separate but accessible via a tab or filter chip on the same page

### 4.4 History Page (`/history`)

**Layout**:
```
┌──────────────────────────────────────────────────────────┐
│  History                                                  │
│                                                          │
│  [View: Detailed | Daily Summary | Monthly Summary]       │
│  [Date Range Picker]  [Category Filter]  [Search]         │
│                                                          │
│  === Detailed View ===                                    │
│  Table: Name | Category | Date | Entry | Exit | Duration  │
│  ...paginated...                                         │
│                                                          │
│  === Daily Summary View ===                               │
│  Table: Date | Total Entries | Unique People | Avg Hours  │
│                                                          │
│  === Monthly Summary View ===                             │
│  Table: Month | Total Entries | Unique People | Days      │
└──────────────────────────────────────────────────────────┘
```

**GUIDELINES**:
- Use tabs or a segmented control for view switching (Detailed / Daily / Monthly)
- Date range filter: default to "Today" for detailed, "Last 30 days" for daily, "Last 12 months" for monthly
- Category filter: dropdown or chips for root categories
- All views support pagination
- Include an "Export" option later (not in v1)
- Night duty: entries are grouped by their `date` field (entry date), so a night worker entering Jan 5 at 10 PM shows under Jan 5

### 4.5 People Registry (`/people`)

**Layout**:
```
┌──────────────────────────────────────────────────────────┐
│  People                                [🔍 Search]       │
│                                                          │
│  [Filter: All | Customer | Employee | Supplier]           │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │ Name    | Category  | Code  | Company | Status   │    │
│  │ (click to view detail page)                       │    │
│  │ ...paginated...                                   │    │
│  └──────────────────────────────────────────────────┘    │
│                                                          │
│  [+ Register] button                                     │
└──────────────────────────────────────────────────────────┘
```

- "Status" column shows whether person is currently inside (green badge) or not
- Clicking a person goes to `/people/[id]`

### 4.6 Person Detail Page (`/people/[id]`)

```
┌──────────────────────────────────────────────────────────┐
│  ← Back                                                   │
│                                                          │
│  [Photo]  John Doe                                       │
│           Category: Employee > Frontliner                 │
│           Code: EMP-042   Card: RF-1234                  │
│           Company: KR Steel    Trained: ✓                │
│           Contact: +880xxxxxxxxx                         │
│                                                          │
│  [Edit] [Check In / Check Out]                           │
│                                                          │
│  ── Recent Entries ──────────────────────────────         │
│  [Date filter]                                           │
│  Table: Date | Entry | Exit | Duration                   │
│  ...paginated...                                         │
│                                                          │
│  Stats: Total visits: 142 | Avg duration: 8h 12m         │
└──────────────────────────────────────────────────────────┘
```

### 4.7 Vehicle Detail Page (`/vehicles/[id]`) - NEW

Similar to person detail but showing vehicle-specific info + entry history.

### 4.8 Admin: Categories Page (`/admin/categories`) - NEW

```
┌──────────────────────────────────────────────────────────┐
│  Person Categories                                       │
│                                                          │
│  ▼ Customer                                    [Edit][×] │
│    ├── Dokandari                                [Edit][×] │
│    ├── Rolling                                  [Edit][×] │
│    └── Outfitting                               [Edit][×] │
│  ▼ Supplier / 3rd Party                        [Edit][×] │
│  ▼ Employee                                    [Edit][×] │
│    ├── Management                               [Edit][×] │
│    └── Frontliner                               [Edit][×] │
│                                                          │
│  [+ Add Category]                                        │
│  (When adding, select parent or "Root" for top-level)    │
└──────────────────────────────────────────────────────────┘
```

### 4.9 Navbar Simplification

Current nav has too many items (Labours dropdown, Visitors dropdown, Vehicles dropdown, Portal dropdown, Admin dropdown).

**New nav**:
```
[Dashboard] [Attendance] [History] [People] [Vehicles] [Admin ▼]
                                                        ├── Users
                                                        ├── Roles
                                                        └── Categories
```

- Only 5 top-level items (no dropdowns except Admin)
- Mobile: hamburger menu with same items
- Keep the global search in navbar
- Permission-based visibility: Admin menu only for users with `users.manage`

### 4.10 Global Fuzzy Search

**Use shadcn-svelte's `Command` component** (cmdk-style):
- Trigger: Search icon in navbar OR keyboard shortcut (Ctrl+K)
- Searches across: People (name, code, company) + Vehicles (number, driver)
- Shows results grouped by type with icons
- Clicking a result navigates to the detail page
- Debounced (300ms), min 2 chars
- Server-side search using SQL LIKE or ideally FTS5 (SQLite full-text search)

### 4.11 Pagination Guidelines

Add pagination to every list view:
- Default page size: 20 items
- Show: "Showing 1-20 of 142" with Previous/Next buttons
- Use URL search params (`?page=2&limit=20`) for bookmarkable pages
- Use the existing `Pagination.svelte` component or replace with shadcn-svelte pagination

### 4.12 Animations (Simple, Inexpensive)

Use CSS transitions only - no JavaScript animation libraries:
- Page transitions: `opacity` + `translateY(8px)` fade-in on mount (use Svelte `transition:fly`)
- List items: staggered `transition:fly` with small delay
- FAB buttons: `scale` on hover, `translateY` slide-in on mount
- Cards: `box-shadow` + slight `translateY(-2px)` on hover
- Status badges: gentle `pulse` animation for "on_premises"
- Modals/Drawers: `opacity` + `translateY` (shadcn handles this)
- **Avoid**: `transform: scale()` on large elements, complex SVG animations, layout-triggering animations

---

## PHASE 5: Implementation Order

Execute in this exact order. Each step should be a separate commit.

### Step 1: Setup & Dependencies
1. Install shadcn-svelte: `npx shadcn-svelte@latest init`
2. Add required components: `npx shadcn-svelte@latest add button input dialog command card badge tabs separator checkbox table select tooltip sonner`
3. Remove old `src/lib/components/ui/` files that are now replaced by shadcn
4. Keep: `Navbar.svelte`, `LangSwitch.svelte`, `Pagination.svelte` (or replace with shadcn)

### Step 2: Database Migration
1. Write new schema in `src/lib/server/db/schema.ts` (add new tables, keep old temporarily)
2. Create migration script `scripts/migrate-to-v2.ts`
3. Run migration on a copy of the DB first, verify data integrity
4. Update `schema.ts` to remove old tables after migration verified

### Step 3: Auth & Permissions
1. Remove legacy `role` column from user table
2. Make `roleId` NOT NULL
3. Update permission set (remove old, add new)
4. Update seed script
5. Test: create user with guard role, verify they can only access permitted routes

### Step 4: Backend - Categories API
1. Create `/admin/categories` route with CRUD
2. Seed default categories

### Step 5: Backend - People API
1. Create people CRUD endpoints
2. Create attendance check-in/check-out endpoints (with the "must exit before re-entering" logic)
3. Create history endpoint with summary modes
4. Update search API
5. Update dashboard data queries

### Step 6: Frontend - Layout & Navigation
1. Update `Navbar.svelte` with simplified nav
2. Update root layout
3. Add global Command search (Ctrl+K)

### Step 7: Frontend - Dashboard
1. Rewrite dashboard with new design (currently inside hero, today's activity, quick actions, mini trend)

### Step 8: Frontend - Attendance Page
1. Build the main attendance page with list view
2. Add Check-In flow (category cards → person search → confirm)
3. Add Register flow (category cards → sub-category → form)
4. Add FAB buttons
5. Add filters and search

### Step 9: Frontend - History Page
1. Build history with 3 view modes (detailed, daily summary, monthly summary)
2. Add date range picker, category filter, search
3. Add pagination

### Step 10: Frontend - People & Vehicle Detail Pages
1. Build `/people` list page
2. Build `/people/[id]` detail page
3. Build `/vehicles/[id]` detail page (new)

### Step 11: Frontend - Admin Pages
1. Build `/admin/categories` page
2. Update `/admin/users` and `/admin/roles` pages with new components

### Step 12: Cleanup
1. Delete all old route directories (`/labours`, `/visitors`, `/portal`)
2. Delete `portal-utils.ts`
3. Remove unused i18n keys
4. Test all routes end-to-end

---

## Key Technical Guidelines (for implementer)

### Database
- Always use `uuid v4` for primary keys (import from `uuid` package)
- Always set `date` field as `format(new Date(), 'yyyy-MM-dd')` using date-fns
- Use Drizzle ORM query builder, not raw SQL
- Add indexes on frequently queried columns (see schema above)
- Use transactions for multi-step operations (e.g., register + auto-check-in)

### Forms & Validation
- Use Zod schemas for form validation on both client and server
- All form actions must call `requirePermission()` first
- Return `fail(400, { message })` for validation errors
- Use SvelteKit `enhance` for progressive enhancement on forms

### Components
- Use shadcn-svelte components consistently (don't mix with custom UI)
- Pass data via SvelteKit `load` functions, not client-side fetches
- Use `$state` and `$derived` (Svelte 5 runes) for client state
- Keep components small - if a component exceeds ~150 lines, split it

### Styling
- Use Tailwind CSS classes exclusively
- Follow existing color scheme: primary (blue), emerald (success), amber (warning), rose (error)
- Responsive: mobile-first, test on 320px width minimum
- The attendance page should work well on tablets (guards may use tablets at the gate)

### Error Handling
- Show toast notifications (sonner) for success/error after form submissions
- Show inline error messages for form validation
- Handle loading states with skeleton/spinner

### i18n
- Keep the existing i18n system (`$lib/i18n.svelte.ts`)
- Add new translation keys for all new labels
- Bengali translations are important for this shipyard

---

## Verification / Testing

After implementation:
1. **Auth test**: Create a guard user, login, verify they can only see Attendance/History/People/Vehicles (not Admin)
2. **Category test**: As admin, create a new sub-category under Customer, verify it appears in check-in flow
3. **Registration test**: Register a new Employee (verify is_trained defaults to true), register a new Customer (verify is_trained defaults to false)
4. **Check-in/out test**: Check in a person, verify they show as "on_premises", try to check in again (should fail), check out, check in again (should succeed)
5. **Night duty test**: Check in someone at 11 PM, check out at 6 AM next day, verify the entry appears under the entry date in history
6. **History test**: Verify detailed/daily/monthly summary views show correct data
7. **Search test**: Use global search to find people by name, code, company
8. **Mobile test**: Test attendance page on mobile viewport (375px width)
9. **Dashboard test**: Verify "Currently Inside" count matches actual on_premises records
10. **Vehicle test**: Full check-in/out cycle, verify vehicle detail page shows history
