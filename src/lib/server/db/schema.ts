import { sqliteTable, text, integer, index, primaryKey } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// --- RBAC (New) ---
export const roles = sqliteTable('roles', {
    id: text('id').primaryKey(), // 'admin', 'guard'
    name: text('name').notNull().unique(), // Display name
    description: text('description')
});

export const permissions = sqliteTable('permissions', {
    id: text('id').primaryKey(), // 'labour.view', 'labour.create'
    description: text('description')
});

export const rolePermissions = sqliteTable('role_permissions', {
    roleId: text('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
    permissionId: text('permission_id').notNull().references(() => permissions.id, { onDelete: 'cascade' }),
}, (table) => ({
    pk: primaryKey({ columns: [table.roleId, table.permissionId] })
}));

// --- Auth (Existing & Required) ---
// Kept compatible with src/lib/server/auth.ts
export const user = sqliteTable('user', {
    id: text('id').primaryKey(),
    username: text('username').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    // Extended fields for HRM
    role: text('role', { enum: ['admin', 'guard'] }).default('guard').notNull(), // Legacy: to be migrated
    roleId: text('role_id').references(() => roles.id), // New RBAC Link
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
    // Store as boolean (0 or 1). Default to 1 (true) as requested.
    isTrained: integer('is_trained', { mode: 'boolean' }).default(true).notNull(),
    type: text('type', { enum: ['company', 'contractor'] }).notNull(),
    contractorName: text('contractor_name'),
    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`)
}, (table) => ({
    nameIdx: index('labour_name_idx').on(table.name),
    codeIdx: index('labour_code_idx').on(table.codeNo),
    designationIdx: index('labour_designation_idx').on(table.designation),
    contractorIdx: index('labour_contractor_idx').on(table.contractorName),
    createdAtIdx: index('labour_created_at_idx').on(table.createdAt),
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
    entryTimeIdx: index('log_entry_time_idx').on(table.entryTime),
}));

// --- Visitor Profiles (Master) ---
export const visitorProfiles = sqliteTable('visitor_profiles', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    company: text('company'),
    contactNo: text('contact_no').unique(),
    visitorType: text('visitor_type', { enum: ['vendor', 'guest'] }).default('guest'),
    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`)
}, (table) => ({
    contactIdx: index('visitor_contact_idx').on(table.contactNo),
    nameIdx: index('visitor_name_idx').on(table.name),
    companyIdx: index('visitor_company_idx').on(table.company),
    createdAtIdx: index('visitor_created_at_idx').on(table.createdAt),
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
    vCardIdx: index('vlog_card_no_idx').on(table.visitingCardNo),
    entryTimeIdx: index('vlog_entry_time_idx').on(table.entryTime),
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
    driverNameIdx: index('vehicle_driver_idx').on(table.driverName),
    vendorNameIdx: index('vehicle_vendor_idx').on(table.vendorName),
    entryTimeIdx: index('vehicle_entry_time_idx').on(table.entryTime),
}));
