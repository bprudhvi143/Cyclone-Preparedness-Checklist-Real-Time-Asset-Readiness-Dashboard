# DATABASE DESIGN: Cyclone Preparedness Checklist & Real-Time Asset Readiness Dashboard

**Client:** Greater Visakhapatnam Municipal Corporation (GVMC)  
**Domain:** Disaster Management & Emergency Response  
**Target DBMS:** PostgreSQL 16+  
**Spatial Extension:** PostGIS 3.4+  
**Target ORM:** SQLAlchemy 2.0  
**Migration Tool:** Alembic  
**Primary Key Standard:** RFC 4122 UUIDv4  

---

## 1 Database Goals

### 1.1 Why PostgreSQL
PostgreSQL 16 was selected as the core database engine for the GVMC Disaster Management platform for several reasons:
1.  **Native GIS Capabilities (PostGIS)**: Disaster management relies on geographical intelligence. PostGIS extends PostgreSQL to support spatial datasets, allowing coordinates (shelter/asset locations) and polygon boundaries (wards/zones) to be stored, indexed, and analyzed natively using SQL functions (e.g., checking if a submission occurred within 15 meters of a shelter).
2.  **Robust JSONB Support**: To accommodate future disaster types (e.g., floods, heatwaves) and dynamic audit logging, the database requires a storage engine that combines relational constraints with high-performance, queryable JSON fields. PostgreSQL’s binary JSON implementation (`JSONB`) allows queryable metadata schemas and indexing (GIN) over dynamic JSON keys.
3.  **Advanced Concurrency Control (MVCC)**: During disaster activations, multiple Field Officers, Zone Managers, and executive users will submit check data and view metrics concurrently. PostgreSQL’s Multi-Version Concurrency Control (MVCC) ensures read operations never block write operations.
4.  **Security and Access Control**: Offers enterprise-grade encryption options, role propagation, column-level security, and structured connection patterns.

### 1.2 Relational Database vs. NoSQL
Disaster preparedness auditing requires strict data consistency and referential integrity. If a shelter is deleted, the system must not leave orphaned checklist submissions or alerts. Relational databases enforce strict schemas, transactional behavior (ACID compliance), foreign key constraints, and unique constraints, preventing:
*   Duplicate submissions for a shelter within the same operational cycle.
*   Checklists submitted by non-existent users.
*   Photos linked to missing question responses.

### 1.3 Scalability Considerations & Workload Profile
*   **Write Workload**: Highly bursty. Under normal conditions, usage is low. During a active cyclone warning, approximately 100+ concurrent Field Officers will upload multiple checklists and photos in a concentrated 4 to 8-hour window.
*   **Read Workload**: Continuous and low-latency. Commissioners and Zone Officers will view dashboards that run aggregate queries.
*   **Mitigation Strategy**: The schema incorporates precomputed state tables (`readiness_snapshots`) updated via database triggers or background task workers, avoiding heavy aggregation queries on the raw submissions database during dashboard updates.

---

## 2 ER Diagram

```mermaid
erDiagram
    DISASTER_TYPE ||--o{ CHECKLIST_TEMPLATE : "defines"
    DISASTER_TYPE ||--o{ OPERATIONAL_CYCLE : "manages"
    ZONE ||--o{ WARD : "subdivides"
    ZONE ||--o{ USER : "filters"
    WARD ||--o{ SHELTER : "contains"
    WARD ||--o{ ASSET : "locates"
    WARD ||--o{ USER : "filters"
    USER ||--o{ CHECKLIST_SUBMISSION : "submits"
    USER ||--o{ SYSTEM_ALERT : "manages"
    USER ||--o{ NOTIFICATION : "receives"
    USER ||--o{ AUDIT_LOG : "creates"
    SHELTER ||--o{ ASSET : "houses"
    SHELTER ||--o{ CHECKLIST_SUBMISSION : "receives"
    ASSET_CATEGORY ||--o{ ASSET : "classifies"
    ASSET ||--o{ CHECKLIST_SUBMISSION : "receives"
    CHECKLIST_TEMPLATE ||--o{ CHECKLIST_SECTION : "contains"
    CHECKLIST_SECTION ||--o{ CHECKLIST_QUESTION : "contains"
    OPERATIONAL_CYCLE ||--o{ CHECKLIST_SUBMISSION : "gathers"
    CHECKLIST_SUBMISSION ||--o{ CHECKLIST_RESPONSE : "contains"
    CHECKLIST_QUESTION ||--o{ CHECKLIST_RESPONSE : "answers"
    CHECKLIST_RESPONSE ||--o|| PHOTO_METADATA : "verifies"
    CHECKLIST_SUBMISSION ||--o{ SYSTEM_ALERT : "triggers"
    CHECKLIST_QUESTION ||--o{ SYSTEM_ALERT : "failed_at"
    SYSTEM_ALERT ||--o{ NOTIFICATION : "sends"
```

---

## 3 Entity List

