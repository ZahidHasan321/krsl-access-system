# Implementation Draft: KR Steel HRM

This document serves as a detailed guide for implementing the KR Steel HRM system. It is designed to be followed by an AI model to generate code efficiently.

## 1. Design & UX Guidelines [DONE]

*   **Philosophy:** "Simple enough for a child." High contrast, large touch targets, clear navigation.
*   **Mobile-First:**
    *   **Desktop:** Tables for data lists.
    *   **Mobile:** Card-based lists (rows become cards). Hide sidebar, use bottom nav or hamburger menu.
*   **Localization (Bangla/English):**
    *   **Requirement:** Full support for English and Bangla.
    *   **Implementation:** A persistent store (saved in `localStorage` or cookie) that toggles the language.
    *   **Switch:** A prominent toggle in the Navigation Bar.
    *   **Scope:** All UI text (Buttons, Table Headers, Labels, Placeholders) must be translatable.
    *   **Default:** English (or user preference).
*   **Styling:** Tailwind CSS v4.
    *   **Primary Color:** Blue/Indigo (Trust, Corporate).
    *   **Action Colors:**
        *   Green/Emerald: Check-in / Safe / Present.
        *   Red/Rose: Check-out / Exit / Delete.
        *   Amber/Yellow: Warning / Edit.
    *   **Font:** `Inter` (English) and `Noto Sans Bengali` (Bangla) via Google Fonts.

## 2. Recommended Packages [DONE]

*These packages should be installed to support the features:*

*   `lucide-svelte`: Icons (User, Truck, LogIn, LogOut, Menu, X).
*   `clsx` & `tailwind-merge`: Class management.
*   `date-fns`: Date formatting (Crucial for the `date` column).
*   `uuid`: Generating unique IDs (SQLite does not auto-gen UUIDs).
*   `@types/uuid`: TypeScript definitions for uuid.
*   `svelte-sonner`: Toast notifications.
*   `zod`: Form validation.

## 3. Database Schema (Drizzle ORM) [DONE]

*File: `src/lib/server/db/schema.ts`*

**IMPORTANT:** This schema preserves the existing `session` table required by the current auth implementation. Do not remove it.

**NOTE on Foreign Keys:** The `onDelete: 'restrict'` is intentional. Labours/Visitors cannot be deleted if they have log entries. This preserves historical data integrity.

```typescript
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// --- Auth (Existing & Required) ---
// Kept compatible with src/lib/server/auth.ts
export const user = sqliteTable('user', {
    id: text('id').primaryKey(),
    username: text('username').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    // Extended fields for HRM
    role: text('role', { enum: ['admin', 'guard'] }).default('guard').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`)
});

export const session = sqliteTable('session', {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => user.id),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull()
});

export type Session = typeof session.$inferSelect;
export type User = typeof user.$inferSelect;

// --- Labours (Registry) ---
export const labours = sqliteTable('labours', {
    id: text('id').primaryKey(), // Generate using uuid v4
    name: text('name').notNull(),
    codeNo: text('code_no').notNull().unique(), // Employee ID
    joinDate: integer('join_date', { mode: 'timestamp' }),
    designation: text('designation'),
    // Store as JSON string: JSON.stringify(["Training A", "Training B"])
    trainingDetails: text('training_details'), 
    type: text('type', { enum: ['company', 'contractor'] }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`)
}, (table) => ({
    nameIdx: index('labour_name_idx').on(table.name),
    codeIdx: index('labour_code_idx').on(table.codeNo),
}));

// --- Labour Logs (Attendance) ---
export const labourLogs = sqliteTable('labour_logs', {
    id: text('id').primaryKey(),
    labourId: text('labour_id').references(() => labours.id, { onDelete: 'restrict' }).notNull(),
    entryTime: integer('entry_time', { mode: 'timestamp' }).notNull(),
    exitTime: integer('exit_time', { mode: 'timestamp' }), // Null = Currently Inside
    status: text('status', { enum: ['on_premises', 'checked_out'] }).notNull(),
    // Use date-fns to format as 'YYYY-MM-DD' strictly
    date: text('date').notNull() 
}, (table) => ({
    labourIdIdx: index('log_labour_id_idx').on(table.labourId),
    statusIdx: index('log_status_idx').on(table.status),
    dateIdx: index('log_date_idx').on(table.date),
}));

// --- Visitor Profiles (Master) ---
export const visitorProfiles = sqliteTable('visitor_profiles', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    company: text('company'),
    contactNo: text('contact_no').unique(),
    visitorType: text('visitor_type', { enum: ['vendor', 'transport', 'guest'] }).default('guest'),
    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`)
}, (table) => ({
    contactIdx: index('visitor_contact_idx').on(table.contactNo),
    nameIdx: index('visitor_name_idx').on(table.name),
}));

