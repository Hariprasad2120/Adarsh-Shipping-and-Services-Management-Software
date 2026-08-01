# Component reorganization report

Date: 2026-07-30

## Scope and source state

- Branch: `codex/production-safe-structural-cleanup-20260730`
- Starting commit: `e891cdd7e240aa69155d3c89e0462512d8ebd1b3`
- Starting working tree: clean
- Routes, URLs, API contracts, database behavior, permissions, server actions,
  validation, component props, markup, semantic tokens, and intentional visual
  presentation changed: no
- Commits created by this batch: none

The fresh pre-flight and accepted failures are recorded in
[`component-reorganization-baseline.md`](component-reorganization-baseline.md).

## Inventory

The AST audit inspected 899 TSX, JSX, TS, JS, and CSS files under
`src/components`, `src/app`, `src/modules`, and `src/styles`. It mapped
537 TSX/JSX components, static imports, string-literal dynamic imports, exports,
ownership, business/route/style signals, and proposed destinations.

- Final proposed path changes: 0
- Retained uncertain/cross-module review entries: 43
- Automated zero-import output used as deletion authority: no

Detailed evidence:

- [component usage map](component-usage-map.md)
- [component migration map](component-migration-map.md)
- [component deletion candidates](component-deletion-candidates.md)
- [component retention list](component-retention-list.md)

## Final component tree

```text
src/
  app/                         Next.js conventions and route-private composition
  components/
    ui/                        canonical business-neutral primitives
    data-display/              generic tables and operational display
    forms/                     generic filters, uploads, and form composition
    layout/                    workspace/dialog/application layout
    navigation/                breadcrumbs and navigation helpers
    feedback/                  warnings and asynchronous states
    providers/                 cross-application providers
  modules/
    accounting/components/
    admin/components/
    ams/components/
    auth/components/
    cha/components/
    communication/components/
    core/components/
    crm/components/
    customer-portal/components/
    dashboard/components/
    hrms/components/
    items/components/
    mona/components/
    notifications/components/
    people/components/
    performance/components/
  styles/
    monolith-tokens.css
    monolith-system.css
```

`src/components/monolith` no longer exists. No file is loose directly under
`src/components`.

## Consolidation and removals

- The former `button-1.tsx` compatibility re-export was temporarily mapped
  during the move, all consumers were migrated to
  `@/components/ui/button`, and the compatibility file was removed.
- The former Monolith barrel was removed after every consumer was split onto
  its canonical primitive, shared, or module path.
- `workspace-data-table.tsx` remains as the People module adapter and
  re-exports the People-specific table contract; the generic foundation is
  `@/components/data-display/data-table`.
- No uncertain component or CSS rule was deleted.
- No legacy backup/archive folder was created; tracked moves use Git history.

Deleted compatibility sources:

- `src/components/monolith/button-1.tsx`

## Every file moved