| Table Name | Target Name | Core Purpose | Soft Delete? |
| :--- | :--- | :--- | :--- |
| **Disaster Types** | `disaster_types` | Defines disaster categories (Cyclone, Flood, Heatwave) to support future expansion. | No |
| **Zones** | `zones` | Maps GVMC's 8 primary administrative zones. | No |
| **Wards** | `wards` | Maps GVMC's 98 wards, including spatial boundary polygons. | No |
| **Users** | `users` | Stores accounts, password hashes, and assigned location profiles. | Yes |
| **Asset Categories**| `asset_categories` | Defines equipment categories (e.g., Dewatering Pumps, Chain Saws, Generators).| No |
| **Shelters** | `shelters` | Stores safe evacuation shelters with capacity and coordinate data. | Yes |
| **Assets** | `assets` | Physical emergency machinery registered across wards and shelters. | Yes |
| **Operational Cycles**| `operational_cycles` | Operational campaigns (e.g., "Cyclone Gulab Oct 2026"). | No |
| **Checklist Templates**| `checklist_templates` | Schema templates containing section-based inspection questions. | Yes |
| **Checklist Sections**| `checklist_sections` | Groups questions (e.g., infrastructure checks, logistics staging). | No |
| **Checklist Questions**| `checklist_questions` | Individual checkpoints, assigning weights and critical flags. | Yes |
| **Submissions** | `checklist_submissions` | Parent table for checklists submitted by Field Officers. | Yes |
| **Checklist Responses**| `checklist_responses` | Submitter answers (Yes/No/NA) for checklist questions. | No |
| **Photo Metadata** | `photo_metadata` | Storage locations and EXIF data for uploaded verification photos. | No |
| **Scoring Configs** | `scoring_configurations` | Weight factors used to calculate readiness scores. | No |
| **Readiness Snapshots**| `readiness_snapshots` | Cached readiness percentage calculations for dashboards. | No |
| **System Alerts** | `system_alerts` | Tracks failures flagged from checklist answers. | No |
| **Notifications** | `notifications` | Pushes messages to target dashboard users. | No |
| **Audit Logs** | `audit_logs` | Logs state changes (inserts, updates, deletes) for security compliance. | No |
| **Activity Logs** | `activity_logs` | Logs administrative and operational actions (e.g., approvals, logins). | No |

---

## 4 Table Design

### 4.1 Administrative Hierarchy & Users

#### Table: `disaster_types`
*   **Purpose**: Categorizes disaster preparedness scopes. Allows the system to support new disasters without schema modifications.

| Column | Datatype | Nullable | Default | Constraints / Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | No | `gen_random_uuid()` | Primary Key |
| `name` | `VARCHAR(100)`| No | None | e.g., "Cyclone", "Flood" |
| `code` | `VARCHAR(20)` | No | None | Unique Code, e.g., "CYCLONE", "FLOOD" |
| `description`| `TEXT` | Yes | None | Details about the preparedness scope |
| `created_at` | `TIMESTAMPTZ` | No | `CURRENT_TIMESTAMP` | System creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | No | `CURRENT_TIMESTAMP` | System update timestamp |

*   **Indexes**: Unique index on `code`.
*   **Constraints**: `UNIQUE(code)`.

#### Table: `zones`
*   **Purpose**: Stores administrative zones of GVMC (typically Zone I to Zone VIII).

| Column | Datatype | Nullable | Default | Constraints / Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | No | `gen_random_uuid()` | Primary Key |
| `name` | `VARCHAR(100)`| No | None | Zone Name, e.g., "Zone-III (Gajuwaka)" |
| `code` | `VARCHAR(10)` | No | None | e.g., "Z3" |
| `created_at` | `TIMESTAMPTZ` | No | `CURRENT_TIMESTAMP` | Creation time |
| `updated_at` | `TIMESTAMPTZ` | No | `CURRENT_TIMESTAMP` | Update time |

*   **Indexes**: Unique index on `code`.
*   **Constraints**: `UNIQUE(code)`.

#### Table: `wards`
*   **Purpose**: Stores constituent wards under GVMC. Relates directly to a parent zone.

| Column | Datatype | Nullable | Default | Constraints / Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | No | `gen_random_uuid()` | Primary Key |
| `zone_id` | `UUID` | No | None | Foreign Key -> `zones.id` |
| `number` | `INTEGER` | No | None | Ward Number (e.g., 1 to 98) |
| `name` | `VARCHAR(150)`| No | None | e.g., "Madhurawada" |
| `boundary` | `GEOMETRY(Polygon, 4326)` | Yes | None | Spatial polygon for maps |
| `created_at` | `TIMESTAMPTZ` | No | `CURRENT_TIMESTAMP` | Creation time |
| `updated_at` | `TIMESTAMPTZ` | No | `CURRENT_TIMESTAMP` | Update time |

*   **Indexes**: 
    *   B-Tree index on `zone_id`.
    *   Spatial GIST index on `boundary`.
    *   Unique index on `number`.
*   **Constraints**: 
    *   `UNIQUE(number)`
    *   `CHECK (number > 0)`

#### Table: `users`
*   **Purpose**: Stores application users, roles, password hashes, and assigned location profiles.

| Column | Datatype | Nullable | Default | Constraints / Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | No | `gen_random_uuid()` | Primary Key |
| `full_name` | `VARCHAR(150)`| No | None | User's full name |
| `email` | `VARCHAR(255)`| No | None | Unique login email |
| `phone` | `VARCHAR(20)` | No | None | Mobile phone number |
| `password_hash`| `TEXT` | No | None | Argon2id hash |
| `role` | `VARCHAR(30)` | No | None | Role: `ADMIN`, `COMMISSIONER`, `ZONE_OFFICER`, `FIELD_OFFICER` |
| `status` | `VARCHAR(20)` | No | 'ACTIVE' | Status: `ACTIVE`, `INACTIVE`, `SUSPENDED` |
| `zone_id` | `UUID` | Yes | None | Foreign Key -> `zones.id` (Zone Officers) |
| `ward_id` | `UUID` | Yes | None | Foreign Key -> `wards.id` (Field Officers) |
| `created_at` | `TIMESTAMPTZ` | No | `CURRENT_TIMESTAMP` | Creation time |
| `updated_at` | `TIMESTAMPTZ` | No | `CURRENT_TIMESTAMP` | Update time |
| `deleted_at` | `TIMESTAMPTZ` | Yes | None | Soft delete timestamp |

*   **Indexes**:
    *   Unique index on `email` where `deleted_at IS NULL`.
    *   B-Tree index on `role`.
    *   B-Tree indexes on `zone_id`, `ward_id`.
