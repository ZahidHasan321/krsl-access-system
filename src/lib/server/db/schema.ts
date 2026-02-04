import { sqliteTable, text, integer, index, primaryKey } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// --- RBAC ---
export const roles = sqliteTable('roles', {
    id: text('id').primaryKey(), // 'admin', 'guard'
    name: text('name').notNull().unique(), // Display name
    description: text('description')
});

export const permissions = sqliteTable('permissions', {
    id: text('id').primaryKey(), // 'people.view', 'people.create', etc.
    description: text('description')
});

export const rolePermissions = sqliteTable('role_permissions', {
    roleId: text('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
    permissionId: text('permission_id').notNull().references(() => permissions.id, { onDelete: 'cascade' }),
}, (table) => ({
    pk: primaryKey({ columns: [table.roleId, table.permissionId] })
}));

// --- Auth ---
export const user = sqliteTable('user', {
    id: text('id').primaryKey(),
    username: text('username').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    roleId: text('role_id').notNull().references(() => roles.id),
    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`)
});

export const session = sqliteTable('session', {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull()
});

export type Session = typeof session.$inferSelect;
export type User = typeof user.$inferSelect;

// --- People Category System ---
export const personCategories = sqliteTable('person_categories', {
    id: text('id').primaryKey(), // uuid
    name: text('name').notNull(), // e.g. "Customer", "Dokandari", "Employee"
    slug: text('slug').notNull().unique(), // url-safe: "customer", "dokandari"
    parentId: text('parent_id').references((): any => personCategories.id, { onDelete: 'cascade' }), // null = root category
    sortOrder: integer('sort_order').default(0), // ordering within siblings
    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`)
}, (table) => ({
    parentIdIdx: index('category_parent_id_idx').on(table.parentId),
    slugIdx: index('category_slug_idx').on(table.slug),
}));

// --- People Table ---
export const people = sqliteTable('people', {
    id: text('id').primaryKey(), // uuid
    name: text('name').notNull(),
    categoryId: text('category_id').notNull().references(() => personCategories.id),

    // Identification
    codeNo: text('code_no').unique(), // employee ID / visitor card number
    cardNo: text('card_no'), // RFID/NFC card number
    biometricId: text('biometric_id'), // device ID
    photoUrl: text('photo_url'), // path to stored photo

    // Contact & details
    company: text('company'),
    contactNo: text('contact_no'),
    designation: text('designation'),

    // Training
    isTrained: integer('is_trained', { mode: 'boolean' }).notNull().default(false),

    // Metadata
    joinDate: integer('join_date', { mode: 'timestamp' }),
    notes: text('notes'),
    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`)
}, (table) => ({
    nameIdx: index('people_name_idx').on(table.name),
    categoryIdx: index('people_category_id_idx').on(table.categoryId),
    codeIdx: index('people_code_no_idx').on(table.codeNo),
    cardIdx: index('people_card_no_idx').on(table.cardNo),
    biometricIdx: index('people_biometric_id_idx').on(table.biometricId),
    contactIdx: index('people_contact_no_idx').on(table.contactNo),
    companyIdx: index('people_company_idx').on(table.company),
}));

// --- Attendance Logs ---
export const attendanceLogs = sqliteTable('attendance_logs', {
    id: text('id').primaryKey(),
    personId: text('person_id').notNull().references(() => people.id, { onDelete: 'restrict' }),
    entryTime: integer('entry_time', { mode: 'timestamp' }).notNull(),
    exitTime: integer('exit_time', { mode: 'timestamp' }), // null = currently inside
    status: text('status', { enum: ['on_premises', 'checked_out'] }).notNull(),
    date: text('date').notNull(), // 'YYYY-MM-DD'
    purpose: text('purpose'), // Reason for visit (for non-employees)
    notes: text('notes'),
    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`)
}, (table) => ({
    personIdIdx: index('attendance_person_id_idx').on(table.personId),
    statusIdx: index('attendance_status_idx').on(table.status),
    dateIdx: index('attendance_date_idx').on(table.date),
    entryTimeIdx: index('attendance_entry_time_idx').on(table.entryTime),
    personStatusIdx: index('attendance_person_status_idx').on(table.personId, table.status),
}));

// --- Vehicles ---
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
    driverNameIdx: index('vehicle_driver_idx').on(table.driverName),
    vendorNameIdx: index('vehicle_vendor_idx').on(table.vendorName),
    entryTimeIdx: index('vehicle_entry_time_idx').on(table.entryTime),
}));