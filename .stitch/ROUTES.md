# ROUTES.md — Route Inventory & Redesign Tracking

Source of truth for machine detail: `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md`
(regenerate with `node scripts/audit-ui-routes.mjs`). Full flat list:
`docs/ui-audit/route-inventory.md`.

- **354** `page.tsx` files · **~290** unique routes · **407** route-states audited.
- Compliance snapshot (2026-08-31): 267 COMPLIANT · 36 PARTIAL · 101 NON_COMPLIANT · 3 SPECIALISED.

This file tracks routes **grouped by page pattern** (see `PAGE-PATTERNS.md`) with redesign
status, not one row per route. Redesign status values:
`NOT AUDITED · AUDITED · STITCH DESIGNED · APPROVED · IMPLEMENTED · QA PASSED · COMPLETE`.

---

## Representative routes per module (redesign anchors)

The migration is per-pattern, not per-route. These are the anchor pages to design first.

| Pattern | Anchor route | Module | Roles | Purpose | Primary action | Redesign status |
|---|---|---|---|---|---|---|
| DASHBOARD | `/dashboard` | Dashboard | all employees | "What needs my attention, what next" | Punch in/out; open flagged item | AUDITED |
| DASHBOARD (module) | `/crm/dashboard` | CRM | sales | Pipeline state at a glance | Open deal/enquiry | NOT AUDITED |
| INDEX / LIST | `/hrms/employees` | HRMS | hr | Browse & find employees | New employee | NOT AUDITED |
| DATA TABLE (dense) | `/accounting/sales-invoices` | Accounting | finance | Work the invoice queue | New invoice; record payment | NOT AUDITED |
| ENTITY DETAIL | `/hrms/employees/[id]` | HRMS | hr | Full record + related data + actions | Edit; run workflow | NOT AUDITED |
| CREATE / EDIT FORM | `/hrms/employees/new` | HRMS | hr | Capture a new record | Save | NOT AUDITED |
| CREATE / EDIT FORM (heavy) | `/accounting/journal-entries/new` | Accounting | finance | Multi-line document entry | Post | NOT AUDITED |
| WORKFLOW / PROCESS | `/cha/process/[quoteId]` | CHA | ops | Advance a customs job through stages | Complete current stage | NOT AUDITED |
| WORKFLOW / PROCESS | `/freight-forwarding/process/[quoteId]` | FF | ops | Advance a booking | Complete current stage | NOT AUDITED |
| SETTINGS (nav + panels) | `/payroll/settings` (+ ~40 children) | Payroll | admin | Configure a subsystem | Save section | NOT AUDITED |
| CALENDAR | `/attendance/leaves/team-calendar` | Attendance | manager | See team availability | Approve/plan leave | NOT AUDITED |
| KANBAN / PIPELINE | `/crm/deals` | CRM | sales | Move deals between stages | Advance stage; new deal | NOT AUDITED |
| APPROVALS QUEUE | `/cha/approvals`, `/accounting/approvals`, `/hrms/approvals`, `/crm/approvals`, `/payroll/approvals` | many | approver | Clear items awaiting my decision | Approve / reject | NOT AUDITED |
| REPORT / ANALYTICS | `/accounting/profit-loss`, `/ams/analytics`, `/attendance/reports` | many | manager/finance | Read a computed report | Change params; export | NOT AUDITED |
| DIRECTORY (cards/grid) | `/lms/courses`, `/crm/campaigns` | LMS/CRM | learner/marketer | Browse a collection | Open item | NOT AUDITED |
| WIZARD | `/freight-forwarding/create-booking` | FF | ops | Guided multi-step creation | Next / finish | NOT AUDITED |
| SELF-SERVICE | `/my-payroll/payslips`, `/ams/my-appraisal` | Payroll/AMS | employee | View own data / act on own task | Download / submit | NOT AUDITED |
| AUTHENTICATION | `/(auth)/login`, `/customer-portal/login` | Auth | anonymous | Sign in | Sign in | SPECIALISED (keep) |
| PORTAL (external) | `/customer-portal/dashboard` + children | Portal | customer | Track shipments / approve quotes | Approve quotation | NOT AUDITED |

---

## Per-route detail template

For each route being actively redesigned, append a block here:

```
### ROUTE: /cha/jobs
PAGE NAME: Customs Jobs
MODULE: CHA
USER ROLES: cha.job.view (+ manage for actions)
PRIMARY PURPOSE: Work the queue of active customs jobs
PRIMARY ACTION: New job
SECONDARY ACTIONS: filter by status/customer, open job, export
DATA DISPLAYED: job no, customer, mode, status, ETA, assigned, pending doc count
CURRENT COMPONENTS: ChaWorkspaceFrame, ChaRoutePageHeader, OperationalDataTable family
CURRENT UX PROBLEMS: (fill during audit)
PAGE PATTERN: DATA TABLE
REDESIGN STATUS: NOT AUDITED
```

---

## Full flat route list

See `docs/ui-audit/route-inventory.md` (generated). No route is silently omitted; every
`page.tsx` under `src/app` is enumerated there with its module and audit status.