*   **Constraints**:
    *   `CHECK (role IN ('ADMIN', 'COMMISSIONER', 'ZONE_OFFICER', 'FIELD_OFFICER'))`
    *   `CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED'))`

---

### 4.2 Shelters & Asset Inventories

#### Table: `shelters`
*   **Purpose**: Stores designated safe cyclone evacuation shelters with capacity and utilities data.

| Column | Datatype | Nullable | Default | Constraints / Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | No | `gen_random_uuid()` | Primary Key |
| `ward_id` | `UUID` | No | None | Foreign Key -> `wards.id` |
| `name` | `VARCHAR(200)`| No | None | e.g., "M V P Colony Community Hall" |
| `address` | `TEXT` | No | None | Physical address |
| `location` | `GEOMETRY(Point, 4326)` | No | None | Spatial point coordinates |
| `capacity` | `INTEGER` | No | None | Maximum occupant capacity |
| `contact_person`| `VARCHAR(150)`| Yes | None | Shelter manager name |
| `contact_phone`| `VARCHAR(20)` | Yes | None | Shelter manager phone |
| `created_at` | `TIMESTAMPTZ` | No | `CURRENT_TIMESTAMP` | Creation time |
| `updated_at` | `TIMESTAMPTZ` | No | `CURRENT_TIMESTAMP` | Update time |
| `deleted_at` | `TIMESTAMPTZ` | Yes | None | Soft delete timestamp |

*   **Indexes**:
    *   B-Tree index on `ward_id`.
    *   Spatial GIST index on `location`.

#### Table: `asset_categories`
*   **Purpose**: Defines categories of emergency resources (e.g., Dewatering Pumps, Chain Saws, Inflatable Boats).

| Column | Datatype | Nullable | Default | Constraints / Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | No | `gen_random_uuid()` | Primary Key |
| `name` | `VARCHAR(100)`| No | None | e.g., "Dewatering Pump", "Generator" |
| `code` | `VARCHAR(30)` | No | None | Unique key code, e.g., "PUMP", "GENSET" |
| `description`| `TEXT` | Yes | None | Category description |
| `created_at` | `TIMESTAMPTZ` | No | `CURRENT_TIMESTAMP` | Creation time |
| `updated_at` | `TIMESTAMPTZ` | No | `CURRENT_TIMESTAMP` | Update time |

*   **Indexes**: Unique index on `code`.
*   **Constraints**: `UNIQUE(code)`.

#### Table: `assets`
*   **Purpose**: Tracks individual physical emergency assets. Can be assigned to a ward or staged inside a shelter.

| Column | Datatype | Nullable | Default | Constraints / Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | No | `gen_random_uuid()` | Primary Key |
| `category_id`| `UUID` | No | None | Foreign Key -> `asset_categories.id` |
| `ward_id` | `UUID` | No | None | Foreign Key -> `wards.id` |
| `shelter_id` | `UUID` | Yes | None | Foreign Key -> `shelters.id` (Optional stage) |
| `name` | `VARCHAR(150)`| No | None | e.g., "Kirloskar Diesel Pump A-4" |
| `serial_number`| `VARCHAR(100)`| No | None | Manufacturer Serial/Asset Tag |
| `status` | `VARCHAR(30)` | No | 'FUNCTIONAL' | Status: `FUNCTIONAL`, `NON_FUNCTIONAL`, `STAGED`, `DISPATCHED` |
| `location` | `GEOMETRY(Point, 4326)` | Yes | None | Real-time coordinate of asset |
| `created_at` | `TIMESTAMPTZ` | No | `CURRENT_TIMESTAMP` | Creation time |
| `updated_at` | `TIMESTAMPTZ` | No | `CURRENT_TIMESTAMP` | Update time |
| `deleted_at` | `TIMESTAMPTZ` | Yes | None | Soft delete timestamp |

*   **Indexes**:
    *   B-Tree indexes on `category_id`, `ward_id`, `shelter_id`.
    *   Spatial GIST index on `location`.
    *   Unique index on `serial_number` where `deleted_at IS NULL`.
*   **Constraints**:
    *   `CHECK (status IN ('FUNCTIONAL', 'NON_FUNCTIONAL', 'STAGED', 'DISPATCHED'))`

---

### 4.3 Checklist Templates & Submissions

#### Table: `operational_cycles`
*   **Purpose**: Tracks distinct disaster preparation windows (e.g., Cyclone Gulab Oct 2026 warning). Serves as a reference window for checklists.

| Column | Datatype | Nullable | Default | Constraints / Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | No | `gen_random_uuid()` | Primary Key |
| `disaster_type_id`| `UUID` | No | None | Foreign Key -> `disaster_types.id` |
| `name` | `VARCHAR(150)`| No | None | Campaign name, e.g., "Gulab Preparations" |
| `status` | `VARCHAR(20)` | No | 'DRAFT' | Status: `DRAFT`, `ACTIVE`, `COMPLETED` |
| `start_date` | `TIMESTAMPTZ` | No | None | Start of cycle |
| `end_date` | `TIMESTAMPTZ` | Yes | None | Completion date |
| `created_at` | `TIMESTAMPTZ` | No | `CURRENT_TIMESTAMP` | Creation time |
| `updated_at` | `TIMESTAMPTZ` | No | `CURRENT_TIMESTAMP` | Update time |

*   **Indexes**:
    *   B-Tree index on `disaster_type_id`.
    *   B-Tree index on `status`.
*   **Constraints**:
    *   `CHECK (status IN ('DRAFT', 'ACTIVE', 'COMPLETED'))`
    *   `CHECK (end_date >= start_date)`

#### Table: `checklist_templates`
*   **Purpose**: Master configuration for checklist frameworks, versioned and linked to a disaster type.

