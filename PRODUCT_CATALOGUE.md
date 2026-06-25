# Monolith Engine — Product Catalogue

> **Version**: 0.1.0 | **Company**: Adarsh Shipping & Services | **Last Updated**: 2026-06-25

---

## 1. Product Overview

| Field | Value |
|---|---|
| **Product Name** | Monolith Engine |
| **Company** | Adarsh Shipping & Services |
| **Business Purpose** | Unified enterprise operations platform consolidating HR, CRM, Attendance, Assets, Accounting, Recruitment, Communication, and AI into one system |
| **Target Users** | Employees, HR Managers, Sales Teams, Operations Directors, Finance Controllers, Admins |
| **Tech Stack** | Next.js 15, TypeScript, Prisma 7, PostgreSQL (Neon), Tailwind CSS 4, Kotlin/Jetpack Compose (Android) |
| **Hosting** | Vercel (Web), GitHub Releases (APK) |
| **Current Status** | Production — actively used with 13 modules |
| **Vision** | One unified core for total operational command — eliminating data silos, manual spreadsheets, and disconnected tools |

### Codebase Statistics

| Metric | Count |
|---|---|
| App Routes (Pages) | 197 |
| API Routes | 167 |
| Database Models | 237 |
| Module Service Files | 70 |
| UI Components | 89 |

---

## 2. User Roles

| Role | Purpose | Accessible Modules | Key Permissions |
|---|---|---|---|
| **Admin** | Full system control | All modules | Create users, manage roles, configure org |
| **HR Manager** | Employee lifecycle management | HRMS, Attendance, AMS, Recruit, LMS | Manage employees, approve letters, run payroll |
| **Manager** | Team operations oversight | HRMS, Attendance, CRM, CHA | Approve leaves, review reports, manage jobs |
| **Employee** | Self-service portal | HRMS (self), Attendance, To-Do | View own data, punch, apply leaves |
| **Sales Executive** | Customer relationship management | CRM, Communication | Manage leads, create quotes, track calls |
| **CHA Operator** | Customs handling operations | CHA, Communication | Create/manage jobs, upload checklists |
| **Accountant** | Financial operations | Accounting, CRM (invoices) | Post journals, manage ledger, reconcile |
| **Job Seeker** | Recruitment self-service | Recruit (career portal) | Browse jobs, apply, track applications |

---

## 3. Module Catalogue

### 3.1 Core Platform ✅ Implemented

**Purpose**: Authentication, session management, RBAC, notifications, and shared infrastructure.

| Feature | Status | Route | API |
|---|---|---|---|
| Authentication (NextAuth) | ✅ | `/login` | `/api/auth/*` |
| Session Management | ✅ | — | `/api/auth/session` |
| Role-Based Access Control | ✅ | `/admin/roles` | `/api/roles` |
| User Management | ✅ | `/admin/users` | `/api/users` |
| Notification System | ✅ | `/notifications` | `/api/notifications` |
| Dark/Light Theme | ✅ | All pages | — |
| Design System | ✅ | — | — |

**Key Models**: User, Role, Permission, RolePermission, UserRole, Organisation, Branch, Department, Division, Notification

---

### 3.2 HRMS Module ✅ Implemented

**Purpose**: Complete employee lifecycle — directory, onboarding, letters, salary, files, tracking.

| Feature | Status | Route | API |
|---|---|---|---|
| Employee Directory | ✅ | `/hrms/employees` | `/api/hrms/employees` |
| Org Structure (Branch/Dept) | ✅ | `/hrms/org-structure` | `/api/org/branches`, `/api/org/departments` |
| Employee Onboarding | ✅ | `/hrms/onboarding` | `/api/hrms/onboarding` |
| HR Letter Templates | ✅ | `/hrms/letters` | `/api/hrms/letters` |
| Salary Structure & Revisions | ✅ | `/hrms/salary-structure` | `/api/hrms/salary` |
| Employee File Drive | ✅ | `/hrms/files` | `/api/hrms/files` |
| HR Helpdesk / Cases | ✅ | `/hrms/helpdesk` | `/api/hrms/helpdesk` |
| Work Reports | ✅ | `/hrms/work-reports` | `/api/hrms/work-reports` |
| Travel Requests | ✅ | `/hrms/travel` | `/api/hrms/travel` |
| On-Duty Requests | ✅ | `/hrms/on-duty-admin` | `/api/hrms/on-duty` |
| Live Location Tracking | ✅ | `/hrms/tracking` | `/api/hrms/tracking` |
| Face Enrollment | ✅ | — (mobile) | `/api/mobile/hrms/face/enroll` |
| User Agreement | ✅ | — (mobile) | `/api/mobile/hrms/agreement` |
| Mobile HRMS App | ✅ | — (Android APK) | `/api/mobile/hrms/*` |

