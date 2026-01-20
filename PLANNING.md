# Project Planning: KR Steel HRM

## Overview
KR Steel HRM is a Gate Management and Human Resource system designed to manage the flow of personnel and vehicles into the facility. The system focuses on three key entities: Daily Labours (Company & Contractor), Visitors, and Vehicles. The core functionality revolves around tracking entry/exit times, managing identity details, and maintaining operational logs. Future iterations will include hardware integration for Face Recognition and Card Scanning.

## Architecture & Tech Stack
- **Frontend:** SvelteKit
- **Database:** SQLite (local.db) with Drizzle ORM
- **Auth:** Custom Backend Auth (Implementation deferred)
- **Styling:** Tailwind CSS v4

## Database Schema Design

### 1. Users (Admin/Guard)
*System users with access to the dashboard.*

| Column | Type | Notes |
| :--- | :--- | :--- |
| `id` | `text` (UUID) | Primary Key |
| `username` | `text` | Unique |
| `password_hash` | `text` | |
| `role` | `text` | Enum: 'admin', 'guard' |
| `created_at` | `integer` | |

### 2. Labours (Entity)
*Stores master data for daily labours. This is the permanent registry.*

| Column | Type | Notes |
| :--- | :--- | :--- |
| `id` | `text` (UUID) | Primary Key |
| `name` | `text` | |
| `code_no` | `text` | Unique Identifier |
| `join_date` | `integer` | Timestamp/Date |
| `designation` | `text` | |
| `training_details` | `text` | |
| `type` | `text` | Enum: 'company', 'contractor' |
| `created_at` | `integer` | |

### 3. Labour Logs (Transaction)
*Tracks daily entry/exit for registered labours.*

| Column | Type | Notes |
| :--- | :--- | :--- |
| `id` | `text` (UUID) | Primary Key |
| `labour_id` | `text` | Foreign Key to Labours.id |
| `entry_time` | `integer` | Timestamp |
| `exit_time` | `integer` | Timestamp (Nullable) |
| `status` | `text` | Enum: 'on_premises', 'checked_out' |
| `date` | `text` | ISO Date (YYYY-MM-DD) for easier querying |

### 4. Visitor Profiles (Entity)
*Stores master data for frequent visitors to avoid redundancy.*

| Column | Type | Notes |
| :--- | :--- | :--- |
| `id` | `text` (UUID) | Primary Key |
| `name` | `text` | |
| `company` | `text` | |
| `contact_no` | `text` | Unique Index recommended |
| `visitor_type` | `text` | Enum: 'vendor', 'transport', 'guest' |
| `created_at` | `integer` | |

### 5. Visitor Logs (Transaction)
*Tracks individual visits linking to a profile.*

| Column | Type | Notes |
| :--- | :--- | :--- |
| `id` | `text` (UUID) | Primary Key |
| `visitor_id` | `text` | Foreign Key to VisitorProfiles.id |
| `purpose` | `text` | |
| `visiting_card_no` | `text` | ID/Card Number used for entry |
| `entry_time` | `integer` | Timestamp |
| `exit_time` | `integer` | Timestamp (Nullable, filled on exit) |
| `status` | `text` | Enum: 'on_premises', 'checked_out' |
| `date` | `text` | ISO Date (YYYY-MM-DD) for easier querying |

### 6. Vehicles (Log/Transaction)
*Tracks vehicle movement. Since drivers and cargo change per trip, each entry is treated as a unique transaction linked to the vehicle number.*

| Column | Type | Notes |
| :--- | :--- | :--- |
| `id` | `text` (UUID) | Primary Key |
| `vehicle_number` | `text` | License Plate |
| `type` | `text` | Enum: 'transport', 'regular' |
| `vendor_name` | `text` | |
| `cargo_description` | `text` | "What it's carrying" |
| `driver_name` | `text` | |
| `helper_name` | `text` | |
| `mobile` | `text` | Driver's contact |
| `note` | `text` | |
| `entry_time` | `integer` | Timestamp |
| `exit_time` | `integer` | Timestamp (Nullable) |
| `status` | `text` | Enum: 'on_premises', 'checked_out' |
| `date` | `text` | ISO Date (YYYY-MM-DD) for easier querying |

## Application Structure & Pages

### 1. Dashboard (`/`)
- Overview of current status:
    - Count of Labours inside.
    - Count of Visitors inside.
    - Count of Vehicles inside.
- Quick Actions (New Entry).

### 2. Labour Management (`/labours`)
- **Registry (`/labours`):** List of all registered labours with search. Add/Edit via modal.
- **Attendance (`/labours/attendance`):** View daily attendance logs. Check-in/Check-out actions.
- **Profile (`/labours/[id]`):** View individual labour details and their attendance history.

### 3. Visitor Log (`/visitors`)
- **Profiles (`/visitors/profiles`):** Manage Visitor Profiles registry (create, edit, delete).
- **Active Log (`/visitors`):** List of visitors currently on premises. Check-in/Check-out actions.
- **History (`/visitors/history`):** Searchable history of all past visits.

### 4. Vehicle Log (`/vehicles`)
- **Active Log (`/vehicles`):** List of vehicles currently on premises. Check-in/Check-out actions.
- **History (`/vehicles/history`):** Searchable history of all past vehicle entries.

## Roadmap / Implementation Plan

### Phase 1: Core Implementation (Current Focus)
- [ ] **Database Setup:** Define Drizzle schemas for `users`, `labours`, `labour_logs`, `visitor_profiles`, `visitor_logs`, and `vehicles`.
- [ ] **UI Components:** Button, Input, Select, Badge, Modal, Card, Navbar, LangSwitch.
- [ ] **Localization:** i18n system with English/Bangla support.
- [ ] **Dashboard:** Counter cards showing current occupancy (labours, visitors, vehicles inside).
- [ ] **Labour Module:**
    - [ ] Registry page (`/labours`) - List, Add, Edit, Delete labours.
    - [ ] Profile page (`/labours/[id]`) - View labour details + attendance history.
    - [ ] Attendance page (`/labours/attendance`) - Today's check-in/check-out log.
- [ ] **Visitor Module:**
    - [ ] Active logs page (`/visitors`) - Currently inside, check-in/check-out.
    - [ ] Profiles page (`/visitors/profiles`) - Manage visitor registry.
    - [ ] History page (`/visitors/history`) - Searchable past visits.
- [ ] **Vehicle Module:**
    - [ ] Active logs page (`/vehicles`) - Currently inside, check-in/check-out.
    - [ ] History page (`/vehicles/history`) - Searchable past entries.

### Phase 2: Gate Operations (Future)
- [ ] "Quick Entry" mode for guards (simplified UI for fast check-ins).
- [ ] Real-time updates (auto-refresh or WebSocket).

### Phase 3: Hardware Integration (Future)
- [ ] Face Recognition hook for Labour lookup.
- [ ] Card Reader input focus handling for Visitors.

## Notes
- **Face Recognition:** Deferred. Currently, focus on manual entry/management of the labour registry.
- **Vehicles:** Treated as dynamic entries. Even if the truck `KA-01-1234` returns, the driver or cargo might be different, so we record these details per visit.
- **Authentication:** Custom backend implementation (deferred).