| Column | Datatype | Nullable | Default | Constraints / Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | No | `gen_random_uuid()` | Primary Key |
| `disaster_type_id`| `UUID` | No | None | Foreign Key -> `disaster_types.id` |
| `title` | `VARCHAR(200)`| No | None | e.g., "Cyclone Shelter Prep Template v2" |
| `version` | `INTEGER` | No | 1 | Schema versioning |
| `is_active` | `BOOLEAN` | No | `TRUE` | Actively in-use flag |
| `created_at` | `TIMESTAMPTZ` | No | `CURRENT_TIMESTAMP` | Creation time |
| `updated_at` | `TIMESTAMPTZ` | No | `CURRENT_TIMESTAMP` | Update time |
| `deleted_at` | `TIMESTAMPTZ` | Yes | None | Soft delete timestamp |

*   **Indexes**:
    *   B-Tree index on `disaster_type_id`.
*   **Constraints**:
    *   `UNIQUE (disaster_type_id, version)`

#### Table: `checklist_sections`
*   **Purpose**: Divides checklists into sections (e.g., Structural Integrity, Power, Supplies).

| Column | Datatype | Nullable | Default | Constraints / Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | No | `gen_random_uuid()` | Primary Key |
| `template_id`| `UUID` | No | None | Foreign Key -> `checklist_templates.id` |
| `title` | `VARCHAR(150)`| No | None | e.g., "Infrastructure Integrity Checks" |
| `sort_order` | `INTEGER` | No | 0 | Display sequence index |
| `created_at` | `TIMESTAMPTZ` | No | `CURRENT_TIMESTAMP` | Creation time |
| `updated_at` | `TIMESTAMPTZ` | No | `CURRENT_TIMESTAMP` | Update time |

*   **Indexes**:
    *   B-Tree index on `template_id`.

#### Table: `checklist_questions`
*   **Purpose**: Stores individual questions for inspections, defining question weight and verification requirements.

| Column | Datatype | Nullable | Default | Constraints / Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | No | `gen_random_uuid()` | Primary Key |
| `section_id` | `UUID` | No | None | Foreign Key -> `checklist_sections.id` |
| `question_text`| `TEXT` | No | None | The checklist question |
| `weight` | `INTEGER` | No | 1 | Priority weight (1 to 5) |
| `requires_photo`| `BOOLEAN`| No | `FALSE` | Require photo verification |
| `is_critical`| `BOOLEAN` | No | `FALSE` | Triggers alert if answered "No" |
| `sort_order` | `INTEGER` | No | 0 | Display order |
| `created_at` | `TIMESTAMPTZ` | No | `CURRENT_TIMESTAMP` | Creation time |
| `updated_at` | `TIMESTAMPTZ` | No | `CURRENT_TIMESTAMP` | Update time |
| `deleted_at` | `TIMESTAMPTZ` | Yes | None | Soft delete timestamp |

*   **Indexes**:
    *   B-Tree index on `section_id`.
*   **Constraints**:
    *   `CHECK (weight BETWEEN 1 AND 5)`

#### Table: `checklist_submissions`
*   **Purpose**: Stores checklist submissions from Field Officers for verification.

| Column | Datatype | Nullable | Default | Constraints / Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | No | `gen_random_uuid()` | Primary Key |
| `operational_cycle_id`| `UUID`| No | None | Foreign Key -> `operational_cycles.id` |
| `user_id` | `UUID` | No | None | Foreign Key -> `users.id` (Field Officer) |
| `shelter_id` | `UUID` | Yes | None | Foreign Key -> `shelters.id` (Target) |
| `asset_id` | `UUID` | Yes | None | Foreign Key -> `assets.id` (Target) |
| `status` | `VARCHAR(30)` | No | 'PENDING' | `PENDING`, `APPROVED`, `REJECTED` |
| `submitted_gps`| `GEOMETRY(Point, 4326)`| Yes | None | Location metadata captured on device |
| `submitted_at`| `TIMESTAMPTZ` | No | `CURRENT_TIMESTAMP` | Verification time |
| `reviewed_by` | `UUID` | Yes | None | Foreign Key -> `users.id` (Zone Officer) |
| `reviewed_at` | `TIMESTAMPTZ` | Yes | None | Date of approval decision |
| `rejection_remarks`| `TEXT` | Yes | None | Notes if rejected |
| `created_at` | `TIMESTAMPTZ` | No | `CURRENT_TIMESTAMP` | Creation time |
| `updated_at` | `TIMESTAMPTZ` | No | `CURRENT_TIMESTAMP` | Update time |
| `deleted_at` | `TIMESTAMPTZ` | Yes | None | Soft delete timestamp |

*   **Indexes**:
    *   B-Tree indexes on `operational_cycle_id`, `user_id`, `shelter_id`, `asset_id`.
    *   B-Tree composite: `(operational_cycle_id, status)`.
    *   Spatial GIST index on `submitted_gps`.
*   **Constraints**:
    *   `CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED'))`
    *   `CHECK ((shelter_id IS NOT NULL AND asset_id IS NULL) OR (shelter_id IS NULL AND asset_id IS NOT NULL))`

#### Table: `checklist_responses`
*   **Purpose**: Stores individual answers for a submission.

| Column | Datatype | Nullable | Default | Constraints / Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | No | `gen_random_uuid()` | Primary Key |
| `submission_id`| `UUID` | No | None | Foreign Key -> `checklist_submissions.id` |
| `question_id` | `UUID` | No | None | Foreign Key -> `checklist_questions.id` |
| `response_value`| `VARCHAR(20)`| No | None | Value: `YES`, `NO`, `NOT_APPLICABLE` |
| `remarks` | `TEXT` | Yes | None | Context details |
| `created_at` | `TIMESTAMPTZ` | No | `CURRENT_TIMESTAMP` | Creation time |
| `updated_at` | `TIMESTAMPTZ` | No | `CURRENT_TIMESTAMP` | Update time |

