# School ERP Management System (Multi-School Enterprise Edition)

A complete, production-grade, multi-school School ERP (Enterprise Resource Planning) platform designed for schools, educational groups, CBSE/ICSE/State boards, and residential campuses. Built with React 19, TypeScript, Tailwind CSS, Express, and high-performance embedded PostgreSQL (ElectricSQL PGlite).

---

## 1. Project Overview

The School ERP system provides complete institutional governance, academic management, and financial accounting across multiple branches with strict school-level data isolation.

### Core Modules & Workflows
- **Multi-School Architecture & RBAC**: Strict school-level data isolation, 11 standard roles (Super Admin, School Admin, Principal, Teacher, Accountant, HR, Librarian, Transport Manager, Hostel Warden, Parent, Student), and 70+ granular permission keys.
- **Academic Master & Curriculums**: Sessions, Classes, Sections, Subjects, Curriculum maps, Terms, Units, Chapters, Lesson Plans, and Syllabus Pacing.
- **Student Information System (SIS)**: 360° Student lifecycle, admissions, enrollments, documents, photo storage, family relationships, sibling links, health records, and promotion workflows.
- **Parent & Guardian Management**: Verified parent profiles, primary/secondary guardians, multi-ward switching, digital consent, and portal authorization.
- **Teacher & Staff Workspace**: Single unified employee master, qualification & experience tracking, subject assignments, and class teacher allocations.
- **Attendance System**: Daily student attendance, bulk marking, late/half-day codes, holiday/academic calendar, teacher attendance check-in/out, and locked registers with audit corrections.
- **Fees & Financial Accounting**: Fee categories, flexible fee structures, installments, student concessions/scholarships, daily collection, multi-mode payments (Cash, UPI, Cheque, Bank Transfer, Card), unique sequential receipt numbering, idempotency tokens, audit ledger, and payment reversal.
- **Examination & Result Management**: Exam creation, room/seat scheduling, marks entry with validation gates, grading scales (CBSE 10-point, ICSE, Letter), result calculation, approval workflow, and printable PDF report cards.
- **Timetable & Conflict Engine**: Academic periods, room allocations, teacher timetables, real-time collision detection (prevents double-booking), and smart substitution management.
- **Homework & Study Materials**: Rich homework assignment, student submissions, file attachments, teacher evaluation, grading, and syllabus-linked study resources.
- **Public & Online Admissions**: Multi-step application portal, document verification, entrance test/interview scheduling, and one-click confirmed admission linking.
- **Parent & Student Portal**: Real database-driven portal with student overview, attendance registers, fee dues, online payments, report cards, timetable, and leave requests.
- **Campus Facilities Management**:
  - **Library**: Book cataloging, accession numbers, issues, returns, renewals, and automated fine calculation integrated with fee ledgers.
  - **Transport**: Fleet vehicles, GPS route mapping, stops, driver licenses, vehicle fitness/insurance tracking, and student bus passes.
  - **Hostel / Residential**: Buildings, floors, room & bed allocation, biometric roll calls, gate passes, and room inventory.
  - **Inventory & Assets**: Item masters, stock in/out, purchase requisitions, vendor directory, and asset depreciation.
  - **HR & Payroll**: Salary structures, allowances, deductions, PF/ESI calculations, payslip generation, and leave quotas.
- **Workflow Automation & Approval Engine**: Safe JSON AST rules engine, multi-level sequential & parallel approval chains, SLA escalation monitor, and automated operational morning briefings.

---

## 2. Technology Stack

- **Frontend**: React 19, TypeScript 5+, Tailwind CSS 4, Lucide React Icons, Motion (Framer Motion), Recharts.
- **Build Tool**: Vite 8 with `@vitejs/plugin-react` and `@tailwindcss/vite`.
- **Backend API**: Node.js, Express 4, `tsx` TypeScript runtime, `cookie-parser`, `bcryptjs`.
- **Database**: Embedded PostgreSQL via `@electric-sql/pglite` (WebAssembly/C PostgreSQL running in-process for instant setup without external DB daemon dependencies). Also compatible with external PostgreSQL instances.
- **Document & PDF Generation**: `jspdf`, `qrcode`.
- **PWA & Offline Support**: `vite-plugin-pwa` with service worker asset caching.