// --- Visitor Logs (Visits) ---
export const visitorLogs = sqliteTable('visitor_logs', {
    id: text('id').primaryKey(),
    visitorId: text('visitor_id').references(() => visitorProfiles.id, { onDelete: 'restrict' }).notNull(),
    purpose: text('purpose'),
    visitingCardNo: text('visiting_card_no'), 
    entryTime: integer('entry_time', { mode: 'timestamp' }).notNull(),
    exitTime: integer('exit_time', { mode: 'timestamp' }),
    status: text('status', { enum: ['on_premises', 'checked_out'] }).notNull(),
    date: text('date').notNull() 
}, (table) => ({
    visitorIdIdx: index('vlog_visitor_id_idx').on(table.visitorId),
    statusIdx: index('vlog_status_idx').on(table.status),
    dateIdx: index('vlog_date_idx').on(table.date),
}));

// --- Vehicles (Logs) ---
export const vehicles = sqliteTable('vehicles', {
    id: text('id').primaryKey(),
    vehicleNumber: text('vehicle_number').notNull(),
    type: text('type', { enum: ['transport', 'regular'] }).notNull(),
    vendorName: text('vendor_name'),
    cargoDescription: text('cargo_description'),
    driverName: text('driver_name'),
    helperName: text('helper_name'),
    mobile: text('mobile'),
    note: text('note'),
    entryTime: integer('entry_time', { mode: 'timestamp' }).notNull(),
    exitTime: integer('exit_time', { mode: 'timestamp' }),
    status: text('status', { enum: ['on_premises', 'checked_out'] }).notNull(),
    date: text('date').notNull() 
}, (table) => ({
    vehicleNumIdx: index('vehicle_num_idx').on(table.vehicleNumber),
    statusIdx: index('vehicle_status_idx').on(table.status),
    dateIdx: index('vehicle_date_idx').on(table.date),
}));
```

## 4. Localization Implementation (Bangla) [DONE]

Create a lightweight translation state using Svelte 5 Runes: `src/lib/i18n.svelte.ts`.
**IMPORTANT:** Ensure these exact keys are implemented. Use `browser` from `$app/environment` for SSR safety.

```typescript
import { browser } from '$app/environment';