*   **Indexes**:
    *   B-Tree index on `submission_id`.
    *   B-Tree composite: `(submission_id, question_id)`.
*   **Constraints**:
    *   `CHECK (response_value IN ('YES', 'NO', 'NOT_APPLICABLE'))`
    *   `UNIQUE (submission_id, question_id)`

---

### 4.4 Media, Alerts & Auditing

#### Table: `photo_metadata`
*   **Purpose**: Stores file locations and metadata for verification photos.

| Column | Datatype | Nullable | Default | Constraints / Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | No | `gen_random_uuid()` | Primary Key |
| `response_id` | `UUID` | No | None | Foreign Key -> `checklist_responses.id` |
| `file_path` | `VARCHAR(512)`| No | None | Remote S3 URI or filepath |
| `file_size_bytes`| `INTEGER` | No | None | File size constraint check |
| `mime_type` | `VARCHAR(50)` | No | None | e.g., "image/jpeg", "image/png" |
| `uploaded_by` | `UUID` | No | None | Foreign Key -> `users.id` |
| `gps_location`| `GEOMETRY(Point, 4326)`| Yes | None | Extracted EXIF geotag |
| `device_timestamp`| `TIMESTAMPTZ`| Yes | None | Extracted EXIF capture timestamp |
| `created_at` | `TIMESTAMPTZ` | No | `CURRENT_TIMESTAMP` | Creation time |
| `updated_at` | `TIMESTAMPTZ` | No | `CURRENT_TIMESTAMP` | Update time |

*   **Indexes**:
    *   B-Tree index on `response_id`.
    *   Spatial GIST index on `gps_location`.
*   **Constraints**:
    *   `CHECK (file_size_bytes > 0)`

#### Table: `system_alerts`
*   **Purpose**: Tracks critical failures flagged from checklists.

| Column | Datatype | Nullable | Default | Constraints / Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | No | `gen_random_uuid()` | Primary Key |
| `submission_id`| `UUID` | No | None | Foreign Key -> `checklist_submissions.id` |
| `question_id` | `UUID` | No | None | Foreign Key -> `checklist_questions.id` |
| `severity` | `VARCHAR(20)` | No | 'WARNING' | `CRITICAL`, `WARNING` |
| `status` | `VARCHAR(20)` | No | 'ACTIVE' | `ACTIVE`, `ACKNOWLEDGED`, `RESOLVED` |
| `assigned_to` | `UUID` | Yes | None | Foreign Key -> `users.id` (Remediation) |
| `resolved_by` | `UUID` | Yes | None | Foreign Key -> `users.id` (Approving Officer) |
| `escalation_level`| `INTEGER`| No | 0 | Escalation Level: `0`, `1`, `2` |
| `resolution_remarks`| `TEXT` | Yes | None | Explanation of how the issue was fixed |
| `triggered_at`| `TIMESTAMPTZ` | No | `CURRENT_TIMESTAMP` | Alert timestamp |
| `resolved_at` | `TIMESTAMPTZ` | Yes | None | Resolve timestamp |
| `created_at` | `TIMESTAMPTZ` | No | `CURRENT_TIMESTAMP` | Creation time |
| `updated_at` | `TIMESTAMPTZ` | No | `CURRENT_TIMESTAMP` | Update time |

*   **Indexes**:
    *   B-Tree index on `submission_id`.
    *   B-Tree index on `status`.
    *   B-Tree composite: `(status, severity)`.
*   **Constraints**:
    *   `CHECK (severity IN ('CRITICAL', 'WARNING'))`
    *   `CHECK (status IN ('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED'))`
    *   `CHECK (escalation_level BETWEEN 0 AND 2)`

#### Table: `notifications`
*   **Purpose**: Stores notification messages for users.

| Column | Datatype | Nullable | Default | Constraints / Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | No | `gen_random_uuid()` | Primary Key |
| `user_id` | `UUID` | No | None | Foreign Key -> `users.id` (Recipient) |
| `alert_id` | `UUID` | Yes | None | Foreign Key -> `system_alerts.id` (Context) |
| `message` | `TEXT` | No | None | Notification content |
| `is_read` | `BOOLEAN` | No | `FALSE` | Read status |
| `sent_at` | `TIMESTAMPTZ` | No | `CURRENT_TIMESTAMP` | Notification timestamp |
| `created_at` | `TIMESTAMPTZ` | No | `CURRENT_TIMESTAMP` | Creation time |
| `updated_at` | `TIMESTAMPTZ` | No | `CURRENT_TIMESTAMP` | Update time |

*   **Indexes**:
    *   B-Tree index on `user_id` where `is_read = FALSE`.

#### Table: `audit_logs`
*   **Purpose**: Logs data state changes (inserts, updates, deletes) for accountability.

| Column | Datatype | Nullable | Default | Constraints / Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | No | `gen_random_uuid()` | Primary Key |
| `user_id` | `UUID` | Yes | None | Foreign Key -> `users.id` (Actor) |
| `table_name` | `VARCHAR(100)`| No | None | Target DB table |
| `record_id` | `UUID` | No | None | Key of target record |
| `action` | `VARCHAR(10)` | No | None | `INSERT`, `UPDATE`, `DELETE` |
| `old_values` | `JSONB` | Yes | None | Previous state |
| `new_values` | `JSONB` | Yes | None | New state |
| `ip_address` | `VARCHAR(45)` | Yes | None | IP address of request (IPv4/IPv6) |
| `created_at` | `TIMESTAMPTZ` | No | `CURRENT_TIMESTAMP` | Creation timestamp |

*   **Indexes**:
    *   B-Tree index on `(table_name, record_id)`.
    *   GIN index on `old_values`.
    *   GIN index on `new_values`.