**Key Models**: User, EmploymentRecord, Document, HRLetterTemplate, HRLetterRequest, EmployeeFaceEnrollment, AttendanceSession, LocationTrackingSession, LocationPoint, OnDutyRequest, UserAgreementVersion, UserAgreementAcceptance

---

### 3.3 Attendance Engine ✅ Implemented

**Purpose**: Biometric sync, punch tracking, shifts, overtime, leaves, holidays.

| Feature | Status | Route | API |
|---|---|---|---|
| Biometric Terminal Sync | ✅ | `/attendance` | `/api/attendance/sync` |
| Punch Card Tracking | ✅ | `/attendance` | `/api/attendance/punches` |
| Shift Management | ✅ | `/attendance/shifts` | `/api/attendance/shifts` |
| Overtime Calculations | ✅ | `/attendance/overtime` | `/api/attendance/ot` |
| Leave Management | ✅ | `/attendance/leaves` | `/api/attendance/leaves` |
| Holiday Calendar | ✅ | `/attendance/holidays` | `/api/attendance/holidays` |

**Key Models**: AttendancePunch, Shift, ShiftAssignment, LeaveType, LeaveBalance, LeaveRequest, Holiday, OTEntry, OtSettings, OtRecord, AttendanceRegularization

---

### 3.4 Appraisal Management (AMS) ✅ Implemented

**Purpose**: Performance evaluation cycles, multi-rater reviews, hike decisions.

| Feature | Status | Route | API |
|---|---|---|---|
| Appraisal Cycle Scheduling | ✅ | `/ams` | `/api/ams/cycles` |
| Self-Assessment Forms | ✅ | `/ams/appraisals` | `/api/ams/self-assessment` |
| Reviewer Rating | ✅ | `/ams/reviews` | `/api/ams/reviews` |
| Management Review | ✅ | `/ams/management` | `/api/ams/management` |
| Hike Decisions | ✅ | `/ams/hikes` | `/api/ams/hikes` |

**Key Models**: AppraisalCycle, AppraisalSchedule, Appraisal, AppraisalReviewer, SelfAssessment, ReviewerRating, ManagementReview, HikeDecision, IncrementSlab

---

### 3.5 CRM Module ✅ Implemented

**Purpose**: Lead-to-customer lifecycle, sales pipeline, quotes, invoices, mobile app.

| Feature | Status | Route | API |
|---|---|---|---|
| Lead Management | ✅ | `/crm/leads` | `/api/crm/leads` |
| Contact Management | ✅ | `/crm/contacts` | `/api/crm/contacts` |
| Account Management | ✅ | `/crm/accounts` | `/api/crm/accounts` |
| Deals Pipeline | ✅ | `/crm/deals` | `/api/crm/deals` |
| Quotation Builder | ✅ | `/crm/quotes` | `/api/crm/quotes` |
| Support Tickets | ✅ | `/crm/tickets` | `/api/crm/tickets` |
| Products & Price Books | ✅ | `/crm/products` | `/api/crm/products` |
| Mobile CRM App | ✅ | — (Android APK) | `/api/mobile/crm/*` |
| Call Tracking | ✅ | — (mobile) | `/api/mobile/crm/call-attempts/*` |

**Key Models**: CrmLead, CrmContact, CrmAccount, CrmDeal, CrmProduct, CrmInvoice, CrmCallAttempt, CrmCallRecording, Quotation

---

### 3.6 CHA Module ✅ Implemented

**Purpose**: Customs handling job lifecycle, checklists, filing, document control.

| Feature | Status | Route | API |
|---|---|---|---|
| Job Creation | ✅ | `/cha` | `/api/cha/jobs` |
| Checklist Management | ✅ | `/cha/checklists` | `/api/cha/checklists` |
| Filing Workflow | ✅ | `/cha/filing` | `/api/cha/filing` |
| Job Deletion Approval | ✅ | `/cha/jobs` | `/api/cha/jobs/delete` |
| CHA Expenses | ✅ | `/cha/expenses` | `/api/cha/expenses` |