const translations = {
    en: {
        // Navigation
        appName: 'KR Steel HRM',
        dashboard: 'Dashboard',
        labours: 'Labours',
        visitors: 'Visitors',
        vehicles: 'Vehicles',

        // Actions
        checkIn: 'Check In',
        checkOut: 'Check Out',
        addNew: 'Add New',
        edit: 'Edit',
        delete: 'Delete',
        save: 'Save',
        cancel: 'Cancel',
        confirm: 'Confirm',

        // Common Labels
        name: 'Name',
        phone: 'Phone',
        designation: 'Designation',
        company: 'Company',
        purpose: 'Purpose',
        vehicleNo: 'Vehicle No',
        cardNo: 'Card No',
        status: 'Status',
        actions: 'Actions',
        date: 'Date',
        entryTime: 'Entry Time',
        exitTime: 'Exit Time',
        codeNo: 'Code No',
        joinDate: 'Join Date',
        trainingDetails: 'Training Details',

        // Labour Types
        type: 'Type',
        companyLabour: 'Company',
        contractorLabour: 'Contractor',

        // Visitor Types
        visitorType: 'Visitor Type',
        vendor: 'Vendor',
        transport: 'Transport',
        guest: 'Guest',

        // Vehicle Fields
        vehicleType: 'Vehicle Type',
        transportVehicle: 'Transport',
        regularVehicle: 'Regular',
        driverName: 'Driver Name',
        helperName: 'Helper Name',
        vendorName: 'Vendor Name',
        cargo: 'Cargo Description',
        note: 'Note',

        // Status Labels
        onPremises: 'On Premises',
        checkedOut: 'Checked Out',
        inside: 'Inside',

        // Page Sections
        registry: 'Registry',
        attendance: 'Attendance',
        history: 'History',
        activeLog: 'Currently Inside',

        // Search & Empty States
        searchPlaceholder: 'Search...',
        noResults: 'No results found.',
        noData: 'No data available.',

        // Messages
        successCheckIn: 'Successfully checked in!',
        successCheckOut: 'Successfully checked out!',
        successSaved: 'Saved successfully!',
        successDeleted: 'Deleted successfully!',
        errorGeneric: 'Something went wrong.',
        confirmDelete: 'Are you sure you want to delete this?',
    },
    bn: {
        // Navigation
        appName: 'কে.আর স্টিল',
        dashboard: 'ড্যাশবোর্ড',
        labours: 'শ্রমিক',
        visitors: 'দর্শনার্থী',
        vehicles: 'যানবাহন',

        // Actions
        checkIn: 'প্রবেশ',
        checkOut: 'বাহির',
        addNew: 'নতুন যোগ',
        edit: 'সম্পাদনা',
        delete: 'মুছুন',
        save: 'সংরক্ষণ',
        cancel: 'বাতিল',
        confirm: 'নিশ্চিত করুন',

        // Common Labels
        name: 'নাম',
        phone: 'মোবাইল',
        designation: 'পদবী',
        company: 'কোম্পানি',
        purpose: 'উদ্দেশ্য',
        vehicleNo: 'গাড়ির নম্বর',
        cardNo: 'কার্ড নম্বর',
        status: 'অবস্থা',
        actions: 'পদক্ষেপ',
        date: 'তারিখ',
        entryTime: 'প্রবেশের সময়',
        exitTime: 'বাহিরের সময়',
        codeNo: 'কোড নং',
        joinDate: 'যোগদানের তারিখ',
        trainingDetails: 'প্রশিক্ষণ তথ্য',

        // Labour Types
        type: 'ধরন',
        companyLabour: 'কোম্পানি',
        contractorLabour: 'ঠিকাদার',

        // Visitor Types
        visitorType: 'দর্শনার্থীর ধরন',
        vendor: 'ভেন্ডর',
        transport: 'পরিবহন',
        guest: 'অতিথি',

        // Vehicle Fields
        vehicleType: 'গাড়ির ধরন',
        transportVehicle: 'পরিবহন',
        regularVehicle: 'সাধারণ',
        driverName: 'চালকের নাম',
        helperName: 'হেল্পারের নাম',
        vendorName: 'ভেন্ডরের নাম',
        cargo: 'মালামালের বিবরণ',
        note: 'নোট',

        // Status Labels
        onPremises: 'প্রাঙ্গনে',
        checkedOut: 'বাইরে',
        inside: 'ভিতরে',

        // Page Sections
        registry: 'নিবন্ধন',
        attendance: 'উপস্থিতি',
        history: 'ইতিহাস',
        activeLog: 'বর্তমানে ভিতরে',

        // Search & Empty States
        searchPlaceholder: 'অনুসন্ধান...',
        noResults: 'কোনো তথ্য পাওয়া যায়নি।',
        noData: 'কোনো তথ্য নেই।',

        // Messages
        successCheckIn: 'সফলভাবে প্রবেশ করানো হয়েছে!',
        successCheckOut: 'সফলভাবে বাহির করা হয়েছে!',
        successSaved: 'সফলভাবে সংরক্ষিত হয়েছে!',
        successDeleted: 'সফলভাবে মুছে ফেলা হয়েছে!',
        errorGeneric: 'কিছু ভুল হয়েছে।',
        confirmDelete: 'আপনি কি নিশ্চিত যে আপনি এটি মুছে ফেলতে চান?',
    }
};

type Lang = 'en' | 'bn';
type TranslationKey = keyof typeof translations['en'];

// Initialize with default; hydrate from localStorage on client
let currentLang = $state<Lang>('en');

// Call this once in root +layout.svelte inside onMount
export function initI18n() {
    if (browser) {
        const saved = localStorage.getItem('kr_hrm_lang') as Lang;
        if (saved === 'en' || saved === 'bn') currentLang = saved;
    }
}