*   **Constraints**:
    *   `CHECK (action IN ('INSERT', 'UPDATE', 'DELETE'))`

#### Table: `activity_logs`
*   **Purpose**: Logs administrative and operational actions (e.g., logins, report exports).

| Column | Datatype | Nullable | Default | Constraints / Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | No | `gen_random_uuid()` | Primary Key |
| `user_id` | `UUID` | Yes | None | Foreign Key -> `users.id` |
| `action_description`| `TEXT` | No | None | Description of action |
| `context_json`| `JSONB` | Yes | None | Metadata context |
| `ip_address` | `VARCHAR(45)` | Yes | None | Client IP |
| `created_at` | `TIMESTAMPTZ` | No | `CURRENT_TIMESTAMP` | Creation timestamp |

*   **Indexes**:
    *   B-Tree index on `user_id`.

---

## 5 Relationships

### 5.1 Hierarchical Location Structure
1.  **Zone (1) to Ward (Many)**: One Zone contains many Wards. Enforced via `wards.zone_id` pointing to `zones.id`. Deleting a zone is protected if wards are active.
2.  **Ward (1) to Shelter (Many)**: One Ward hosts multiple Safe Shelters. Enforced via `shelters.ward_id` referencing `wards.id`.
3.  **Ward (1) to Asset (Many)**: One Ward contains many assets. Enforced via `assets.ward_id`. Deleting a ward is protected.
4.  **Shelter (1) to Asset (Many)**: A shelter can house multiple staged assets. Enforced via `assets.shelter_id` (nullable). When an asset is staged in a shelter, its ward relation must match the shelter's ward.

### 5.2 Templates & Audits
1.  **Disaster Type (1) to Template (Many)**: A disaster type (e.g., Cyclone) has multiple historical templates. Only one is marked active. Enforced via `checklist_templates.disaster_type_id`.
2.  **Template (1) to Checklist Section (Many)**: Enforced via `checklist_sections.template_id`. Deleting a template cascades to delete its sections.
3.  **Section (1) to Checklist Question (Many)**: Enforced via `checklist_questions.section_id`. Deleting a section cascades to delete its questions.

### 5.3 Submissions & Responses
1.  **Operational Cycle (1) to Submission (Many)**: Enforced via `checklist_submissions.operational_cycle_id`.
2.  **User (1) to Submission (Many)**: Enforced via `checklist_submissions.user_id`. A Field Officer submits multiple checklists.
3.  **Shelter/Asset (1) to Submission (Many)**: A shelter or asset can have multiple checklist submissions across operational cycles. Enforced via nullable `shelter_id` or `asset_id` on `checklist_submissions`.
4.  **Submission (1) to Response (Many)**: Enforced via `checklist_responses.submission_id`. Deleting a submission cascades to delete its answers.
5.  **Question (1) to Response (Many)**: Enforced via `checklist_responses.question_id`.
6.  **Response (1) to Photo Metadata (0 or 1)**: Enforced via `photo_metadata.response_id` referencing `checklist_responses.id`. Supports 1-to-1 relationships for photo verification.

### 5.4 Alerts & Actions
1.  **Submission (1) to Alert (Many)**: Enforced via `system_alerts.submission_id`.
2.  **Question (1) to Alert (Many)**: Enforced via `system_alerts.question_id`. Maps the alert to the failed check.
3.  **User (1) to Alert (Many)**: Handles assignments (`assigned_to`) and approvals (`resolved_by`).

---

## 6 Constraints

### 6.1 Hierarchical Location Constraint
*   **Rule**: When an asset is assigned to a shelter, both the asset and the shelter must belong to the same ward.
*   **Enforcement**: Handled via a database trigger function:

```sql
-- Logical representation of validation trigger:
-- IF NEW.shelter_id IS NOT NULL THEN
--   SELECT ward_id INTO v_shelter_ward FROM shelters WHERE id = NEW.shelter_id;
--   IF v_shelter_ward != NEW.ward_id THEN
--     RAISE EXCEPTION 'Asset ward and Shelter ward must align.';
--   END IF;
-- END IF;
```

### 6.2 Submission Lock Constraint
*   **Rule**: Prevent duplicate submissions for a specific shelter or asset within the same operational cycle.
*   **Enforcement**: Conditional partial unique indexes:
    *   *Shelter Submissions*: `CREATE UNIQUE INDEX uq_shelter_submission_cycle ON checklist_submissions(operational_cycle_id, shelter_id) WHERE (shelter_id IS NOT NULL AND deleted_at IS NULL);`
    *   *Asset Submissions*: `CREATE UNIQUE INDEX uq_asset_submission_cycle ON checklist_submissions(operational_cycle_id, asset_id) WHERE (asset_id IS NOT NULL AND deleted_at IS NULL);`

### 6.3 Photo Requirements
*   **Rule**: If a question requires photo verification, the submission response must include photo metadata.
*   **Enforcement**: Enforced at the application service layer via transaction validations.

### 6.4 Geographic Submission Lock
*   **Rule**: Ensure submissions are captured near the physical asset or shelter.
*   **Enforcement**: Validate distance constraints using PostGIS:

```sql
-- Check distance:
-- ST_Distance(submitted_gps, target_asset_location) <= 20 meters
```

---

## 7 Index Strategy

### 7.1 Primary Indexes
*   All tables use `UUID` primary keys, generating clustered B-Tree indexes by default.

### 7.2 Foreign Key Indexes
*   Indexes are defined on all foreign keys to prevent full-table scans during relational joins.
    *   `idx_wards_zone_id` ON `wards(zone_id)`
    *   `idx_shelters_ward_id` ON `shelters(ward_id)`
    *   `idx_assets_ward_id` ON `assets(ward_id)`
    *   `idx_checklist_questions_section_id` ON `checklist_questions(section_id)`
    *   `idx_system_alerts_submission_id` ON `system_alerts(submission_id)`