- `src/app/(dashboard)/accounting/_components/commercial-document-form-page.tsx` → `src/modules/accounting/components/routes/commercial-document-form-page.tsx`
- `src/app/(dashboard)/accounting/_components/commercial-documents-page.tsx` → `src/modules/accounting/components/routes/commercial-documents-page.tsx`
- `src/app/(dashboard)/cha/_components/cha-dashboard-filter-action.tsx` → `src/modules/cha/components/dashboard/cha-dashboard-filter-action.tsx`
- `src/app/(dashboard)/cha/_components/cha-dashboard-search-action.tsx` → `src/modules/cha/components/dashboard/cha-dashboard-search-action.tsx`
- `src/app/(dashboard)/cha/_components/cha-due-date-warning-indicator.tsx` → `src/modules/cha/components/warnings/cha-due-date-warning-indicator.tsx`
- `src/app/(dashboard)/cha/_components/cha-due-date-warning-note.tsx` → `src/modules/cha/components/warnings/cha-due-date-warning-note.tsx`
- `src/app/(dashboard)/cha/_components/cha-due-date-warnings-indicator.tsx` → `src/modules/cha/components/warnings/cha-due-date-warnings-indicator.tsx`
- `src/app/(dashboard)/cha/_components/cha-operations-shared.tsx` → `src/modules/cha/components/workspace/cha-operations-shared.tsx`
- `src/app/(dashboard)/cha/_components/job-delete-inline-button.tsx` → `src/modules/cha/components/jobs/job-delete-inline-button.tsx`
- `src/app/(dashboard)/cha/_components/job-filing-query-warning-indicator.tsx` → `src/modules/cha/components/warnings/job-filing-query-warning-indicator.tsx`
- `src/app/(dashboard)/cha/_components/job-section49-validity-warning-indicator.tsx` → `src/modules/cha/components/warnings/job-section49-validity-warning-indicator.tsx`
- `src/app/(dashboard)/cha/jobs/[jobId]/workflow-documents-section.tsx` → `src/modules/cha/components/jobs/workflow-documents-section.tsx`
- `src/app/(dashboard)/communication/google-chat-live-view/_components/google-chat-live-view-settings.tsx` → `src/modules/communication/components/google-chat-live-view-settings.tsx`
- `src/app/(dashboard)/communication/google-chat-live-view/actions.ts` → `src/modules/communication/actions/google-chat-live-view.ts`
- `src/app/(dashboard)/crm/_components/activities-panel.tsx` → `src/modules/crm/components/records/activities-panel.tsx`
- `src/app/(dashboard)/crm/_components/attachments-panel.tsx` → `src/modules/crm/components/records/attachments-panel.tsx`
- `src/app/(dashboard)/crm/_components/crm-workspace-page.tsx` → `src/modules/crm/components/records/crm-workspace-page.tsx`
- `src/app/(dashboard)/crm/_components/delete-record-button.tsx` → `src/modules/crm/components/delete-record-button.tsx`
- `src/app/(dashboard)/crm/_components/notes-panel.tsx` → `src/modules/crm/components/records/notes-panel.tsx`
- `src/app/(dashboard)/crm/_components/timeline-panel.tsx` → `src/modules/crm/components/records/timeline-panel.tsx`
- `src/app/(dashboard)/crm/invoices/_components/InvoiceDetailsPage.tsx` → `src/modules/crm/components/invoices/InvoiceDetailsPage.tsx`
- `src/app/(dashboard)/crm/quotes/_components/ComboboxField.tsx` → `src/modules/crm/components/quotes/ComboboxField.tsx`
- `src/app/(dashboard)/crm/quotes/_components/ConfirmDialog.tsx` → `src/modules/crm/components/quotes/ConfirmDialog.tsx`
- `src/app/(dashboard)/crm/quotes/_components/CustomerSection.tsx` → `src/modules/crm/components/quotes/CustomerSection.tsx`
- `src/app/(dashboard)/crm/quotes/_components/DateField.tsx` → `src/modules/crm/components/quotes/DateField.tsx`
- `src/app/(dashboard)/crm/quotes/_components/FileUploadBox.tsx` → `src/modules/crm/components/quotes/FileUploadBox.tsx`
- `src/app/(dashboard)/crm/quotes/_components/FixedActionBar.tsx` → `src/modules/crm/components/quotes/FixedActionBar.tsx`
- `src/app/(dashboard)/crm/quotes/_components/FormRow.tsx` → `src/modules/crm/components/quotes/FormRow.tsx`
- `src/app/(dashboard)/crm/quotes/_components/ItemAutocomplete.tsx` → `src/modules/crm/components/quotes/ItemAutocomplete.tsx`
- `src/app/(dashboard)/crm/quotes/_components/LineItemsTable.tsx` → `src/modules/crm/components/quotes/LineItemsTable.tsx`
- `src/app/(dashboard)/crm/quotes/_components/NewQuotePage.tsx` → `src/modules/crm/components/quotes/NewQuotePage.tsx`
- `src/app/(dashboard)/crm/quotes/_components/NotesAndTermsSection.tsx` → `src/modules/crm/components/quotes/NotesAndTermsSection.tsx`
- `src/app/(dashboard)/crm/quotes/_components/QuoteDetailsPage.tsx` → `src/modules/crm/components/quotes/QuoteDetailsPage.tsx`
- `src/app/(dashboard)/crm/quotes/_components/QuoteMetaSection.tsx` → `src/modules/crm/components/quotes/QuoteMetaSection.tsx`
- `src/app/(dashboard)/crm/quotes/_components/QuotesIndexPage.tsx` → `src/modules/crm/components/quotes/QuotesIndexPage.tsx`
- `src/app/(dashboard)/crm/quotes/_components/ShippingDetailsSection.tsx` → `src/modules/crm/components/quotes/ShippingDetailsSection.tsx`
- `src/app/(dashboard)/crm/quotes/_components/TotalsPanel.tsx` → `src/modules/crm/components/quotes/TotalsPanel.tsx`
- `src/app/(dashboard)/crm/quotes/_lib/gst-states.ts` → `src/modules/crm/components/quotes/lib/gst-states.ts`
- `src/app/(dashboard)/crm/quotes/_lib/mock-data.ts` → `src/modules/crm/components/quotes/lib/mock-data.ts`
- `src/app/(dashboard)/crm/quotes/_lib/quote-calculations.ts` → `src/modules/crm/components/quotes/lib/quote-calculations.ts`
- `src/app/(dashboard)/crm/quotes/_lib/quote-details-data.ts` → `src/modules/crm/components/quotes/lib/quote-details-data.ts`
- `src/app/(dashboard)/crm/quotes/_lib/quote-list-data.ts` → `src/modules/crm/components/quotes/lib/quote-list-data.ts`
- `src/app/(dashboard)/crm/quotes/_lib/types.ts` → `src/modules/crm/components/quotes/lib/types.ts`
- `src/app/(dashboard)/crm/quotes/_lib/validation.ts` → `src/modules/crm/components/quotes/lib/validation.ts`
- `src/app/(dashboard)/lms/_components/lms-route-page.tsx` → `src/modules/performance/components/lms-route-page.tsx`
- `src/app/customer-portal/_components/client-actions.tsx` → `src/modules/customer-portal/components/client-actions.tsx`
- `src/app/customer-portal/_components/portal-kyc-workspace.tsx` → `src/modules/customer-portal/components/portal-kyc-workspace.tsx`
- `src/app/customer-portal/_components/portal-placeholder.tsx` → `src/modules/customer-portal/components/portal-placeholder.tsx`
- `src/components/ams/criteria-points-form.tsx` → `src/modules/ams/components/criteria-points-form.tsx`
- `src/components/ams/cycle-progress-card.tsx` → `src/modules/ams/components/cycle-progress-card.tsx`
- `src/components/ams/form-preview-modal.tsx` → `src/modules/ams/components/form-preview-modal.tsx`
- `src/components/auth/animated-login.module.css` → `src/modules/auth/components/animated-login.module.css`
- `src/components/auth/login-scene.config.ts` → `src/modules/auth/components/login-scene.config.ts`
- `src/components/auth/monolith-logistics-login.tsx` → `src/modules/auth/components/monolith-logistics-login.tsx`
- `src/components/cha/create-job-dialog.tsx` → `src/modules/cha/components/create-job-dialog.tsx`
- `src/components/cha/create-job-permission-guard.tsx` → `src/modules/cha/components/create-job-permission-guard.tsx`
- `src/components/cha/dashboard-create-job.tsx` → `src/modules/cha/components/dashboard-create-job.tsx`
- `src/components/crm/ApprovalActionBar.tsx` → `src/modules/crm/components/ApprovalActionBar.tsx`
- `src/components/hrms/app-settings-page.tsx` → `src/modules/hrms/components/app-settings-page.tsx`
- `src/components/hrms/approvals-view.tsx` → `src/modules/hrms/components/approvals-view.tsx`
- `src/components/hrms/attendance-calendar.tsx` → `src/modules/hrms/components/attendance-calendar.tsx`
- `src/components/hrms/dashboard-widgets.tsx` → `src/modules/hrms/components/dashboard-widgets.tsx`
- `src/components/hrms/employee-profile-fields.tsx` → `src/modules/hrms/components/employee-profile-fields.tsx`
- `src/components/hrms/files-view.tsx` → `src/modules/hrms/components/files-view.tsx`
- `src/components/hrms/leave-tracker.tsx` → `src/modules/hrms/components/leave-tracker.tsx`
- `src/components/hrms/letters-view.tsx` → `src/modules/hrms/components/letters-view.tsx`
- `src/components/hrms/lms-view.tsx` → `src/modules/performance/components/lms-view.tsx`
- `src/components/hrms/on-duty-admin-view.tsx` → `src/modules/hrms/components/on-duty-admin-view.tsx`
- `src/components/hrms/onboarding-view.tsx` → `src/modules/hrms/components/onboarding-view.tsx`
- `src/components/hrms/pms-view.tsx` → `src/modules/hrms/components/pms-view.tsx`
- `src/components/hrms/reimbursement-admin-view.tsx` → `src/modules/hrms/components/reimbursement-admin-view.tsx`
- `src/components/hrms/settings-services.tsx` → `src/modules/hrms/components/settings-services.tsx`
- `src/components/hrms/sidebar.tsx` → `src/modules/hrms/components/sidebar.tsx`
- `src/components/hrms/tasks-view.tsx` → `src/modules/hrms/components/tasks-view.tsx`
- `src/components/hrms/top-nav.tsx` → `src/modules/hrms/components/top-nav.tsx`
- `src/components/hrms/tracking-dashboard-view.tsx` → `src/modules/hrms/components/tracking-dashboard-view.tsx`
- `src/components/hrms/travel-view.tsx` → `src/modules/hrms/components/travel-view.tsx`
- `src/components/hrms/user-control-page.tsx` → `src/modules/hrms/components/user-control-page.tsx`
- `src/components/hrms/users-table.tsx` → `src/modules/hrms/components/users-table.tsx`
- `src/components/hrms/work-report-settings.tsx` → `src/modules/hrms/components/work-report-settings.tsx`
- `src/components/hrms/work-reports.tsx` → `src/modules/hrms/components/work-reports.tsx`
- `src/components/items/ConfirmDialog.tsx` → `src/modules/items/components/ConfirmDialog.tsx`
- `src/components/items/FixedItemActionBar.tsx` → `src/modules/items/components/FixedItemActionBar.tsx`
- `src/components/items/InventoryInfoBanner.tsx` → `src/modules/items/components/InventoryInfoBanner.tsx`
- `src/components/items/ItemDetailPage.tsx` → `src/modules/items/components/ItemDetailPage.tsx`
- `src/components/items/ItemFormHeader.tsx` → `src/modules/items/components/ItemFormHeader.tsx`
- `src/components/items/ItemInventorySection.tsx` → `src/modules/items/components/ItemInventorySection.tsx`
- `src/components/items/ItemLogisticsFieldsSection.tsx` → `src/modules/items/components/ItemLogisticsFieldsSection.tsx`
- `src/components/items/ItemPriceListSection.tsx` → `src/modules/items/components/ItemPriceListSection.tsx`
- `src/components/items/ItemPrimaryInfoSection.tsx` → `src/modules/items/components/ItemPrimaryInfoSection.tsx`
- `src/components/items/ItemPurchaseInfoSection.tsx` → `src/modules/items/components/ItemPurchaseInfoSection.tsx`
- `src/components/items/ItemSalesInfoSection.tsx` → `src/modules/items/components/ItemSalesInfoSection.tsx`
- `src/components/items/ItemsListPage.tsx` → `src/modules/items/components/ItemsListPage.tsx`
- `src/components/items/ItemsPagination.tsx` → `src/modules/items/components/ItemsPagination.tsx`
- `src/components/items/ItemsTable.tsx` → `src/modules/items/components/ItemsTable.tsx`
- `src/components/items/ItemsToolbar.tsx` → `src/modules/items/components/ItemsToolbar.tsx`
- `src/components/items/NewItemDialog.tsx` → `src/modules/items/components/NewItemDialog.tsx`
- `src/components/items/NewItemPage.tsx` → `src/modules/items/components/NewItemPage.tsx`
- `src/components/landing-page/AppraisalsModule.tsx` → `src/modules/dashboard/components/landing-page/AppraisalsModule.tsx`
- `src/components/landing-page/AttendanceModule.tsx` → `src/modules/dashboard/components/landing-page/AttendanceModule.tsx`
- `src/components/landing-page/CompanyOverview.tsx` → `src/modules/dashboard/components/landing-page/CompanyOverview.tsx`
- `src/components/landing-page/CRMModule.tsx` → `src/modules/dashboard/components/landing-page/CRMModule.tsx`
- `src/components/landing-page/HRModule.tsx` → `src/modules/dashboard/components/landing-page/HRModule.tsx`
- `src/components/landing-page/initialData.ts` → `src/modules/dashboard/components/landing-page/initialData.ts`
- `src/components/mona/mona-avatar.tsx` → `src/modules/mona/components/mona-avatar.tsx`
- `src/components/mona/mona-chat.tsx` → `src/modules/mona/components/mona-chat.tsx`
- `src/components/mona/mona-input.tsx` → `src/modules/mona/components/mona-input.tsx`
- `src/components/mona/mona-message.tsx` → `src/modules/mona/components/mona-message.tsx`
- `src/components/mona/mona-provider.tsx` → `src/modules/mona/components/mona-provider.tsx`
- `src/components/monolith/accounting-delete-action.tsx` → `src/modules/accounting/components/accounting-delete-action.tsx`
- `src/components/monolith/accounting-items.tsx` → `src/modules/accounting/components/accounting-items.tsx`
- `src/components/monolith/accounting-workspace.test.tsx` → `src/modules/accounting/components/accounting-workspace.test.tsx`
- `src/components/monolith/accounting-workspace.tsx` → `src/modules/accounting/components/accounting-workspace.tsx`
- `src/components/monolith/admin-workspace.tsx` → `src/modules/admin/components/admin-workspace.tsx`
- `src/components/monolith/alert.tsx` → `src/components/ui/alert.tsx`
- `src/components/monolith/app-shell.tsx` → `src/modules/core/components/monolith-app-shell.tsx`
- `src/components/monolith/badge.tsx` → `src/components/ui/badge.tsx`
- `src/components/monolith/button.tsx` → `src/components/ui/button.tsx`
- `src/components/monolith/card.tsx` → `src/components/ui/card.tsx`
- `src/components/monolith/cha-workspace.test.tsx` → `src/modules/cha/components/workspace/cha-workspace.test.tsx`
- `src/components/monolith/cha-workspace.tsx` → `src/modules/cha/components/workspace/cha-workspace.tsx`
- `src/components/monolith/communication-admin-workspace.test.tsx` → `src/modules/communication/components/communication-admin-workspace.test.tsx`
- `src/components/monolith/communication-workspace.tsx` → `src/modules/communication/components/workspace/communication-workspace.tsx`
- `src/components/monolith/crm-workspace.test.tsx` → `src/modules/crm/components/workspace/crm-workspace.test.tsx`
- `src/components/monolith/crm-workspace.tsx` → `src/modules/crm/components/workspace/crm-workspace.tsx`
- `src/components/monolith/date-input.tsx` → `src/components/ui/date-input.tsx`
- `src/components/monolith/dropdown-menu.tsx` → `src/components/ui/dropdown-menu.tsx`
- `src/components/monolith/dropdown-select.tsx` → `src/components/ui/dropdown-select.tsx`
- `src/components/monolith/file-upload-field.tsx` → `src/components/forms/file-upload/file-upload-field.tsx`
- `src/components/monolith/filter-menu.tsx` → `src/components/forms/filter-menu.tsx`
- `src/components/monolith/folder-icon.tsx` → `src/components/ui/folder-icon.tsx`
- `src/components/monolith/foundation.test.tsx` → `src/components/ui/foundation.test.tsx`
- `src/components/monolith/foundation.tsx` → `src/components/ui/foundation.tsx`
- `src/components/monolith/index.ts` → `src/components/ui/index.ts`
- `src/components/monolith/input.tsx` → `src/components/ui/input.tsx`
- `src/components/monolith/label.tsx` → `src/components/ui/label.tsx`
- `src/components/monolith/modal.tsx` → `src/components/ui/modal.tsx`
- `src/components/monolith/native-select.tsx` → `src/components/ui/native-select.tsx`
- `src/components/monolith/neon-checkbox.tsx` → `src/components/ui/neon-checkbox.tsx`
- `src/components/monolith/operations-overview.tsx` → `src/components/data-display/operations-overview/operations-overview.tsx`
- `src/components/monolith/people-controls.tsx` → `src/modules/people/components/people-controls.tsx`
- `src/components/monolith/people-data-table.tsx` → `src/modules/people/components/people-data-table.tsx`
- `src/components/monolith/people-workspace.test.tsx` → `src/modules/people/components/people-workspace.test.tsx`
- `src/components/monolith/people-workspace.tsx` → `src/modules/people/components/people-workspace.tsx`
- `src/components/monolith/performance-workspace.test.tsx` → `src/modules/performance/components/performance-workspace.test.tsx`
- `src/components/monolith/performance-workspace.tsx` → `src/modules/performance/components/performance-workspace.tsx`
- `src/components/monolith/public-workspace.test.tsx` → `src/modules/auth/components/public-workspace.test.tsx`
- `src/components/monolith/public-workspace.tsx` → `src/modules/auth/components/public-workspace.tsx`
- `src/components/monolith/textarea.tsx` → `src/components/ui/textarea.tsx`
- `src/components/monolith/warning-indicator-popover.tsx` → `src/components/feedback/warning-indicator-popover.tsx`
- `src/components/monolith/workspace-data-table.tsx` → `src/modules/people/components/workspace-data-table.tsx`
- `src/components/monolith/workspace-dialog.test.ts` → `src/components/layout/workspace-dialog.test.ts`
- `src/components/monolith/workspace-dialog.tsx` → `src/components/layout/workspace-dialog.tsx`
- `src/components/monolith/workspace-states.tsx` → `src/components/feedback/workspace-states.tsx`
- `src/components/monolith/workspace.test.tsx` → `src/components/layout/workspace.test.tsx`
- `src/components/monolith/workspace.tsx` → `src/components/layout/workspace.tsx`
- `src/components/notifications/notification-provider.tsx` → `src/modules/notifications/components/notification-provider.tsx`
- `src/components/shared/clickable-row.tsx` → `src/components/navigation/clickable-row.tsx`
- `src/components/shared/data-table.tsx` → `src/components/data-display/data-table.tsx`
- `src/components/shared/demo-fill-button.tsx` → `src/components/forms/development/demo-fill-button.tsx`