export const i18n = {
    get lang() { return currentLang },
    setLang: (lang: Lang) => {
        currentLang = lang;
        if (browser) localStorage.setItem('kr_hrm_lang', lang);
    },
    t: (key: TranslationKey) => {
        return translations[currentLang][key] || key;
    }
};
```

**IMPORTANT:** Call `initI18n()` once in your root `+layout.svelte` inside `onMount`:
```svelte
<script lang="ts">
import { onMount } from 'svelte';
import { initI18n } from '$lib/i18n.svelte';

onMount(() => {
    initI18n();
});
</script>
```

## 5. Coding Standards (Strict Adherence Required) [DONE]



*   **Svelte 5 Only:**

    *   Use `$state()` for local state. **Do not** use `writable()` stores for local component state.

    *   Use `$props()` for component props. **Do not** use `export let`.

    *   Use `$derived()` for computed values.

    *   Use `<script lang="ts">` for all components.

*   **Forms:** Use `form` actions in `+page.server.ts` for all data mutations (Create, Update, Delete).

*   **Loading Data:** Use `+page.server.ts` `load` functions to fetch data.

*   **Type Safety:** Share types via `import type { PageData } from './$types'`.



## 6. Directory Structure & File Plan [DONE]



*Strictly adhere to these paths.*



```text

src/

├── lib/

│   ├── components/

│   │   ├── ui/

│   │   │   ├── Button.svelte       (Base button)

│   │   │   ├── Input.svelte        (Base text input)

│   │   │   ├── Select.svelte       (Dropdown for type selections)

│   │   │   ├── Card.svelte         (Container with shadow)

│   │   │   ├── Badge.svelte        (Status indicator pill)

│   │   │   └── Modal.svelte        (Dialog for forms)

│   │   ├── Navbar.svelte           (Top navigation)

│   │   └── LangSwitch.svelte       (Language toggler)

│   ├── server/

│   │   └── db/

│   │       ├── schema.ts           (Provided in Section 3)

│   │       └── index.ts            (Drizzle Client)

│   └── i18n.svelte.ts              (Provided in Section 4)

├── routes/

│   ├── +layout.svelte              (Global Shell: Navbar + Toaster)

│   ├── +page.svelte                (Dashboard)

│   ├── +page.server.ts             (Dashboard Data Loading)

│   ├── labours/

│   │   ├── +page.svelte            (Registry: List View + Search + Add/Edit Modal)

│   │   ├── +page.server.ts         (Load List + Actions: Create/Update/Delete)

│   │   ├── [id]/

│   │   │   ├── +page.svelte        (Profile: Labour Details + Attendance History)

│   │   │   └── +page.server.ts     (Load Labour + Their Logs)

│   │   └── attendance/