### 7.3 Spatial Indexes
*   Spatial GIST indexes are defined on geographic and geometric columns to support spatial queries.
    *   `idx_wards_boundary` ON `wards` USING GIST(`boundary`)
    *   `idx_shelters_location` ON `shelters` USING GIST(`location`)
    *   `idx_assets_location` ON `assets` USING GIST(`location`)
    *   `idx_submissions_gps` ON `checklist_submissions` USING GIST(`submitted_gps`)

### 7.4 Dashboard Telemetry Indexes
*   Composite indexes are defined on operational status columns to support dashboard queries.
    *   `idx_submissions_cycle_status` ON `checklist_submissions(operational_cycle_id, status)`
    *   `idx_alerts_status_severity` ON `system_alerts(status, severity)`
    *   `idx_snapshots_lookup` ON `readiness_snapshots(entity_type, entity_id, calculated_at DESC)`

### 7.5 Audit Search Indexes
*   GIN indexes are defined on JSONB audit columns to support deep-key search operations.
    *   `idx_audit_logs_old_values` ON `audit_logs` USING GIN(`old_values`)
    *   `idx_audit_logs_new_values` ON `audit_logs` USING GIN(`new_values`)

---

## 8 Readiness Calculation Data Model

The readiness scoring system uses configurable weights to calculate preparedness metrics at different administrative levels.

### 8.1 Configuration Tables

#### Table: `scoring_configurations`
*   **Purpose**: Configures weight factors for calculating readiness scores.

| Column | Datatype | Nullable | Default | Constraints / Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | No | `gen_random_uuid()` | Primary Key |
| `disaster_type_id`| `UUID` | No | None | Foreign Key -> `disaster_types.id` |
| `section_weights`| `JSONB` | No | None | Key-value weights for sections |
| `is_active` | `BOOLEAN` | No | `TRUE` | Active configuration flag |
| `created_at` | `TIMESTAMPTZ` | No | `CURRENT_TIMESTAMP` | Creation time |
| `updated_at` | `TIMESTAMPTZ` | No | `CURRENT_TIMESTAMP` | Update time |

*   **Indexes**: Unique index on `disaster_type_id` where `is_active = TRUE`.

#### Table: `readiness_snapshots`
*   **Purpose**: Stores precalculated readiness scores for dashboards and reporting.

| Column | Datatype | Nullable | Default | Constraints / Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | No | `gen_random_uuid()` | Primary Key |
| `operational_cycle_id`| `UUID`| No | None | Foreign Key -> `operational_cycles.id` |
| `entity_type` | `VARCHAR(20)`| No | None | `CITY`, `ZONE`, `WARD`, `SHELTER` |
| `entity_id` | `UUID` | No | None | Targets: `zones.id`, `wards.id`, `shelters.id` |
| `score` | `NUMERIC(5,2)`| No | None | Calculated score (0.00 to 100.00) |
| `breakdown` | `JSONB` | No | None | Detailed section-wise scores |
| `calculated_at` | `TIMESTAMPTZ` | No | `CURRENT_TIMESTAMP` | Calculation timestamp |

*   **Indexes**:
    *   B-Tree index on `(entity_type, entity_id, calculated_at DESC)`.

### 8.2 Calculation Rules
*   **Section Score**: Sum of weighted answers divided by total weight of questions:

$$Score_{section} = \frac{\sum (Answer\_Value_i \times Weight_i)}{\sum Weight_i} \times 100$$

*   **Readiness Score**: Sum of section scores multiplied by section weights:

$$Readiness\_Score = \sum (Score_{section} \times Weight_{section})$$

Precomputed readiness values are cached in `readiness_snapshots` to optimize dashboard performance.

---

## 9 Alert Data Model

The alert system flags safety gaps identified during inspections.

### 9.1 Alert Schema Configuration
Failed checks trigger entries in the `system_alerts` table. The alert life cycle contains three statuses:

```
[ACTIVE] ---> [ACKNOWLEDGED] ---> [RESOLVED]
```

*   **Severity Levels**:
    *   `CRITICAL`: Triggered by failures of life-safety components (e.g., non-functional generators).
    *   `WARNING`: Triggered by minor resource deficits.
*   **Escalation Pipeline**: The `escalation_level` column tracks unresolved alerts, escalating from Field Office (Level 0) to Zone Officer (Level 1) and Commissioner (Level 2).

---

## 10 Audit Logging

The database logs data modifications to support auditing and compliance.

### 10.1 Audit Logging Table Design

#### Table: `audit_logs`
*   **Purpose**: Stores audit logs for data modifications.

| Column | Datatype | Nullable | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | No | `gen_random_uuid()` | Primary Key |
| `user_id` | `UUID` | Yes | None | User who made the change |
| `table_name` | `VARCHAR(100)`| No | None | Name of modified table |
| `record_id` | `UUID` | No | None | Primary key of modified record |
| `action` | `VARCHAR(10)` | No | None | `INSERT`, `UPDATE`, or `DELETE` |
| `old_values` | `JSONB` | Yes | None | Pre-update record state |
| `new_values` | `JSONB` | Yes | None | Post-update record state |
| `ip_address` | `VARCHAR(45)` | Yes | None | Client IP |
| `created_at` | `TIMESTAMPTZ` | No | `CURRENT_TIMESTAMP` | Log timestamp |

### 10.2 Triggers
Changes are captured automatically using database triggers:

```sql
CREATE OR REPLACE FUNCTION fn_audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    INSERT INTO audit_logs(table_name, record_id, action, old_values, created_at)
    VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', to_jsonb(OLD), CURRENT_TIMESTAMP);
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO audit_logs(table_name, record_id, action, old_values, new_values, created_at)
    VALUES (TG_TABLE_NAME, OLD.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), CURRENT_TIMESTAMP);
    RETURN NEW;
  ELSIF (TG_OP = 'INSERT') THEN
    INSERT INTO audit_logs(table_name, record_id, action, new_values, created_at)
    VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', to_jsonb(NEW), CURRENT_TIMESTAMP);
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;
```

