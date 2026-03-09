# Portal de Serviços de TI — Technical Overview

> **Date:** 2026-03-05  
> **Purpose:** Architecture review document for senior engineering review  
> **System:** Portal TI — O Pequeno Nazareno  
> **Status:** Production (Azure App Service)

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Project Architecture](#2-project-architecture)
3. [Folder / Code Structure](#3-folder--code-structure)
4. [Database Structure](#4-database-structure)
5. [Main Business Modules](#5-main-business-modules)
6. [Current Data Flow](#6-current-data-flow)
7. [Weaknesses & Limitations](#7-weaknesses--limitations-in-the-current-architecture)

---

## 1. System Overview

### What the System Does

Portal TI is an **internal IT service management platform** for the organization "O Pequeno Nazareno." It serves two distinct user populations:

- **Public users** (employees, staff) — open support tickets, track ticket status, browse an FAQ/knowledge center.
- **Internal users** (IT staff, managers, admins) — manage tickets, track IT assets/equipment, handle procurement, generate reports, manage the knowledge base.

### Main Modules and Responsibilities

| Module | Responsibility |
|--------|---------------|
| **Authentication** | Dual-auth system: token-based access for public users, JWT login for internal staff |
| **Ticket Management** | Full helpdesk lifecycle: creation, assignment, messaging, attachments, status tracking |
| **Inventory / Equipment** | Track notebooks, peripherals, and other IT assets with delivery/return terms and movement history |
| **Purchase Requisitions** | Request, approve, purchase, and receive new equipment linked to inventory |
| **Knowledge Base / Information Center** | Public FAQ articles and internal knowledge management |
| **Reports & Analytics** | Dashboards, SLA analysis, technician performance, Excel/PDF exports |
| **Real-time Notifications** | WebSocket-based live notifications for ticket events |
| **Email Notifications** | SMTP-based email alerts for ticket lifecycle events |

---

## 2. Project Architecture

### High-Level Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 + TypeScript + Vite |
| **State Management** | Zustand (2 stores) |
| **UI Routing** | React Router v6 |
| **HTTP Client** | Axios |
| **Real-time** | Socket.IO (client) |
| **Backend** | Node.js + Express 4 + TypeScript |
| **Database** | PostgreSQL (via `pg` driver — raw SQL) |
| **Auth** | JWT (jsonwebtoken) + bcryptjs |
| **File Uploads** | Multer |
| **PDF Generation** | PDFKit |
| **Excel Reports** | ExcelJS |
| **QR Codes** | qrcode |
| **Email** | Nodemailer |
| **Validation** | Zod |
| **Real-time (server)** | Socket.IO |
| **Deploy** | Azure App Service (zip deploy via Kudu) |
| **Container** | Docker (Dockerfile per service) |

### API Structure

- **Base URL:** `/api`
- **Style:** REST-ish (not strictly RESTful — some RPC-style actions like `/movements/deliver`)
- **Auth:** Bearer JWT in `Authorization` header for internal users; `x-user-token` header for public users
- **Response format:** JSON (`application/json; charset=utf-8`)

### Route Mounting

```
/api/auth                → Legacy auth (login/register/me)
/api/public-auth         → Public user token-based access
/api/internal-auth       → Internal staff JWT login, user management
/api/tickets             → Helpdesk tickets CRUD + messages + attachments
/api/assets              → Legacy inventory (inventory_items table)
/api/purchases           → Stub (not implemented — returns 501)
/api/inventory           → Full inventory module (equipment, movements, terms, requisitions)
/api/knowledge           → Knowledge articles (mounted at /api directly)
/api/information-articles → Public FAQ articles (also under /api)
/api/dashboard           → Admin & manager dashboard stats
/api/reports             → Stats, SLA, trends, Excel exports
/api/health              → Health check (always responds, independent of DB)
```

### Design Patterns Used

| Pattern | Where |
|---------|-------|
| **Singleton** | Database connection (`Database` class), model instances (`userModel`, `ticketModel`, `assetModel`), WebSocket service |
| **Static Service Classes** | `EmailService`, `ExcelReportService`, `PDFService`, `QRCodeService` — stateless utility classes |
| **Middleware Pipeline** | Express middleware for auth, rate limiting, validation, file uploads |
| **RBAC (Role-Based Access Control)** | `authorization.ts` — permissions matrix mapping actions → allowed roles |
| **Feature Flags** | Email sending gated by `EMAIL_ENABLED`; rate limiters relaxed in development |
| **Stream-to-Response** | PDF and Excel files piped directly to HTTP response (no temp files) |
| **Soft Delete** | Assets use `is_deleted = false` flag; equipment uses `current_status` field |
| **Schema-as-Migration** | Database schema and all migrations run via `CREATE TABLE IF NOT EXISTS` + `ALTER TABLE ... IF NOT EXISTS` on every startup |
| **Room-based WebSocket Routing** | `user:{id}` and `role:{role}` rooms for targeted notifications |

---

## 3. Folder / Code Structure

### Root

```
portal-ti/
├── backend/              # Express API server
├── frontend/             # React SPA
├── scripts/              # Deployment scripts (PowerShell)
├── docs/                 # Architecture documentation
├── webapp-logs/          # Azure log snapshots
├── docker-compose.yml    # Multi-container orchestration
├── package.json          # Root (minimal — only pdfkit dependency)
└── *.md                  # Various deployment/status docs
```

### Backend (`backend/`)

```
backend/
├── src/
│   ├── index.ts                  # Express app entry point, route mounting, server startup
│   ├── config/
│   │   └── environment.ts        # Environment variables & config object (DB, JWT, CORS, email)
│   ├── database/
│   │   ├── connection.ts         # PostgreSQL Pool wrapper (Database singleton class)
│   │   └── schema.ts             # Full schema DDL + migrations + seed data (977 lines)
│   ├── routes/                   # Route handlers (contain ALL business logic inline)
│   │   ├── auth.ts               # Legacy auth: login, register, me (3 endpoints)
│   │   ├── publicAuth.ts         # Public user token access (3 endpoints)
│   │   ├── internalAuth.ts       # Internal staff login + user CRUD (8 endpoints)
│   │   ├── tickets.ts            # Ticket lifecycle + messages + attachments (10 endpoints)
│   │   ├── assets.ts             # Legacy inventory items CRUD (5 endpoints)
│   │   ├── purchases.ts          # Stub — returns 501 (2 endpoints)
│   │   ├── inventory.ts          # Full inventory module (30 endpoints, 1929 lines)
│   │   ├── knowledge.ts          # Knowledge articles CRUD (6 endpoints)
│   │   ├── dashboard.ts          # Admin/manager dashboard stats (2 endpoints)
│   │   └── reports.ts            # Stats, SLA, exports (8 endpoints)
│   ├── middleware/
│   │   ├── auth.ts               # JWT verification, role checking, token generation
│   │   ├── authorization.ts      # RBAC permissions matrix + ownership verification
│   │   ├── rateLimiter.ts        # Express rate-limit (4 limiters, Azure-aware)
│   │   └── validation.ts         # Zod schema validation middleware (11 schemas)
│   ├── models/                   # Data access layer (used by legacy routes only)
│   │   ├── Asset.ts              # CRUD for `assets` & `asset_movements` tables
│   │   ├── Ticket.ts             # CRUD for `tickets` table
│   │   ├── User.ts               # CRUD for `users` table + password hashing
│   │   └── RefreshToken.ts       # Refresh token lifecycle
│   ├── services/
│   │   ├── emailService.ts       # SMTP email notifications (branded HTML templates)
│   │   ├── excelReportService.ts # Excel .xlsx report generator (streams to response)
│   │   ├── pdfService.ts         # A4 PDF term documents (delivery + return)
│   │   ├── qrcodeService.ts      # QR code generation for equipment labels
│   │   ├── uploadService.ts      # Multer config + file management helpers
│   │   └── websocketService.ts   # Socket.IO server with room-based routing
│   ├── types/
│   │   └── enums.ts              # Shared enums (UserRole, TicketStatus, etc.) + AuthUser interface
│   └── tests/                    # Test files (Jest)
├── migrations/                   # SQL migration files (historical)
├── scripts/                      # DB init, migrate scripts
├── data/                         # Static data files
├── uploads/                      # Uploaded files (runtime)
├── package.json
├── tsconfig.json
└── Dockerfile
```

#### Layer Responsibilities

| Layer | Purpose | Notes |
|-------|---------|-------|
| `routes/` | **Request handling + Business logic + Data access** | Monolithic — combines controller, service, and repository concerns in one file |
| `models/` | **Data access** for legacy tables (`users`, `assets`, `tickets`) | Only used by `auth.ts` and partially; newer routes query DB directly |
| `services/` | **Cross-cutting infrastructure** (email, PDF, Excel, QR, uploads, WebSocket) | Not business-logic services — utility/infrastructure only |
| `middleware/` | **Auth, validation, rate limiting** | Well-structured; `authorization.ts` has comprehensive RBAC matrix |
| `database/` | **Connection pooling + Schema management** | Single-file schema with DDL + migrations + seed data |
| `config/` | **Environment configuration** | Centralized env-var management with production validation |

### Frontend (`frontend/`)

```
frontend/
├── src/
│   ├── main.tsx                  # React entry point
│   ├── App.tsx                   # Route definitions (36 routes) + layout
│   ├── pages/                    # One component per route (36 page components)
│   │   ├── HomePage.tsx
│   │   ├── OpenTicketPage.tsx
│   │   ├── MyTicketsPage.tsx
│   │   ├── TicketDetailPage.tsx
│   │   ├── InformationCenterPage.tsx
│   │   ├── InternalLoginPage.tsx
│   │   ├── AdminDashboardPage.tsx
│   │   ├── AdminTicketsPage.tsx
│   │   ├── AdminTicketDetailPage.tsx
│   │   ├── KnowledgeManagementPage.tsx
│   │   ├── UsersManagementPage.tsx
│   │   ├── InventoryPage.tsx
│   │   ├── InventoryDashboardPage.tsx
│   │   ├── EquipmentPage.tsx
│   │   ├── EquipmentDetailPage.tsx
│   │   ├── CreateEquipmentPage.tsx
│   │   ├── NotebooksPage.tsx
│   │   ├── PeripheralsPage.tsx
│   │   ├── DeliverEquipmentPage.tsx
│   │   ├── ReturnEquipmentPage.tsx
│   │   ├── ReturnTermPage.tsx
│   │   ├── ReceiveEquipmentPage.tsx
│   │   ├── MoveEquipmentPage.tsx
│   │   ├── SignTermPage.tsx
│   │   ├── PurchasesPage.tsx
│   │   ├── CreatePurchasePage.tsx
│   │   ├── ResponsibilitiesPage.tsx
│   │   ├── ReportsPage.tsx
│   │   ├── GestorDashboardPage.tsx
│   │   ├── GestorTicketsPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── AssetsPage.tsx
│   │   └── AnalyticsDashboardPage.tsx
│   ├── components/               # 19 shared components
│   │   ├── Navigation.tsx        # Dual-mode navbar (public vs internal)
│   │   ├── InternalProtectedRoute.tsx  # Auth guard for internal routes
│   │   ├── ProtectedRoute.tsx    # Auth guard (UNUSED — dead code)
│   │   ├── InventoryLayout.tsx   # Layout wrapper for inventory pages
│   │   ├── GlobalSearch.tsx      # Full-text search (IT staff only)
│   │   ├── FilterBar.tsx         # Reusable filter controls
│   │   ├── Pagination.tsx        # Reusable pagination
│   │   ├── ConfirmDialog.tsx     # Modal confirmation dialog
│   │   ├── EditTicketModal.tsx   # Ticket edit modal
│   │   ├── StatusProgressBar.tsx # Visual ticket status progression
│   │   ├── StatusTimeline.tsx    # Ticket event timeline
│   │   ├── NextAction.tsx        # Suggested next action widget
│   │   ├── FileUpload.tsx        # Generic file upload
│   │   ├── DocumentUploader.tsx  # Document upload component
│   │   ├── PhotoUploader.tsx     # Photo upload component
│   │   ├── AttachmentsList.tsx   # Attachment listing
│   │   ├── TicketAttachments.tsx # Ticket-specific attachments
│   │   ├── Comments.tsx          # Ticket message thread
│   │   └── ToastContainer.tsx    # Custom toast notifications
│   ├── services/                 # API client wrappers
│   │   ├── api.ts                # Axios instance (base URL, interceptors, auth headers)
│   │   ├── authService.ts        # Login, register, logout, refresh token
│   │   ├── ticketService.ts      # Ticket CRUD API calls
│   │   ├── assetService.ts       # Asset/inventory API calls
│   │   ├── excelExportService.ts # Excel export helpers (xlsx library)
│   │   ├── websocketClient.ts    # Socket.IO client (active — used by authStore)
│   │   └── websocketService.ts   # Socket.IO client (duplicate — unused)
│   ├── stores/                   # Zustand state management
│   │   ├── authStore.ts          # Auth state: user, isAuthenticated, login/logout + WS connect
│   │   └── toastStore.ts         # Toast notification state
│   ├── styles/                   # CSS files (one per page/component)
│   ├── types/                    # TypeScript type definitions
│   │   └── index.ts              # Enums (UserRole, TicketStatus, etc.) + User, Ticket, Asset interfaces
│   ├── utils/                    # Utility functions
│   └── test/                     # Vitest test files
├── public/                       # Static assets
├── package.json
├── vite.config.ts
├── vitest.config.ts
└── Dockerfile
```

---

## 4. Database Structure

The system uses **PostgreSQL** with raw SQL queries (no ORM). Schema management is code-driven via `schema.ts` (`CREATE TABLE IF NOT EXISTS` + conditional `ALTER TABLE` migrations).

### Active Tables (Current System)

#### `public_users`
Public-facing users who access via token (no password).

| Column | Type | Constraints |
|--------|------|------------|
| `id` | UUID | PK, auto-generated |
| `email` | VARCHAR(255) | NOT NULL |
| `name` | VARCHAR(255) | NOT NULL |
| `department` | VARCHAR(255) | |
| `unit` | VARCHAR(255) | |
| `user_token` | VARCHAR(255) | UNIQUE, NOT NULL |
| `is_active` | BOOLEAN | DEFAULT true |
| `last_access` | TIMESTAMP | |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |

---

#### `internal_users`
IT staff, managers, and admins with password-based login.

| Column | Type | Constraints |
|--------|------|------------|
| `id` | UUID | PK, auto-generated |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL |
| `name` | VARCHAR(255) | NOT NULL |
| `password_hash` | VARCHAR(255) | NOT NULL |
| `role` | VARCHAR(50) | NOT NULL, DEFAULT 'it_staff' |
| `department_id` | UUID | FK → departments(id) |
| `is_active` | BOOLEAN | DEFAULT true |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |

---

#### `refresh_tokens`
JWT refresh tokens for automatic session renewal.

| Column | Type | Constraints |
|--------|------|------------|
| `id` | UUID | PK, auto-generated |
| `user_id` | UUID | FK → internal_users(id) ON DELETE CASCADE |
| `token` | VARCHAR(500) | UNIQUE, NOT NULL |
| `expires_at` | TIMESTAMP | NOT NULL |
| `is_revoked` | BOOLEAN | DEFAULT false |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |

---

#### `departments`
Organizational departments.

| Column | Type | Constraints |
|--------|------|------------|
| `id` | UUID | PK, auto-generated |
| `name` | VARCHAR(255) | NOT NULL |
| `description` | TEXT | |
| `is_active` | BOOLEAN | DEFAULT true |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |

---

#### `tickets`
Support tickets — core helpdesk entity.

| Column | Type | Constraints |
|--------|------|------------|
| `id` | UUID | PK, auto-generated |
| `title` | VARCHAR(255) | NOT NULL |
| `description` | TEXT | NOT NULL |
| `type` | VARCHAR(50) | NOT NULL |
| `priority` | VARCHAR(50) | NOT NULL, DEFAULT 'medium' |
| `status` | VARCHAR(50) | NOT NULL, DEFAULT 'open' |
| `requester_type` | VARCHAR(20) | NOT NULL, DEFAULT 'public' |
| `requester_id` | UUID | NOT NULL |
| `assigned_to_id` | UUID | FK → internal_users(id) |
| `department_id` | UUID | FK → departments(id) |
| `resolved_at` | TIMESTAMP | |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |

**Note:** `requester_id` has **no FK constraint** — it can reference either `public_users(id)` or `internal_users(id)` depending on `requester_type`. This is a polymorphic association without database enforcement.

---

#### `ticket_messages`
Messages/conversation thread on a ticket.

| Column | Type | Constraints |
|--------|------|------------|
| `id` | UUID | PK, auto-generated |
| `ticket_id` | UUID | FK → tickets(id) ON DELETE CASCADE |
| `message` | TEXT | NOT NULL |
| `author_type` | VARCHAR(20) | NOT NULL, DEFAULT 'public' |
| `author_id` | UUID | NOT NULL |
| `is_internal` | BOOLEAN | DEFAULT false |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |

---

#### `ticket_attachments`
Files attached to tickets.

| Column | Type | Constraints |
|--------|------|------------|
| `id` | UUID | PK, auto-generated |
| `ticket_id` | UUID | FK → tickets(id) ON DELETE CASCADE |
| `filename` | VARCHAR(255) | NOT NULL |
| `original_name` | VARCHAR(255) | NOT NULL |
| `file_path` | VARCHAR(500) | NOT NULL |
| `file_size` | INTEGER | NOT NULL, DEFAULT 0 |
| `mime_type` | VARCHAR(100) | NOT NULL, DEFAULT 'application/octet-stream' |
| `uploaded_by_type` | VARCHAR(20) | NOT NULL, DEFAULT 'public' |
| `uploaded_by_id` | UUID | NOT NULL |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |

---

#### `inventory_equipment`
IT equipment — the primary inventory entity (2026 redesign).

| Column | Type | Constraints |
|--------|------|------------|
| `id` | UUID | PK, auto-generated |
| `internal_code` | VARCHAR(50) | UNIQUE, NOT NULL |
| `category` | VARCHAR(50) | NOT NULL, DEFAULT 'PERIPHERAL' |
| `type` | VARCHAR(100) | NOT NULL |
| `brand` | VARCHAR(100) | |
| `model` | VARCHAR(100) | |
| `description` | TEXT | |
| `serial_number` | VARCHAR(255) | DEFAULT 'S/N' |
| `processor` | VARCHAR(255) | Notebook-specific |
| `memory_ram` | VARCHAR(50) | Notebook-specific |
| `storage` | VARCHAR(100) | Notebook-specific |
| `screen_size` | VARCHAR(20) | Notebook-specific |
| `operating_system` | VARCHAR(100) | Notebook-specific |
| `physical_condition` | VARCHAR(50) | DEFAULT 'good' |
| `current_status` | VARCHAR(50) | NOT NULL, DEFAULT 'available' |
| `current_location` | VARCHAR(255) | |
| `current_unit` | VARCHAR(100) | |
| `current_responsible_id` | UUID | FK → internal_users(id) |
| `current_responsible_name` | VARCHAR(255) | Denormalized |
| `acquisition_date` | DATE | |
| `purchase_value` | DECIMAL(12,2) | |
| `warranty_expiration` | DATE | |
| `invoice_file` | VARCHAR(500) | |
| `photos` | TEXT[] | Array of file paths |
| `qr_code` | VARCHAR(255) | |
| `notes` | TEXT | |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |

---

#### `responsibility_terms`
Legal responsibility documents linking equipment to a person.

| Column | Type | Constraints |
|--------|------|------------|
| `id` | UUID | PK, auto-generated |
| `equipment_id` | UUID | FK → inventory_equipment(id) ON DELETE CASCADE |
| `responsible_id` | UUID | FK → internal_users(id) |
| `responsible_name` | VARCHAR(255) | NOT NULL |
| `responsible_cpf` | VARCHAR(20) | |
| `responsible_email` | VARCHAR(255) | |
| `responsible_phone` | VARCHAR(20) | |
| `responsible_position` | VARCHAR(255) | |
| `responsible_department` | VARCHAR(255) | |
| `responsible_unit` | VARCHAR(100) | |
| `issued_date` | DATE | NOT NULL, DEFAULT CURRENT_DATE |
| `delivery_reason` | VARCHAR(100) | |
| `delivery_notes` | TEXT | |
| `delivery_term_pdf` | VARCHAR(500) | |
| `delivery_term_signed_pdf` | VARCHAR(500) | |
| `issued_by_id` | UUID | FK → internal_users(id) |
| `issued_by_name` | VARCHAR(255) | |
| `returned_date` | DATE | |
| `return_condition` | VARCHAR(50) | |
| `return_checklist` | JSONB | |
| `return_problems` | TEXT | |
| `return_destination` | VARCHAR(50) | |
| `return_term_pdf` | VARCHAR(500) | |
| `return_term_signed_pdf` | VARCHAR(500) | |
| `received_by_id` | UUID | FK → internal_users(id) |
| `received_by` | VARCHAR(255) | |
| `status` | VARCHAR(50) | NOT NULL, DEFAULT 'active' |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |

---

#### `equipment_movements`
Audit trail for all equipment movements.

| Column | Type | Constraints |
|--------|------|------------|
| `id` | UUID | PK, auto-generated |
| `movement_number` | VARCHAR(50) | UNIQUE, NOT NULL |
| `equipment_id` | UUID | FK → inventory_equipment(id) ON DELETE CASCADE |
| `term_id` | UUID | FK → responsibility_terms(id) |
| `movement_type` | VARCHAR(50) | NOT NULL |
| `movement_date` | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP |
| `from_user_id` | UUID | FK → internal_users(id) |
| `from_user_name` | VARCHAR(255) | Denormalized |
| `to_user_id` | UUID | FK → internal_users(id) |
| `to_user_name` | VARCHAR(255) | Denormalized |
| `from_location` | VARCHAR(255) | |
| `from_unit` | VARCHAR(100) | |
| `to_location` | VARCHAR(255) | |
| `to_unit` | VARCHAR(100) | |
| `from_department` | VARCHAR(255) | |
| `to_department` | VARCHAR(255) | |
| `reason` | TEXT | |
| `notes` | TEXT | |
| `condition_before` | VARCHAR(50) | |
| `condition_after` | VARCHAR(50) | |
| `registered_by_id` | UUID | FK → internal_users(id), NOT NULL |
| `registered_by_name` | VARCHAR(255) | Denormalized |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |

---

#### `purchase_requisitions`
Purchase requests for new equipment.

| Column | Type | Constraints |
|--------|------|------------|
| `id` | UUID | PK, auto-generated |
| `request_number` | VARCHAR(50) | UNIQUE, NOT NULL |
| `requested_by_id` | UUID | FK → internal_users(id), NOT NULL |
| `requester_name` | VARCHAR(255) | Denormalized |
| `requester_department` | VARCHAR(255) | |
| `requester_unit` | VARCHAR(100) | |
| `item_type` | VARCHAR(100) | NOT NULL |
| `item_description` | TEXT | NOT NULL |
| `specifications` | TEXT | |
| `quantity` | INTEGER | NOT NULL, DEFAULT 1 |
| `priority` | VARCHAR(50) | DEFAULT 'normal' |
| `reason` | TEXT | NOT NULL |
| `needed_by_date` | DATE | |
| `status` | VARCHAR(50) | NOT NULL, DEFAULT 'pending' |
| `approved_by_id` | UUID | FK → internal_users(id) |
| `approved_by_name` | VARCHAR(255) | |
| `approval_date` | DATE | |
| `rejection_reason` | TEXT | |
| `estimated_value` | DECIMAL(12,2) | |
| `actual_value` | DECIMAL(12,2) | |
| `supplier` | VARCHAR(255) | |
| `purchase_date` | DATE | |
| `expected_delivery_date` | DATE | |
| `actual_delivery_date` | DATE | |
| `invoice_file` | VARCHAR(500) | |
| `received_by_id` | UUID | FK → internal_users(id) |
| `received_by_name` | VARCHAR(255) | |
| `received_date` | DATE | |
| `becomes_equipment` | BOOLEAN | DEFAULT true |
| `created_equipment_id` | UUID | FK → inventory_equipment(id) |
| `notes` | TEXT | |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |

---

#### `requisition_equipment`
Join table linking purchase requisitions to received equipment.

| Column | Type | Constraints |
|--------|------|------------|
| `id` | UUID | PK, auto-generated |
| `requisition_id` | UUID | FK → purchase_requisitions(id) ON DELETE CASCADE |
| `equipment_id` | UUID | FK → inventory_equipment(id) ON DELETE CASCADE |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |
| | | UNIQUE(requisition_id, equipment_id) |

---

#### `documents`
General document repository.

| Column | Type | Constraints |
|--------|------|------------|
| `id` | UUID | PK, auto-generated |
| `title` | VARCHAR(255) | NOT NULL |
| `description` | TEXT | |
| `document_type` | VARCHAR(50) | NOT NULL |
| `file_url` | VARCHAR(500) | |
| `file_size` | INTEGER | |
| `is_public` | BOOLEAN | DEFAULT false |
| `uploaded_by_id` | UUID | FK → internal_users(id), NOT NULL |
| `views_count` | INTEGER | DEFAULT 0 |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |

---

#### `information_articles`
Public-facing FAQ and knowledge articles.

| Column | Type | Constraints |
|--------|------|------------|
| `id` | UUID | PK, auto-generated |
| `title` | VARCHAR(255) | NOT NULL |
| `content` | TEXT | NOT NULL |
| `category` | VARCHAR(100) | |
| `is_public` | BOOLEAN | DEFAULT true |
| `created_by_id` | UUID | FK → internal_users(id), NOT NULL |
| `views_count` | INTEGER | DEFAULT 0 |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |

---

### Legacy Tables (Maintained for Backward Compatibility)

These tables are from the original system and are mostly **superseded** by the newer inventory module:

| Table | Superseded by | Notes |
|-------|--------------|-------|
| `users` | `public_users` + `internal_users` | Used by `auth.ts` legacy routes and `User` model |
| `assets` | `inventory_equipment` | Used by `assets.ts` legacy routes and `Asset` model |
| `asset_movements` | `equipment_movements` | Linked to `assets` table |
| `purchase_requests` | `purchase_requisitions` | Simpler schema, linked to `users` |
| `knowledge_articles` | `information_articles` | Nearly identical schema |
| `inventory_items` | `inventory_equipment` | Used by `assets.ts` route (different from `assets` table) |
| `inventory_movements` | `equipment_movements` | Linked to `inventory_items` |

### Entity Relationship Diagram (Simplified)

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ public_users │     │ internal_users   │     │  departments     │
│              │     │                  │◄────│                  │
│  id          │     │  id              │     │  id              │
│  email       │     │  email           │     │  name            │
│  user_token  │     │  password_hash   │     └──────────────────┘
└──────┬───────┘     │  role            │
       │             └───────┬──────────┘
       │                     │
       │  (requester_id)     │  (assigned_to_id, requester_id)
       ▼                     ▼
  ┌──────────────────────────────────┐
  │            tickets               │
  │  id, title, status, priority     │
  │  requester_type, requester_id    │──────► ticket_messages
  │  assigned_to_id                  │──────► ticket_attachments
  └──────────────────────────────────┘

  ┌──────────────────────────────┐
  │    inventory_equipment       │
  │  id, internal_code, category │
  │  current_status              │
  │  current_responsible_id  ────┼──► internal_users
  └────────────┬─────────────────┘
               │
       ┌───────┼───────────┐
       ▼       ▼           ▼
  ┌─────────┐ ┌──────────┐ ┌─────────────────┐
  │ equip.  │ │ respons. │ │ purchase_       │
  │ movem.  │ │ terms    │ │ requisitions    │
  └─────────┘ └──────────┘ └────────┬────────┘
                                     │
                              ┌──────┴──────┐
                              │ requisition │
                              │ _equipment  │
                              └─────────────┘
```

---

## 5. Main Business Modules

### 5.1 Ticket Management (Helpdesk)

**Status:** Fully implemented and active.

The core helpdesk module supports:
- **Ticket creation** by public users (via token — no login required)
- **Ticket lifecycle:** `open` → `in_progress` → `waiting` → `resolved` → `closed`/`cancelled`
- **Assignment** to IT staff by admin/manager
- **Threaded messaging** between requester and IT team
- **File attachments** on tickets (images + documents, max 10 MB)
- **Priority levels:** low, medium, high, critical
- **Ticket types:** incident, request, change, problem
- **Email notifications** on creation, assignment, status changes, and new messages
- **WebSocket real-time updates** for assigned technicians
- **Full audit history** of all changes

### 5.2 Equipment Inventory (2026 Module)

**Status:** Fully implemented — the most complex module.

Manages IT equipment through its full lifecycle:
- **Equipment registration** with category (NOTEBOOK, PERIPHERAL), detailed specs, photos, QR codes
- **Auto-generated internal codes** (NB-001, MS-001, KB-001, etc.)
- **Delivery flow** — assign equipment to a person, generate a signed responsibility term (PDF)
- **Return flow** — process equipment return with condition inspection checklist
- **Transfer flow** — move equipment between employees or locations
- **Movement audit trail** with full from/to history
- **Dashboard** with counts by status, pending items, alerts
- **Views:** by person, by organizational unit
- **Alerts:** long maintenance, overdue terms, missing documentation

### 5.3 Purchase Requisitions

**Status:** Implemented in the inventory module (routes at `/api/inventory/requisitions`).

Full procurement lifecycle:
- **Request creation** with item specs, quantity, priority, justification
- **Approval workflow:** `pending` → `approved` (or `rejected`)
- **Purchase tracking:** supplier, values, delivery dates
- **Receiving:** link received items to new equipment records
- **Auto-numbered:** PED-YYYY-NNN format

> **Note:** The legacy `/api/purchases` route returns 501 (not implemented). All purchase logic is in the inventory module.

### 5.4 Responsibility Terms

**Status:** Implemented as part of equipment delivery/return.

Legal documents that formalize equipment custody:
- **Delivery terms** — generated as PDF when equipment is delivered to a person
- **Return terms** — generated as PDF when equipment is returned
- **Data captured:** responsible person details (name, CPF, email, phone, position, department, unit), LGPD consent
- **Condition tracking:** physical inspection on delivery and return
- **Inspection checklist** (return): screen, keyboard, touchpad, charger, battery condition

### 5.5 Knowledge Base / Information Center

**Status:** Implemented with two parallel systems.

- **Public articles** (`information_articles`) — visible to all users at `/central`, seeded with default FAQ content
- **Knowledge management** (`knowledge_articles`) — internal management interface for IT staff
- **Categories:** getting-started, troubleshooting, faq, tutorials, institutional
- **View counting** on public articles

### 5.6 Reports & Analytics

**Status:** Implemented, no authentication required.

- **General overview:** total tickets, by status, by priority, avg response/resolution time
- **Technician performance:** per-person ticket counts, resolution rates
- **SLA compliance:** response and resolution targets by priority level
- **Trends:** time-series data for created vs resolved tickets
- **Export:** JSON, Excel (.xlsx) for tickets, technicians, and consolidated reports
- **Admin dashboard:** summary stats for the admin panel
- **Manager dashboard:** includes monthly trends, department stats, top issues

### 5.7 User Management

**Status:** Implemented for internal users.

- **Internal user CRUD** — admin can create/update/deactivate IT staff, managers, admins
- **Password management** — bcrypt hashing, admin can reset passwords
- **Role system:** `admin`, `it_staff`, `manager`, `final_user`
- **Toggle active/inactive** status per user

---

## 6. Current Data Flow

### 6.1 Opening a Support Ticket (Public User)

```
1. User visits /abrir-chamado (no login needed)
2. User fills: name, email, department, unit → POST /api/public-auth/public-access
3. System creates/reuses public_users record, returns user_token
4. user_token stored in browser (x-user-token header for subsequent requests)
5. User fills ticket form: title, description, type, priority
6. POST /api/tickets/ (with x-user-token header)
7. Backend creates ticket record in DB (requester_type='public', requester_id=public_user.id)
8. EmailService.notifyNewTicket() → emails IT staff
9. WebSocketService.notifyNewTicket() → real-time push to IT staff browsers
10. User redirected to /meus-chamados
```

### 6.2 IT Staff Processing a Ticket

```
1. IT staff logs in at /admin/login → POST /api/internal-auth/internal-login
2. Backend verifies bcrypt hash, returns JWT + user info
3. JWT stored as internal_token in localStorage
4. Staff views /admin/chamados → GET /api/tickets/ (with JWT)
5. Staff opens ticket → GET /api/tickets/:id (detail + messages)
6. Staff assigns to self → PATCH /api/tickets/:id { assigned_to_id }
7. Email sent to assigned technician + WebSocket notification
8. Staff adds message → POST /api/tickets/:id/messages
9. Email sent to requester + WebSocket notification
10. Staff resolves → PATCH /api/tickets/:id { status: 'resolved' }
11. Email sent to requester with resolution notice
```

### 6.3 Registering Equipment (Notebook)

```
1. IT staff navigates to /inventario/equipamentos/novo
2. Fills form: type=notebook, brand, model, serial number, specs (processor, RAM, storage, screen, OS)
3. POST /api/inventory/notebooks
4. Backend auto-generates internal_code (NB-XXX, incrementing from last)
5. Record created in inventory_equipment with current_status='available'
6. QR code data URL generated for the equipment label
7. Staff can upload photos via POST /api/inventory/equipment/:id/photo
```

### 6.4 Delivering Equipment to an Employee

```
1. IT staff navigates to /inventario/equipamentos/entregar
2. Selects equipment (must be status='available')
3. Fills responsible person details: name, CPF, email, phone, department, unit, position
4. Accepts LGPD consent checkbox
5. POST /api/inventory/movements/deliver
6. Backend (in a single transaction-like flow):
   a. Creates responsibility_term record (status='active')
   b. Creates equipment_movement record (type='delivery')
   c. Updates inventory_equipment: current_status='in_use', current_responsible_id/name, etc.
7. GET /api/inventory/terms/:termId/delivery-pdf
8. PDFService generates A4 delivery term with equipment details, conditions, signature blocks
9. PDF streamed to browser for download/print
```

### 6.5 Returning Equipment

```
1. IT staff navigates to /inventario/equipamentos/devolver
2. Selects equipment currently in use
3. Fills return form: condition assessment, inspection checklist (screen, keyboard, etc.)
4. POST /api/inventory/movements/return
5. Backend:
   a. Closes active responsibility_term (returned_date, return_condition, return_checklist)
   b. Creates equipment_movement record (type='return')
   c. Updates inventory_equipment: current_status='available', clears responsible
6. GET /api/inventory/terms/:termId/return-pdf
7. PDFService generates return term with inspection results and signature blocks
```

### 6.6 Purchase Requisition Flow

```
1. IT staff creates requisition at /inventario/compras/nova
2. POST /api/inventory/requisitions { item_type, description, specs, quantity, priority, reason }
3. Auto-numbered PED-2026-001
4. Manager/Admin approves → PATCH /api/inventory/requisitions/:id/approve
5. IT registers purchase → PATCH /api/inventory/requisitions/:id/purchase { supplier, actual_value, invoice }
6. Item received → PATCH /api/inventory/requisitions/:id/receive { received_by, equipment_ids }
7. Links new equipment records to the requisition via requisition_equipment table
```

---

## 7. Weaknesses & Limitations in the Current Architecture

### 7.1 Critical Issues

#### No Authentication on Critical Endpoints
**Severity: HIGH**

30 inventory endpoints, 2 dashboard endpoints, and 8 report endpoints have **zero authentication**. Anyone with the URL can:
- Read all equipment data
- Create/modify equipment
- Deliver/return equipment
- View all business analytics
- Export all ticket data as Excel

This is a major security vulnerability.

#### No Controller/Service Layer Separation
**Severity: HIGH**

All business logic, data access, and HTTP handling are coupled in route files. The `inventory.ts` route file is **1929 lines** with 30 endpoints containing raw SQL queries, business rules, and response formatting all interleaved. This makes:
- Unit testing nearly impossible
- Code reuse across endpoints impractical
- Bug isolation difficult
- Onboarding new developers slow

#### Polymorphic Foreign Key Without DB Enforcement
**Severity: MEDIUM**

`tickets.requester_id` can reference either `public_users` or `internal_users` depending on `requester_type`, but there is **no database constraint** enforcing this. Orphaned references are possible and undetectable at the DB level.

### 7.2 Architectural Issues

#### Dual/Triplicate Systems

| Concern | Duplicates |
|---------|-----------|
| User tables | `users` (legacy) + `public_users` + `internal_users` |
| Asset tables | `assets` + `inventory_items` + `inventory_equipment` |
| Movement tables | `asset_movements` + `inventory_movements` + `equipment_movements` |
| Purchase tables | `purchase_requests` + `purchase_requisitions` |
| Knowledge tables | `knowledge_articles` + `information_articles` |
| Auth routes | `/api/auth` + `/api/public-auth` + `/api/internal-auth` |
| WebSocket clients | `websocketClient.ts` + `websocketService.ts` (frontend) |
| Toast systems | `react-hot-toast` + custom Zustand `toastStore` |

This creates confusion about which is canonical and risks data fragmentation.

#### Schema-as-Migration Anti-Pattern

The entire `schema.ts` file (977 lines) runs on **every server startup**. It contains:
- `CREATE TABLE IF NOT EXISTS` for all tables
- Dozens of `ALTER TABLE ... IF NOT EXISTS` column additions
- Index creation
- Admin user seeding
- Article seeding

This approach:
- Has no rollback capability
- Cannot track which migrations have been applied
- Makes destructive changes (column renames, type changes) extremely risky
- Will slow down server cold starts over time

#### No Transaction Management

Critical multi-step operations (e.g., deliver equipment = create term + create movement + update equipment) run as **separate queries without a database transaction**. If any step fails, the system is left in an inconsistent state.

### 7.3 Data Integrity Issues

#### Excessive Denormalization

Responsible person names, department names, and user names are duplicated across multiple tables:
- `inventory_equipment.current_responsible_name`
- `equipment_movements.from_user_name`, `to_user_name`, `registered_by_name`
- `responsibility_terms.responsible_name`, `issued_by_name`, `received_by`
- `purchase_requisitions.requester_name`, `approved_by_name`, `received_by_name`

If a user's name is updated, all these denormalized copies become stale. There is no mechanism to propagate name changes.

#### Missing Audit History on Equipment

While `equipment_movements` tracks physical movements, there is no audit trail for:
- Field edits (who changed the serial number? when?)
- Status changes outside of movement flows
- Photo additions/deletions
- Document changes

#### No Soft Delete on Equipment

Equipment uses `current_status` values but has no `is_deleted` flag (unlike the legacy `assets` table). Deleted equipment is presumably hard-deleted, losing all history.

### 7.4 Frontend Issues

#### Auth State Divergence

`InternalProtectedRoute` and `Navigation` read auth state **directly from localStorage**, bypassing the Zustand `authStore`. This creates a split-brain scenario where the store may say "not authenticated" but localStorage still has valid tokens, or vice versa.

#### No Code Splitting

All 36 page components are **eagerly imported** in `App.tsx`. With the number of pages and dependencies (recharts, xlsx, etc.), the initial bundle size is unnecessarily large. `React.lazy()` + `Suspense` should be used.

#### Dead Code

- `ProtectedRoute.tsx` — defined but **never used** in any route
- `websocketService.ts` (frontend) — duplicate of `websocketClient.ts`, not wired to auth store
- `MyTicketsPage.tsx.bak` — backup file in source
- `inventory.ts.backup` — backup file in backend routes

### 7.5 Scalability Concerns

#### Raw SQL Without Connection Pool Tuning

The PostgreSQL pool uses default settings with no configuration for:
- Max pool size
- Connection timeout
- Idle timeout
- Statement timeout

Under load, this could lead to connection exhaustion.

#### No Caching Layer

Every API call hits the database directly. Frequently-read, rarely-changed data (dashboard stats, article lists, user lookups) should be cached.

#### No Pagination on Several List Endpoints

Some inventory endpoints return all records without pagination (`GET /api/inventory/notebooks`, `GET /api/inventory/peripherals`), which will degrade as data grows.

#### File Storage on Local Disk

Uploads are stored in `backend/uploads/` on the server filesystem. This:
- Is lost on Azure App Service redeployments (non-persistent storage)
- Cannot scale horizontally
- Has no CDN or backup strategy

Should use Azure Blob Storage or equivalent.

### 7.6 Testing Gaps

- Backend has `jest.config.js` but only a few test files exist (`internalAuth.test.ts`, `validation.test.ts`, `RefreshToken.test.ts`)
- No integration tests for the 30 inventory endpoints
- No end-to-end tests
- Frontend has `vitest` configured but minimal test coverage (`authStore.test.ts`, `toastStore.test.ts`, `authService.test.ts`)

### 7.7 Summary of Recommendations

| Priority | Recommendation |
|----------|---------------|
| **P0** | Add authentication to all inventory, dashboard, and report endpoints |
| **P0** | Wrap multi-step operations in database transactions |
| **P1** | Extract business logic from routes into service/controller layers |
| **P1** | Consolidate duplicate tables and remove legacy systems |
| **P1** | Implement proper migration tool (e.g., node-pg-migrate or Knex migrations) |
| **P1** | Move file storage to Azure Blob Storage |
| **P2** | Add audit logging for all entity modifications |
| **P2** | Implement frontend code splitting with React.lazy |
| **P2** | Unify auth state management (remove direct localStorage reads) |
| **P2** | Remove all dead code and backup files |
| **P3** | Add caching layer for dashboard/report queries |
| **P3** | Configure connection pool limits |
| **P3** | Add comprehensive test coverage |

---

> **Document prepared for architecture review.**  
> Total API endpoints: **77** (across 10 route files)  
> Total frontend pages: **36** (across 6 public + 30 protected routes)  
> Total database tables: **20** (13 active + 7 legacy)