## Boundary enforcement

`npm run architecture:check` now detects:

- loose files directly under `src/components`;
- a reintroduced `src/components/monolith`;
- deprecated component imports;
- UI primitives importing routes or feature modules;
- shared components or modules importing route implementations;
- cross-module imports of private component paths;
- imports from another route segment's `_components`;
- duplicate primitive filenames outside `components/ui`;
- tracked generated/copied/log clutter.

ESLint mirrors the UI, shared-component, and module-to-route restrictions.
Public component barrels are intentionally narrow; the Performance barrel was
kept client-safe after the production build exposed a server/client bundle
boundary.

## Validation

All Node commands used `NODE_OPTIONS=--max-old-space-size=8192`.

| Gate | Result |
| --- | --- |
| Architecture check | Passed: 1,345 tracked paths and 1,272 source/style files |
| Production TypeScript | Passed |
| Targeted ESLint | Passed with no findings |
| Accounting static verifier | Passed: 32 routes and 68-file archive |
| Communication/Admin static verifier | Passed: 20 routes and 45-file archive |
| People Operations static verifier | Passed: 45 routes |
| Performance/Learning static verifier | Passed: 23 routes and 47-file archive |
| Expense/CHA static verifier | Passed: 12 routes and four archives |
| CRM static verifier | Passed: 57 routes and 131-file archive |
| Auth/Misc static verifier | Existing stale failure: requires literal `await auth()` in the root source |
| Full Vitest | Existing blocker: marker-verified staging PostgreSQL offline at `127.0.0.1:56432` |
| Production build | Passed: Prisma generation, Next.js compilation, TypeScript, and 328 pages |
| Build warnings | One accepted non-fatal Turbopack NFT trace warning |
| Public Playwright smoke | Passed `/login` at 390×844: HTTP 200, meaningful content, Night theme, no console/page errors, no error overlay, no horizontal overflow |
| Screenshot | After screenshot: `C:\Users\venka\AppData\Local\Temp\component-refactor-login.png` |
| Diff hygiene | `git diff --check` passed |

The preferred `agent-browser` wrapper was unavailable in the workspace, so
the public smoke used the repository-installed Playwright runtime. No safe
authenticated credentials were supplied. Authenticated Light/Night/Violet
desktop/tablet/mobile matrices and before/after screenshots were therefore not
re-run; the pre-existing UI migration evidence remains authoritative and is
not reclassified by this structural batch.

## Regressions and remaining work

- Functional regressions known: none.
- Visual regressions observed: none in the public Playwright smoke.
- Authenticated visual regressions: not re-measured; existing credential/browser
  blocker remains.
- Remaining uncertain files: 43, retained in
  [component-retention-list.md](component-retention-list.md).
- Existing customer-portal UI migration and CHA/CRM authenticated visual gaps
  remain outside this structural refactor.