---

## 3. System Requirements & Installation

### Prerequisites
- **Node.js**: `v20.0.0` or higher (recommended: Node 20 LTS or Node 22 LTS).
- **Package Manager**: `npm` (v10+), `yarn` (v1.22+), or `pnpm` (v9+).
- **Operating System**: Linux, macOS, or Windows (WSL recommended on Windows).

### Quick Start Installation

```bash
# 1. Clone or extract the repository
git clone <repository-url> school-erp
cd school-erp

# 2. Install dependencies
npm install

# 3. Setup environment configuration
cp .env.example .env

# 4. Start the application in development mode
npm run dev
```

The application server will start at: `http://localhost:3000`

---

## 4. Environment Variables Configuration

Copy `.env.example` to `.env` and configure the following variables:

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `PORT` | HTTP Server port | `3000` |
| `NODE_ENV` | Application environment (`development` / `production`) | `production` |
| `APP_URL` | Public base URL of the application | `http://localhost:3000` |
| `SESSION_SECRET` | Cryptographic secret for signing session tokens and cookies | (At least 32 random characters) |
| `GEMINI_API_KEY` | Optional: Google Gemini API key for automated operational briefings | `AIza...` |
| `DATABASE_URL` | Optional: Connection string if using external PostgreSQL | `postgresql://user:pass@host:5432/erp` |
| `SMTP_HOST` | Outbound email server hostname | `smtp.mailprovider.com` |
| `SMTP_PORT` | SMTP port | `587` |
| `SMTP_USER` | SMTP username | `notifications@school.edu` |
| `SMTP_PASS` | SMTP password | `********` |
| `SMS_API_KEY` | SMS gateway API key | `********` |
| `PAYMENT_GATEWAY_KEY_ID` | Payment gateway Key (Razorpay / Stripe) | `rzp_live_...` |

---

## 5. Database Architecture & Migrations

The application uses an integrated PostgreSQL engine with self-healing schemas and automatic migration checks on startup.

### Schema Modules
1. **Core Database (`server/db.ts`)**:
   - `schools`, `academic_sessions`, `roles`, `permissions`, `role_permissions`
   - `users`, `user_sessions`, `audit_logs`
   - `classes`, `sections`, `subjects`, `departments`, `designations`
   - `students`, `student_enrollments`, `parents`, `student_parents`, `student_documents`
   - `employees`, `teacher_subjects`, `class_teachers`
   - `student_attendance`, `staff_attendance`, `attendance_locks`, `attendance_corrections`
   - `fee_categories`, `fee_structures`, `fee_structure_items`, `fee_installments`, `fee_student_assignments`, `fee_payments`, `fee_receipts`, `fee_concessions`
   - `exams`, `exam_schedules`, `exam_marks`, `exam_results`, `grading_scales`
2. **Classroom & Timetable (`server/routes/classroom.ts`)**:
   - `rooms`, `periods`, `timetables`, `timetable_entries`, `timetable_substitutions`, `homework`, `homework_submissions`, `study_materials`, `school_notices`
3. **Campus Management Schemas**:
   - `server/libraryDb.ts`: Books, copies, issues, returns, fines.
   - `server/transportDb.ts`: Vehicles, routes, stops, maintenance, bus allocations.
   - `server/hostelDb.ts`: Hostels, rooms, beds, allocations, night check-in, outings.
   - `server/inventoryDb.ts`: Items, stock ledgers, purchase orders, vendors, asset registry.
   - `server/payrollDb.ts`: Salary structures, payroll runs, payslips, leave balances.
   - `server/communicationDb.ts`: Circulars, SMS/email templates, broadcast logs.
   - `server/administrationDb.ts`: Visitors, gate passes, complaints, calendar events.
   - `server/lifecycleDb.ts`: Student transfer certificates (TC), character certificates, bona fide certificates.
   - `server/workflowDb.ts`: Definitions, instances, multi-level approvals, automation rules, smart tasks.

