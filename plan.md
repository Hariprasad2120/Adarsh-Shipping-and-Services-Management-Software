# CHA Redesign Audit Plan

## Notes
- `graphify-out/graph.json` is not present in this checkout, so this audit is based on direct source review.
- Current workspace is already dirty in unrelated files; do not assume a clean pre-redesign baseline.

## Route Audit

| Route / Surface | Purpose | Current Components | Primary Actions | Secondary Actions | Page-Specific Data | Current Layout Issues | Proposed Layout Pattern |
|---|---|---|---|---|---|---|---|
| `/cha` | Operational dashboard for current CHA work | [page.tsx](src/app/(dashboard)/cha/page.tsx), `DashboardCreateJob`, `DataTable`, warning indicators | Open assigned job, create job, view all jobs | Open settings, inspect due-date/query warnings | KPI counts, assigned jobs, pending advances, filing/query warnings | Missing compact page header from approved reference; summary and queue section are strong but not unified with Jobs/Overview shell | Shared CHA header + KPI row + command rail + full-width work queue |
| `/cha/jobs` | Search, filter, create, and manage all CHA jobs | [jobs/page.tsx](src/app/(dashboard)/cha/jobs/page.tsx), [jobs-client.tsx](src/app/(dashboard)/cha/jobs/jobs-client.tsx), `CreateJobDialog`, `FilterMenu`, `DataTable` | Search, filter, paginate, open job, create job | Toggle assignment view, inspect warnings | Active/completed job tables, filters, due-date warnings, filing-query warnings | Close to target already, but header/breadcrumb/search/date layer and control hierarchy need tightening | Shared CHA header + 4 KPI cards + command center + active/completed queue tables |
| `/cha/jobs/[jobId]` shell | Main job workspace route | [page.tsx](src/app/(dashboard)/cha/jobs/[jobId]/page.tsx), [job-workspace-client.tsx](src/app/(dashboard)/cha/jobs/[jobId]/job-workspace-client.tsx) | Navigate job tabs, update job, progress workflow | Delete job, assign/change manager, audit actions | Full job detail payload, permissions, managers, settings, workflow state | Largest mismatch vs approved overview reference; top identity row is cramped; operational summary is spread across stage cards/tabs | Compact breadcrumb header + full-width job identity card + horizontal workflow progress + overview/dashboard sections |
| `job workspace: Overview` | Above-the-fold operational job dashboard | Same client file as job workspace route | Open operational areas, launch docs/workflow/queries/expenses | Delete, change manager, view activity | Job summary, important dates, quick actions, recent activity, stage progress | Currently mixed into shell and tabs; lacks dedicated full-width overview dashboard treatment | 12-col grid with identity card, workflow stepper, summary/dates/actions cards, recent activity |
| `job workspace: Documents` | Filing workflow document management | [workflow-documents-section.tsx](src/app/(dashboard)/cha/jobs/[jobId]/workflow-documents-section.tsx), workspace handlers | Upload/re-upload, preview, N/A, exemption, delete, progress | Search/filter docs, Section 49 controls | Document requirements, versions, exceptions, progress | Recently redesigned to target | Keep and align with shell/header updates |
| `job workspace: Workflow / Filing` | Checklist and filing workflow execution | `MilestoneCard`, filing/query panels inside `job-workspace-client.tsx` | Start workflow, complete stage, manage queries | Toggle query processing, upload attachments | Active node, conditional sections, query state, checklist approvals | Dense and visually fragmented; benefits from new full-width shell and section framing | Query + checklist/filing split panels with shared summary row |
| `job workspace: Additional Data` | Capture manifests, delivery order validity, container details | Same client file | Save/edit additional data, proceed stage | Expiry-driven extensions | Vessel inward, IGM/EGM, delivery order validity | Good logic, but framed like an isolated milestone rather than part of one unified page | Keep card, tighten header and adjacency with related workflow info |
| `job workspace: Advances` | Track customer advances and receipts | Same client file | Add receipt, update advance follow-up | Inspect outstanding balance | Expected vs received amounts | Needs same full-width, less nested presentation | Summary strip + receipt/action panel + ledger table |
| `job workspace: Expenses` | Submit/manage expense requests | Same client file | Create expense, review queue, update states | View attachments/history | Expense requests, categories, approvals | Functional but visually separate from approved CHA language | KPI strip + queue table + action panel |
| `job workspace: Audit` | Job activity and audit trail | Same client file | Review history | Filter/sort history if present | Audit events and metadata | Reads as a fallback tab, not a polished operational page | Full-width activity stream with metadata chips |
| `/cha/approvals` | Checklist/customer approval workloads | [approvals/page.tsx](src/app/(dashboard)/cha/approvals/page.tsx) | Review/approve items | Navigate to job/work item | Approval queues | Not yet audited deeply in this pass | Reuse dashboard/jobs shell after core pages land |
| `/cha/expenses` | Expense operations page | [expenses/page.tsx](src/app/(dashboard)/cha/expenses/page.tsx), `expenses-client.tsx` | Manage requests/payments | Filter/export | Expense queue data | Not yet audited deeply in this pass | Reuse queue shell and KPI/header pattern |
| `/cha/customers`, `/cha/customers/new`, `/cha/customers/[id]/edit` | Customer master data for CHA | customer pages | CRUD customer records | Search/filter | Customer metadata | Not yet audited deeply in this pass | Shared compact CHA form/list shell |
| `/cha/reports` | Reporting/export surface | [reports/page.tsx](src/app/(dashboard)/cha/reports/page.tsx) | View/export reports | Filter/date range | Aggregates/report rows | Not yet audited deeply in this pass | Shared compact header + filter rail + report panels |
| `/cha/settings`, `/cha/settings/filing-workflows` | CHA settings and workflow admin | settings pages | Configure module/workflows | Toggle advanced settings | Settings state and workflow definitions | Not yet audited deeply in this pass | Shared settings shell with denser sections |

## Shared Components Worth Reusing / Consolidating

- `DataTable` and related table primitives for queue/list sections
- `DashboardCreateJob` / `CreateJobDialog` for creation flows
- Warning indicators:
  - `job-filing-query-warning-indicator`
  - `job-section49-validity-warning-indicator`
  - `cha-due-date-warning-indicator`
  - `cha-due-date-warnings-indicator`
- `MilestoneCard` patterns already in `job-workspace-client.tsx`
- Newly created workflow document components:
  - `RequirementDocumentCard`
  - `WorkflowDocumentsSectionHeader`
  - `UploadedWorkflowDocumentCard`
  - `WorkflowProgressPanel`
  - `DocumentMetaItem`
  - `DocumentDropzone`

## Proposed Shared Layout System

1. Shared CHA page header
   - compact eyebrow/breadcrumb/title row
   - optional search field
   - utility actions on the right

2. Shared KPI row
   - 4 to 5 compact cards
   - icon tile + label + value + helper text

3. Shared operational section card
   - title + badge + small description
   - right-side context metrics or controls
   - full-width content area below

4. Shared right-rail / supporting panel pattern
   - sticky on desktop
   - stacked below on tablet/mobile

5. Shared activity / metadata tiles
   - low-contrast borders
   - soft shadows
   - avoid nested card-in-card overload

## Immediate Implementation Order

1. Finish aligning the job workspace shell with the approved Job Overview reference
2. Add a shared CHA header treatment and apply it to Dashboard and Jobs
3. Normalize section spacing and summary-card hierarchy across Dashboard and Jobs
4. Revisit remaining CHA routes after the core shell is stable