**Key Models**: ChaJob, ChaJobAssignment, ChaChecklistSection, ChaChecklistItem, ChaChecklistApproval, ChaFiling, ChaExpenseRequest, ChaAuditLog

---

### 3.7 Communication Module ✅ Implemented

**Purpose**: Gmail/Google Chat integration, email dispatch, announcements.

| Feature | Status | Route | API |
|---|---|---|---|
| Gmail Integration | ✅ | `/communication` | `/api/communication/*` |
| Google Chat Integration | ✅ | `/communication/chat` | `/api/google-chat/*` |
| Email Queue | ✅ | — | `/api/communication/send` |

**Key Models**: GoogleWorkspaceConnection, GoogleChatUserLink, GoogleChatSpace, EmailQueue, CommunicationAuditEvent

---

### 3.8 Recruitment (Recruit) ✅ Implemented

**Purpose**: Full hiring pipeline — employer postings, candidate management, job seeker portal.

| Feature | Status | Route | API |
|---|---|---|---|
| Employer Job Posting | ✅ | `/hrms/recruit/employer/jobs` | `/api/recruit/jobs` |
| Candidate Management | ✅ | `/hrms/recruit/employer/candidates` | `/api/recruit/candidates` |
| Application Pipeline | ✅ | `/hrms/recruit/employer/applications` | `/api/recruit/applications` |
| Job Seeker Portal | ✅ | `/hrms/recruit/career` | `/api/recruit/jobseeker/*` |
| AI Career Assistant | ✅ | `/hrms/recruit/career/assistant` | `/api/recruit/jobseeker/career/conversations` |

**Key Models**: RecruitJobOpening, RecruitCandidate, RecruitApplication, RecruitInterview, RecruitOffer, RecruitJobSeekerProfile

---

### 3.9 Accounting Module 🟡 Partial

**Purpose**: Chart of accounts, journal entries, general ledger, financial reporting.

| Feature | Status | Route | API |
|---|---|---|---|
| Chart of Accounts | ✅ | `/accounting` | `/api/accounting/*` |
| Journal Entries | ✅ | `/accounting/journals` | `/api/accounting/journals` |
| General Ledger | ✅ | `/accounting/ledger` | `/api/accounting/ledger` |
| Payroll Batches | 🟡 | `/accounting/payroll` | — |

**Key Models**: Account, FiscalYear, JournalEntry, GeneralLedgerEntry, SalesInvoice, PurchaseInvoice, PaymentEntry

---

### 3.10 To-Do & Reminders ✅ Implemented

| Feature | Status | Route | API |
|---|---|---|---|
| Task CRUD | ✅ | `/todo` | `/api/todos` |
| Subtasks | ✅ | `/todo` | `/api/todos/subtasks` |
| Reminders | ✅ | `/todo` | `/api/todos/reminders` |

**Key Models**: TodoTask, TodoSubtask

---

### 3.11 Mona AI Assistant ✅ Implemented

| Feature | Status | Route | API |
|---|---|---|---|
| AI Chat | ✅ | (sidebar widget) | `/api/mona/chat` |
| Mobile Mona | ✅ | (Android app) | `/api/mobile/mona/chat` |
| Product Knowledge | 🟡 | — | — |

---

### 3.12 LMS (Learning Management) 🟡 Partial

| Feature | Status | Route | API |
|---|---|---|---|
| Course Builder | 🟡 | `/lms/courses` | — |
| My Learning | 🟡 | `/lms/my-learning` | — |

**Key Models**: Course, CourseEnrollment, Survey, SurveyQuestion

---

### 3.13 Expense Management 📋 Planned

| Feature | Status | Target |
|---|---|---|
| Expense Claims | 📋 | Q3 2026 |
| Receipt OCR | 📋 | Q3 2026 |
| Multi-Level Approval | 📋 | Q3 2026 |

---

## 4. Workflow Catalogue

### 4.1 CHA Job Lifecycle
**Status**: ✅ Implemented

```
Job Creation → Manager Assignment → Checklist Upload → Internal Approval
→ Customer Approval → Filing (First Check → Second Check → Amendment)
→ RMS → Open Bill → Completion
```

### 4.2 HR Letter Generation
**Status**: ✅ Implemented

```
Template Selection → Variable Population → Manager Approval
→ PDF Generation → Email Dispatch → Audit Log
```

### 4.3 Appraisal Cycle
**Status**: ✅ Implemented