│   │       ├── +page.svelte        (Today's Attendance Log View)

│   │       └── +page.server.ts     (Load Logs + Actions: Check-in/Check-out)

│   ├── visitors/

│   │   ├── +page.svelte            (Active Visitor Logs - Currently Inside)

│   │   ├── +page.server.ts         (Load Active Logs + Actions: Check-in/Check-out)

│   │   ├── profiles/

│   │   │   ├── +page.svelte        (Visitor Profiles Registry)

│   │   │   └── +page.server.ts     (Load Profiles + Actions: Create/Update/Delete)

│   │   └── history/

│   │       ├── +page.svelte        (All Past Visitor Logs - Searchable)

│   │       └── +page.server.ts     (Load All Logs with Search/Filter)

│   └── vehicles/

│       ├── +page.svelte            (Active Vehicle Logs - Currently Inside)

│       ├── +page.server.ts         (Load Active Logs + Actions: Check-in/Check-out)

│       └── history/

│           ├── +page.svelte        (All Past Vehicle Logs - Searchable)

│           └── +page.server.ts     (Load All Logs with Search/Filter)

```



## 7. Implementation Checklist (Execute Sequentially)



**Phase 1: Foundation [DONE]**

1.  **Dependencies:** Install `lucide-svelte clsx tailwind-merge date-fns uuid svelte-sonner zod`.

2.  **Database:**

    *   Update `src/lib/server/db/schema.ts` with the code from **Section 3**.

    *   Run `pnpm db:push` to sync the database.

3.  **Localization:** Create `src/lib/i18n.svelte.ts` with the code from **Section 4**.



**Phase 2: Core UI Components [DONE]**

*Create these files in `src/lib/components/ui/` first.*

1.  `Button.svelte`: Support variants (primary, danger, outline).

2.  `Input.svelte`: Basic styled input with label support.

3.  `Select.svelte`: Styled dropdown with label support. Accepts `options` array of `{ value, label }`.

4.  `Badge.svelte`: Accepts a 'status' prop and renders the correct color (Green for 'on_premises', Red for 'checked_out').

5.  `Modal.svelte`: A simple overlay dialog that can be opened/closed via a `$state` boolean prop.



**Phase 3: Global Layout [DONE]**

1.  `LangSwitch.svelte`: Uses `i18n.setLang()` to toggle between 'en' and 'bn'.

2.  `Navbar.svelte`: Top navigation bar with:
    *   App name/logo linking to Dashboard (`/`)
    *   Main nav links: Dashboard, Labours, Visitors, Vehicles
    *   Sub-navigation (can be dropdown or secondary row):
        *   Labours: Registry (`/labours`), Attendance (`/labours/attendance`)
        *   Visitors: Active (`/visitors`), Profiles (`/visitors/profiles`), History (`/visitors/history`)
        *   Vehicles: Active (`/vehicles`), History (`/vehicles/history`)
    *   `LangSwitch` component on the right side
    *   Mobile: Hamburger menu that opens a slide-out drawer with all links

3.  `routes/+layout.svelte`:

    *   Import `<Toaster />` from `svelte-sonner`.

    *   Import `initI18n` from `$lib/i18n.svelte` and call it inside `onMount`.

    *   Render `Navbar` at the top.

    *   Render `{@render children()}` inside a container.



**Phase 4: Feature Modules [DONE]**

### 4.1 Dashboard (`/`) [DONE]

**`+page.server.ts`:**
```typescript
load(): Return counts of:
  - laboursInside: SELECT COUNT(*) FROM labour_logs WHERE status = 'on_premises'
  - visitorsInside: SELECT COUNT(*) FROM visitor_logs WHERE status = 'on_premises'
  - vehiclesInside: SELECT COUNT(*) FROM vehicles WHERE status = 'on_premises'
```

**`+page.svelte`:**
- Display 3 large counter cards (Labours, Visitors, Vehicles) with counts
- Each card links to its respective module
- Use icons from lucide-svelte (Users, UserCheck, Truck)

---

### 4.2 Labour Module [DONE]

#### `/labours` (Registry) [DONE]

**`+page.server.ts`:**
```typescript
load(): SELECT * FROM labours ORDER BY created_at DESC
actions: {
  create: INSERT new labour (generate UUID, validate codeNo uniqueness)
  update: UPDATE labour by id
  delete: DELETE labour by id (will fail if logs exist due to restrict)
}
```

**`+page.svelte`:**
- Table with columns: Code No, Name, Type, Designation, Join Date, Actions
- Search input filters by name or codeNo (client-side filtering is fine)
- "Add New" button opens Modal with form: name, codeNo, type (Select), designation, joinDate, trainingDetails
- Each row has Edit (opens modal pre-filled) and Delete buttons
- Name links to `/labours/[id]`

#### `/labours/[id]` (Profile) [DONE]

**`+page.server.ts`:**
```typescript
load({ params }):
  - SELECT * FROM labours WHERE id = params.id
  - SELECT * FROM labour_logs WHERE labour_id = params.id ORDER BY date DESC, entry_time DESC
```

**`+page.svelte`:**
- Header card showing labour details (name, codeNo, type, designation, joinDate, trainingDetails)
- Table of attendance history: Date, Entry Time, Exit Time, Status

#### `/labours/attendance` (Daily Attendance) [DONE]

**`+page.server.ts`:**
```typescript
load():
  - SELECT labour_logs.*, labours.name, labours.codeNo
    FROM labour_logs
    JOIN labours ON labour_logs.labour_id = labours.id
    WHERE labour_logs.date = TODAY
    ORDER BY entry_time DESC
  - Also load list of labours for check-in dropdown
actions: {
  checkIn: INSERT labour_log (labour_id, entry_time=now, status='on_premises', date=today)
  checkOut: UPDATE labour_logs SET exit_time=now, status='checked_out' WHERE id=?
}
```

**`+page.svelte`:**
- "Check In" button opens Modal with Select dropdown of labours (show name + codeNo)
- Table: Name, Code No, Entry Time, Exit Time, Status, Actions
- Status shown as Badge (green for on_premises, gray for checked_out)
- "Check Out" button only shown for rows with status='on_premises'

---

### 4.3 Visitor Module [DONE]

#### `/visitors` (Active Logs) [DONE]

**`+page.server.ts`:**
```typescript
load():
  - SELECT visitor_logs.*, visitor_profiles.name, visitor_profiles.company, visitor_profiles.contactNo
    FROM visitor_logs
    JOIN visitor_profiles ON visitor_logs.visitor_id = visitor_profiles.id
    WHERE visitor_logs.status = 'on_premises'
    ORDER BY entry_time DESC
  - Also load visitor_profiles for check-in dropdown
actions: {
  checkIn: INSERT visitor_log (visitor_id, purpose, visitingCardNo, entry_time=now, status='on_premises', date=today)
  checkOut: UPDATE visitor_logs SET exit_time=now, status='checked_out' WHERE id=?
}
```

**`+page.svelte`:**
- "Check In" button opens Modal:
  - Select dropdown of existing visitor profiles (or link to create new in /visitors/profiles)
  - Input for purpose
  - Input for visitingCardNo
- Table: Name, Company, Phone, Purpose, Card No, Entry Time, Actions
- "Check Out" button for each row

#### `/visitors/profiles` (Registry) [DONE]

**`+page.server.ts`:**
```typescript
load(): SELECT * FROM visitor_profiles ORDER BY created_at DESC
actions: {
  create: INSERT visitor_profile (name, company, contactNo, visitorType)
  update: UPDATE visitor_profile by id
  delete: DELETE visitor_profile by id (will fail if logs exist)
}
```

**`+page.svelte`:**
- Table: Name, Company, Contact No, Type, Actions
- Search input filters by name or contactNo
- "Add New" opens Modal: name, company, contactNo, visitorType (Select)
- Edit and Delete buttons per row

#### `/visitors/history` (All Logs) [DONE]

**`+page.server.ts`:**
```typescript
load({ url }):
  - Get optional search query from url.searchParams
  - SELECT visitor_logs.*, visitor_profiles.name, visitor_profiles.company
    FROM visitor_logs
    JOIN visitor_profiles ON visitor_logs.visitor_id = visitor_profiles.id
    ORDER BY date DESC, entry_time DESC
    LIMIT 100
```

**`+page.svelte`:**
- Search input (searches by visitor name)
- Table: Date, Name, Company, Purpose, Entry Time, Exit Time, Status

---

### 4.4 Vehicle Module [DONE]

#### `/vehicles` (Active Logs) [DONE]

**`+page.server.ts`:**
```typescript
load():
  - SELECT * FROM vehicles WHERE status = 'on_premises' ORDER BY entry_time DESC
actions: {
  checkIn: INSERT vehicle (all fields, entry_time=now, status='on_premises', date=today)
  checkOut: UPDATE vehicles SET exit_time=now, status='checked_out' WHERE id=?
}
```

**`+page.svelte`:**
- "Check In" button opens Modal with full form:
  - vehicleNumber (required)
  - type (Select: transport/regular)
  - vendorName, cargoDescription, driverName, helperName, mobile, note
- Table: Vehicle No, Type, Driver, Vendor, Cargo, Entry Time, Actions
- "Check Out" button for each row

#### `/vehicles/history` (All Logs) [DONE]

**`+page.server.ts`:**
```typescript
load({ url }):
  - Get optional search query from url.searchParams
  - SELECT * FROM vehicles ORDER BY date DESC, entry_time DESC LIMIT 100
```

**`+page.svelte`:**
- Search input (searches by vehicleNumber)
- Table: Date, Vehicle No, Type, Driver, Vendor, Cargo, Entry, Exit, Status



## 8. Style Hints for Code Generation [DONE]



*   **Buttons:** `px-4 py-3 rounded-lg font-semibold transition-all active:scale-95`.

*   **Inputs:** `w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500`.

*   **Mobile Lists:** Use `grid-cols-1` on mobile and `md:grid-cols-3` on desktop.

*   **Status Colors:**

    *   'on_premises' -> `bg-green-100 text-green-800`

    *   'checked_out' -> `bg-gray-100 text-gray-800`
