# Component deletion candidates

Generated before moves. These are manual review candidates only. A missing AST
import is not deletion evidence: registries, string references, tests,
catalogues, archives, and framework entrypoints must also be checked.

| Path | Exports | Owner | Duplicate name | Style risk | Required next check |
| --- | --- | --- | --- | --- | --- |
| `src/app/(dashboard)/crm/invoices/invoice-form.tsx` | `InvoiceForm` | crm | no | no signal | search registries, strings, tests, catalogues, docs, CSS coupling, and replacement consumers |
| `src/app/(dashboard)/dashboard/graphics/TaskStudioGraphic.tsx` | `TaskStudioGraphic` | dashboard | no | review | search registries, strings, tests, catalogues, docs, CSS coupling, and replacement consumers |
| `src/components/layout/workspace.test.tsx` | none | shared | no | no signal | search registries, strings, tests, catalogues, docs, CSS coupling, and replacement consumers |
| `src/components/ui/foundation.test.tsx` | none | shared | no | no signal | search registries, strings, tests, catalogues, docs, CSS coupling, and replacement consumers |
| `src/modules/accounting/components/accounting-workspace.test.tsx` | none | accounting | no | no signal | search registries, strings, tests, catalogues, docs, CSS coupling, and replacement consumers |
| `src/modules/auth/components/public-workspace.test.tsx` | none | auth | no | no signal | search registries, strings, tests, catalogues, docs, CSS coupling, and replacement consumers |
| `src/modules/cha/components/jobs/job-delete-inline-button.tsx` | `JobDeleteInlineButton` | cha | no | no signal | search registries, strings, tests, catalogues, docs, CSS coupling, and replacement consumers |
| `src/modules/cha/components/workspace/cha-workspace.test.tsx` | none | cha | no | no signal | search registries, strings, tests, catalogues, docs, CSS coupling, and replacement consumers |
| `src/modules/communication/components/communication-admin-workspace.test.tsx` | none | communication | no | no signal | search registries, strings, tests, catalogues, docs, CSS coupling, and replacement consumers |
| `src/modules/crm/components/workspace/crm-workspace.test.tsx` | none | crm | no | no signal | search registries, strings, tests, catalogues, docs, CSS coupling, and replacement consumers |
| `src/modules/dashboard/components/landing-page/AppraisalsModule.tsx` | `AppraisalsModule`, `default` | dashboard | no | review | search registries, strings, tests, catalogues, docs, CSS coupling, and replacement consumers |
| `src/modules/dashboard/components/landing-page/AttendanceModule.tsx` | `AttendanceModule`, `default` | dashboard | no | review | search registries, strings, tests, catalogues, docs, CSS coupling, and replacement consumers |
| `src/modules/dashboard/components/landing-page/CompanyOverview.tsx` | `CompanyOverview`, `default` | dashboard | no | no signal | search registries, strings, tests, catalogues, docs, CSS coupling, and replacement consumers |
| `src/modules/dashboard/components/landing-page/CRMModule.tsx` | `CRMModule`, `default` | dashboard | no | review | search registries, strings, tests, catalogues, docs, CSS coupling, and replacement consumers |
| `src/modules/dashboard/components/landing-page/HRModule.tsx` | `HRModule`, `default` | dashboard | no | review | search registries, strings, tests, catalogues, docs, CSS coupling, and replacement consumers |
| `src/modules/hrms/components/attendance-calendar.tsx` | `AttendanceCalendar` | hrms | no | review | search registries, strings, tests, catalogues, docs, CSS coupling, and replacement consumers |
| `src/modules/hrms/components/dashboard-widgets.tsx` | `DashboardWidgets` | hrms | no | review | search registries, strings, tests, catalogues, docs, CSS coupling, and replacement consumers |
| `src/modules/hrms/components/leave-tracker.tsx` | `LeaveTracker` | hrms | no | review | search registries, strings, tests, catalogues, docs, CSS coupling, and replacement consumers |
| `src/modules/hrms/components/sidebar.tsx` | `HrmsSidebar`, `SidebarItem` | hrms | yes | review | search registries, strings, tests, catalogues, docs, CSS coupling, and replacement consumers |
| `src/modules/hrms/components/top-nav.tsx` | `HrmsTopNav` | hrms | no | review | search registries, strings, tests, catalogues, docs, CSS coupling, and replacement consumers |
| `src/modules/people/components/people-workspace.test.tsx` | none | people | no | no signal | search registries, strings, tests, catalogues, docs, CSS coupling, and replacement consumers |
| `src/modules/performance/components/performance-workspace.test.tsx` | none | performance | no | no signal | search registries, strings, tests, catalogues, docs, CSS coupling, and replacement consumers |