```
Schedule Slot → Reviewer Assignment → Self-Assessment
→ Multi-Rater Scoring → Manager Calibration → Review Meeting
→ Hike Decision → CTC Update → Cycle Close
```

### 4.4 Lead-to-Customer
**Status**: ✅ Implemented

```
Lead Import → Agent Assignment → Contact Attempts
→ Qualification → Quote Creation → Manager Approval
→ Invoice → Payment → Customer Record
```

### 4.5 Mobile Attendance
**Status**: ✅ Implemented

```
App Launch → Face Detection (Liveness) → GPS Capture
→ Server Validation → Session Created → Heartbeat Tracking
→ Check-Out → Session Closed → Working Hours Calculated
```

### 4.6 Recruitment Pipeline
**Status**: ✅ Implemented

```
Job Opening → Application Received → Screening
→ Interview Scheduling → Feedback → Offer Generation
→ Offer Approval → Onboarding Handoff
```

---

## 5. Rebuild Blueprint

### 5.1 Tech Stack
- **Framework**: Next.js 15 (App Router, Server Components)
- **Language**: TypeScript (strict mode)
- **Database**: PostgreSQL via Prisma ORM 7.x
- **Hosting**: Vercel (serverless, edge)
- **Auth**: NextAuth.js with credentials provider
- **Styling**: Tailwind CSS 4 + custom design system tokens
- **Mobile**: Kotlin + Jetpack Compose (Android)
- **AI**: Google Gemini API

### 5.2 Folder Structure
```
├── prisma/                  # Schema + migrations + seed
├── src/
│   ├── app/
│   │   ├── (auth)/          # Login, verify pages
│   │   ├── (dashboard)/     # All authenticated pages
│   │   │   ├── admin/       # Admin panel
│   │   │   ├── ams/         # Appraisals
│   │   │   ├── attendance/  # Punch & leaves
│   │   │   ├── cha/         # Customs handling
│   │   │   ├── communication/ # Gmail, Chat
│   │   │   ├── crm/         # Sales CRM
│   │   │   ├── hrms/        # HR management
│   │   │   ├── lms/         # Learning
│   │   │   └── todo/        # Tasks & reminders
│   │   └── api/             # API routes (167 endpoints)
│   ├── components/          # 89 shared UI components
│   ├── lib/                 # Shared utilities, auth, RBAC
│   └── modules/             # 13 business logic modules
├── mobile/                  # Android (Kotlin/Compose)
├── scripts/                 # CLI tools (seed, import, catalogue)
├── docs/                    # Documentation
└── public/                  # Static assets + APK
```

### 5.3 Build Order
1. **Core Platform**: Auth, RBAC, user management, notifications, design system
2. **HRMS**: Employee directory, org structure, salary, letters
3. **Attendance**: Biometric sync, punches, shifts, OT, leaves
4. **AMS**: Appraisal cycles, reviews, hike decisions
5. **CRM**: Leads, contacts, quotes, invoices, mobile app
6. **CHA**: Job lifecycle, checklists, filing
7. **Communication**: Gmail, Google Chat integration
8. **Recruit**: Employer + job seeker portals
9. **Accounting**: Chart of accounts, ledger, journals
10. **To-Do**: Tasks, subtasks, reminders
11. **LMS**: Courses, enrollments
12. **Mona AI**: Chat assistant, product knowledge
13. **Mobile**: Android app (CRM + HRMS modules)

### 5.4 Deployment
- **Web**: Push to `main` → Vercel auto-deploys
- **Mobile**: `./gradlew assembleRelease` → copy APK to `public/app-release.apk` → push
- **Database**: `prisma migrate deploy` on Vercel build
- **Environment**: `.env` with DATABASE_URL, NEXTAUTH_SECRET, GOOGLE_API keys

---

## 6. Keeping This Catalogue Updated

### Automatic Updates

```bash
npm run catalogue:update    # Regenerate docs/product-catalogue.json
npm run catalogue:check     # Validate catalogue is current
```

### Agent Rule

Before completing any Monolith Engine task, update the Product Catalogue:

```bash
npm run catalogue:update
npm run catalogue:check
```

No feature is complete unless the catalogue is updated.

---

*This document is the authoritative product reference for Monolith Engine. See also:*
- *In-app catalogue: `/product-catalogue`*
- *Auto-generated data: `docs/product-catalogue.json`*
- *Manual registry: `docs/product-feature-registry.json`*