### Database Initialization & Seeding
Database tables, indexes, default roles, permissions, sample schools, academic sessions, and sample students are initialized automatically when running `npm run dev` or `npm start`.

---

## 6. Scripts & NPM Commands

| Command | Purpose |
| :--- | :--- |
| `npm run dev` | Runs the full-stack development server with live compilation via `tsx server.ts` |
| `npm run build` | Compiles the frontend application using Vite into `/dist` |
| `npm start` | Runs the production server (`tsx server.ts`), serving both API routes and static `/dist` |
| `npm run lint` | Runs TypeScript compilation checking (`tsc --noEmit`) to verify zero type errors |
| `npm run clean` | Cleans the `/dist` directory |
| `npx tsx tests/core_erp_e2e_test.ts` | Runs the 10-scenario comprehensive end-to-end audit test suite |

---

## 7. Pre-Configured Test Accounts (Default Credentials)

All default accounts use password: **`Admin@123`**

| Role | Username | Email | School Scope |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin` | `superadmin@erp.edu` | Master access to all schools |
| **School Admin (VVPS)** | `admin.vvps` | `admin@vvps.edu` | Vidya Vahini Public School (`sch_vvps`) |
| **School Admin (GISK)** | `admin.gisk` | `admin@gisk.edu` | Gyanodaya International School (`sch_gisk`) |
| **Teacher** | `teacher.vvps` | `teacher@vvps.edu` | VVPS Academic Faculty |
| **Accountant** | `accounts.vvps` | `accounts@vvps.edu` | VVPS Finance & Accounts |
| **Parent** | `parent.vvps` | `parent@vvps.edu` | Ward: Ananya Sharma (Grade 5-A) |
| **Student** | `student.vvps` | `student@vvps.edu` | Ananya Sharma (Admission #VVP-2026-0001) |

---

## 8. Multi-School Isolation & Security Architecture

1. **Server-Side Authorization**: Every API request is verified on the backend via `authenticateToken`, `requireAuth`, and `requirePermission`. UI button hiding is not treated as security.
2. **School Scope Enforcement (`checkSchoolScope`)**: Non-superadmin users are strictly quarantined to their assigned `schoolId`. Passing a different `school_id` header or parameter returns **HTTP 403 Forbidden**.
3. **Parent Portal IDOR Prevention (`authorizeStudentAccess`)**: Parents can only access records for wards linked to their profile in `student_parents`. Querying an unlinked student returns **HTTP 403 Forbidden**.
4. **Financial Ledger Immutability**: Financial transactions and fee payments are never deleted silently; payment reversals and refunds create explicit audit trail records with reason codes.
5. **Session Invalidation**: When user status is updated to `inactive` or `suspended`, all active user sessions in `user_sessions` are terminated immediately.

---

## 9. Production Deployment Instructions

### Standard Node.js / VPS Deployment (Ubuntu / Debian)
```bash
# 1. Install Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Clone project and install dependencies
git clone <repo> /var/www/school-erp
cd /var/www/school-erp
npm ci

# 3. Build frontend assets
npm run build

# 4. Configure environment
cp .env.example .env
nano .env

# 5. Start with PM2 Process Manager
sudo npm install -g pm2
pm2 start "npm start" --name "school-erp"
pm2 save
pm2 startup
```

### Docker / Containerized Deployment
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

---

## 10. Verification & Quality Assurance

- **Type Safety**: Verified with `tsc --noEmit` (Zero errors).
- **Vite Production Compilation**: Verified with `npm run build` (Clean bundle output).
- **End-to-End Audit**: Full 10-step lifecycle tested via `tests/core_erp_e2e_test.ts`.

---

## 11. License

Proprietary Institutional License. Copyright © 2026. All rights reserved.