Triggers are assigned to sensitive transactional tables (e.g., `shelters`, `assets`, `checklist_responses`).

---

## 11 Image Storage

### 11.1 Metadata Architecture
Uploaded photos are stored in S3-compatible object storage, while metadata is tracked in the database to prevent performance degradation.

*   `photo_metadata.file_path` stores the relative S3 path (e.g., `/photos/2026/07/uuid.jpg`).
*   `photo_metadata.gps_location` and `device_timestamp` store metadata extracted from EXIF headers.

---

## 12 Future Scalability

### 12.1 Multi-Tenant Tenant Grid
To support deployment across multiple cities or municipal corporations, the schema can be extended by adding a tenant key:
*   Add a `municipalities` table.
*   Add `municipality_id` columns to `zones`, `users`, and `operational_cycles` to partition data logically.

### 12.2 Multi-Disaster Adaptability
The `disaster_types` table allows the system to support new disaster types (e.g., Heatwaves, Floods) by linking templates and scoring rules to specific disaster configurations.

### 12.3 Dynamic Checklist Framework
The checklist database uses a decoupled, relational structure:

```
[Template] ---> [Sections] ---> [Questions] ---> [Submissions] ---> [Responses]
```

This design allows administrators to update checklist questions, sections, and weights dynamically without modifying the database schema.

### 12.4 Offline Synchronization
To support offline data entry, clients generate UUID primary keys locally. During synchronization, the system compares timestamps (`updated_at`) and uses soft delete flags (`deleted_at`) to merge changes:
*   **Inserts**: Locally created records are inserted directly.
*   **Updates**: Resolved using last-write-wins logic based on client timestamps.
*   **Deletes**: Processed using soft-delete timestamps.

### 12.5 GIS & PostGIS Integration
The schema stores spatial boundaries and coordinates using PostGIS data types:
*   `geometry(Polygon, 4326)` for ward boundaries.
*   `geometry(Point, 4326)` for shelter locations, asset locations, and submissions.
Spatial indexes (GIST) enable fast geospatial analysis, such as validating submission proximity.

---

## 13 Reporting Support

The database schema supports analytical reporting through optimized indices and precomputed data models:

*   **Zone & Ward Readiness Reports**: Reports are generated from `readiness_snapshots`, allowing users to retrieve preparedness histories for specific zones and wards.
*   **Officer Auditing**: Querying `checklist_submissions` joined with `users` allows administrators to review submission histories and response rates.
*   **Asset Performance**: Joining `assets` and `checklist_submissions` provides access to historical maintenance histories and operational statuses.
*   **Alert Resolution Histories**: Querying `system_alerts` allows administrators to analyze response times and identify common equipment failures.
*   **Historical Readiness Trends**: Time-series queries on `readiness_snapshots` provide historical views of preparedness improvements.

---

## 14 Security Considerations

*   **Password Safety**: User credentials are encrypted using **Argon2id** hashes stored in `users.password_hash`.
*   **Sensitive Field Separation**: Contact details and passwords are isolated from metadata tables to prevent unauthorized access.
*   **Role Permissions Enforcement**: API endpoints enforce role-based access control (RBAC), verifying user roles against permissions before executing queries.
*   **Row-Level Security (RLS)**: Row-Level Security can be enabled to restrict Zone and Field Officers to records matching their assigned location IDs.

---

## 15 Performance Considerations

### 15.1 Expected Data Volumes (5-Year Horizon)
*   `users`: ~500 rows.
*   `shelters`: ~200 rows.
*   `assets`: ~5,000 rows.
*   `checklist_submissions`: ~50,000 rows.
*   `checklist_responses`: ~1,000,000 rows.
*   `audit_logs`: ~5,000,000 rows.

### 15.2 Table Partitioning Strategy
For long-term storage, the `audit_logs` and `checklist_responses` tables can be partitioned by time range:
*   `PARTITION BY RANGE (created_at)`
*   This splits large tables into monthly or annual partitions, improving query performance and simplifying archival processes.

### 15.3 Connection Pooling
To manage concurrent connections, deploy a connection pooler (e.g., PgBouncer) upstream of PostgreSQL:
*   **Transaction Pool Mode**: Configured to reuse connection blocks, reducing connection overhead.
*   **Pool Size**: Configured to match CPU threads and database capacity.

---

## 16 Naming Conventions

*   **Format**: Use `snake_case` for all table names, column names, indexes, and constraints.
*   **Pluralization**: Table names use plural nouns (e.g., `users`, `shelters`, `assets`).
*   **Foreign Keys**: Follow the `parent_table_singular_id` naming convention (e.g., `ward_id`, `submission_id`).
*   **Timestamps**: Timestamps use consistent naming conventions:
    *   `created_at`: Row creation time.
    *   `updated_at`: Last modification time.
    *   `deleted_at`: Soft-delete timestamp.
*   **Primary Keys**: All tables use `id` as their primary key name, typed as `UUID`.

---

## 17 Key Assumptions

1.  **Spatial Coordinates Standard**: Coordinates are assumed to use the WGS 84 (SRID 4326) coordinate system.
2.  **User Hierarchy Limits**: Users are assumed to belong to a single zone or ward.
3.  **Active Cycles**: The system assumes one active operational cycle per disaster type at a time.
4.  **Storage Architecture**: Images are assumed to be stored in S3-compatible storage, with only file paths and metadata tracked in the database.
5.  **Soft Deletion**: Deleting key resources (e.g., shelters, assets) uses soft deletion to preserve historical checklist records.
