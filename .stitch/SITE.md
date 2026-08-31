# SITE.md — Monolith Engine

## Product purpose

Internal operations platform ("Monolith Engine") for **Adarsh Shipping & Services** — a
freight-forwarding / customs-house-agent (CHA) business in India. Single app covering the
whole back office: customs jobs, freight bookings, CRM/sales pipeline, HR, payroll,
attendance/leave, accounting/ERP ledger, performance appraisals, learning, communication
(mail/chat/drive/calendar), and a customer portal for external clients.

There is also a **CHA edition** (`isChaEdition()`) that redirects `/dashboard` → `/cha` and
narrows the app to customs operations.

## Application architecture

- **Framework**: Next.js 16.2.12 App Router, React 19.2.4, RSC + client islands.
- **Auth**: next-auth 5 beta. Session-gated route groups.
- **DB**: Prisma 7.8 + PostgreSQL (Neon). Multi-tenant (`orgId` scoping), RBAC via
  capability keys (`Caps`, e.g. `attendance.leave.manage`).
- **Styling**: Tailwind CSS v4 + one global stylesheet `src/app/globals.css` (38,605 lines,
  pseudo-sectioned). Semantic token chain: `.mnx-*` class → `--mnx-*` local var →
  `--mn-*` semantic alias → `--frappe-*` / raw value. shadcn tokens (`--background`,
  `--primary`, …) are aliased on top.
- **Component libs present**: shadcn 4, Radix UI, react-aria-components, lucide-react +
  @carbon/icons-react, sonner (toasts), framer-motion + gsap + three/react-three (dashboard
  decoration), @react-pdf/renderer, leaflet.
- **Themes**: light / night / violet, plus accent (blue/green/amber/violet). No-flash inline
  script in root layout; `data-theme` + legacy `.dark` / `.theme-*` classes.

## Route groups

| Group | Path | Audience | Shell |
|---|---|---|---|
| Public | `/`, `/verify/[id]`, `/quote-share/[token]`, `/google-chat-link`, `/invite/employee` | anonymous / tokened | none |
| Auth | `/(auth)/login`, `/(auth)/setup` | anonymous | animated-login CSS module |
| Dashboard | `/(dashboard)/**` | employees (RBAC-filtered) | Monolith AppShell (sidebar + top bar) |
| Customer portal | `/customer-portal/**` | external customers | `customer-portal-workspace.tsx` |

## Major modules (under `/(dashboard)`)

| Module | Root | Approx routes | Function |
|---|---|---|---|
| Dashboard | `/dashboard` | 1 (+ tabs) | Personal operations home |
| CHA | `/cha` | ~18 | Customs jobs, masters, filing workflows, approvals, reports |
| Freight Forwarding | `/freight-forwarding` | ~14 | HBL/MBL, bookings, process pipeline |
| CRM | `/crm` | ~70 | Leads, deals, quotes, customers, contacts, tickets, campaigns, forecasts, service enquiries |
| HRMS | `/hrms` | ~40 | Employees, onboarding, letters, recruit (career + employer), org structure, travel, helpdesk |
| Payroll | `/payroll` | ~60 | Pay runs, compensation, statutory (EPF/ESI/PT/LWF), taxes & forms, huge settings tree |
| My Payroll | `/my-payroll` | 4 | Employee self-service payslips/investments |
| AMS | `/ams` | ~22 | Appraisals, cycles, criteria, KPI, assets, arrears/slabs |
| Attendance | `/attendance` | ~11 | Punch, leaves (hr-console, policies, team-calendar), OT, timesheets, reports |
| Accounting | `/accounting` | ~75 | Full ERP: invoices (sales/purchase), payments, journal entries, ledger, trial balance, P&L, balance sheet, fixed assets, tax settlement, banking |
| LMS | `/lms` | ~6 | Courses, assignments, my-learning, reports |
| Communication | `/communication` | ~10 | Mail, chat, drive, calendar, meetings, job-spaces, search |
| Admin | `/admin` | ~13 | Roles, sessions, passkeys, design-system catalogue, notifications, simulation, work-pet |
| Product Catalogue | `/product-catalogue` | 1 | Catalogue engine |
| Todo | `/todo` | 1 | Personal task workspace |
| Notifications | `/notifications` | 1 | Notification center |
| Account | `/account/security` | 1 | Personal security settings |
| Expense | `/expense` | 1 | Expense desk (CHA-linked) |

## Route inventory

- **354** `page.tsx` files.
- **~290** unique routes; **407** route-states in the audit (page + loading + error + not-found).
- Full list: `docs/ui-audit/route-inventory.md` and `.stitch/ROUTES.md`.

## Navigation

- Left **AppShell sidebar** (`src/components/navigation/monolith-app-sidebar.tsx`, 438 lines):
  module sections, RBAC-filtered via `getVisibleSections(caps, enabledModuleIds)`.
- **Command palette** (`monolith-search-command.tsx`).
- Nested `layout.tsx` per module (14 of them) — mostly feature-flag guards + module CSS scope,
  a few add a secondary/settings nav (payroll, hrms/recruit).
- Breadcrumbs via `breadcrumb-label.tsx`.

## Prior design-system effort (IMPORTANT context)

A repository-wide UI migration is already underway. Do not treat this as greenfield.

- Governance doc: `docs/MONOLITH_UI_DESIGN_SYSTEM.md` (mandatory agent guide).
- Fresh route audit (2026-08-31): `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md` —
  267 COMPLIANT / 36 PARTIAL / 101 NON_COMPLIANT / 3 SPECIALISED (of 407 states).
- Component/style ownership audit: `docs/ui-component-and-style-ownership-audit.md` (3,600 lines).
- Migration handoff: `docs/ui-migration-handoff.md` (10,569 lines).
- Audit scripts: `scripts/audit-ui-routes.mjs`, `scripts/generate-ui-component-style-audit.mjs`.
- Verify gate: `npm run design-system:verify`, `npm run architecture:check`.
- Live component catalogue route: `/admin/design-system`.

**This Stitch redesign layers UX exploration + a dashboard rethink on top of that effort.**
It does not replace the `--mn-*` token system or the `Workspace*` / `Operational*` component
families — those remain the production source of truth (matches redesign brief Phases 7, 9, 15).

## Completed redesigns

- None yet under this branch. First target: `/dashboard`.

## Pending redesigns

- `/dashboard` (Phase 11 — audit + 3 Stitch variants + approval, then implement).
- Then page-pattern migration across the ~9 patterns (see `PAGE-PATTERNS.md`).
