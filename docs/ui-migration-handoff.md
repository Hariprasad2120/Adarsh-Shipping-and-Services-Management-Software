# Monolith UI migration handoff

Last updated: 2026-08-06

## 2026-08-06 CRM to Freight/CHA process handoff flow

Replaced the placeholder Freight Forwarding and CHA `Process` routes with a
real queue-first operational handoff flow from CRM quotations.

Delivered:

- updated `src/modules/crm/approval-workflow.ts` and
  `src/modules/crm/approval-actions.ts` so quotation `Create Booking` now
  queues Freight and CHA work into `PROCESSING_PENDING`, and each module now
  has a dedicated completion action that writes back the real Freight booking
  or CHA job only after processing starts from its `Process` route;
- added `src/modules/crm/quote-process.ts`-driven process queue pages at
  `src/app/(dashboard)/freight-forwarding/process/page.tsx` and
  `src/app/(dashboard)/cha/process/page.tsx` so both modules now show
  quote-only handoff data instead of creating downstream records immediately;
- added detail routes at
  `src/app/(dashboard)/freight-forwarding/process/[quoteId]/page.tsx` and
  `src/app/(dashboard)/cha/process/[quoteId]/page.tsx` so teams open the quote
  from the process queue, choose transaction mode or create the CHA job there,
  and complete the downstream record from that dedicated process surface;
- updated
  `src/modules/freight-forwarding/components/freight-forwarding-create-booking-client.tsx`
  so the Freight create-booking page can run in a process-completion mode with
  quote-prefilled values, a custom title, custom back link, and final
  redirection into the created transaction;
- updated `src/modules/cha/components/create-job-dialog.tsx` and
  `src/app/(dashboard)/cha/jobs/new/new-job-client.tsx` so the page-form CHA
  job creation flow accepts quote-prefilled defaults and can report the created
  job back into the CRM quotation handoff;
- updated `src/modules/crm/components/ApprovalActionBar.tsx` so quotations in
  `BOOKING_CREATED` open the dedicated Freight or CHA process page while the
  record is still waiting in the process queue;
- regenerated `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md`,
  `docs/ui-route-audit.md`, and
  `docs/ui-component-and-style-ownership-audit.md` so the process queue and
  detail routes are reflected in the current migration inventory.

Verification on Thursday, August 6, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/audit-ui-routes.mjs`:
  passed and refreshed the route matrix for the new process detail routes;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/generate-ui-component-style-audit.mjs`:
  passed.

Known limits:

- focused ESLint still fails if `src/modules/cha/components/create-job-dialog.tsx`
  is included because that long-lived file already carries pre-existing
  `react-hooks/set-state-in-effect` and `@typescript-eslint/no-explicit-any`
  violations outside this process-handoff change;
- no authenticated browser runtime is attached in this Codex session, so the
  new queue pages and process detail flows are source-verified and
  type-verified rather than manually browser-verified in Light, Night, and
  Violet themes.

## 2026-08-06 Freight Forwarding and CHA process routes

Added dedicated empty `Process` pages for both Freight Forwarding and CHA so
each module now has a stable route ready for future workflow implementation.

Delivered:

- added `src/app/(dashboard)/freight-forwarding/process/page.tsx` as a
  tokenized Freight Forwarding workspace page with a canonical header, section,
  panel, and empty state;
- added `src/app/(dashboard)/cha/process/page.tsx` as a CHA workspace route
  with the shared CHA route header contract and an empty-state section;
- updated `src/lib/navigation.ts` so both modules expose `Process` in their
  sidebar navigation;
- updated `src/lib/route-labels.ts`,
  `src/modules/cha/components/workspace/cha-workspace.tsx`, and
  `src/modules/cha/components/workspace/cha-workspace.test.tsx` so the new CHA
  route has the correct label and route metadata;
- regenerated `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md`,
  `docs/ui-route-audit.md`, and
  `docs/ui-component-and-style-ownership-audit.md` so both new routes are
  reflected in the current migration inventory.

Verification on Thursday, August 6, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/app/(dashboard)/cha/process/page.tsx' 'src/app/(dashboard)/freight-forwarding/process/page.tsx' 'src/lib/navigation.ts' 'src/lib/route-labels.ts' 'src/modules/cha/components/workspace/cha-workspace.tsx' 'src/modules/cha/components/workspace/cha-workspace.test.tsx'`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/audit-ui-routes.mjs`:
  passed and refreshed the route matrix with the new process routes;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/generate-ui-component-style-audit.mjs`:
  passed.

Known limits:

- no authenticated browser runtime is attached in this Codex session, so the
  new pages are source-verified and type-verified rather than manually checked
  in Light, Night, and Violet themes.

## 2026-08-05 CHA dedicated new-job page

Replaced the popup-first CHA job creation entry points with a dedicated
`/cha/jobs/new` route while keeping the existing create-job form logic as the
single source of truth.

Delivered:

- added `src/app/(dashboard)/cha/jobs/new/page.tsx` and
  `src/app/(dashboard)/cha/jobs/new/new-job-client.tsx` so CHA now has a real
  create-job workspace route with a route header and back-to-jobs action;
- updated `src/modules/cha/components/create-job-dialog.tsx` so the existing
  CHA create-job implementation can render either as the original modal or as a
  full-page surface, preserving the existing form fields, job-type/shipment-type
  creation helpers, draft restore behavior, and server action integration;
- updated `src/modules/cha/components/dashboard-create-job.tsx`,
  `src/app/(dashboard)/cha/page.tsx`, and
  `src/app/(dashboard)/cha/jobs/jobs-client.tsx` so the Dashboard and Jobs
  `New Job` actions now navigate to `/cha/jobs/new` instead of opening the
  popup;
- updated `src/app/(dashboard)/cha/jobs/page.tsx` so legacy
  `/cha/jobs?new=true` requests redirect into `/cha/jobs/new`, preserving old
  deep links and customer-create return flows;
- updated CHA route metadata and breadcrumb labels in
  `src/modules/cha/components/workspace/cha-workspace.tsx`,
  `src/modules/cha/components/workspace/cha-workspace.test.tsx`, and
  `src/lib/route-labels.ts`;
- regenerated `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md`,
  `docs/ui-route-audit.md`, and
  `docs/ui-component-and-style-ownership-audit.md` so the new
  `/cha/jobs/new` route is recorded in the route inventory.

Verification on Wednesday, August 5, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/app/(dashboard)/cha/page.tsx' 'src/app/(dashboard)/cha/jobs/page.tsx' 'src/app/(dashboard)/cha/jobs/jobs-client.tsx' 'src/app/(dashboard)/cha/jobs/new/page.tsx' 'src/app/(dashboard)/cha/jobs/new/new-job-client.tsx' 'src/modules/cha/components/dashboard-create-job.tsx' 'src/modules/cha/components/workspace/cha-workspace.tsx' 'src/modules/cha/components/workspace/cha-workspace.test.tsx' 'src/lib/route-labels.ts'`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/audit-ui-routes.mjs`:
  passed and refreshed the route matrix with the new `/cha/jobs/new` page;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/generate-ui-component-style-audit.mjs`:
  passed.

Known limits:

- focused ESLint still fails if `src/modules/cha/components/create-job-dialog.tsx`
  is included because that long-lived file already carries pre-existing
  `react-hooks/set-state-in-effect` and `@typescript-eslint/no-explicit-any`
  violations outside this routing change;
- no authenticated browser runtime is attached in this Codex session, so the
  new page flow is source-verified and type-verified rather than manually
  browser-verified in Light, Night, and Violet themes.

## 2026-08-05 CRM quotation create-booking operational handoff fix

Fixed the broken CRM quotation `Create Booking` flow so a customer-approved
quotation now launches real downstream operational records instead of only
writing a freight placeholder reference.

Delivered:

- updated `src/modules/crm/approval-workflow.ts` so quote conversion now
  creates a real Freight Forwarding `FREIGHT_BOOKING` draft transaction with
  prefilled customer, enquiry/job reference, port, Incoterm, commodity, and
  internal handoff notes;
- preserved the existing CHA job creation path and now store direct Freight
  transaction linkage (`freightTransactionId` and `freightBookingGroupId`)
  beside the CHA job linkage in the quote workflow conversion snapshot;
- updated `src/modules/crm/components/quotes/lib/types.ts` so the quote
  workflow conversion contract exposes the direct Freight transaction and
  booking-group references;
- updated `src/modules/crm/components/ApprovalActionBar.tsx` so `Create
  Booking` first shows a routing summary dialog, then after conversion exposes
  direct `Process CHA Job` and `Process Freight Booking` actions;
- updated
  `src/modules/freight-forwarding/components/freight-forwarding-workspace-client.tsx`
  so Workspace Home and the transaction registries now expose explicit
  `Process` actions instead of passive text-only next-step hints;
- updated `src/app/(dashboard)/cha/jobs/jobs-client.tsx` so the CHA jobs
  register now exposes a direct `Process` action per row, matching the
  requested downstream workflow handoff more clearly.

Verification on Wednesday, August 5, 2026:

- pending focused ESLint for the touched CRM, Freight Forwarding, and CHA UI
  files in this session.

Known limits:

- no authenticated browser runtime is attached in this Codex session, so the
  repaired handoff is source-verified only and still needs manual browser
  verification in Light, Night, and Violet themes;
- the Freight Forwarding handoff currently creates a prefilled HBL-side draft
  transaction and opens the existing transaction detail page for continuation;
  it does not yet introduce the later dedicated post-conversion booking wizard
  the user plans to design.

## 2026-08-05 CRM quote detail submit action visibility

Kept the CRM quote detail submit action in the main toolbar so users can always
see where quote submission lives alongside the other top-row actions.

Delivered:

- updated `src/modules/crm/components/quotes/QuoteDetailsPage.tsx` so the
  `Submit For Approval` control now stays in the visible toolbar next to Edit,
  Mails, Share, and PDF/Print;
- updated the same header panel to allow visible overflow so the three-dot
  dropdown menu can render outside the toolbar card instead of being folded
  back into the panel bounds;
- updated `src/lib/rbac.ts` so the migrated CRM quote workflow permissions map
  back to the older seeded `crm.invoice.manage` grant, allowing current CRM
  users to submit draft quotes for approval without waiting for a role reseed;
- updated `src/app/(dashboard)/crm/quotes/[quoteId]/page.tsx` so the submit
  dialog manager dropdown now lists active org users with `Manager` and
  `Admin` roles, plus platform admins, instead of only the narrower approval
  permission lookup;
- updated `src/modules/crm/components/quotes/QuoteDetailsPage.tsx` so the
  quote header card adds extra bottom padding and a higher stacking context
  while the three-dot actions menu is open, keeping Delete and Workflow
  preferences fully visible;
- updated the same quote detail component so the left-rail filters now stay
  hidden until the quote-view dropdown is opened, and the collapsed rail uses
  a dedicated compact layout instead of the broken squeezed header state;
- preserved the existing CRM dialog and approval server action flow, but now
  disable the button instead of removing it when the quote is not a submittable
  draft or the current user lacks submit access.

Verification on Wednesday, August 5, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/lib/rbac.ts' 'src/modules/crm/components/quotes/QuoteDetailsPage.tsx' 'src/app/(dashboard)/crm/quotes/[quoteId]/page.tsx'`:
  passed.

Known limits:

- no authenticated browser runtime is attached in this Codex session, so this
  toolbar update is source-verified only and still needs manual browser
  verification in Light, Night, and Violet themes.

## 2026-08-05 CRM quote detail logistics section

Added the missing logistics summary block to the CRM quote details workspace so
users can see the shipping context recorded during quote creation without going
back into edit mode.

Delivered:

- updated `src/app/(dashboard)/crm/quotes/[quoteId]/page.tsx` so the detail
  serializer now forwards `portOfLoadingCountry` and
  `portOfDestinationCountry` in addition to the existing logistics fields;
- updated `src/modules/crm/components/quotes/lib/types.ts` so the quote detail
  contract includes the full logistics shape used by the detail view;
- updated `src/modules/crm/components/quotes/QuoteDetailsPage.tsx` so the
  page renders a dedicated `Logistics Details` card with port, country,
  Incoterm, container, commodity, and weight values using the existing shared
  detail-card treatment.

Verification on Wednesday, August 5, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/app/(dashboard)/crm/quotes/[quoteId]/page.tsx' 'src/modules/crm/components/quotes/QuoteDetailsPage.tsx' 'src/modules/crm/components/quotes/lib/types.ts'`:
  passed.

Known limits:

- no authenticated browser runtime is attached in this Codex session, so the
  logistics section is source-verified and lint-verified rather than manually
  browser-verified in Light, Night, and Violet themes.

## 2026-08-05 CRM quote detail layout fix

Refined the CRM quote detail presentation so the route behaves like a normal
Monolith CRM workspace instead of rendering a second full-screen shell inside
the existing page frame.

Delivered:

- updated `src/modules/crm/components/quotes/QuoteDetailsPage.tsx` so the page
  now uses a contained two-column workspace layout instead of nested
  `min-h-screen` shells;
- moved the left-side quote register onto a standard CRM panel treatment and
  replaced the vertical collapsed `QUOTE LIST` label with a compact horizontal
  state that no longer reads like a broken UI;
- softened the quote detail header scale and spacing so the title, status, and
  total sit inside a shared CRM surface rather than a custom route-wide chrome;
- converted the major quote detail sections to shared CRM composition patterns,
  so versioning, workflow, summary panels, and the detail/activity workspace
  now flow through `CrmSection`, `CrmPanel`, and shared CRM status surfaces;
- replaced the raw manager approval `<select>` with `CrmSelect` to keep the
  submission dialog on the shared CRM form-control contract.

Verification on Wednesday, August 5, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/modules/crm/components/quotes/QuoteDetailsPage.tsx'`:
  passed.

Known limits:

- no authenticated browser runtime is attached in this Codex session, so the
  quote detail fix is source-verified and lint-verified rather than manually
  browser-verified in Light, Night, and Violet themes.

## 2026-08-05 Accounting quotations workspace redesign

Reworked the Accounting quotations route into a cleaner split workspace that
keeps the quotation register and selected quotation detail in one place while
preserving the existing quotation and note workflows.

Delivered:

- updated `src/app/(dashboard)/accounting/quotations/page.tsx` so the route now
  resolves an active quotation from `?quote=` and loads the permission-aware
  quotation detail payload needed for embedded actions;
- added `src/app/(dashboard)/accounting/quotations/quotation-presentation.ts`
  to share the serialized quotation presentation shape between the embedded
  workspace detail and the standalone quotation detail route;
- rewrote `src/app/(dashboard)/accounting/quotations/quotations-client.tsx`
  into a register-plus-detail workspace with a searchable left-side quotation
  list, a cleaner selected quotation summary surface, and the existing note
  management flow still available on the same route;
- refreshed
  `src/app/(dashboard)/accounting/quotations/[id]/quotation-detail-client.tsx`
  so the detail surface now supports both the standalone route and the
  embedded quotations workspace while continuing to use the existing Accounting
  approval, dispatch, decision, duplication, and conversion actions;
- updated `src/app/(dashboard)/accounting/quotations/[id]/page.tsx` so the
  standalone detail route shares the same serialized quotation presentation and
  now requests the quotation-create capability required for duplication;
- added the quotations workspace layout styles to
  `src/styles/modules/accounting.css` using Accounting module tokens and
  canonical Monolith surfaces instead of route-local ad hoc styling;
- updated `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md` with the current source
  verification status for this quotations batch.

Verification on Wednesday, August 5, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/app/(dashboard)/accounting/quotations/page.tsx' 'src/app/(dashboard)/accounting/quotations/quotations-client.tsx' 'src/app/(dashboard)/accounting/quotations/quotation-presentation.ts' 'src/app/(dashboard)/accounting/quotations/[id]/page.tsx' 'src/app/(dashboard)/accounting/quotations/[id]/quotation-detail-client.tsx'`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  passed in this session;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; git diff --check -- 'src/app/(dashboard)/accounting/quotations/page.tsx' 'src/app/(dashboard)/accounting/quotations/quotations-client.tsx' 'src/app/(dashboard)/accounting/quotations/quotation-presentation.ts' 'src/app/(dashboard)/accounting/quotations/[id]/page.tsx' 'src/app/(dashboard)/accounting/quotations/[id]/quotation-detail-client.tsx' 'src/styles/modules/accounting.css'`:
  passed, aside from normal Windows line-ending warnings in this worktree.

Known limits:

- no authenticated browser runtime is attached in this Codex session, so the
  redesigned quotations workspace is source-verified and lint/typecheck-verified
  rather than manually browser-verified in Light, Night, and Violet themes;
- the new quotations workspace intentionally prioritizes the important
  quotation actions and keeps less-frequent note work under the existing
  secondary tab instead of duplicating every note action into the split detail
  surface.

## 2026-08-05 Shared document dropzone and Freight Forwarding attachment panel

Added a new shared document-upload dropzone and applied it to the Freight
Forwarding Reference document panel.

Delivered:

- added `src/components/forms/file-upload/document-dropzone-field.tsx` as a
  new shared Monolith upload surface with drag-and-drop, browse, and selected
  file preview support;
- exported the component through `src/components/monolith/index.ts` and added a
  live specimen to `src/components/monolith/catalogue/shared-catalogue.tsx`;
- added the shared dropzone styling to `src/styles/monolith-system.css` using
  Monolith tokens and the existing yellow highlight gradient language;
- updated
  `src/modules/freight-forwarding/components/freight-forwarding-booking-page.tsx`
  so the Reference document panel now uses the shared dropzone in place of the
  raw browser file input while keeping the Attachment name field above it;
- added the Freight Forwarding layout hook for the new dropzone in
  `src/styles/modules/freight-forwarding.css`.

Verification on Wednesday, August 5, 2026:

- pending focused ESLint, TypeScript, design-system verification, and targeted
  `git diff --check` after the component and Freight Forwarding integration
  patch in this session.

Known limits:

- no authenticated browser runtime is attached in this Codex session, so the
  new dropzone is source-verified and still needs manual browser verification
  in Light, Night, and Violet themes;
- the Freight Forwarding Reference document panel still treats the selected
  file as local client state only because the booking attachment upload
  backend is not yet wired.

## 2026-08-05 Freight Forwarding dedicated create-booking page

Replaced the popup-first Freight Forwarding booking start with a dedicated
create-booking page that lets users choose MBL, HBL, or both and fill the
matching transaction details before records are created.

Delivered:

- rewrote `src/app/(dashboard)/freight-forwarding/create-booking/page.tsx` so
  `/freight-forwarding/create-booking` is now a real workspace route instead of
  an automatic redirect, with server-loaded Freight Forwarding reference data
  and optional `?mode=` preselection;
- updated `src/app/(dashboard)/freight-forwarding/create-booking/[documentType]/page.tsx`
  so legacy `/create-booking/mbl` and `/create-booking/hbl` entry points now
  redirect into the new dedicated page with the correct transaction mode;
- added
  `src/modules/freight-forwarding/components/freight-forwarding-create-booking-client.tsx`
  as the new page client that keeps transaction mode selection on-page and
  renders MBL, HBL, or both transaction-detail forms in one workflow;
- extended
  `src/modules/freight-forwarding/components/freight-forwarding-booking-page.tsx`
  so the shared Freight Forwarding form can be reused as an embedded
  create-booking editor without its own standalone header or save action;
- added `createFreightBookingWithDetailsAction` in
  `src/modules/freight-forwarding/actions.ts` so the dedicated page can create
  fully populated MBL/HBL transaction records directly instead of first
  creating empty drafts from the older modal flow;
- updated `src/modules/freight-forwarding/components/freight-forwarding-workspace.tsx`,
  `src/modules/freight-forwarding/components/freight-forwarding-workspace-client.tsx`,
  and `src/app/(dashboard)/freight-forwarding/settings/page.tsx` so every
  Freight Forwarding `Create Booking` entry point now opens the dedicated page
  instead of the previous popup-based start path;
- updated `src/styles/modules/freight-forwarding.css` with dedicated layout
  styling for the new mode selector and stacked create-booking transaction
  sections;
- updated `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md` with the current source
  verification status for this create-booking batch.

Verification on Wednesday, August 5, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/app/(dashboard)/freight-forwarding/create-booking/page.tsx' 'src/app/(dashboard)/freight-forwarding/create-booking/[documentType]/page.tsx' 'src/app/(dashboard)/freight-forwarding/settings/page.tsx' 'src/modules/freight-forwarding/actions.ts' 'src/modules/freight-forwarding/service.ts' 'src/modules/freight-forwarding/components/freight-forwarding-booking-page.tsx' 'src/modules/freight-forwarding/components/freight-forwarding-create-booking-client.tsx' 'src/modules/freight-forwarding/components/freight-forwarding-workspace.tsx' 'src/modules/freight-forwarding/components/freight-forwarding-workspace-client.tsx' 'src/modules/freight-forwarding/components/index.ts'`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  still fails on the repo's existing
  `src/modules/crm/components/masters/crm-masters-workspace.tsx` errors where
  `"xl"` is not assignable to `WorkspaceDialogSize`; those failures predate
  this Freight Forwarding batch;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run design-system:verify`:
  still fails on the repo's existing unregistered visual export
  `src/components/ui/button.tsx#ButtonLink`, which predates this batch;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; git diff --check -- 'src/app/(dashboard)/freight-forwarding/create-booking/page.tsx' 'src/app/(dashboard)/freight-forwarding/create-booking/[documentType]/page.tsx' 'src/app/(dashboard)/freight-forwarding/settings/page.tsx' 'src/modules/freight-forwarding/actions.ts' 'src/modules/freight-forwarding/service.ts' 'src/modules/freight-forwarding/components/freight-forwarding-booking-page.tsx' 'src/modules/freight-forwarding/components/freight-forwarding-create-booking-client.tsx' 'src/modules/freight-forwarding/components/freight-forwarding-workspace.tsx' 'src/modules/freight-forwarding/components/freight-forwarding-workspace-client.tsx' 'src/modules/freight-forwarding/components/index.ts' 'src/styles/modules/freight-forwarding.css'`:
  passed, aside from normal Windows line-ending warnings in this worktree.

Known limits:

- no authenticated browser runtime is attached in this Codex session, so the
  new dedicated create-booking route is source-verified and lint-verified
  rather than manually browser-verified in Light, Night, and Violet themes;
- the current create-booking page now creates fully populated draft
  transactions, but it does not yet add new field-level validation beyond the
  existing form-control constraints already present in the shared Freight
  Forwarding booking form.

## 2026-08-05 Freight Forwarding data cleanup route

Added a dedicated Freight Forwarding settings sub-route for data management and
an admin-only delete-all action for Freight Forwarding records.

Delivered:

- added `src/app/(dashboard)/freight-forwarding/settings/data/page.tsx` as a
  `Data management` workspace under Freight Forwarding settings, with live
  transaction, booking-group, and MBL/HBL split counts;
- added
  `src/app/(dashboard)/freight-forwarding/settings/data/delete-freight-forwarding-data-action.tsx`
  for the client-side destructive action flow with a required confirmation
  phrase of `DELETE ALL FREIGHT DATA`;
- added `deleteAllFreightForwardingDataAction` in
  `src/modules/freight-forwarding/actions.ts` so the purge deletes all
  `FREIGHT_BOOKING` transactions for the current organisation plus their
  linked `crmApprovalLog` records, then revalidates the Freight Forwarding
  workspace, register, settings, and booking routes;
- updated `src/app/(dashboard)/freight-forwarding/settings/page.tsx` so the
  main Freight Forwarding settings page now links to the new `Data` route;
- updated `src/lib/route-labels.ts` and regenerated
  `docs/ui-route-audit.md`, `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md`, and
  `docs/ui-component-and-style-ownership-audit.md` so the new route is
  reflected in the route inventory.

Verification on Wednesday, August 5, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/modules/freight-forwarding/actions.ts' 'src/app/(dashboard)/freight-forwarding/settings/page.tsx' 'src/app/(dashboard)/freight-forwarding/settings/data/page.tsx' 'src/app/(dashboard)/freight-forwarding/settings/data/delete-freight-forwarding-data-action.tsx' 'src/lib/route-labels.ts'`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/audit-ui-routes.mjs`:
  passed and refreshed the migration matrix with the new
  `/freight-forwarding/settings/data` route;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/generate-ui-component-style-audit.mjs`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; git diff --check -- 'src/modules/freight-forwarding/actions.ts' 'src/app/(dashboard)/freight-forwarding/settings/page.tsx' 'src/app/(dashboard)/freight-forwarding/settings/data/page.tsx' 'src/app/(dashboard)/freight-forwarding/settings/data/delete-freight-forwarding-data-action.tsx' 'src/lib/route-labels.ts'`:
  passed, aside from normal Windows line-ending warnings in this worktree.

Known limits:

- no authenticated browser runtime is attached in this Codex session, so the
  new Freight Forwarding data route is source-verified and lint-verified
  rather than browser-verified across Light, Night, and Violet themes;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`
  still fails on pre-existing repo compile errors outside this page batch,
  including:
  `src/modules/crm/components/masters/crm-masters-workspace.tsx` dialog-size
  `"xl"` issues,
  `src/modules/freight-forwarding/components/freight-forwarding-booking-page.tsx`
  `ContainerRow` resolution,
  and existing `freight-forwarding-workspace-client.tsx` symbol and button
  variant errors;
- the delete-all action is intentionally restricted to users who satisfy
  `admin.org.manage`, so non-admin Freight Forwarding users can review the
  counts on the page but cannot run the destructive purge.

## 2026-08-05 Module settings route expansion

Added first-class settings routes for modules that previously exposed
operational workspaces without a dedicated settings destination.

Delivered:

- added `src/app/(dashboard)/attendance/settings/page.tsx` with an Attendance
  settings workspace that links into attendance controls for overtime,
  leave-management, biometric sync, and month-end reporting;
- added `src/app/(dashboard)/ams/settings/page.tsx` and
  `src/app/(dashboard)/lms/settings/page.tsx` so the Performance/Learning
  workspace now includes dedicated settings overviews for appraisal governance
  and learning-program administration;
- added `src/app/(dashboard)/crm/settings/page.tsx` and
  `src/app/(dashboard)/freight-forwarding/settings/page.tsx` so CRM and
  Freight Forwarding now expose settings workspaces tied to their existing
  operational control surfaces;
- updated `src/lib/navigation.ts`, `src/lib/route-labels.ts`,
  `src/modules/people/components/people-workspace.tsx`,
  `src/modules/performance/components/performance-workspace.tsx`, and
  `src/modules/crm/components/workspace/crm-workspace.tsx` so the new routes
  appear as native module destinations with the correct header metadata and
  sidebar labels;
- regenerated `docs/ui-route-audit.md`,
  `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md`, and
  `docs/ui-component-and-style-ownership-audit.md` after the route inventory
  changed.

Verification on Wednesday, August 5, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/app/(dashboard)/attendance/settings/page.tsx' 'src/app/(dashboard)/ams/settings/page.tsx' 'src/app/(dashboard)/lms/settings/page.tsx' 'src/app/(dashboard)/crm/settings/page.tsx' 'src/app/(dashboard)/freight-forwarding/settings/page.tsx' 'src/lib/navigation.ts' 'src/lib/route-labels.ts' 'src/modules/people/components/people-workspace.tsx' 'src/modules/performance/components/performance-workspace.tsx' 'src/modules/crm/components/workspace/crm-workspace.tsx'`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/audit-ui-routes.mjs`:
  passed and refreshed the migration matrix with the new settings routes;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/generate-ui-component-style-audit.mjs`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; git diff --check -- 'src/app/(dashboard)/attendance/settings/page.tsx' 'src/app/(dashboard)/ams/settings/page.tsx' 'src/app/(dashboard)/lms/settings/page.tsx' 'src/app/(dashboard)/crm/settings/page.tsx' 'src/app/(dashboard)/freight-forwarding/settings/page.tsx' 'src/lib/navigation.ts' 'src/lib/route-labels.ts' 'src/modules/people/components/people-workspace.tsx' 'src/modules/performance/components/performance-workspace.tsx' 'src/modules/crm/components/workspace/crm-workspace.tsx'`:
  passed, aside from normal Windows line-ending warnings in this worktree.

Known limits:

- no authenticated browser runtime is attached in this Codex session, so the
  new settings routes are source-verified and lint-verified rather than
  browser-verified across Light, Night, and Violet themes;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`
  still fails on the repo's existing
  `src/modules/crm/components/masters/crm-masters-workspace.tsx` errors where
  `"xl"` is not assignable to `WorkspaceDialogSize`; those failures predate
  this batch and were left unchanged here;
- the regenerated static audit still classifies the new AMS, LMS, CRM, and
  Freight Forwarding settings routes as non-compliant heuristically, so those
  routes still need manual runtime review and any follow-up component-audit
  reconciliation if the team wants the static classification fully aligned.

## 2026-08-05 Freight Forwarding transaction detail spacing regression

Adjusted the embedded Freight Forwarding transaction detail surface so it keeps
the intended panel padding without oversizing the shared form controls.

Delivered:

- updated `src/styles/modules/freight-forwarding.css` so
  `.ff-booking-content-embedded` uses a roomier embedded-only wrapper padding;
- removed the embedded detail override that was increasing
  `.mnx-field-control` and `.mnx-field-textarea` padding beyond the canonical
  Monolith field height;
- added embedded-only panel-body padding selectors for the Freight Forwarding
  detail surface so section content sits correctly inside each panel while the
  standalone `/freight-forwarding/create-booking` route is unchanged.

Verification on Wednesday, August 5, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; git diff --check -- 'src/styles/modules/freight-forwarding.css'`:
  passed.

Known limits:

- no authenticated browser runtime is attached in this Codex session, so the
  updated Freight Forwarding detail spacing is source-verified and still needs
  manual browser verification in Light, Night, and Violet themes.

## 2026-08-05 Freight Forwarding transaction field padding

Increased the internal padding of the form controls on the embedded Freight
Forwarding transaction details page so the detail editor fields read more
comfortably.

Delivered:

- updated `src/styles/modules/freight-forwarding.css` so the embedded
  transaction-detail variant applies larger padding to
  `.mnx-field-control` and `.mnx-field-textarea`;
- kept the padding override scoped to `.ff-booking-page-embedded` so the
  standalone create-booking route is unchanged.

Verification on Wednesday, August 5, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; git diff --check -- 'src/styles/modules/freight-forwarding.css' 'docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md' 'docs/ui-migration-handoff.md'`:
  passed, aside from normal Windows line-ending warnings in this worktree.

Known limits:

- no authenticated browser runtime is attached in this Codex session, so the
  updated field padding is source-verified and still needs manual browser
  verification in Light, Night, and Violet themes.

## 2026-08-05 Freight Forwarding transaction detail design-system polish

Adjusted the embedded Freight Forwarding transaction detail editor so it reads
more like a Monolith detail surface and less like the full create-booking page.

Delivered:

- updated `src/modules/freight-forwarding/components/freight-forwarding-booking-page.tsx`
  so the embedded transaction-detail variant now applies dedicated wrapper
  classes instead of sharing the exact same presentation hooks as the
  standalone create-booking page;
- updated `src/styles/modules/freight-forwarding.css` so the embedded detail
  variant gets extra padding around the details content and lighter-weight
  section, panel, and field-label typography.

Verification on Wednesday, August 5, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/modules/freight-forwarding/components/freight-forwarding-booking-page.tsx'`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/styles/modules/freight-forwarding.css'`:
  returns the repo's existing "File ignored because no matching configuration
  was supplied" warning, so the stylesheet is not directly linted by the
  current ESLint setup;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; git diff --check -- 'src/modules/freight-forwarding/components/freight-forwarding-booking-page.tsx' 'src/styles/modules/freight-forwarding.css' 'docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md' 'docs/ui-migration-handoff.md'`:
  passed, aside from normal Windows line-ending warnings in this worktree.

Known limits:

- no authenticated browser runtime is attached in this Codex session, so the
  updated transaction details page is source-verified and still needs manual
  browser verification in Light, Night, and Violet themes.

## 2026-08-05 Freight Forwarding dual-detail switch

Added an in-page switch on the dedicated Freight Forwarding transaction detail
screens so bookings created with both MBL and HBL can move between the linked
detail views without going back to the register.

Delivered:

- updated `src/modules/freight-forwarding/components/freight-forwarding-transaction-detail-client.tsx`
  so the shared detail shell now resolves the current booking group and shows
  `MBL Details` and `HBL Details` actions only when the booking mode is
  `BOTH` and both linked transactions exist;
- kept MBL-only and HBL-only transactions unchanged, so one-sided bookings do
  not render the new detail switch.

Verification on Wednesday, August 5, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/modules/freight-forwarding/components/freight-forwarding-transaction-detail-client.tsx'`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; git diff --check -- 'src/modules/freight-forwarding/components/freight-forwarding-transaction-detail-client.tsx' 'docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md' 'docs/ui-migration-handoff.md'`:
  passed, aside from normal Windows line-ending warnings in this worktree.

Known limits:

- no authenticated browser runtime is attached in this Codex session, so the
  new switch is source-verified and will need manual browser verification in
  Light, Night, and Violet themes.

## 2026-08-05 Freight Forwarding workspace data-table alignment

Aligned the Freight Forwarding workspace booking registers to the production
operational data-table system so the Home, MBL, and HBL lists now use the same
Monolith table language as other operational workspaces.

Delivered:

- updated
  `src/modules/freight-forwarding/components/freight-forwarding-workspace-client.tsx`
  so Workspace Home now renders booking groups with
  `OperationalDataTable`, `OperationalTable`, `OperationalPrimaryCell`,
  `OperationalStatus`, and `OperationalLinkedRow` instead of a custom stacked
  button list;
- updated the same client so the MBL and HBL registry tabs now use the same
  operational table primitives for transaction number, customer, booking link,
  status, and last-updated metadata;
- removed the Freight Forwarding module CSS that only supported the older
  custom booking-list/table presentation and kept the create-booking dialog on
  a narrowly-scoped module-owned style hook.

Verification on Wednesday, August 5, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/modules/freight-forwarding/components/freight-forwarding-workspace-client.tsx'`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; git diff --check -- 'src/modules/freight-forwarding/components/freight-forwarding-workspace-client.tsx' 'src/styles/modules/freight-forwarding.css'`:
  passed.

Known limits:

- no authenticated browser runtime is attached in this Codex session, so the
  updated Freight Forwarding tables are source-verified and lint-verified
  rather than browser-verified across Light, Night, and Violet themes;
- this pass changes the booking-register presentation only and does not alter
  Freight Forwarding business logic, booking creation flow, or transaction
  detail routing.

## 2026-08-05 Freight Forwarding dedicated transaction detail pages

Moved Freight Forwarding transaction editing out of the MBL/HBL register pages
so the list views stay operational and the transaction form opens on its own
page.

Delivered:

- updated `src/modules/freight-forwarding/components/freight-forwarding-workspace-client.tsx`
  so the MBL and HBL sidebar tabs behave as transaction registers and open a
  dedicated route when a row is selected;
- added
  `src/modules/freight-forwarding/components/freight-forwarding-transaction-detail-client.tsx`
  as the shared transaction detail shell for viewing, saving, connecting, and
  disconnecting MBL/HBL records;
- added `src/app/(dashboard)/freight-forwarding/mbl/[transactionId]/page.tsx`
  and `src/app/(dashboard)/freight-forwarding/hbl/[transactionId]/page.tsx` so
  each transaction now has a dedicated view/update page;
- updated the freight forwarding route pages so the list screens only load the
  data needed for the register and no longer mount the booking editor inline at
  the bottom.

Verification on Wednesday, August 5, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/modules/freight-forwarding/components/freight-forwarding-workspace-client.tsx' 'src/modules/freight-forwarding/components/freight-forwarding-transaction-detail-client.tsx' 'src/modules/freight-forwarding/components/index.ts' 'src/app/(dashboard)/freight-forwarding/page.tsx' 'src/app/(dashboard)/freight-forwarding/mbl/page.tsx' 'src/app/(dashboard)/freight-forwarding/hbl/page.tsx' 'src/app/(dashboard)/freight-forwarding/mbl/[transactionId]/page.tsx' 'src/app/(dashboard)/freight-forwarding/hbl/[transactionId]/page.tsx'`:
  passed;

Known limits:

- no authenticated browser runtime is attached in this Codex session, so the
  new Freight Forwarding detail-route flow is source-verified and lint-verified
  rather than browser-verified in Light, Night, and Violet themes;
- the separate request to restyle the Freight Forwarding booking registers to
  more closely match the CHA jobs table is not included in this specific pass.

## 2026-08-05 CRM Masters upload workflow expansion

Expanded the CRM Masters workspace from static placeholder tabs into a working
client-side master-register workflow for the non-item master tabs.

Delivered:

- rewrote `src/modules/crm/components/masters/crm-masters-workspace.tsx` so
  Agent, Charge, Port, State, Terminal, and Vessel masters now share one
  structured master-register flow instead of separate placeholder panels;
- added workbook parsing with `xlsx`, first-sheet ingestion, source-header
  discovery, and an explicit field-mapping dialog before import proceeds;
- added a live import-progress dialog with animated progress, rolling
  success/failed/skipped counts, row-level remarks, and a completion summary;
- persisted the latest client-side import run per master tab so users can still
  review counts and logs after closing the modal;
- added `Add Entry` for every structured master tab, with a single-entry dialog
  generated from the active master headings;
- kept `Item Master` on the existing dedicated item register while the other
  master tabs now use the new shared import/export/add-entry workflow;
- updated `src/styles/modules/crm.css` with dedicated Masters workflow styles
  for mapping, progress, result cards, logs, and single-entry form layouts.

Verification on Wednesday, August 5, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/modules/crm/components/masters/crm-masters-workspace.tsx'`:
  passed;
- targeted `git diff --check` for
  `src/modules/crm/components/masters/crm-masters-workspace.tsx` and
  `src/styles/modules/crm.css`:
  passed, aside from the normal Windows line-ending warnings in this worktree.

Known limits:

- this pass is fully client-side: imported records, logs, and single-entry
  additions live in browser state and are not yet persisted through a CRM API or
  database-backed master-data service;
- workbook parsing currently uses the first sheet only and assumes header-driven
  tabular data;
- there is no authenticated browser runtime attached in this Codex session, so
  the new import dialogs and progress animation are source-verified and
  lint-verified rather than browser-verified in Light, Night, and Violet themes.

## 2026-08-05 CRM quotation manager-customer approval workflow and destination conversion

Redesigned the CRM quotation detail experience and replaced the older generic
quote approval path with an explicit manager approval stage, customer decision
capture, and downstream booking/job conversion tracking.

Delivered:

- updated `src/modules/crm/approval-workflow.ts` and
  `src/modules/crm/approval-actions.ts` so CRM quotations now move through:
  `DRAFT` -> `PENDING_MANAGER_APPROVAL` -> `PENDING_CUSTOMER_APPROVAL` ->
  `CUSTOMER_APPROVED` -> `BOOKING_CREATED`, while both manager rejection and
  customer rejection return the record to `DRAFT` with structured remarks,
  actor, and timestamp metadata stored in the quotation snapshot;
- updated `src/app/(dashboard)/crm/quotes/[quoteId]/page.tsx`,
  `src/modules/crm/components/ApprovalActionBar.tsx`, and
  `src/modules/crm/components/quotes/QuoteDetailsPage.tsx` so the quotation
  detail page now shows clearer workflow sections for manager approval details,
  customer approval details, pending actions, notifications, audit summary, and
  booking/job conversion status, with only valid actions exposed for the
  current quotation state;
- updated quote status typing and filter data in
  `src/modules/crm/components/quotes/lib/types.ts`,
  `src/modules/crm/components/quotes/lib/quote-list-data.ts`, and
  `src/modules/crm/components/quotes/QuotesIndexPage.tsx` so the CRM quotation
  list now understands the new manager/customer approval states and booking
  conversion state instead of only the older generic labels;
- wired `Create Booking` for customer-approved quotations so Customs Clearance
  conversions create a real CHA job through the existing CHA service with
  generated CHA job numbers, while Freight Forwarding conversions create a
  persisted freight booking placeholder record inside the quotation snapshot;
- updated `src/app/(dashboard)/freight-forwarding/page.tsx` and
  `src/modules/freight-forwarding/components/freight-forwarding-workspace.tsx`
  so the Freight Forwarding module now lists those testing-phase converted
  booking placeholders and exposes a visible `Process Booking` action that is
  intentionally disabled until the dedicated Freight Forwarding booking form is
  implemented.

Verification on Wednesday, August 5, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/modules/crm/approval-workflow.ts' 'src/modules/crm/approval-actions.ts' 'src/app/(dashboard)/crm/quotes/[quoteId]/page.tsx' 'src/modules/crm/components/ApprovalActionBar.tsx' 'src/modules/crm/components/quotes/QuoteDetailsPage.tsx' 'src/modules/crm/components/quotes/QuotesIndexPage.tsx' 'src/modules/crm/components/quotes/lib/types.ts' 'src/modules/crm/components/quotes/lib/quote-list-data.ts' 'src/modules/freight-forwarding/components/freight-forwarding-workspace.tsx' 'src/app/(dashboard)/freight-forwarding/page.tsx'`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; git diff --check -- 'src/modules/crm/approval-workflow.ts' 'src/modules/crm/approval-actions.ts' 'src/app/(dashboard)/crm/quotes/[quoteId]/page.tsx' 'src/modules/crm/components/ApprovalActionBar.tsx' 'src/modules/crm/components/quotes/QuoteDetailsPage.tsx' 'src/modules/crm/components/quotes/QuotesIndexPage.tsx' 'src/modules/crm/components/quotes/lib/types.ts' 'src/modules/crm/components/quotes/lib/quote-list-data.ts' 'src/modules/freight-forwarding/components/freight-forwarding-workspace.tsx' 'src/app/(dashboard)/freight-forwarding/page.tsx'`:
  passed aside from the normal Windows CRLF warnings in this worktree.

Known limits:

- no authenticated browser runtime is attached in this Codex session, so the
  redesigned quotation detail route and the Freight Forwarding starter list are
  source-verified, lint-verified, and type-verified rather than manually
  browser-verified in Light, Night, and Violet themes;
- Freight Forwarding still does not have its final booking form or persisted
  operational booking model yet, so `Process Booking` is intentionally a
  visible disabled placeholder while the testing-phase booking list is derived
  from approved quotation conversion metadata;
- the older generic quote status values such as `PENDING_APPROVAL`,
  `APPROVED`, `SENT`, `CUSTOMER_VIEWED`, `ACCEPTED`, and `INVOICED` are still
  preserved in legacy helper paths for backward compatibility, but the updated
  quotation detail and index views normalize them into the new manager/customer
  workflow states.

## 2026-08-05 Freight forwarding booking workspace

Added a real Freight Forwarding booking route at
`/freight-forwarding/create-booking`, wired the existing `Create Booking`
workspace action to that route, and built the booking screen around canonical
Monolith workspace panels and form controls instead of a route-local visual
one-off.

Delivered:

- added `src/app/(dashboard)/freight-forwarding/create-booking/page.tsx` and
  `src/modules/freight-forwarding/components/freight-forwarding-booking-page.tsx`
  so the Freight Forwarding module now opens a booking worksheet that follows
  the provided PDF structure for shipment details, liner details, voyage
  details, party details, agent details, cargo/container details, attachments,
  and notes;
- added MBL and HBL side tabs in the booking workspace so users can switch the
  active bill-of-lading workflow while keeping the rest of the booking sheet in
  the same operational context;
- added `src/modules/freight-forwarding/booking-reference.ts` to centralize
  dropdown content built from existing in-repo references plus verified public
  shipping references for Incoterms, common container types, and freight-term
  labels;
- added `src/styles/modules/freight-forwarding.css` and imported it from
  `src/app/globals.css` so the new freight-forwarding layout has a dedicated
  module style owner instead of relying on compatibility CSS.

Verification on Wednesday, August 5, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/modules/freight-forwarding/booking-reference.ts' 'src/modules/freight-forwarding/components/freight-forwarding-booking-page.tsx' 'src/modules/freight-forwarding/components/freight-forwarding-workspace.tsx' 'src/app/(dashboard)/freight-forwarding/create-booking/page.tsx'`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; git diff --check -- 'src/modules/freight-forwarding/booking-reference.ts' 'src/modules/freight-forwarding/components/freight-forwarding-booking-page.tsx' 'src/modules/freight-forwarding/components/freight-forwarding-workspace.tsx' 'src/modules/freight-forwarding/components/index.ts' 'src/app/(dashboard)/freight-forwarding/create-booking/page.tsx' 'src/styles/modules/freight-forwarding.css' 'src/app/globals.css'`:
  passed aside from normal Windows CRLF warnings;
- full repo TypeScript verification could not be used as the success criterion
  for this batch because it is currently blocked by pre-existing CRM compile
  issues unrelated to the Freight Forwarding module, including missing
  `@/modules/crm/components/ApprovalActionBar` imports and existing
  `approval-workflow.ts` errors.

Known limits:

- no authenticated browser runtime is attached in this Codex session, so the
  new booking route is source-verified and lint-verified rather than
  browser-verified across Light, Night, and Violet themes;
- the `Create` action on the booking page is still intentionally non-persistent,
  because this pass focused on the route, layout, and field coverage requested
  from the PDF and did not introduce a new booking database workflow.

## 2026-08-05 CRM freight/customs split-rate quotation workflow

Split the CRM service-enquiry pricing flow so freight forwarding and customs
clearance rates are now managed as department-owned rate sets, and wired the
CRM quote flow to create versioned quotations from those rate sets instead of
overwriting the last quote in place.

Delivered:

- added `src/modules/crm/rate-workflow.ts` as a shared workflow helper for
  freight-only, customs-only, combined, and newly-added-only quote modes,
  including department submission tracking and quote-version lineage metadata;
- added
  `src/modules/crm/components/service-enquiries/service-rate-workflow-panel.tsx`
  and replaced the duplicated inline worksheets in
  `src/app/(dashboard)/crm/enquiries/[id]/enquiry-detail-client.tsx` and
  `src/app/(dashboard)/crm/leads/[id]/lead-detail-wrapper.tsx` so the active
  pricing UI now exposes only:
  `Ocean Freight`, `CFS Charges`, `VGM Charges`,
  `Customs Clearance Charges`, `DO Charges`, and `BL Charges`;
- updated the freight-forwarding and customs-clearance queue detail routes to
  pass department context into the shared enquiry detail client, so each queue
  can restrict rate entry to its own department while still showing pending and
  recreate-quotation states;
- updated `saveEnquiryRatesAction` in `src/modules/crm/actions.ts` so each
  department saves only its own rates, the merged enquiry snapshot is kept for
  compatibility, service-enquiry pricing snapshots are department-specific, and
  lead timeline events now identify which department updated rates;
- updated `src/app/(dashboard)/crm/quotes/new/page.tsx`,
  `src/modules/crm/components/quotes/NewQuotePage.tsx`, and
  `saveQuoteAction` so linked CRM quotes can be created in
  freight-only/customs-only/combined/newly-added-only modes and are now saved as
  `V1`, `V2`, `V3`, etc. using the existing CRM quote lineage fields
  `sourceQuotationId`, `sourceQuotationVersion`, `sourceQuotationNumber`, and
  `sourceQuotationSnapshot`;
- updated the CRM quote list and quote detail data loaders to show the latest
  visible version per quote family while also surfacing version history and root
  quote number information on the quote detail page.

Verification on Wednesday, August 5, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/modules/crm/rate-workflow.ts' 'src/modules/crm/components/service-enquiries/service-rate-workflow-panel.tsx' 'src/app/(dashboard)/crm/quotes/new/page.tsx' 'src/modules/crm/components/quotes/NewQuotePage.tsx' 'src/app/(dashboard)/crm/quotes/page.tsx' 'src/modules/crm/components/quotes/lib/types.ts'`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; git diff --check -- 'src/modules/crm/rate-workflow.ts' 'src/modules/crm/components/service-enquiries/service-rate-workflow-panel.tsx' 'src/modules/crm/actions.ts' 'src/modules/crm/service.ts' 'src/app/(dashboard)/crm/enquiries/[id]/enquiry-detail-client.tsx' 'src/app/(dashboard)/crm/leads/[id]/lead-detail-wrapper.tsx' 'src/app/(dashboard)/crm/freight-forwarding/[serviceEnquiryId]/page.tsx' 'src/app/(dashboard)/crm/customs-clearance/[serviceEnquiryId]/page.tsx' 'src/app/(dashboard)/crm/quotes/new/page.tsx' 'src/modules/crm/components/quotes/NewQuotePage.tsx' 'src/app/(dashboard)/crm/quotes/page.tsx' 'src/app/(dashboard)/crm/quotes/[quoteId]/page.tsx' 'src/modules/crm/components/quotes/QuoteDetailsPage.tsx' 'src/modules/crm/components/quotes/lib/types.ts'`:
  passed aside from the normal worktree CRLF warnings on Windows.

Known limits:

- no authenticated browser runtime is attached in this Codex session, so the new
  split-rate tabs, recreate-quotation path, and version-history surfaces are
  source-verified and command-verified rather than browser-verified in Light,
  Night, and Violet themes;
- targeted ESLint still fails on several older CRM detail files such as
  `src/app/(dashboard)/crm/enquiries/[id]/enquiry-detail-client.tsx`,
  `src/app/(dashboard)/crm/leads/[id]/lead-detail-wrapper.tsx`, and
  `src/app/(dashboard)/crm/quotes/[quoteId]/page.tsx` because those files carry
  pre-existing `@typescript-eslint/no-explicit-any` debt unrelated to this pass;
- this pass intentionally used the existing CRM quote lineage fields rather than
  adding a new database table, so full audit visibility is stored across version
  records plus `sourceQuotationSnapshot` metadata instead of a separate bespoke
  quotation-version entity.

## 2026-08-05 CRM quote form design-system alignment

Aligned the shared CRM quote creation and edit experience used by
`/crm/quotes/new` and `/crm/quotes/[quoteId]/edit` so the page now composes the
approved CRM workspace panels and shared Monolith actions instead of relying on
its older standalone quote-form chrome.

Delivered:

- updated `src/modules/crm/components/quotes/NewQuotePage.tsx` to remove the
  duplicate local route header, add a CRM workspace intro section, and wrap the
  form flow in shared `CrmSection`, `CrmPanel`, `CrmStatus`, and shared
  button-link actions;
- updated `src/modules/crm/components/quotes/CustomerSection.tsx`,
  `QuoteMetaSection.tsx`, and `ShippingDetailsSection.tsx` so each block now
  uses the canonical `WorkspacePanelHeader` treatment rather than raw section
  headings;
- updated `src/modules/crm/components/quotes/LineItemsTable.tsx`,
  `NotesAndTermsSection.tsx`, and `FixedActionBar.tsx` so the pricing table,
  customer-notes/totals area, and output actions follow shared Monolith panel
  headers and button variants more closely;
- relabeled the metadata `Reference#` field to `Enquiry Number` while
  preserving the existing field binding and quote-save behavior.

Verification on Wednesday, August 5, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/modules/crm/components/quotes/NewQuotePage.tsx' 'src/modules/crm/components/quotes/CustomerSection.tsx' 'src/modules/crm/components/quotes/QuoteMetaSection.tsx' 'src/modules/crm/components/quotes/ShippingDetailsSection.tsx' 'src/modules/crm/components/quotes/LineItemsTable.tsx' 'src/modules/crm/components/quotes/NotesAndTermsSection.tsx' 'src/modules/crm/components/quotes/FixedActionBar.tsx'`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; git diff --check -- 'src/modules/crm/components/quotes/NewQuotePage.tsx' 'src/modules/crm/components/quotes/CustomerSection.tsx' 'src/modules/crm/components/quotes/QuoteMetaSection.tsx' 'src/modules/crm/components/quotes/ShippingDetailsSection.tsx' 'src/modules/crm/components/quotes/LineItemsTable.tsx' 'src/modules/crm/components/quotes/NotesAndTermsSection.tsx' 'src/modules/crm/components/quotes/FixedActionBar.tsx'`:
  passed aside from the normal worktree CRLF warnings;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/audit-ui-routes.mjs`:
  passed and refreshed `docs/ui-route-audit.md` plus
  `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md`;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/generate-ui-component-style-audit.mjs`:
  passed and refreshed `docs/ui-component-and-style-ownership-audit.md`;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run architecture:check`:
  still fails on the pre-existing repository-wide code-organization guard that
  reports existing implementation files under `src/components/monolith`;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run design-system:verify`:
  still fails on the existing unregistered shared export
  `src/components/ui/button.tsx#ButtonLink`.

Known limits:

- no authenticated browser runtime is attached in this Codex session, so this
  pass is source-verified and command-verified rather than browser-verified in
  Light, Night, and Violet themes across desktop, tablet, and mobile;
- this pass keeps the underlying CRM quote field structure, save flow, and
  approval behavior intact, so deeper route-local control implementations such
  as the custom quote combobox and item autocomplete remain for a later shared
  component extraction pass if needed.

## 2026-08-05 CRM Masters sidebar workspace addition

Added a new `Masters` entry to the shared CRM sidebar so users can open a
dedicated master-data workspace from the module navigation.

Delivered:

- updated `src/lib/navigation.ts` so the CRM section now exposes `/crm/masters`
  as a shared sidebar item using the authoritative navigation model;
- updated `src/modules/crm/components/workspace/crm-workspace.tsx` so
  `/crm/masters` renders first-class CRM route metadata instead of the generic
  fallback header copy;
- added `src/app/(dashboard)/crm/masters/page.tsx` and
  `src/modules/crm/components/masters/crm-masters-workspace.tsx` so the new
  sidebar entry now opens a dedicated CRM workspace with the master tabs,
  including a migrated `Item Master` tab alongside Agent Master, Charge
  Master, Port Master, State Master, Terminal Master, and Vessel Master;
- updated `src/app/(dashboard)/crm/items/page.tsx` to redirect the old
  standalone Items landing page into `/crm/masters?tab=item-master`, so the
  legacy entry point now resolves into the Masters workspace instead of keeping
  a separate top-level register;
- updated `src/lib/navigation.ts` so CRM no longer shows a separate sidebar
  `Items` entry once that register is represented under `Masters` as
  `Item Master`;
- updated `src/modules/crm/components/records/crm-workspace-page.tsx` so the
  catch-all CRM workspace page presents a specific `Masters` badge, summary,
  and description when that sidebar item is opened;
- added a regression assertion in `src/lib/navigation.test.ts` so the CRM
  sidebar model keeps the `Masters` workspace discoverable.

Verification on Wednesday, August 5, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx vitest run src/lib/navigation.test.ts --reporter verbose`:
  blocked by the repository's guarded test bootstrap because
  `.env.staging.local` is not present in this session;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/lib/navigation.ts' 'src/lib/navigation.test.ts' 'src/modules/crm/components/workspace/crm-workspace.tsx' 'src/modules/crm/components/records/crm-workspace-page.tsx' 'src/app/(dashboard)/crm/masters/page.tsx' 'src/modules/crm/components/masters/crm-masters-workspace.tsx' 'src/modules/crm/components/workspace/crm-workspace.test.tsx'`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/audit-ui-routes.mjs`:
  passed and refreshed `docs/ui-route-audit.md` plus
  `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md`;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/generate-ui-component-style-audit.mjs`:
  passed and refreshed `docs/ui-component-and-style-ownership-audit.md`;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  still fails on pre-existing unrelated CRM errors in
  `src/app/(dashboard)/crm/enquiries/[id]/enquiry-detail-client.tsx`,
  `src/app/(dashboard)/crm/leads/[id]/lead-detail-wrapper.tsx`, and
  `src/modules/crm/actions.ts`.

Known limits:

- no authenticated browser runtime is attached in this Codex session, so this
  navigation update is source-verified and lint-verified rather than
  browser-verified in Light, Night, and Violet themes;
- the new `Masters` tabs currently provide the dedicated CRM workspace shell and
  tab switching only for the newly added master areas; `Item Master` is the
  only tab in this pass that embeds an existing working register.

## 2026-08-05 CRM service-enquiry queue design-system alignment

Aligned the shared CRM service-enquiry queue surface used by
`/crm/freight-forwarding` and `/crm/customs-clearance` so the queue now uses
the approved operational table/header/button/input system instead of a
standalone CRM panel and raw table markup.

Delivered:

- updated `src/modules/crm/components/service-enquiries/service-enquiry-queue.tsx`
  to collapse the separate heading, search card, and list card into one shared
  `OperationalDataTable` composition;
- replaced the route-local search field and table shell with
  `OperationalDataTableHeader`, shared `Input`, shared button actions,
  `OperationalVisibleRecords`, `OperationalTable*` cells, and
  `OperationalStatus`;
- made each queue row use the shared `OperationalLinkedRow` contract while
  preserving the explicit `Open` action button for direct navigation.

Verification on Wednesday, August 5, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/modules/crm/components/service-enquiries/service-enquiry-queue.tsx' 'src/app/(dashboard)/crm/freight-forwarding/page.tsx' 'src/app/(dashboard)/crm/customs-clearance/page.tsx'`:
  passed.

Known limits:

- no authenticated browser runtime is attached in this Codex session, so this
  pass is source-verified and lint-verified rather than browser-verified in
  Light, Night, and Violet themes;
- the visible-records chip currently reflects the filtered queue length because
  the page does not yet provide a separate unfiltered total count for these
  service queues.

## 2026-08-05 CRM enquiries and leads table action-column removal

Removed the rightmost action column from the CRM enquiries and leads registers
so both tables now rely on the existing linked primary cells instead of a
separate eye/delete action rail.

Delivered:

- updated `src/app/(dashboard)/crm/enquiries/page.tsx` to remove the `Actions`
  header and row action cell while preserving the linked enquiry number as the
  navigation path into each enquiry record;
- updated `src/app/(dashboard)/crm/leads/page.tsx` to remove the `Actions`
  header and row action cell, including the inline view and delete controls,
  while preserving the linked lead name as the navigation path into each lead
  record;
- aligned the empty-state `colSpan` values in both tables with the new six-
  column layouts.

Verification on Wednesday, August 5, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/app/(dashboard)/crm/enquiries/page.tsx' 'src/app/(dashboard)/crm/leads/page.tsx'`:
  passed.

Known limits:

- this change intentionally removes the inline lead delete affordance from the
  leads register, so deletion now depends on any remaining lead-detail workflow
  rather than the list view;
- no authenticated browser runtime is attached in this Codex session, so the
  result is source-verified and lint-targeted rather than browser-verified in
  Light, Night, and Violet themes.

## 2026-08-05 CRM enquiries and leads whole-row navigation follow-up

Made the full enquiry and lead register rows actionable so users can open a
record by clicking anywhere across the row, not just the primary text cell.

Delivered:

- added `src/components/data-display/operational-linked-row.tsx` as a shared
  data-display owner component that gives operational table rows link-like
  click and keyboard behavior while keeping route pages server-rendered;
- updated `src/app/(dashboard)/crm/enquiries/page.tsx` and
  `src/app/(dashboard)/crm/leads/page.tsx` to use the shared clickable row
  wrapper for each record row instead of inline text links;
- updated `src/styles/monolith-system.css` so actionable rows show pointer
  cursor feedback and a visible focus treatment.

Verification on Wednesday, August 5, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/components/data-display/operational-linked-row.tsx' 'src/app/(dashboard)/crm/enquiries/page.tsx' 'src/app/(dashboard)/crm/leads/page.tsx'`:
  passed.

Known limits:

- this pass only applies the shared whole-row interaction to the CRM enquiries
  and leads registers touched here; other operational tables still keep their
  existing interaction patterns unless migrated separately;
- no authenticated browser runtime is attached in this Codex session, so the
  result is source-verified and lint-verified rather than browser-verified in
  Light, Night, and Violet themes.

## 2026-08-05 CRM enquiry detail tab-shell cleanup follow-up

Removed the grey container background and border around the CRM enquiry-detail
right-rail tab actions so the pill actions sit directly on the page surface.

Delivered:

- updated `src/styles/monolith-system.css` to remove the shared `.mnx-crm-tabs`
  shell border, background, radius, and inner padding while keeping the tab
  row layout and horizontal scrolling behavior intact.

Verification on Wednesday, August 5, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/app/(dashboard)/crm/enquiries/[id]/enquiry-detail-client.tsx' 'src/modules/crm/components/workspace/crm-workspace.tsx'`:
  still fails on pre-existing route debt in `enquiry-detail-client.tsx`,
  primarily long-standing `@typescript-eslint/no-explicit-any` findings and the
  existing `react-hooks/set-state-in-effect` warning around `setLocalCalls(calls)`.

Known limits:

- because `.mnx-crm-tabs` is a shared CRM tab-shell style, the same chrome
  removal also applies to other CRM surfaces that use `CrmTabs`;
- no authenticated browser runtime is attached in this Codex session, so the
  result is source-verified only.

## 2026-08-05 CRM lead detail tab-shell alignment follow-up

Aligned the lead detail page's related-lists tab strip with the shared CRM tab
pattern already used by the enquiry detail page.

Delivered:

- updated `src/app/(dashboard)/crm/leads/[id]/lead-detail-wrapper.tsx` to
  replace the older underlined route-local tab buttons with shared `CrmTabs`
  and compact `CrmButton` pills;
- kept the lead-specific `Files` tab intact while renaming the common tabs to
  match the enquiry detail wording more closely, including `Summary` and
  `Tasks`.

Verification on Wednesday, August 5, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/app/(dashboard)/crm/leads/[id]/lead-detail-wrapper.tsx' 'src/modules/crm/components/workspace/crm-workspace.tsx'`:
  still fails on pre-existing route debt in `lead-detail-wrapper.tsx`,
  primarily long-standing `@typescript-eslint/no-explicit-any` findings and
  existing `react-hooks/set-state-in-effect` warnings.

Known limits:

- this follow-up aligns the lead detail tab strip with the enquiry detail page,
  but the wider lead detail screen still retains substantial older route-local
  composition beyond the tab area;
- no authenticated browser runtime is attached in this Codex session, so the
  result is source-verified only.

## 2026-08-05 CRM enquiry and lead tab-section surface cleanup

Removed the remaining grey outer surface behind the right-rail tab and content
sections on both CRM enquiry and lead detail pages.

Delivered:

- updated `src/app/(dashboard)/crm/enquiries/[id]/enquiry-detail-client.tsx`
  so the related-lists container no longer renders the default CRM panel
  background, border, or shadow;
- updated `src/app/(dashboard)/crm/leads/[id]/lead-detail-wrapper.tsx` to drop
  the route-local grey boxed wrapper around the tabs and content section.

Verification on Wednesday, August 5, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/app/(dashboard)/crm/enquiries/[id]/enquiry-detail-client.tsx' 'src/app/(dashboard)/crm/leads/[id]/lead-detail-wrapper.tsx'`:
  still fails on pre-existing route debt in both legacy detail files,
  primarily long-standing `@typescript-eslint/no-explicit-any` findings and
  existing `react-hooks/set-state-in-effect` warnings.

Known limits:

- this pass removes the outer grey container surface only; inner summary/info
  cards within the active tabs remain unchanged;
- no authenticated browser runtime is attached in this Codex session, so the
  result is source-verified only.

## 2026-08-05 CRM duplicate page-level loading cleanup

Removed the extra CRM item-detail loading screen so CRM pages rely on the
shared `crm/loading.tsx` route loader instead of stacking a second local page
loader on top of it.

Delivered:

- updated `src/app/(dashboard)/crm/items/[id]/page.tsx` to remove the local
  client `loading` state and inline `Loading...` screen;
- switched the item lookup to a direct synchronous read so the route now either
  renders the item detail immediately or falls through to `notFound()`.

Verification on Wednesday, August 5, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/app/(dashboard)/crm/items/[id]/page.tsx'`:
  passed.

Known limits:

- this cleanup removes the duplicate page-level loader I found in the CRM route
  family, but it does not affect button-level pending states such as upload or
  action spinners inside CRM workflows;
- no authenticated browser runtime is attached in this Codex session, so the
  result is source-verified and lint-verified rather than browser-verified.

## 2026-08-04 CRM enquiry-detail design-system composition follow-up

Moved the main `/crm/enquiries/[id]` detail experience further onto the shared
CRM design-system composition path while preserving the existing enquiry
actions, follow-up workflow, worksheet logic, and email simulation behavior.

Delivered:

- updated `src/app/(dashboard)/crm/enquiries/[id]/enquiry-detail-client.tsx`
  so the visible top-level experience now uses shared `CrmActionLink`,
  `CrmPanel`, `CrmSection`, `CrmField`, and `CrmStatus` primitives for the
  command bar, enquiry hero, follow-up scheduling surface, main detail section,
  worksheet section, automation section, reminder card, and right-rail tab
  shell;
- replaced the older route-local tab underline treatment in the right rail with
  shared CRM button variants, so the summary/notes/tasks/audit/time/calls tabs
  now follow the approved monolith action styling more closely;
- preserved the route's current business logic, owner reassignment flow,
  worksheet save behavior, and automation/test tooling while changing the page
  composition and visual ownership.

Verification on Tuesday, August 4, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/app/(dashboard)/crm/enquiries/[id]/enquiry-detail-client.tsx' 'src/app/(dashboard)/crm/enquiries/[id]/page.tsx'`:
  still fails on pre-existing route debt in `enquiry-detail-client.tsx`,
  primarily `@typescript-eslint/no-explicit-any` and the existing
  `react-hooks/set-state-in-effect` finding around `setLocalCalls(calls)`.

Known limits:

- this pass focuses on the main visible page composition shown in the enquiry
  detail workspace; deeper sub-surfaces inside the long legacy client component,
  including perishable/worksheet internals and some nested utility blocks,
  still retain older route-local field/layout markup;
- no authenticated browser runtime is attached in this Codex session, so the
  migration is source-verified only and still needs Light, Night, and Violet
  runtime verification across desktop, tablet, and mobile.

## 2026-08-04 CRM enquiries shared filter-menu follow-up

Replaced the enquiry register's one-off `Apply` search submit control with the
shared operational filter-menu pattern, and moved the enquiry-type filtering
into that same datatable toolbar.

Delivered:

- added `src/modules/crm/components/enquiries/enquiry-register-toolbar.tsx` as
  a module-owned CRM toolbar composition built on the shared
  `OperationalDataTableHeader`, compact search field, shared filter-menu
  dropdown, active-filter summary row, and CRM command actions;
- updated `src/app/(dashboard)/crm/enquiries/page.tsx` to use the new toolbar,
  preserving the existing `search` and `type` query semantics while removing
  the duplicate lower enquiry-type filter strip;
- kept the current enquiry dataset behavior intact while exposing the filter
  choices directly through the datatable's canonical filter control.

Verification on Tuesday, August 4, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/app/(dashboard)/crm/enquiries/page.tsx' 'src/modules/crm/components/enquiries/enquiry-register-toolbar.tsx'`:
  passed.

Known limits:

- no authenticated browser runtime is attached in this Codex session, so this
  follow-up is source-verified and lint-verified rather than browser-verified
  in Light, Night, and Violet themes;
- this pass keeps the current enquiry filters limited to the existing
  `search`, `perishable`, and `future follow-up` controls rather than adding
  new server-side filter dimensions.

## 2026-08-04 CRM action-link button-element follow-up

Updated the CRM action wrapper so CRM command-bar actions now render the shared
design-system `Button` element instead of a CRM-specific link wrapper.

Delivered:

- updated `src/modules/crm/components/workspace/crm-workspace.tsx` so
  `CrmActionLink` now uses the shared `Button` component and client-side router
  navigation for its `href`;
- preserved the shared Monolith button variants and compact/default sizing
  contract already used by the CRM toolbar actions, while changing the rendered
  element from link markup to a real button element.

Verification on Tuesday, August 4, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/modules/crm/components/workspace/crm-workspace.tsx'`:
  passed.

Known limits:

- this follow-up intentionally changes the CRM action wrapper implementation
  without touching unrelated route-local text links, tab links, or row-action
  links elsewhere in CRM;
- no authenticated browser runtime is attached in this Codex session, so the
  fix is source-verified and lint-verified rather than browser-verified in
  Light, Night, and Violet themes.

## 2026-08-04 CRM enquiries operational table alignment handoff

Aligned `/crm/enquiries` with the shared operational data-table system used by
 CHA instead of keeping the older route-local CRM toolbar and table shell.

Delivered:

- updated `src/app/(dashboard)/crm/enquiries/page.tsx` to replace the custom
  page-level header/card stack with the shared
  `OperationalDataTable`/`OperationalDataTableHeader`/`OperationalVisibleRecords`
  shell;
- converted the enquiries toolbar to the shared compact search field plus
  operational apply button, while keeping the page's actual supported filters:
  `search` and `type` (`all`, `perishable`, `future_follow`);
- replaced the custom enquiry-type pills with the shared operational filter
  group treatment and kept their counts in sync with the current route data;
- moved the list body onto the shared operational table primitives so enquiry
  actions now use the same row-action contract as the CHA data tables;
- regenerated `docs/ui-route-audit.md`,
  `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md`, and
  `docs/ui-component-and-style-ownership-audit.md`.

Verification on Tuesday, August 4, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/app/(dashboard)/crm/enquiries/page.tsx'`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/audit-ui-routes.mjs`:
  passed and refreshed the route inventory;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/generate-ui-component-style-audit.mjs`:
  passed.

Known limits:

- the route still preserves CRM-specific enquiry row content and status/flag
  wording instead of collapsing everything into the exact CHA jobs column
  model, because the underlying enquiry data shape is different;
- this pass did not add new filter capabilities beyond the existing `search`
  and `type` query parameters already supported by the page logic.

## 2026-08-04 CRM leads filter-menu and operational toolbar handoff

Aligned `/crm/leads` with the same shared operational toolbar/filter treatment
 now used by the CRM enquiries register, while preserving the existing lead
 query behavior.

Delivered:

- added `src/modules/crm/components/leads/lead-register-toolbar.tsx` as a
  module-owned composition that uses the shared operational table header,
  visible-records block, compact search field, shared filter-menu dropdown, and
  active-filter link summary;
- updated `src/app/(dashboard)/crm/leads/page.tsx` to replace the old native
  status select and route-local apply/reset controls with the shared filter-menu
  pattern while preserving the existing `search`, `status`, and `tab` query
  semantics;
- moved the lead tab strip onto the shared operational filter-group treatment so
  the leads register now matches the CRM enquiries register and CHA table
  family more closely;
- regenerated `docs/ui-route-audit.md`,
  `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md`, and
  `docs/ui-component-and-style-ownership-audit.md`.

Verification on Tuesday, August 4, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/app/(dashboard)/crm/leads/page.tsx' 'src/modules/crm/components/leads/lead-register-toolbar.tsx'`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/audit-ui-routes.mjs`:
  passed and refreshed the route inventory;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/generate-ui-component-style-audit.mjs`:
  passed.

Known limits:

- the leads route still keeps its CRM-specific row content, delete action, and
  lead-status cooldown logic rather than adopting the CHA jobs data model;
- this pass does not add saved-view persistence to CRM leads; the shared
  filter-menu usage here is visual and interaction-aligned only.

## 2026-08-04 Shared primary button spacing and label-color fix

Fixed the shared primary button CSS so icon-plus-label actions stop drifting
 away from the approved Monolith button look when the label is wrapped in a
 `span`.

Delivered:

- updated `src/styles/monolith-system.css` to remove
  `justify-content: space-between` from `.mnx-button-primary`, which was
  creating the oversized gap between the icon and text;
- updated `src/styles/monolith-system.css` to stop coloring
  `.mnx-button-primary > span:not(.mnx-button-spinner)`, which was turning
  wrapped button labels into the accent color instead of keeping the standard
  primary-button label color;
- preserved icon tinting for the icon element itself, so the fix only corrects
  label spacing and label color without changing unrelated button behavior.

Verification on Tuesday, August 4, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/modules/crm/components/leads/lead-register-toolbar.tsx' 'src/app/(dashboard)/crm/enquiries/page.tsx' 'src/app/(dashboard)/crm/leads/page.tsx' 'src/modules/crm/components/workspace/crm-workspace.tsx'`:
  passed.

Known limits:

- no browser runtime is attached in this Codex session, so this shared visual
  correction is source-verified and lint-verified rather than screenshot- or
  theme-verified in Light, Night, and Violet;
- if any route intentionally relied on the old broken primary-button label tint
  or forced icon-label separation, it will now inherit the corrected shared
  button behavior instead.

## 2026-08-04 CRM action-link compact toolbar sizing fix

Fixed the CRM action-link wrapper so toolbar links can use the same compact
 button size contract as CHA operational toolbar actions instead of always
 falling back to the larger default shell.

Delivered:

- updated `src/modules/crm/components/workspace/crm-workspace.tsx` so
  `CrmActionLink` now accepts `size="compact"` and applies the shared
  `mnx-button-compact` contract;
- updated `src/modules/crm/components/leads/lead-register-toolbar.tsx` so
  `Lead Sources` and `Create Lead` use the compact toolbar button size instead
  of the default oversized shell;
- updated `src/app/(dashboard)/crm/enquiries/page.tsx` so the enquiries toolbar
  actions use the same compact size contract.

Verification on Tuesday, August 4, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/modules/crm/components/workspace/crm-workspace.tsx' 'src/modules/crm/components/leads/lead-register-toolbar.tsx' 'src/app/(dashboard)/crm/enquiries/page.tsx'`:
  passed.

Known limits:

- this fixes the CRM toolbar action-link size mismatch, but it does not change
  the global Monolith button typography contract beyond the earlier shared
  primary-button spacing/color correction;
- no authenticated browser runtime is attached in this Codex session, so the
  change is source-verified and lint-verified rather than browser-verified in
  Light, Night, and Violet themes.

## 2026-08-04 Shared ButtonLink architecture fix

Centralized button-styled navigation links onto one shared design-system
 primitive so module wrappers stop reconstructing Monolith button classes by
 hand and drifting away from the catalogue button behavior.

Delivered:

- updated `src/components/ui/button.tsx` to export a shared `ButtonLink`
  primitive backed by the same `buttonVariants` contract as the shared `Button`
  component;
- updated `src/modules/crm/components/workspace/crm-workspace.tsx`,
  `src/modules/cha/components/workspace/cha-workspace.tsx`,
  `src/modules/people/components/people-workspace.tsx`,
  `src/modules/performance/components/performance-workspace.tsx`, and
  `src/modules/accounting/components/accounting-workspace.tsx` so their
  action-link wrappers now delegate to `ButtonLink` instead of manually
  assembling `mnx-button*` classes;
- updated `src/components/feedback/workspace-states.tsx`,
  `src/modules/crm/components/service-enquiries/service-enquiry-queue.tsx`, and
  `src/modules/crm/components/service-enquiries/service-enquiry-detail.tsx` to
  replace direct button-like `Link` class strings with the shared `ButtonLink`
  primitive;
- kept the CRM leads and enquiries toolbar actions on these shared wrappers so
  future button-style fixes now land through a single source of truth.

Verification on Tuesday, August 4, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/components/ui/button.tsx' 'src/components/feedback/workspace-states.tsx' 'src/modules/crm/components/workspace/crm-workspace.tsx' 'src/modules/cha/components/workspace/cha-workspace.tsx' 'src/modules/people/components/people-workspace.tsx' 'src/modules/performance/components/performance-workspace.tsx' 'src/modules/accounting/components/accounting-workspace.tsx' 'src/modules/crm/components/service-enquiries/service-enquiry-queue.tsx' 'src/modules/crm/components/service-enquiries/service-enquiry-detail.tsx' 'src/modules/crm/components/leads/lead-register-toolbar.tsx' 'src/app/(dashboard)/crm/leads/page.tsx' 'src/app/(dashboard)/crm/enquiries/page.tsx'`:
  passed.

Known limits:

- this centralizes the shared button-link path for the main workspace wrappers
  and the CRM routes touched here, but other direct `mnx-button*` usages that
  render actual `<button>` elements remain intentionally unchanged;
- no authenticated browser runtime is attached in this Codex session, so this
  architectural fix is source-verified and lint-verified rather than browser-
  verified in Light, Night, and Violet themes.

## 2026-08-04 Shared filter-menu interaction cleanup follow-up

Adjusted the shared filter menu interaction so open sections can be collapsed
again, the option list scrolls without a visible scrollbar, the in-panel
search row is removed, and the `Save view` control now uses the shared
design-system button contract.

Delivered:

- updated `src/components/forms/filter-menu.tsx` so accordion sections can be
  fully closed, the internal search row is removed, and the header action uses
  the shared `Button` component;
- updated `src/styles/monolith-system.css` so only the option list scrolls and
  the scrollbar stays visually hidden;
- removed the no-longer-needed section search flags from
  `src/app/(dashboard)/cha/jobs/jobs-client.tsx`;
- updated `src/components/forms/filter-menu.test.tsx` to reflect the new
  no-search shared markup.

Verification on Tuesday, August 4, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/components/forms/filter-menu.tsx' 'src/components/forms/filter-menu.test.tsx' 'src/app/(dashboard)/cha/jobs/jobs-client.tsx' 'src/app/(dashboard)/cha/customers/customers-filter-bar.tsx'`:
  passed.

## 2026-08-04 Shared filter-menu compact sizing follow-up

Tightened the newly refreshed shared filter menu after runtime feedback so the
panel is smaller, the typography is less oversized, the internal scrollbar is
gone, and the broken top `Select a view` control has been removed.

Delivered:

- updated `src/components/forms/filter-menu.tsx` to remove the unused view
  selector props/markup from the shared panel;
- updated `src/styles/monolith-system.css` so the shared filter panel now uses
  a smaller overall footprint, smaller heading/control/option text, and no
  internal scrolling regions;
- updated `src/app/(dashboard)/cha/jobs/jobs-client.tsx` and
  `src/app/(dashboard)/cha/customers/customers-filter-bar.tsx` so the current
  filter menu dropdown width is narrower.

Verification on Tuesday, August 4, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/components/forms/filter-menu.tsx' 'src/components/forms/filter-menu.test.tsx' 'src/app/(dashboard)/cha/jobs/jobs-client.tsx' 'src/app/(dashboard)/cha/customers/customers-filter-bar.tsx'`:
  passed.

## 2026-08-04 Shared accordion filter-menu refresh handoff

Replaced the temporary button-only shared filter trigger with a new Monolith
accordion filter menu patterned after the provided reference: large title,
top view selector, right-side action link, collapsible filter groups, in-panel
search, and checkbox-style option rows.

Delivered:

- updated `src/components/forms/filter-menu.tsx` so `FilterMenu` once again
  opens shared dropdown content and `CategorizedFilterMenuPanel` now renders
  the new accordion/filter-list treatment instead of the earlier category-card
  panel;
- updated `src/styles/monolith-system.css` with the new shared filter-menu
  layout and option-row styling;
- migrated `src/app/(dashboard)/cha/jobs/jobs-client.tsx` to feed the shared
  filter menu with grouped section data for stage, status, priority, branch,
  job type, and assignment filters;
- migrated `src/app/(dashboard)/cha/customers/customers-filter-bar.tsx` to the
  same shared grouped-section contract for status, portal access, and balance;
- updated `src/components/forms/filter-menu.test.tsx` to cover the new shared
  accordion markup contract.

Verification on Tuesday, August 4, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/components/forms/filter-menu.tsx' 'src/components/forms/filter-menu.test.tsx' 'src/app/(dashboard)/cha/jobs/jobs-client.tsx' 'src/app/(dashboard)/cha/customers/customers-filter-bar.tsx'`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx vitest run 'src/components/forms/filter-menu.test.tsx' --reporter verbose`:
  could not start because the repository's guarded Vitest configuration still
  requires `.env.staging.local` before test execution.

Open follow-up:

- the new top-right `Save view` action is currently visual/shared-layout only;
  persistent saved-filter-view behavior is not yet wired for these routes;
- no authenticated browser backend is attached in this Codex session, so the
  change is source-verified and lint-verified rather than runtime-verified in
  Light, Night, and Violet themes.

## 2026-08-04 Shared filter-menu removal handoff

Removed the current shared design-system filter dropdown behavior while
preserving the existing filter trigger button styling and count chip.

Delivered:

- updated `src/components/forms/filter-menu.tsx` so `FilterMenu` now renders
  only the existing Monolith filter button and no longer mounts the dropdown
  menu content/panel;
- preserved the shared trigger contract used across current consumers, so the
  visible button remains in place on routes that already use the shared
  filter-menu primitive.

Verification on Tuesday, August 4, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/components/forms/filter-menu.tsx'`:
  passed.

Open follow-up:

- `CategorizedFilterMenuPanel` and its styling remain in the repository but are
  no longer reachable through the shared `FilterMenu` trigger; they can be
  removed in a later cleanup pass if you want the unused menu implementation
  deleted as well;
- no authenticated browser backend is attached in this Codex session, so the
  change is source-verified and lint-verified rather than runtime-verified in
  Light, Night, and Violet themes.

## 2026-08-04 Design-system categorized filter-menu handoff

Redesigned the shared Monolith filter-menu pattern so category selection now
happens through a dropdown and the selected category reveals its matching
sub-filter options directly underneath, instead of relying on the older
side-by-side category rail.

Delivered:

- updated `src/components/forms/filter-menu.tsx` to add the shared
  `CategorizedFilterMenuPanel` helper on top of the existing `FilterMenu`
  trigger contract;
- added shared categorized filter-menu styling in
  `src/styles/monolith-system.css` for the new header, category summary,
  selector, option stack, and footer regions;
- migrated `src/app/(dashboard)/cha/jobs/jobs-client.tsx` so the operational
  jobs register filter menu now uses the new dropdown category selector and
  reveals the active category's sub-options below it;
- migrated `src/app/(dashboard)/cha/customers/customers-filter-bar.tsx` to the
  same categorized filter-menu pattern so the customer register follows the
  same design-system interaction;
- added `src/components/forms/filter-menu.test.tsx` to cover the shared
  categorized panel markup contract;
- regenerated `docs/ui-route-audit.md`,
  `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md`, and
  `docs/ui-component-and-style-ownership-audit.md`.

Verification on Tuesday, August 4, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/components/forms/filter-menu.tsx' 'src/components/forms/filter-menu.test.tsx' 'src/app/(dashboard)/cha/jobs/jobs-client.tsx' 'src/app/(dashboard)/cha/customers/customers-filter-bar.tsx'`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run design-system:verify`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/audit-ui-routes.mjs`:
  passed and refreshed the route inventory;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/generate-ui-component-style-audit.mjs`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx vitest run 'src/components/forms/filter-menu.test.tsx' --reporter verbose`:
  could not start because the repository's guarded Vitest configuration still
  requires `.env.staging.local` before test execution.

Open follow-up:

- the new categorized panel is live in the CHA jobs and customers filter menus,
  but other filter-menu consumers such as HRMS employee directory, AMS
  appraisals, and customs masters still use their earlier flat or custom menu
  layouts and can be migrated onto the same shared pattern in a follow-up pass;
- no authenticated browser backend is attached in this Codex session, so the
  redesign is source-verified and lint-verified rather than runtime-verified in
  Light, Night, and Violet themes.

## 2026-08-04 CRM leads operational-table and header-icon handoff

Aligned the `/crm/leads` index page more closely with the shared Monolith data
display and action contracts while removing the icon that was rendering before
the route heading.

Delivered:

- updated `src/app/(dashboard)/crm/leads/page.tsx` to replace the local
  `CrmTable` presentation with the shared
  `OperationalDataTable`, `OperationalDataTableWrap`, `OperationalTable`,
  `OperationalPrimaryCell`, `OperationalStatus`, `OperationalTableEmpty`, and
  `OperationalDataTableFooter` components;
- migrated the primary page actions on the route to the approved CRM button
  contracts by using shared `CrmButton` / `CrmActionLink` primitives instead of
  keeping the previous route-local button treatment around the main filters and
  create action;
- updated `src/modules/crm/components/workspace/crm-workspace.tsx` so the
  `/crm/leads` page header no longer renders the leading icon while preserving
  the standard CRM header treatment on the rest of the workspace;
- regenerated `docs/ui-route-audit.md`,
  `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md`, and
  `docs/ui-component-and-style-ownership-audit.md`.

Verification on Tuesday, August 4, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/app/(dashboard)/crm/leads/page.tsx' 'src/modules/crm/components/workspace/crm-workspace.tsx'`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/audit-ui-routes.mjs`:
  passed and refreshed the current route inventory;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/generate-ui-component-style-audit.mjs`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run design-system:verify`:
  passed.

Open follow-up:

- the fresh static audit still marks `/crm/leads` as `NON_COMPLIANT` because
  the route continues to own several directly styled `Link` elements for tab
  navigation and other action-like links; the main table and primary actions
  now use the shared design-system contracts, but the tab/navigation treatment
  still needs a canonical replacement to clear the remaining audit finding;
- no authenticated browser backend is attached in this Codex session, so the
  change is source-verified and lint-verified rather than runtime-verified in
  Light, Night, and Violet themes.

## 2026-08-04 CRM service-enquiry routing foundation handoff

Added the first normalized CRM routing layer for freight forwarding and customs
clearance so interested leads now create durable service work items instead of
relying only on mixed `CrmLead.enquiryDetails` JSON.

Delivered:

- added Prisma enums and `CrmServiceEnquiry` in `prisma/schema.prisma` plus
  additive migration
  `prisma/migrations/20260804113000_add_crm_service_enquiries/`;
- added `src/modules/crm/services/service-enquiry-routing.service.ts` with the
  transactional `routeQualifiedEnquiry(...)` orchestration and normalized
  queue/detail queries;
- updated `src/modules/crm/actions.ts` so interested-lead conversion now routes
  through the centralized service-enquiry transaction and mirrors rate-sheet
  saves into normalized `pricingSnapshot` state;
- added the new CRM routes
  `src/app/(dashboard)/crm/freight-forwarding/**` and
  `src/app/(dashboard)/crm/customs-clearance/**`;
- added module-owned CRM service-enquiry UI in
  `src/modules/crm/components/service-enquiries/**`;
- updated `src/modules/crm/components/workspace/crm-workspace.tsx`,
  `src/lib/navigation.ts`, and `src/lib/route-labels.ts` so the new routes are
  first-class CRM workspaces in shared chrome and navigation;
- added permission catalogue entries to `prisma/seed.ts`;
- added `docs/architecture/adr-crm-service-enquiry-routing.md` and
  `docs/crm-freight-customs-implementation.md`;
- regenerated `docs/ui-route-audit.md`,
  `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md`, and
  `docs/ui-component-and-style-ownership-audit.md`.

Verification on Tuesday, August 4, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx prisma format`: passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx prisma validate`: passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx prisma generate`: passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  passed in this session after the service-enquiry additions;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint ...` over the new
  service-enquiry files, CRM workspace metadata, navigation, route labels, and
  db singleton: passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/audit-ui-routes.mjs`:
  passed and refreshed route inventory for the new CRM pages;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/generate-ui-component-style-audit.mjs`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run design-system:verify`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run architecture:check`:
  still fails on the pre-existing repository-wide `src/components/monolith`
  ownership baseline, not on this CRM routing pass.

Open follow-up:

- direct enquiry creation, quote linkage by `serviceEnquiryId`, normalized
  freight/customs pricing records, and job conversion are still deferred;
- the new CRM pages are source-verified and type-verified in this session, but
  no authenticated browser backend is attached for Light/Night/Violet runtime
  verification.

## 2026-08-04 Freight Forwarding module scaffold handoff

Added a new first-class `Freight Forwarding` dashboard module and routed it
through the same Monolith registration points used by the existing operational
modules, while intentionally keeping its internal workspace blank for now.

Delivered:

- added `src/app/(dashboard)/freight-forwarding/page.tsx` as the new protected
  route;
- added `src/modules/freight-forwarding/components/freight-forwarding-workspace.tsx`
  and `src/modules/freight-forwarding/components/index.ts` so the module owns
  its workspace composition under `src/modules/<module>/components`;
- updated `src/modules/core/organisation/module-config.ts` so
  `freight-forwarding` is treated as a managed toggleable module and
  `/freight-forwarding` is protected by the dashboard shell's module-enable
  gate;
- updated `src/lib/navigation.ts` and `src/lib/route-labels.ts` so the new
  module appears in primary navigation, command search, and topbar route
  labeling;
- updated `src/modules/dashboard/types.ts`,
  `src/modules/dashboard/service.ts`, and
  `src/app/(dashboard)/dashboard/_components/module-command-center.tsx` so the
  dashboard module card can render the new module with a zero-state summary;
- updated `src/lib/navigation.test.ts` with a managed-path assertion for the
  new module and removed a pre-existing malformed stray `it(...)` stub that was
  making the test file unparsable;
- regenerated `docs/ui-route-audit.md`,
  `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md`, and
  `docs/ui-component-and-style-ownership-audit.md` so the new route family is
  reflected in the current source audit.

Verification on Tuesday, August 4, 2026:

- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx eslint 'src/modules/core/organisation/module-config.ts' 'src/lib/navigation.ts' 'src/modules/dashboard/types.ts' 'src/modules/dashboard/service.ts' 'src/app/(dashboard)/dashboard/_components/module-command-center.tsx' 'src/lib/route-labels.ts' 'src/lib/navigation.test.ts' 'src/modules/freight-forwarding/components/freight-forwarding-workspace.tsx' 'src/modules/freight-forwarding/components/index.ts' 'src/app/(dashboard)/freight-forwarding/page.tsx'`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/audit-ui-routes.mjs`:
  passed and regenerated the route audit and migration matrix;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node scripts/generate-ui-component-style-audit.mjs`:
  passed and regenerated the ownership audit;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run design-system:verify`:
  passed;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npm run architecture:check`:
  still fails on the existing repository-wide `src/components/monolith`
  ownership baseline, not on the Freight Forwarding module scaffold;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit --pretty false`:
  still fails on the existing unrelated Accounting recurring/customization,
  customer-advances, incentives, and Prisma-model baseline issues outside this
  module addition;
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx vitest run 'src/lib/navigation.test.ts'`:
  could not start because the repository's guarded Vitest configuration
  requires `.env.staging.local` before test execution.

Open follow-up:

- the Freight Forwarding module currently exposes only its blank landing
  workspace; no sub-routes, data model, permissions, or workflow actions were
  added in this pass;
- no authenticated browser backend is attached in this Codex session, so the
  new module was source-verified and shell-wired rather than screenshot-verified
  in Light, Night, and Violet themes.

## 2026-08-04 CRM lead detail creator-data handoff

Switched the CRM lead detail `Business Card Details` panel away from imported
lead-source fields and onto the internal employee record for the user who
created the lead, so the page now shows in-system creator metadata for every
lead detail view.

Delivered:

- updated `src/modules/crm/service.ts` so `getLead(...)` enriches
  `lead.createdBy` with internal user data including `employeeNumber`,
  `designation`, `personalPhone`, and the related organisation name;
- updated `src/app/(dashboard)/crm/leads/[id]/lead-detail-wrapper.tsx` so the
  `Business Card Details` panel now shows `Created By`, `Employee ID`,
  `Email`, `Designation`, `Organisation`, and `Mobile` from the creator's
  employee profile instead of imported lead fields such as Justdial company
  text, external designation, and imported phone values;
- preserved fallback behavior so the panel still renders safely when creator
  data is partially missing.

Verification on Tuesday, August 4, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/modules/crm/service.ts' 'src/app/(dashboard)/crm/leads/[id]/lead-detail-wrapper.tsx'`:
  still fails on the existing baseline `no-explicit-any`, unused import, and
  React effect issues already present in those CRM files, not on the new
  creator-data wiring.

Open follow-up:

- no authenticated browser backend is attached in this Codex session, so the
  CRM lead detail change is source-verified rather than screenshot-verified in
  Light, Night, and Violet themes;
- other CRM surfaces still use mixed imported lead data and internal user data,
  so this pass only changes the lead detail `Business Card Details` panel.

## 2026-08-04 CHA customers operational-table migration handoff

Moved the CHA customer register off the page-local `ChaTable` markup and onto
the shared Monolith operational data-table contract so the route now uses the
same production table family as the rest of the CHA workspace.

Delivered:

- updated `src/app/(dashboard)/cha/customers/page.tsx` to replace the local
  bordered table wrapper and raw table cells with
  `OperationalDataTable`, `OperationalDataTableWrap`, `OperationalTable`,
  `OperationalPrimaryCell`, `OperationalStatus`,
  `OperationalTableEmpty`, and `OperationalDataTableFooter`;
- preserved the existing search/filter bar, metrics, permissions, CRM view
  link, edit link, and delete action behavior while aligning the register with
  the approved design-system table structure;
- regenerated `docs/ui-route-audit.md`,
  `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md`, and
  `docs/ui-component-and-style-ownership-audit.md`.

Verification on Tuesday, August 4, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/app/(dashboard)/cha/customers/page.tsx'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 node scripts/audit-ui-routes.mjs`:
  passed and regenerated the route audit and migration matrix;
- `NODE_OPTIONS=--max-old-space-size=8192 node scripts/generate-ui-component-style-audit.mjs`:
  passed and regenerated the ownership audit;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run design-system:verify`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  still fails on the existing unrelated Accounting recurring/customization,
  CRM incentives, HRMS incentives, recurring-sales-invoice, and incentives
  service baseline errors;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run architecture:check`:
  still fails on the pre-existing repository-wide `src/components/monolith`
  ownership baseline, not on the CHA customers route change.

Open follow-up:

- the fresh static route audit still marks `/cha/customers` as
  `NON_COMPLIANT` because two `Link` elements still carry direct button-style
  classes for row actions; the table structure itself is now on the canonical
  operational data-table contract.
- no authenticated browser backend is attached in this Codex session, so
  runtime Light/Night/Violet verification for `/cha/customers` remains
  source-verified rather than screenshot-verified.

## 2026-08-03 HR letters browser-PDF preview handoff

Removed the in-app HR Letters preview implementation so letter previews now
open through the browser's native PDF viewer instead of rendering inside HRMS
modals, surfaces, or embedded iframes.

Delivered:

- added `src/app/api/hrms/letters/preview/route.ts` and
  `generateHRLetterPreviewPdf(...)` in
  `src/modules/hrms/letters-service.ts` so HR can generate a real preview PDF
  from the selected DOCX template and current field values before saving or
  issuing;
- updated
  `src/modules/hrms/components/letter-preparation-page.tsx` so `Preview
  letter` now generates the PDF and opens it in a separate browser tab instead
  of toggling the old preview modal;
- updated `src/modules/hrms/components/letters-view.tsx` so the review modal
  no longer embeds draft or issued previews inline and instead provides
  browser-viewer actions for draft preview generation and issued PDFs;
- updated `src/app/(dashboard)/hrms/letters/view/[id]/page.tsx` so the
  employee-facing portal now offers `Open PDF Viewer` and download actions
  instead of embedding the PDF inside the page;
- removed the unused preview-only components
  `src/modules/hrms/components/letter-document-preview-modal.tsx` and
  `src/modules/hrms/components/letter-document-preview-surface.tsx`;
- regenerated `docs/ui-route-audit.md`,
  `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md`, and
  `docs/ui-component-and-style-ownership-audit.md`.

Verification on Monday, August 3, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/modules/hrms/components/letter-preparation-page.tsx' 'src/modules/hrms/components/letters-view.tsx' 'src/modules/hrms/components/letters-shared.ts' 'src/modules/hrms/letters-service.ts' 'src/app/api/hrms/letters/preview/route.ts' 'src/app/(dashboard)/hrms/letters/view/[id]/page.tsx'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 node scripts/audit-ui-routes.mjs`:
  passed and regenerated the route audit and migration matrix;
- `NODE_OPTIONS=--max-old-space-size=8192 node scripts/generate-ui-component-style-audit.mjs`:
  passed and regenerated the ownership audit;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run design-system:verify`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  still fails for existing unrelated Accounting, CRM, HRMS incentives, and
  Incentives service baseline type errors;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run architecture:check`:
  still fails on the pre-existing repository-wide Monolith component ownership
  baseline under `src/components/monolith`, not on the HR letters preview
  changes.

Open follow-up:

- preview PDFs are generated as temporary public files under
  `public/import-output/letters/previews/`; this change does not yet add a
  cleanup lifecycle for those preview artifacts;
- no authenticated browser automation backend is attached in this Codex
  session, so runtime confirmation is code-verified and action-wired but not
  screenshot-verified in-app.

## 2026-08-03 HR letters preparation route migration

Moved the HR letter drafting workflow out of the modal stack and into a
dedicated dashboard route so draft creation now follows the same page-based
Monolith workspace pattern as the rest of the application.

Delivered:

- added `src/app/(dashboard)/hrms/letters/prepare/page.tsx` as the new
  authenticated preparation route;
- added
  `src/modules/hrms/components/letter-preparation-page.tsx` to host the full
  draft setup flow with shared design-system page chrome, action buttons, and
  a dedicated `Preview letter` action;
- added `src/modules/hrms/components/letters-shared.ts` so both the draft
  preparation page and the existing review flow reuse the same template preview
  rendering logic;
- updated `src/modules/hrms/components/letters-view.tsx` so the main `Prepare
  Letter` action routes to the new page instead of opening a modal, while the
  existing registry and approval review behavior remain intact.

Verification on Monday, August 3, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/modules/hrms/components/letters-view.tsx' 'src/modules/hrms/components/letter-preparation-page.tsx' 'src/modules/hrms/components/letters-shared.ts' 'src/app/(dashboard)/hrms/letters/prepare/page.tsx'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 node scripts/audit-ui-routes.mjs`:
  regenerated `docs/ui-route-audit.md` and
  `docs/UI_DESIGN_SYSTEM_MIGRATION_STATUS.md` to include the new route;
- `NODE_OPTIONS=--max-old-space-size=8192 node scripts/generate-ui-component-style-audit.mjs`:
  regenerated `docs/ui-component-and-style-ownership-audit.md`.

## 2026-08-03 border normalization and HR letters source-actions cleanup

Reduced one recurring Monolith UI regression pattern where route-local border
utilities were bypassing the shared border contract and producing heavier
outlines than the approved design system surfaces.

Delivered:

- updated `src/styles/monolith-system.css` to normalize active raw
  `border-mono-border*`, `divide-mono-border*`, and direct
  `border-[var(--mnx-border)]*` utility usages back onto the shared Monolith
  border tone instead of letting each route vary border strength ad hoc;
- removed the extra outlined container around the HR Letters `Source DOCX
  actions` block in `src/modules/hrms/components/letters-view.tsx` so the
  actions now sit on a softer elevated surface without the heavy rounded
  outline shown in the reported screenshot;
- preserved the earlier HR Letters toolbar button migration so those editor
  controls still use the canonical shared `Button` primitive.

Verification on Monday, August 3, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/modules/hrms/components/letters-view.tsx'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  still fails for existing unrelated repository-wide TypeScript issues in
  Accounting, CRM, HRMS incentives, and incentives service files that were not
  touched in this border pass.

Open follow-up:

- this change normalizes the most common raw border anti-pattern centrally, but
  the repository still contains many route-local hand-authored border/layout
  combinations that should be migrated route by route to canonical shared
  surfaces and field controls for full design-system compliance;
- no browser backend is attached in this Codex session, so visual verification
  remains source-verified and lint-verified rather than screenshot-tested in
  app.

## 2026-08-03 HR letters draft submission handoff

Patched the live HR Letters workflow so new drafts can finally leave the
registry and enter the approval inbox.

Delivered:

- added a `Submit for Review` action to draft rows in
  `src/modules/hrms/components/letters-view.tsx`;
- added the same action inside the draft review modal so operators can submit
  after checking the captured field values;
- left the existing review/issue controls unchanged for `HR_REVIEW`,
  `LEGAL_REVIEW`, `MGMT_APPROVAL`, and `READY_TO_ISSUE`.

Verification on Monday, August 3, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/modules/hrms/components/letters-view.tsx'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  still fails for unrelated existing repository-wide TypeScript issues outside
  HR Letters;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run architecture:check`:
  still fails because tracked generated screenshots and `verification.json`
  remain under `artifacts/ui-migration/final-runtime/`.

## 2026-08-01 accounting workspace catalog handoff

Reduced the current Accounting route sprawl by moving the live workspace list
into one module-owned catalog and wiring both the shared sidebar and the
`/accounting` landing hub to that same source.

Delivered:

- added `src/modules/accounting/workspace-catalog.ts` as the canonical source
  for present Accounting workspace labels, permissions, grouping, route
  matching, descriptions, and card icons;
- updated `src/lib/navigation.ts` so the Accounting sidebar now consumes that
  module-owned catalog instead of maintaining a separate inline route list;
- updated `src/app/(dashboard)/accounting/page.tsx` so the landing hub uses the
  same catalog for workflow descriptions and icons;
- added a regression assertion in `src/lib/navigation.test.ts` so visible
  Accounting nav items continue to mirror the catalog.

Verification on Saturday, August 1, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/modules/accounting/workspace-catalog.ts' 'src/lib/navigation.ts' 'src/lib/navigation.test.ts' 'src/app/(dashboard)/accounting/page.tsx'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- targeted `git diff --check` for the touched Accounting catalog and navigation
  files: passed, aside from the normal Windows line-ending warnings in the
  worktree.

## 2026-08-01 accounting route discoverability handoff

Audited the dashboard route tree against the shared navigation and confirmed
the current Accounting complaint was a discoverability gap rather than missing
route files.

Delivered:

- compared the top-level Accounting routes in
  `src/app/(dashboard)/accounting/**/page.tsx` against the canonical Accounting
  nav section;
- found that `/accounting/configuration/admin` was a real top-level workspace
  but was not exposed from the shared Accounting navigation;
- updated `src/lib/navigation.ts` so `Configuration Admin` is now visible in
  the Accounting sidebar and automatically appears on the `/accounting`
  workspace landing page that is derived from the same section data;
- updated the Accounting landing-page route metadata in
  `src/app/(dashboard)/accounting/page.tsx`;
- added a regression check in `src/lib/navigation.test.ts` to keep both
  configuration routes discoverable.

Verification on Saturday, August 1, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx vitest run src/lib/navigation.test.ts`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/lib/navigation.ts' 'src/lib/navigation.test.ts' 'src/app/(dashboard)/accounting/page.tsx'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- targeted `git diff --check` for the touched navigation and Accounting files:
  passed, aside from the normal Windows line-ending warnings in the worktree.

## 2026-08-01 global single-font handoff

Unified the live website typography to one family so every shared token path
now resolves to Geist Sans instead of mixing the earlier sans, display, and
mono variants.

Delivered:

- removed the extra Geist Mono loader from `src/app/layout.tsx`, leaving the
  root app shell to load only the Geist Sans webfont;
- repointed `--mn-font-sans`, `--mn-font-display`, and `--mn-font-mono` in
  `src/styles/monolith-tokens.css` to the same sans family;
- aligned the legacy compatibility theme aliases in
  `src/styles/legacy-compatibility.css` to that same sans family so older
  utility-driven surfaces do not reintroduce the removed font;
- replaced the remaining direct production stylesheet references and the CHA
  expenses SVG text fallback so they consume the shared token instead of
  separate hardcoded family names.

Verification on Saturday, August 1, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/app/layout.tsx' 'src/app/(dashboard)/cha/expenses/expenses-client.tsx'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- targeted `git diff --check` for the touched typography files: passed, aside
  from the normal Windows line-ending warnings in the worktree.

Open follow-up:

- browser-based visual confirmation across all routes remains manual in this
  session because no Codex browser backend is attached, so this handoff should
  be treated as code-verified but still needing live UI review.

## 2026-08-01 workspace spacing handoff

Normalized the shared vertical spacing rhythm across workspace pages so the
distance between page headers, section headings, navigation strips, and the
next surface no longer varies by module or silently disappears on shells that
were using an undefined spacing token.

Delivered:

- added `--mn-space-7`, `--mn-layout-workspace-stack-gap`, and
  `--mn-layout-workspace-stack-gap-mobile` in
  `src/styles/monolith-tokens.css`;
- updated `src/styles/monolith-system.css` so `WorkspacePage` now provides the
  shared page stack gap and the core customer portal, communication/admin, CHA,
  Accounting, People, Performance, and CRM shells all align to it;
- synced the module-owned stylesheet mirrors in
  `src/styles/modules/{accounting,cha-expense,communication-admin,crm,people,performance}.css`
  to the same contract;
- reduced the admin design-system catalogue page stack gap to the shared
  workspace value so its headings and specimens match the production page
  spacing used elsewhere.

Verification on Saturday, August 1, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- targeted `git diff --check` for the touched token and stylesheet files:
  passed, aside from the normal Windows line-ending warnings in the worktree;
- targeted ESLint on the touched CSS files produced only expected repository
  “file ignored because no matching configuration was supplied” warnings and no
  errors.

Open follow-up:

- visual browser confirmation remains manual in this session because no Codex
  browser backend is attached, so the fix was verified through the shared style
  contract and repository checks rather than screenshot automation.

## 2026-08-01 global loading-screen handoff

Unified route-level loading so the airplane preloader now acts as the common
loading screen across the app instead of being limited to the root loader while
dashboard and portal segments still rendered their own skeleton states.

Delivered:

- added `src/components/feedback/app-route-loading.tsx` to centralize route
  loading copy and reuse the shared `LoadingScreen`;
- replaced the existing route-segment loaders under `src/app` so dashboard,
  module, and customer-portal segments now use the same airplane preloader;
- added missing top-level loaders for `(auth)`, `customer-portal`,
  `google-chat-link`, `invite`, and `verify`, which extends the same loading
  screen to those page families during navigation and initial segment
  resolution.

Verification on Saturday, August 1, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- targeted ESLint for the shared loader component and touched `loading.tsx`
  files: passed;
- targeted `git diff --check` for the touched loader files: passed, aside from
  the normal Windows line-ending warnings in the worktree.

Open follow-up:

- interactive browser confirmation is still session-blocked because this Codex
  run does not have an attached browser backend, so the loading screen behavior
  was verified by static route-segment wiring rather than in-browser automation.

## 2026-08-01 Accounting demo bootstrap and setup-guide continuation
## 2026-08-01 merge recovery and startup handoff

Completed a dedicated Accounting demo workflow that Finance/Admin can trigger
from Admin Settings, plus the shared bootstrap fixes needed for that workflow
to post cleanly through the canonical engine.

Delivered:

- added `src/modules/accounting/demo.ts` to seed an idempotent July 2026
  Accounting walkthrough into the current organisation using dedicated demo
  maker/approver users, demo customer/vendor masters, bank metadata, posted
  documents, posted payments, and posted manual journals;
- added `seedAccountingDemoMonthAction` in
  `src/modules/accounting/actions.ts` and surfaced it in
  `src/app/(dashboard)/admin/settings/page.tsx`,
  `src/app/(dashboard)/admin/settings/settings-client.tsx`, and
  `src/components/monolith/admin-workspace.tsx` so Admin Settings now exposes a
  clear Accounting-specific demo button and result summary;
- hardened `src/modules/accounting/legacy-bootstrap.ts` so missing
  `AccountingAccountControl` rows are automatically created for active posting
  ledgers, with party requirements now limited to the configured trade
  receivable/payable control ledgers instead of every payable-like account;
- extended `src/lib/catalogue-data.ts` and
  `src/app/(dashboard)/product-catalogue/page.tsx` with a detailed Accounting
  implementation guide covering prerequisites, setup sequence, July 2026 demo
  runbook, and working checks.

Verification on Saturday, August 1, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/modules/accounting/demo.ts' 'src/modules/accounting/legacy-bootstrap.ts' 'src/app/(dashboard)/admin/settings/page.tsx' 'src/app/(dashboard)/admin/settings/settings-client.tsx' 'src/components/monolith/admin-workspace.tsx' 'src/app/(dashboard)/product-catalogue/page.tsx' 'src/lib/catalogue-data.ts'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- live `seedAccountingDemoMonth(...)` run for
  `hr@adarshshipping.in` / org `cmr4m8jb10000ysbwuoj2bvvx`: passed and produced
  2 posted canonical documents, 2 posted payments, 3 posted manual journals,
  and balanced July 2026 totals of debit `892850.00` and credit `892850.00`;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build`: passed; the build
  still prints the existing unrelated Turbopack NFT tracing warning through
  `next.config.ts` and
  `src/app/api/customer-portal/document-versions/[id]/route.ts`.

Known limits:

- the new demo bootstrap seeds the current active organisation rather than
  creating a separate org that users can switch into;
- `src/modules/accounting/actions.ts` still has the existing repository-wide
  `no-explicit-any` lint baseline and was not cleaned up in this pass.

## 2026-08-01 Accounting FX revaluation draft continuation

Completed the last open 9.18 Accounting FX automation gap by turning close-date
review into a controlled draft-journal workflow instead of leaving it as
manual-only evidence.

Delivered:

- extended `src/modules/accounting/foreign-exchange.ts` so close runs can now
  resolve configured FX gain/loss posting accounts, convert realized and
  unrealized review rows into balanced journal lines, create a normal draft
  journal through the existing maker-checker journal service, and persist the
  draft lineage/status back onto the close run;
- updated `src/app/(dashboard)/accounting/currency-adjustments/page.tsx` so
  the close-run table now uses the richer FX workspace data, supports `Refresh
  FX review`, allows `Create FX draft` after review evidence exists, and links
  directly to the resulting journal detail route;
- added focused unit coverage in
  `src/modules/accounting/__tests__/foreign-exchange.test.ts` for happy-path
  draft creation and missing-account safeguards;
- added `vitest.unit.config.ts` so mocked unit suites like the new FX draft
  coverage can run locally without requiring the repository's staging-database
  Vitest bootstrap.

Verification on Saturday, August 1, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/modules/accounting/foreign-exchange.ts' 'src/app/(dashboard)/accounting/currency-adjustments/page.tsx' 'src/modules/accounting/__tests__/foreign-exchange.test.ts'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx vitest run --config vitest.unit.config.ts src/modules/accounting/__tests__/foreign-exchange.test.ts src/modules/accounting/__tests__/tax-settlement.test.ts src/modules/accounting/__tests__/phase9-late-slices.test.ts --reporter verbose`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build`: passed; Turbopack
  still reports the existing unrelated NFT tracing warning through
  `next.config.ts` and
  `src/app/api/customer-portal/document-versions/[id]/route.ts`, but the build
  completed successfully.

Known limits:

- browser verification remains intentionally skipped for the remaining Phase 9
  slices per current instruction;
- Phase 9 implementation is now complete through 9.23, with only optional
  authenticated browser QA left if a browser backend returns in a later
  session.

## 2026-08-01 Accounting foreign-exchange review continuation

Continued the remaining 9.18 Accounting FX parity by adding realized and
unrealized review behavior on top of the earlier currency-control and
tax-settlement workspaces.

Delivered:

- added `src/modules/accounting/foreign-exchange.ts` so Accounting can now
  compute open foreign-currency revaluation exposure from approved historical
  and latest FX rates, compute realized settlement variance from actual
  payment allocations, and record a close-run FX review snapshot into
  `AccountingPeriodCloseRun`;
- updated `src/app/(dashboard)/accounting/currency-adjustments/page.tsx` so
  the route now shows unrealized and realized FX review tables plus a
  controlled `Record FX review` action for open, ready, and reopened close
  runs;
- tightened `src/modules/accounting/tax-settlement.ts` so final close now
  requires a matching FX review snapshot when foreign-currency exposure or
  settlement variance exists for the close date;
- extended `src/modules/accounting/phase9-workspaces.ts` and
  `src/modules/accounting/__tests__/tax-settlement.test.ts` so row-version and
  guarded close behavior stay covered.

Verification on Saturday, August 1, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/modules/accounting/foreign-exchange.ts' 'src/modules/accounting/tax-settlement.ts' 'src/app/(dashboard)/accounting/currency-adjustments/page.tsx' 'src/modules/accounting/phase9-workspaces.ts' 'src/modules/accounting/__tests__/tax-settlement.test.ts'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx vitest run 'src/modules/accounting/__tests__/tax-settlement.test.ts' 'src/modules/accounting/__tests__/phase9-late-slices.test.ts'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build`: passed; Turbopack
  still reports the existing unrelated NFT tracing warning through
  `next.config.ts` and
  `src/app/api/customer-portal/document-versions/[id]/route.ts`, but the build
  completed successfully.

Known limits:

- browser verification remains intentionally skipped for the remaining Phase 9
  slices per current instruction;
- the largest remaining 9.18 FX gap is now automatic journalized revaluation
  posting rather than realized/unrealized review and close-evidence control.

## 2026-08-01 Accounting tax-settlement behavior continuation

Continued the 9.18 Accounting parity work by adding operational filing-period
and period-close transitions on top of the earlier tax-settlement visibility
workspace.

Delivered:

- added `src/modules/accounting/tax-settlement.ts` so statutory filing periods
  can now move through guarded `OPEN -> READY -> FILED` transitions with
  report-availability checks, live report snapshots, acknowledgement-reference
  enforcement, audit logging, and row-version protection;
- added guarded close-run transitions so period-close runs can now move through
  `OPEN/REOPENED -> READY -> CLOSED` and `CLOSED -> REOPENED`, with blocking
  checks for overlapping open filing periods and missing transaction-lock
  coverage before final close;
- updated `src/app/(dashboard)/accounting/tax-settlement/page.tsx` so Finance
  operators can now execute those controlled filing and close transitions
  directly from the live settlement workspace instead of returning to
  configuration-admin CRUD;
- extended `src/modules/accounting/phase9-workspaces.ts` and added
  `src/modules/accounting/__tests__/tax-settlement.test.ts` so row-version
  data and focused transition coverage back the new operational behavior.

Verification on Saturday, August 1, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/modules/accounting/tax-settlement.ts' 'src/app/(dashboard)/accounting/tax-settlement/page.tsx' 'src/modules/accounting/__tests__/tax-settlement.test.ts' 'src/modules/accounting/phase9-workspaces.ts'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx vitest run 'src/modules/accounting/__tests__/tax-settlement.test.ts' 'src/modules/accounting/__tests__/phase9-late-slices.test.ts'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build`: passed; Turbopack
  still reports the existing unrelated NFT tracing warning through
  `next.config.ts` and
  `src/app/api/customer-portal/document-versions/[id]/route.ts`, but the build
  completed successfully.

Known limits:

- browser verification remains intentionally skipped for the remaining Phase 9
  slices per current instruction;
- the largest remaining 9.18 gap is now deeper foreign-exchange parity,
  especially realized/unrealized revaluation behavior, rather than missing
  filing or close transition controls.

## 2026-08-01 Banking overview and account workspace foundation handoff

The existing `/accounting/banking` route now behaves as a real Banking
overview instead of only a liquid-ledger transfer hub, and it now has a linked
account transaction workspace under `/accounting/banking/[bankAccountId]`.

Delivered:

- added `src/modules/accounting/banking-service.ts`,
  `src/modules/accounting/banking-actions.ts`, and
  `src/modules/accounting/banking-shared.ts`;
- rebuilt `src/app/(dashboard)/accounting/banking/page.tsx` and
  `src/app/(dashboard)/accounting/banking/banking-client.tsx` so Banking now
  reads `AccountingBankAccount` plus posted ledger data, supports search/date/
  status filtering, shows separate Amount in Bank and Amount in Books values,
  masks account identifiers before browser delivery, and exposes only working
  actions;
- added `src/app/(dashboard)/accounting/banking/[bankAccountId]/page.tsx` and
  `bank-account-client.tsx` so each bank account now has a posted-book
  transactions view with deterministic ordering, opening carry-forward running
  balance, and source-document links where the repository already has routes;
- reused the existing `saveAccountingBankAccount` configuration boundary for
  create/update/inactivate operations instead of creating a second Banking
  persistence path;
- added focused Banking tests in
  `src/modules/accounting/__tests__/banking-service.test.ts` and
  `src/app/(dashboard)/accounting/banking/banking-client.test.tsx`.

Files:

- `src/modules/accounting/banking-shared.ts`
- `src/modules/accounting/banking-service.ts`
- `src/modules/accounting/banking-actions.ts`
- `src/modules/accounting/__tests__/banking-service.test.ts`
- `src/app/(dashboard)/accounting/banking/page.tsx`
- `src/app/(dashboard)/accounting/banking/banking-client.tsx`
- `src/app/(dashboard)/accounting/banking/banking-client.test.tsx`
- `src/app/(dashboard)/accounting/banking/[bankAccountId]/page.tsx`
- `src/app/(dashboard)/accounting/banking/[bankAccountId]/bank-account-client.tsx`

Verification on Saturday, August 1, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/modules/accounting/banking-shared.ts' 'src/modules/accounting/banking-service.ts' 'src/modules/accounting/banking-actions.ts' 'src/modules/accounting/__tests__/banking-service.test.ts' 'src/app/(dashboard)/accounting/banking/page.tsx' 'src/app/(dashboard)/accounting/banking/banking-client.tsx' 'src/app/(dashboard)/accounting/banking/banking-client.test.tsx' 'src/app/(dashboard)/accounting/banking/[bankAccountId]/page.tsx' 'src/app/(dashboard)/accounting/banking/[bankAccountId]/bank-account-client.tsx'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx vitest run 'src/modules/accounting/__tests__/banking-service.test.ts' 'src/app/(dashboard)/accounting/banking/banking-client.test.tsx'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx prisma validate`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build`: passed; the build
  still prints the existing Turbopack NFT tracing warning through
  `next.config.ts` and
  `src/app/api/customer-portal/checklist-files/[id]/route.ts`, but Banking no
  longer introduces any client/server boundary build failure.

Known limits:

- no real bank connectors, automatic import, statement inbox, rule engine,
  reconciliation, deposit capture, or undo-import flow was started in this
  slice;
- the Banking manage dialogs stay within the existing `AccountingBankAccount`
  shape and configuration metadata rather than inventing unsupported schema or
  direct balance writes;
- route denial still follows the existing Accounting access-gate behavior,
  rather than rendering a Banking-local denied view, because the route is
  guarded before page rendering.

## 2026-08-01 Accounting dashboard late-phase visibility continuation

Continued the 9.20 to 9.23 acceptance work by upgrading the main Accounting
landing route so the newer statutory, reporting, integration, and
customization slices are visible from `/accounting` instead of only in leaf
workspaces.

Delivered:

- updated `src/app/(dashboard)/accounting/page.tsx` so the dashboard now loads
  live summaries from the currency-control, tax-settlement, report-builder,
  integrations, and customization workspaces in parallel with the existing
  operational queue metrics;
- added a Phase 9 controls metric band for foreign-currency subledgers, open
  filing periods, active export profiles, active source mappings, and active
  custom metadata;
- added dashboard tables for connected late-phase workspaces and recent
  statutory filing / close checkpoints so the Accounting landing route reflects
  the broader Phase 9 surface area rather than only core drafts, approvals,
  allocations, and audit activity.

Verification on Saturday, August 1, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/app/(dashboard)/accounting/page.tsx' 'src/modules/accounting/phase9-workspaces.ts' 'src/app/(dashboard)/accounting/currency-adjustments/page.tsx' 'src/app/(dashboard)/accounting/tax-settlement/page.tsx'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx vitest run 'src/modules/accounting/__tests__/operational-access.test.ts' 'src/modules/accounting/__tests__/operational-ui.architecture.test.ts' 'src/modules/accounting/__tests__/phase9-late-slices.test.ts'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build`: passed.

Open follow-up:

- browser verification remains intentionally skipped for the remaining Phase 9
  slices per current instruction;
- the largest remaining gaps are now deeper behavioral parity in the 9.18
  close/tax/FX area and any final specification-derived assertions that still
  need explicit test coverage.

## 2026-08-01 Accounting tax-settlement and currency-control continuation

Continued the 9.18 Accounting parity work by turning the earlier
currency/locking/tax foundations into live operational control surfaces for
Finance.

Delivered:

- extended `src/modules/accounting/phase9-workspaces.ts` with
  `getAccountingCurrencyControlWorkspace()` and
  `getAccountingTaxSettlementWorkspace()` so Accounting now has
  server-authoritative workspace queries for functional-currency controls,
  foreign-currency customer/vendor subledgers, filing periods, validated tax
  profiles, GST summary snapshots, period-close checkpoints, and current
  transaction-lock dates;
- updated `src/app/(dashboard)/accounting/currency-adjustments/page.tsx` so
  the route now shows foreign-currency profile visibility and recent close-run
  checkpoints alongside the earlier FX evidence view;
- added `src/app/(dashboard)/accounting/tax-settlement/page.tsx` with live
  Monolith metrics, GST reporting snapshot cards, filing-period and close-run
  tables, and workflow connectors into reports, transaction locking,
  configuration admin, and currency controls;
- updated `src/components/monolith/accounting-workspace.tsx`,
  `src/lib/navigation.ts`, and
  `src/modules/accounting/operational-access.ts` so
  `/accounting/tax-settlement` is routed, labeled, and permission-gated as a
  first-class Accounting workspace;
- updated `src/modules/accounting/__tests__/operational-access.test.ts` and
  `src/modules/accounting/__tests__/operational-ui.architecture.test.ts` so
  the new route is included in shared operational assertions.

Verification on Saturday, August 1, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/modules/accounting/phase9-workspaces.ts' 'src/app/(dashboard)/accounting/currency-adjustments/page.tsx' 'src/app/(dashboard)/accounting/tax-settlement/page.tsx' 'src/components/monolith/accounting-workspace.tsx' 'src/modules/accounting/operational-access.ts' 'src/lib/navigation.ts' 'src/modules/accounting/__tests__/operational-access.test.ts' 'src/modules/accounting/__tests__/operational-ui.architecture.test.ts'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx vitest run 'src/modules/accounting/__tests__/operational-access.test.ts' 'src/modules/accounting/__tests__/operational-ui.architecture.test.ts' 'src/modules/accounting/__tests__/phase9-late-slices.test.ts'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run accounting:phase9:test`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build`: passed.

Open follow-up:

- browser verification remains intentionally skipped for the remaining Phase 9
  slices per current instruction;
- with the local dev server stopped, the earlier `.next\\monolith-dev-3.stderr.log`
  lock is no longer blocking build verification;
- the next highest-value work is deeper 9.18 behavioral parity for tax
  settlement / FX automation and any remaining 9.20 to 9.23 acceptance gaps.

## 2026-08-01 Accounting late-phase workspaces and API continuation

Continued Accounting Phase 9 past the 9.15 purchases slice by wiring the
missing late-phase operational surfaces across approvals, communications,
customization, report builder, integrations, and slice-derived tests.

Delivered:

- added additive persisted Accounting customization registries in
  `prisma/schema.prisma` plus
  `prisma/migrations/20260801000310_accounting_phase9_customization_and_automation/migration.sql`
  for `AccountingCustomFieldDefinition`, `AccountingAutomationRule`, and
  `AccountingWorkspaceModule`;
- added `src/modules/accounting/customization.ts` and
  `src/modules/accounting/phase9-workspaces.ts` so Accounting now has
  server-authoritative customization CRUD plus late-phase workspace summary
  queries;
- added live Monolith routes `/accounting/customization`,
  `/accounting/communications`, `/accounting/report-builder`, and
  `/accounting/integrations`, and expanded `/accounting/approvals` with
  workflow coverage summary;
- added authenticated Accounting API endpoints for approval summaries,
  communications, report catalog, integrations, custom fields, automation
  rules, and workspace modules;
- updated shared Accounting route metadata, navigation, and access control so
  the new routes behave as first-class Finance workspaces;
- added focused late-slice tests in
  `src/modules/accounting/__tests__/phase9-late-slices.test.ts` and extended
  the existing operational route architecture tests to include the new routes.

Verification on Saturday, August 1, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx prisma validate`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx prisma generate`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/modules/accounting/customization.ts' 'src/modules/accounting/phase9-workspaces.ts' 'src/app/(dashboard)/accounting/customization/page.tsx' 'src/app/(dashboard)/accounting/communications/page.tsx' 'src/app/(dashboard)/accounting/report-builder/page.tsx' 'src/app/(dashboard)/accounting/integrations/page.tsx' 'src/app/(dashboard)/accounting/approvals/page.tsx' 'src/app/api/accounting/approvals/summary/route.ts' 'src/app/api/accounting/communications/route.ts' 'src/app/api/accounting/reports/catalog/route.ts' 'src/app/api/accounting/custom-fields/route.ts' 'src/app/api/accounting/custom-fields/[id]/route.ts' 'src/app/api/accounting/automation-rules/route.ts' 'src/app/api/accounting/automation-rules/[id]/route.ts' 'src/app/api/accounting/workspace-modules/route.ts' 'src/app/api/accounting/workspace-modules/[id]/route.ts' 'src/app/api/accounting/integrations/route.ts' 'src/components/monolith/accounting-workspace.tsx' 'src/modules/accounting/operational-access.ts' 'src/lib/navigation.ts' 'src/lib/db.ts'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx vitest run 'src/modules/accounting/__tests__/operational-access.test.ts' 'src/modules/accounting/__tests__/operational-ui.architecture.test.ts' 'src/modules/accounting/__tests__/phase9-late-slices.test.ts'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run accounting:phase9:test`:
  passed;
- targeted `git diff --check` for the touched late-phase files: passed, aside
  from the normal Windows line-ending warnings in the worktree.

Open follow-up:

- browser verification remains intentionally skipped for the remaining slices
  per current instruction;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build` remains blocked by the
  locked `.next\\monolith-dev-3.stderr.log` while the local dev app stays
  running on port 3000;
- deeper 9.18 multi-currency, subaccounts, locking, and tax-settlement parity
  is still the largest remaining specification gap after this continuation.

## 2026-08-01 Accounting debit-note and correction-route continuation

Continued the 9.15 Purchases lifecycle work by closing the customer-side
debit-note visibility gap and aligning the shared correction-route metadata
with its mixed customer/vendor behavior.

Delivered:

- added
  `src/app/(dashboard)/accounting/debit-notes/customer-note-drafts-client.tsx`
  and updated `src/app/(dashboard)/accounting/debit-notes/page.tsx` so
  customer debit-note drafts now appear alongside vendor debit-note drafts and
  the canonical debit-note register;
- updated `src/modules/accounting/service.ts` so customer-note listings now
  include original invoice references for source-lineage display;
- normalized `src/components/monolith/accounting-workspace.tsx`,
  `src/lib/navigation.ts`, and
  `src/modules/accounting/operational-access.ts` so the shared
  `/accounting/credit-notes` route now reads as mixed customer/vendor coverage
  instead of sales-only.

Verification on Saturday, August 1, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/app/(dashboard)/accounting/debit-notes/page.tsx' 'src/app/(dashboard)/accounting/debit-notes/customer-note-drafts-client.tsx' 'src/app/(dashboard)/accounting/debit-notes/vendor-note-drafts-client.tsx'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- targeted `git diff --check` for the touched debit-note and correction-route
  files: passed, aside from the normal Windows line-ending warnings in the
  worktree.

Open follow-up:

- browser verification is intentionally skipped for the remaining slices per
  current instruction;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build` remains blocked by the
  locked `.next\\monolith-dev-3.stderr.log` while the local dev app stays
  running on port 3000;
- the next 9.15 work should focus on deeper canonical payable-party mapping and
  any remaining vendor-settlement edge cases rather than basic correction-route
  coverage.

## 2026-08-01 Accounting expenses and reimbursements continuation

Continued the 9.15 Purchases lifecycle work by giving Accounting a live Finance
view over upstream operational expense and reimbursement payout queues.

Delivered:

- added `src/app/(dashboard)/accounting/expenses/page.tsx` with live Monolith
  metrics, workflow connectors, and queue tables for CHA operational expenses
  and HR fuel reimbursements that are payable-ready;
- updated `src/components/monolith/accounting-workspace.tsx`,
  `src/lib/navigation.ts`, and
  `src/modules/accounting/operational-access.ts` so `/accounting/expenses`
  behaves as a first-class Accounting route;
- intentionally kept payout execution in `/expense` and
  `/hrms/reimbursement` because those source workflows still own approval,
  proof, and party identity and do not yet resolve automatically into canonical
  customer or supplier payment-entry parties.

Verification on Saturday, August 1, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/app/(dashboard)/accounting/expenses/page.tsx' 'src/components/monolith/accounting-workspace.tsx' 'src/lib/navigation.ts' 'src/modules/accounting/operational-access.ts'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run accounting:phase9:test`:
  passed;
- targeted `git diff --check` for the touched Accounting expenses files:
  passed, aside from the normal Windows line-ending warnings in the worktree.

Open follow-up:

- browser verification is intentionally skipped for the remaining slices per
  current instruction;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build` remains blocked by the
  locked `.next\\monolith-dev-3.stderr.log` while the local dev app stays
  running on port 3000;
- the next 9.15 work should focus on any remaining vendor-settlement edge
  cases and on whether non-supplier payouts need explicit canonical payable
  party mapping for direct Accounting payment creation.

## 2026-08-01 Accounting vendor-credit and AP-settlement continuation

Continued the 9.15 Purchases lifecycle work by closing the vendor credit-note
draft visibility gap and improving the AP settlement handoff into vendor
payments.

Delivered:

- updated `src/app/(dashboard)/accounting/credit-notes/new/page.tsx` so both
  customer and supplier original-invoice pickers now use real posted invoice
  states instead of the impossible legacy `APPROVED` / `SUBMITTED` filter;
- added
  `src/app/(dashboard)/accounting/credit-notes/vendor-credit-drafts-client.tsx`
  and updated `src/app/(dashboard)/accounting/credit-notes/page.tsx` so vendor
  credit-note drafts now appear in Accounting with direct submit-to-canonical
  actions and canonical review links once prepared;
- updated `src/app/(dashboard)/accounting/payment-entries/new/page.tsx` and
  `new-payment-client.tsx` so vendor disbursement drafts can now open scoped to
  a supplier and specific purchase invoice, preloading the bill outstanding
  amount into both the payment amount and the initial allocation;
- updated `src/app/(dashboard)/accounting/purchase-invoices/[id]/page.tsx` and
  `src/app/(dashboard)/accounting/vendor-payments/page.tsx` so AP operators can
  jump directly from an open bill or the vendor-payment workspace into the
  scoped settlement flow.

Verification on Saturday, August 1, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/app/(dashboard)/accounting/credit-notes/page.tsx' 'src/app/(dashboard)/accounting/credit-notes/new/page.tsx' 'src/app/(dashboard)/accounting/credit-notes/vendor-credit-drafts-client.tsx' 'src/app/(dashboard)/accounting/payment-entries/new/page.tsx' 'src/app/(dashboard)/accounting/payment-entries/new/new-payment-client.tsx' 'src/app/(dashboard)/accounting/purchase-invoices/[id]/page.tsx' 'src/app/(dashboard)/accounting/vendor-payments/page.tsx'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run accounting:phase9:test`:
  passed;
- targeted `git diff --check` for the touched vendor-credit and AP-settlement
  files: passed, aside from the normal Windows line-ending warnings in the
  worktree.

Open follow-up:

- browser verification is intentionally skipped for the remaining slices per
  current instruction;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build` remains blocked by the
  locked `.next\\monolith-dev-3.stderr.log` while the local dev app stays
  running on port 3000;
- direct expense-entry / reimbursement parity and any remaining AP settlement
  edge cases should be the next 9.15 targets.

## 2026-08-01 Accounting recurring-bill continuation

Continued the 9.15 Purchases lifecycle work by turning the dormant
`RecurringExpense` foundation into a live recurring-bill workflow that
generates draft purchase invoices instead of legacy direct posting.

Delivered:

- added additive recurring-bill run persistence in `prisma/schema.prisma` plus
  `prisma/migrations/20260801000300_accounting_phase9_recurring_expense_runs/migration.sql`;
- added `src/modules/accounting/recurring-expenses.ts` and
  `src/modules/accounting/recurring-expense-actions.ts` so Accounting can now
  create recurring bill profiles, process due occurrences, generate one-off
  draft purchase invoices, skip due dates, pause/resume profiles, and record
  generated / skipped / failed run lineage with idempotency keys;
- added `src/app/(dashboard)/accounting/recurring/recurring-expense-client.tsx`
  and updated `src/app/(dashboard)/accounting/recurring/page.tsx` so the live
  recurring workspace now hosts both recurring sales invoices and recurring
  bills in one Monolith operational route;
- updated `src/lib/db.ts` so the Prisma singleton refresh guard recognizes the
  new recurring-expense run delegate.

Verification on Saturday, August 1, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx prisma validate`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx prisma generate`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/modules/accounting/recurring-expenses.ts' 'src/modules/accounting/recurring-expense-actions.ts' 'src/app/(dashboard)/accounting/recurring/page.tsx' 'src/app/(dashboard)/accounting/recurring/recurring-expense-client.tsx' 'src/app/(dashboard)/accounting/recurring/recurring-sales-client.tsx' 'src/lib/db.ts'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run accounting:phase9:test`:
  passed;
- targeted `git diff --check` for the touched recurring-bill files: passed,
  aside from the normal Windows line-ending warnings in the worktree.

Open follow-up:

- browser verification is intentionally skipped for the remaining slices per
  current instruction;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build` remains blocked by the
  locked `.next\\monolith-dev-3.stderr.log` while the local dev app stays
  running on port 3000;
- vendor-credit, expense, and settlement parity are still open in 9.15 and
  should be the next targets.

## 2026-08-01 Accounting vendor debit-note continuation

Continued the 9.15 Purchases lifecycle work by exposing vendor debit-note
drafts inside Accounting and fixing the purchase-side original-invoice
selection path.

Delivered:

- updated `src/app/(dashboard)/accounting/debit-notes/new/page.tsx` so both
  customer and supplier original-invoice pickers now use real posted invoice
  states instead of the impossible legacy `APPROVED` / `SUBMITTED` filter;
- added
  `src/app/(dashboard)/accounting/debit-notes/vendor-note-drafts-client.tsx`
  and updated `src/app/(dashboard)/accounting/debit-notes/page.tsx` so vendor
  debit-note drafts now appear in a dedicated draft register with direct
  submit-to-canonical actions and canonical review links once prepared;
- updated `src/modules/accounting/service.ts` so vendor-note listings now
  include original purchase-invoice references for AP correction lineage.

Verification on Saturday, August 1, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/app/(dashboard)/accounting/debit-notes/page.tsx' 'src/app/(dashboard)/accounting/debit-notes/new/page.tsx' 'src/app/(dashboard)/accounting/debit-notes/vendor-note-drafts-client.tsx'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- targeted `git diff --check` for the touched debit-note files: passed, aside
  from the normal Windows line-ending warnings in the worktree.

Open follow-up:

- authenticated browser verification still cannot run in this Codex session
  because the browser runtime exposes zero available browser backends even
  though the local app itself is healthy;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build` remains blocked by the
  locked `.next\\monolith-dev-3.stderr.log` while the local dev app stays
  running on port 3000;
- recurring-bill, vendor-credit, expense, and settlement parity are still open
  in 9.15 and should be the next targets.

## 2026-08-01 Accounting purchase-order continuation

Started the 9.15 Purchases lifecycle work by turning purchase orders into a
true supplier-side Accounting workflow with draft purchase-invoice conversion.

Delivered:

- added additive purchase-order lineage persistence in `prisma/schema.prisma`
  plus
  `prisma/migrations/20260801000250_accounting_phase9_purchase_order_purchase_invoice_lineage/migration.sql`;
- added `src/modules/accounting/purchase-orders.ts` and
  `src/modules/accounting/purchase-order-actions.ts` so Accounting can now
  load supplier-aware purchase-order detail and convert eligible purchase
  orders into normal draft purchase invoices with duplicate prevention and an
  explicit mixed-tax safeguard;
- added `src/app/(dashboard)/accounting/purchase-orders/[id]/page.tsx` and
  `src/app/(dashboard)/accounting/purchase-orders/[id]/detail-client.tsx` so
  the Monolith now exposes supplier terms, order lines, linked-bill lineage,
  and one-click draft-bill conversion from the Accounting side;
- updated `src/app/(dashboard)/accounting/_components/commercial-documents-page.tsx`
  and `src/modules/crm/service.ts` so purchase-order rows now show the supplier
  instead of a customer account and expose a review action into the new detail
  route;
- updated `src/components/monolith/accounting-workspace.tsx` so
  `/accounting/purchase-orders/[id]` has dedicated route metadata.

Verification on Saturday, August 1, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx prisma validate`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx prisma generate`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/modules/accounting/purchase-orders.ts' 'src/modules/accounting/purchase-order-actions.ts' 'src/app/(dashboard)/accounting/purchase-orders/[id]/page.tsx' 'src/app/(dashboard)/accounting/purchase-orders/[id]/detail-client.tsx' 'src/app/(dashboard)/accounting/_components/commercial-documents-page.tsx' 'src/components/monolith/accounting-workspace.tsx'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run accounting:phase9:test`:
  passed.

Open follow-up:

- authenticated browser verification still cannot run in this Codex session
  because the browser runtime exposes zero available browser backends even
  though the local app itself is healthy;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build` remains blocked by the
  locked `.next\\monolith-dev-3.stderr.log` while the local dev app stays
  running on port 3000;
- recurring-bill, vendor-credit, expense, and settlement parity are still open
  in 9.15 and should be the next targets.

## 2026-08-01 Accounting customer-advance and sales-receipt continuation

Continued the 9.14 Sales lifecycle work by closing the remaining
retainer-invoice / customer-advance and sales-receipt gaps on top of the
canonical customer-receipt flow.

Delivered:

- added additive accounting customer-advance / retainer request persistence in
  `prisma/schema.prisma` plus
  `prisma/migrations/20260801000240_accounting_phase9_customer_advance_requests/migration.sql`;
- added `src/modules/accounting/customer-advances.ts` and
  `src/modules/accounting/customer-advance-actions.ts` so Accounting can now
  create customer-advance and retainer requests, summarize linked canonical
  receipt coverage by legacy-payment lineage, generate controlled receipt
  drafts against the remaining balance, and cancel untouched requests;
- added a live Monolith `/accounting/customer-advances` workspace in
  `src/app/(dashboard)/accounting/customer-advances/page.tsx` and
  `src/app/(dashboard)/accounting/customer-advances/customer-advances-client.tsx`
  with request intake, remaining-balance metrics, linked draft/canonical
  receipt lineage, and direct receipt-draft generation into the existing
  payment-entry approval flow;
- added dedicated `/accounting/sales-receipts` and
  `/accounting/sales-receipts/new` entry points, and updated
  `/accounting/customer-receipts` so sales receipts now have an explicit route
  and direct navigation into the customer-advances workspace;
- updated `src/lib/db.ts` so the Prisma singleton refresh guard recognizes the
  new customer-advance delegates;
- updated `tsconfig.json` so repo-wide TypeScript now compiles against stable
  `.next/types` output instead of the earlier corrupted `.next/dev/types`
  artifacts, and `next-env.d.ts` is already aligned with `.next/types`.

Verification on Saturday, August 1, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx prisma validate`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx prisma generate`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/modules/accounting/customer-advances.ts' 'src/modules/accounting/customer-advance-actions.ts' 'src/app/(dashboard)/accounting/customer-advances/page.tsx' 'src/app/(dashboard)/accounting/customer-advances/customer-advances-client.tsx' 'src/app/(dashboard)/accounting/sales-receipts/page.tsx' 'src/app/(dashboard)/accounting/customer-receipts/page.tsx' 'src/lib/db.ts' 'src/components/monolith/accounting-workspace.tsx' 'src/modules/accounting/operational-access.ts'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx next typegen`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run accounting:phase9:test`:
  passed;
- targeted `git diff --check` for the touched accounting sales files: passed,
  aside from the normal Windows line-ending warnings in the worktree.

Open follow-up:

- authenticated browser verification still cannot run in this Codex session
  because the browser runtime exposes zero available browser backends even
  though the local app itself is healthy;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build` remains blocked by the
  locked `.next\\monolith-dev-3.stderr.log` while the local dev app stays
  running on port 3000;
- 9.15 Purchases lifecycle parity is now the next active Phase 9 target.

## 2026-08-01 Manual journal contact-required enforcement continuation

The manual-journal contact toggle in ledger master is now enforced as a real
data requirement rather than a UI hint only.

Delivered:

- updated
  `src/app/(dashboard)/accounting/journal-entries/new/new-jv-client.tsx` so any
  line whose selected ledger has `allowJournalContact` enabled now marks the
  contact selector as required, blocks draft save when empty, and surfaces a
  matching operator-facing warning;
- updated `src/modules/accounting/service.ts` with shared
  `assertJournalContactRequirements(...)` validation so manual-journal drafts
  reject incomplete contact payloads during create and re-check the same rule
  again before posting older drafts.

Verification on Saturday, August 1, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- targeted `git diff --check` for the touched manual-journal files: passed,
  aside from the normal Windows line-ending warnings in the worktree.

Open follow-up:

- targeted ESLint including `src/modules/accounting/service.ts` is still
  blocked by that file's pre-existing broad `@typescript-eslint/no-explicit-any`
  backlog rather than this journal-contact change;
- `NODE_OPTIONS=--max-old-space-size=8192 npx vitest run 'src/modules/accounting/__tests__/posting-boundary.architecture.test.ts'`
  is still failing on its older unrelated expectation that `service.ts`
  contains `QUOTATION_CONVERSION_GATED`;
- authenticated browser verification still cannot run in this Codex session
  because the browser runtime exposes zero available browser backends even
  though the local app remains healthy.

## 2026-08-01 Accounting quotation draft edit affordance continuation

Standardized the current Monolith draft-edit affordance for the quotation
workspace, which is the draft flow in this area that already has a real update
service behind it.

Delivered:

- added shared `AccountingDraftEditLink` to
  `src/components/monolith/accounting-workspace.tsx` so draft-edit actions use
  a common Monolith button pattern;
- updated `src/app/(dashboard)/accounting/quotations/page.tsx` so the route now
  accepts `?edit={draftId}`, loads that quotation draft, and passes a serialized
  editable payload into the client workspace;
- updated `src/app/(dashboard)/accounting/quotations/quotations-client.tsx` so
  the quotation dialog can open in edit mode, prefill the current draft,
  persist through `updateQuotationAction`, and expose `Edit draft` links in the
  draft register rows;
- updated
  `src/app/(dashboard)/accounting/quotations/[id]/quotation-detail-client.tsx`
  so draft detail now exposes the same shared `Edit draft` affordance and
  routes back into the register edit dialog.

Verification on Saturday, August 1, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/components/monolith/accounting-workspace.tsx' 'src/app/(dashboard)/accounting/quotations/page.tsx' 'src/app/(dashboard)/accounting/quotations/quotations-client.tsx' 'src/app/(dashboard)/accounting/quotations/[id]/quotation-detail-client.tsx'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- targeted `git diff --check` for the touched quotation workspace files:
  passed, aside from the normal Windows line-ending warnings in the worktree.

Open follow-up:

- only quotation drafts currently have a true draft-update backend in this
  Monolith slice, so other draft-detail pages still need service-layer edit
  support before the same shared edit action can be enabled there without
  misleading operators;
- authenticated browser verification still cannot run in this Codex session
  because the browser runtime exposes zero available browser backends even
  though the local app remains healthy.

## 2026-08-01 HRMS and CRM incentive workspace addition

Added a new cross-module incentive workflow with CRM as the submission desk and
HRMS as the main operating workspace.

Delivered:

- added `IncentiveEntry` in `prisma/schema.prisma` and migration
  `prisma/migrations/20260801000210_add_incentive_entries/migration.sql`;
- added the shared incentive service and validators in
  `src/modules/incentives/service.ts` and
  `src/modules/incentives/validators.ts`;
- added `src/app/api/crm/incentives/route.ts` for CRM list/create and
  `src/app/api/hrms/incentives/route.ts` for HRMS list/update;
- added
  `src/app/(dashboard)/crm/incentives/page.tsx`
  and
  `src/app/(dashboard)/crm/incentives/incentives-client.tsx`
  so CRM users can submit employee incentive inputs;
- added
  `src/app/(dashboard)/hrms/incentives/page.tsx`
  and
  `src/app/(dashboard)/hrms/incentives/incentives-client.tsx`
  so HRMS can perform the main review and status-processing work;
- updated `src/lib/navigation.ts`,
  `src/components/monolith/crm-workspace.tsx`, and
  `src/components/monolith/people-workspace.tsx` so the new CRM route and the
  HRMS `Incentive` subheading are visible and correctly titled.

Verification on Saturday, August 1, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx prisma validate`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx prisma generate`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx vitest run 'src/components/monolith/crm-workspace.test.tsx' 'src/components/monolith/people-workspace.test.tsx'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/app/(dashboard)/crm/incentives/page.tsx' 'src/app/(dashboard)/crm/incentives/incentives-client.tsx' 'src/app/(dashboard)/hrms/incentives/page.tsx' 'src/app/(dashboard)/hrms/incentives/incentives-client.tsx' 'src/app/api/crm/incentives/route.ts' 'src/app/api/hrms/incentives/route.ts' 'src/modules/incentives/service.ts' 'src/modules/incentives/validators.ts' 'src/lib/navigation.ts' 'src/components/monolith/crm-workspace.tsx' 'src/components/monolith/people-workspace.tsx' 'src/components/monolith/crm-workspace.test.tsx' 'src/components/monolith/people-workspace.test.tsx'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- targeted `git diff --check` for the incentive files: passed, aside from the
  normal Windows line-ending warnings in the worktree.

Open follow-up:

- authenticated browser verification still cannot run in this Codex session
  because the browser runtime exposes zero available browser backends even
  though the local app is healthy;
- the first incentive slice intentionally uses CRM reference text plus employee
  selection rather than deep automatic deal-commission calculation logic, so
  richer formula-based payout rules can be added later without reworking the
  new route structure.

## 2026-08-01 HRMS help desk workspace continuation

Replaced the current static `/hrms/helpdesk` notice page with a real Monolith
workspace on top of the existing HR case service.

Delivered:

- added `src/components/hrms/helpdesk-view.tsx`, which loads the current HR
  case register, category FAQs, case detail, and comment timeline from the live
  `/api/hrms/hr-cases` endpoints;
- updated `src/app/(dashboard)/hrms/helpdesk/page.tsx` so the route now
  requires `hrms.helpdesk.read` and renders the new live workspace instead of
  the old informational notice;
- archived the former notice-only route in
  `OLD UI code/src/app/(dashboard)/hrms/helpdesk/page.tsx`.

Verification on Saturday, August 1, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/app/(dashboard)/hrms/helpdesk/page.tsx' 'src/components/hrms/helpdesk-view.tsx'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- `git diff --check -- 'src/app/(dashboard)/hrms/helpdesk/page.tsx' 'src/components/hrms/helpdesk-view.tsx' 'OLD UI code/src/app/(dashboard)/hrms/helpdesk/page.tsx' 'docs/ui-migration-status.md' 'docs/ui-migration-handoff.md'`:
  passed, aside from the normal Windows line-ending warnings in the worktree.

Open follow-up:

- authenticated browser verification still cannot run in this Codex session
  because the browser runtime exposes zero available browser backends even
  though the local app is healthy;
- the current backend still exposes comment updates only for case follow-up, so
  this slice intentionally does not invent assignment or status-edit controls
  that the service does not support yet.

## 2026-07-31 Accounting quotation lifecycle foundation continuation

Continued the 9.14 Sales lifecycle work by replacing the quotations route's
earlier draft-only behavior with a server-authoritative lifecycle foundation
and a dedicated detail route.

Delivered:

- added `src/modules/accounting/quotations.ts` for quotation draft save/edit,
  clone, approval, send, accept/decline, expiry, audit, and partial
  quotation-to-sales-invoice conversion;
- updated `src/modules/accounting/service.ts` and
  `src/modules/accounting/actions.ts` so the route uses the new lifecycle layer
  and accepts partial conversion quantities;
- updated `src/app/(dashboard)/accounting/quotations/page.tsx` and
  `src/app/(dashboard)/accounting/quotations/quotations-client.tsx` so the
  quotations register now uses route-level RBAC, keeps create-quotation payload
  compatibility, and links into quotation details;
- added
  `src/app/(dashboard)/accounting/quotations/[id]/page.tsx`
  and
  `src/app/(dashboard)/accounting/quotations/[id]/quotation-detail-client.tsx`
  so quotation approval, dispatch, decision, cancellation, duplication, audit,
  and partial conversion all have a dedicated Monolith detail surface.

Verification on Friday, July 31, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx prisma validate`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/app/(dashboard)/accounting/quotations/page.tsx' 'src/app/(dashboard)/accounting/quotations/quotations-client.tsx' 'src/app/(dashboard)/accounting/quotations/[id]/page.tsx' 'src/app/(dashboard)/accounting/quotations/[id]/quotation-detail-client.tsx' 'src/modules/accounting/quotations.ts'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run accounting:phase9:test`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run accounting:phase9:verify`:
  passed;
- `git diff --check -- 'src/app/(dashboard)/accounting/quotations/page.tsx' 'src/app/(dashboard)/accounting/quotations/quotations-client.tsx' 'src/app/(dashboard)/accounting/quotations/[id]/page.tsx' 'src/app/(dashboard)/accounting/quotations/[id]/quotation-detail-client.tsx' 'src/modules/accounting/actions.ts' 'src/modules/accounting/service.ts' 'src/modules/accounting/quotations.ts' 'prisma/schema.prisma' 'prisma/migrations/20260731000130_accounting_phase9_quotation_lifecycle_foundation/migration.sql'`:
  passed, aside from the normal Windows line-ending warnings in the worktree.

Open follow-up:

- authenticated browser verification still cannot run in this Codex session
  because the browser runtime exposes zero available browser backends even
  though the local app is healthy on `http://127.0.0.1:3000`;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build` is currently blocked
  by a locked `.next\\monolith-dev-3.stderr.log` while the local dev app stays
  running on port 3000;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run accounting:phase9:safety-scan`
  still reports pre-existing repository findings outside this quotation slice;
- the broader 9.14 through 9.23 lifecycle slices remain open.

## 2026-08-01 Accounting recurring sales-invoice continuation

Continued the 9.14 Sales lifecycle work by replacing the guarded recurring
placeholder with a real recurring sales-invoice profile workspace and
server-authoritative draft generation flow.

Delivered:

- added additive recurring sales-invoice profile, line, and run persistence via
  `prisma/migrations/20260801000230_accounting_phase9_recurring_sales_invoice_profiles/migration.sql`;
- added `src/modules/accounting/recurring-sales-invoices.ts` and
  `src/modules/accounting/recurring-sales-invoice-actions.ts` so recurring
  profiles now support profile creation, deterministic due-date identity,
  generated draft-invoice lineage, skip, pause, resume, cancel, failure
  tracking, and optional email queueing when auto-send is configured;
- updated `src/lib/db.ts` so the Prisma singleton refresh guard picks up the
  new recurring delegates after schema changes;
- replaced `src/app/(dashboard)/accounting/recurring/page.tsx` with a live
  Monolith recurring-invoice workspace and added
  `src/app/(dashboard)/accounting/recurring/recurring-sales-client.tsx`;
- archived the old policy-gate-only recurring route in
  `OLD UI code/src/app/(dashboard)/accounting/recurring/page.tsx`;
- updated `task.md` again so overall/current-slice progress reflects the new
  recurring-invoice completion slice.

Verification on Saturday, August 1, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx prisma validate`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx prisma generate`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/lib/db.ts' 'src/modules/accounting/recurring-sales-invoices.ts' 'src/modules/accounting/recurring-sales-invoice-actions.ts' 'src/app/(dashboard)/accounting/recurring/page.tsx' 'src/app/(dashboard)/accounting/recurring/recurring-sales-client.tsx'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run accounting:phase9:test`:
  passed.

Open follow-up:

- authenticated browser verification still cannot run in this Codex session
  because the browser runtime exposes zero available browser backends even
  though the local app is healthy on `http://127.0.0.1:3000`;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build` remains blocked by a
  locked `.next\\monolith-dev-3.stderr.log` while the local dev app stays
  running on port 3000;
- the retainer-invoice / customer-advance and sales-receipt gaps in 9.14 are
  still open, followed by the 9.15 purchases lifecycle slice.

## 2026-08-01 Accounting quotation sales-order conversion continuation

Continued the 9.14 Sales lifecycle work by extending the accepted-quotation
conversion path into sales orders, rather than leaving that branch of the spec
open while only draft sales-invoice conversion existed.

Delivered:

- added additive quote-lineage fields to `CrmInvoice` and `CrmInvoiceItem`
  plus
  `prisma/migrations/20260801000220_accounting_phase9_quote_sales_order_lineage/migration.sql`;
- updated `src/modules/accounting/quotations.ts`,
  `src/modules/accounting/service.ts`, and
  `src/modules/accounting/actions.ts` so accepted quotations can now create
  confirmed `SALES_ORDER` records with quote snapshot lineage, copied line
  metadata, duplicate-prevention for exhausted quantities, and the same
  converted-quantity / quotation-status updates already used by invoice
  conversion;
- updated
  `src/app/(dashboard)/accounting/quotations/[id]/page.tsx`
  and
  `src/app/(dashboard)/accounting/quotations/[id]/quotation-detail-client.tsx`
  so the quotation detail route now offers sales-order conversion to users with
  `crm.invoice.manage`, alongside the existing draft-invoice conversion path;
- corrected `task.md` so the Phase 9 progress bars, current-slice label, and
  next-target narrative now reflect the active 9.14 state instead of the stale
  9.13-only view.

Verification on Saturday, August 1, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx prisma validate`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx prisma generate`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/modules/accounting/quotations.ts' 'src/app/(dashboard)/accounting/quotations/[id]/page.tsx' 'src/app/(dashboard)/accounting/quotations/[id]/quotation-detail-client.tsx'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run accounting:phase9:test`:
  passed;
- `git diff --check -- 'prisma/schema.prisma' 'prisma/migrations/20260801000220_accounting_phase9_quote_sales_order_lineage/migration.sql' 'src/modules/accounting/quotations.ts' 'src/modules/accounting/service.ts' 'src/modules/accounting/actions.ts' 'src/app/(dashboard)/accounting/quotations/[id]/page.tsx' 'src/app/(dashboard)/accounting/quotations/[id]/quotation-detail-client.tsx' 'task.md'`:
  passed, aside from the normal Windows line-ending warnings in the worktree.

Open follow-up:

- authenticated browser verification still cannot run in this Codex session
  because the browser runtime exposes zero available browser backends even
  though the local app is healthy on `http://127.0.0.1:3000`;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build` remains blocked by a
  locked `.next\\monolith-dev-3.stderr.log` while the local dev app stays
  running on port 3000;
- linting `src/modules/accounting/actions.ts` and
  `src/modules/accounting/service.ts` still surfaces pre-existing
  `@typescript-eslint/no-explicit-any` debt outside the newly added sales-order
  conversion logic itself;
- the broader 9.14 recurring-invoice, retainer-invoice, and sales-receipt gaps,
  followed by the 9.15 purchases lifecycle slice, remain open.

## 2026-08-01 Accounting quotation delivery and portal continuation

Continued the 9.14 Sales lifecycle work by wiring quotation delivery into the
existing email queue and customer portal contracts, then adding a customer
portal quotations surface so portal-published quotations can actually be
reviewed and decided by the customer.

Delivered:

- updated `src/modules/accounting/quotations.ts` so quotation send now
  resolves customer email recipients for `EMAIL`, requires an active
  `AccountingPortalPublicationProfile` and active `CustomerPortalUser`
  recipients for `PORTAL`, and records explicit manual evidence for `MANUAL`;
- updated
  `src/app/(dashboard)/accounting/quotations/[id]/quotation-detail-client.tsx`
  so operators can choose the delivery mode before sending a quotation;
- added `src/modules/customer-portal/accounting-quotations.ts` plus
  `src/app/customer-portal/quotations/page.tsx` and
  `src/app/customer-portal/quotations/[id]/page.tsx` so portal-published
  quotations are visible to the customer;
- added `src/app/customer-portal/quotations/[id]/quotation-decision-panel.tsx`
  and updated `src/modules/customer-portal/accounting-quotations.ts` plus
  `src/modules/customer-portal/actions.ts` so portal recipients can accept or
  decline quotations directly from the detail view with portal-safe lifecycle
  and customer-scope checks;
- updated `src/app/customer-portal/_components/client-actions.tsx` and the
  portal quotation notification link target so the customer portal shell now
  exposes Quotations as a first-class destination and notifications deep-link
  into the published quotation itself.

Verification on Saturday, August 1, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/modules/accounting/quotations.ts' 'src/modules/customer-portal/accounting-quotations.ts' 'src/app/customer-portal/quotations/page.tsx' 'src/app/customer-portal/quotations/[id]/page.tsx' 'src/app/customer-portal/_components/client-actions.tsx' 'src/app/(dashboard)/accounting/quotations/[id]/quotation-detail-client.tsx'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/modules/customer-portal/accounting-quotations.ts' 'src/modules/customer-portal/actions.ts' 'src/app/customer-portal/quotations/[id]/page.tsx' 'src/app/customer-portal/quotations/[id]/quotation-decision-panel.tsx' 'src/modules/accounting/quotations.ts'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run accounting:phase9:test`:
  passed.

Open follow-up:

- authenticated browser verification still cannot run in this Codex session
  because the browser runtime exposes zero available browser backends even
  though the local app is healthy on `http://127.0.0.1:3000`;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build` remains blocked by a
  locked `.next\\monolith-dev-3.stderr.log` while the local dev app stays
  running on port 3000;
- the broader 9.14 through 9.23 lifecycle slices remain open.

## 2026-07-31 Accounting quotations shared-master continuation

Continued the 9.14 Sales lifecycle work by wiring the quotations workspace into
the shared Accounting payment-term and item-master foundations.

Delivered:

- updated `src/app/(dashboard)/accounting/quotations/page.tsx` so the route now
  fetches live `AccountingPaymentTerm` records;
- updated `src/app/(dashboard)/accounting/quotations/quotations-client.tsx`
  so quotation creation now captures shared payment terms and reuses the
  persisted `AccountingItemMaster` catalogue for line suggestions plus default
  rate/GST behavior;
- reused the same live item catalogue for the customer-note line editor on
  that workspace.

Verification on Friday, July 31, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/app/(dashboard)/accounting/quotations/page.tsx' 'src/app/(dashboard)/accounting/quotations/quotations-client.tsx'`:
  passed;
- `git diff --check -- 'src/app/(dashboard)/accounting/quotations/page.tsx' 'src/app/(dashboard)/accounting/quotations/quotations-client.tsx'`:
  passed, aside from the normal Windows line-ending warnings in the worktree.

Browser verification finding:

- the local app is healthy on `http://127.0.0.1:3000`, but the Codex browser
  runtime currently reports zero available browser backends (`agent.browsers.list()`
  returned `[]` after successful runtime setup), so authenticated browser
  verification cannot be completed from this session;
- this is a session-environment limitation, not a repo-side app-start failure.

Open follow-up:

- the broader 9.14 through 9.23 lifecycle slices remain open;
- this still does not complete Slices 9.13 through 9.23.

## 2026-07-31 Accounting quotation conversion continuation

Started the 9.14 Sales lifecycle continuation by replacing the current gated
quotation conversion with a working draft sales-invoice conversion path.

Delivered:

- updated `src/modules/accounting/service.ts` so an open quotation can now
  convert into a draft sales invoice, mark itself converted, and write an
  audit event, provided its lines share a single GST rate;
- updated `src/app/(dashboard)/accounting/quotations/page.tsx` so the
  quotations register reads the persisted subtotal field correctly;
- updated `src/app/(dashboard)/accounting/quotations/quotations-client.tsx`
  so newly created quotations normalize into the expected table row shape and
  the Convert action is exposed for the actual open/draft statuses.

Verification on Friday, July 31, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/app/(dashboard)/accounting/quotations/page.tsx' 'src/app/(dashboard)/accounting/quotations/quotations-client.tsx'`:
  passed;
- `git diff --check -- 'src/modules/accounting/service.ts' 'src/app/(dashboard)/accounting/quotations/page.tsx' 'src/app/(dashboard)/accounting/quotations/quotations-client.tsx'`:
  passed, aside from the normal Windows line-ending warnings in the worktree.

Open follow-up:

- authenticated browser verification still cannot run in this Codex session
  because the browser runtime exposes zero available browser backends, even
  though the local app is healthy on `http://127.0.0.1:3000`;
- quotation conversion is still intentionally limited to uniform GST-rate line
  mixes in this slice;
- this still does not complete Slices 9.13 through 9.23.

## 2026-07-31 Accounting invoice payment-method continuation

Continued the active Accounting Phase 9.13 shared-commercial work by wiring the
Accounting payment-method master into invoice and note entry, then persisting
the selected value on the canonical draft records.

Delivered:

- added additive `paymentMethod` schema and migration coverage for
  `SalesInvoice`, `PurchaseInvoice`, `CustomerNote`, and `VendorNote`;
- updated `src/components/monolith/accounting-invoice-form.tsx` so invoice and
  note entry now exposes live `AccountingPaymentMethod` options;
- updated
  `src/app/(dashboard)/accounting/sales-invoices/new/page.tsx`,
  `src/app/(dashboard)/accounting/purchase-invoices/new/page.tsx`,
  `src/app/(dashboard)/accounting/credit-notes/new/page.tsx`, and
  `src/app/(dashboard)/accounting/debit-notes/new/page.tsx`
  plus their current client wrappers so those routes fetch and pass
  `AccountingPaymentMethod` records into the shared form;
- updated `src/modules/accounting/service.ts` and
  `src/modules/accounting/validators.ts` so the selected payment method is
  accepted and stored on the canonical draft invoice/note records.

Verification on Friday, July 31, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx prisma validate`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run db:generate`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/components/monolith/accounting-invoice-form.tsx' 'src/app/(dashboard)/accounting/sales-invoices/new/page.tsx' 'src/app/(dashboard)/accounting/purchase-invoices/new/page.tsx' 'src/app/(dashboard)/accounting/credit-notes/new/page.tsx' 'src/app/(dashboard)/accounting/debit-notes/new/page.tsx' 'src/app/(dashboard)/accounting/sales-invoices/new/new-invoice-client.tsx' 'src/app/(dashboard)/accounting/purchase-invoices/new/new-invoice-client.tsx' 'src/app/(dashboard)/accounting/credit-notes/new/new-note-client.tsx' 'src/app/(dashboard)/accounting/debit-notes/new/new-note-client.tsx'`:
  passed;
- `git diff --check -- 'prisma/schema.prisma' 'prisma/migrations/20260731000120_accounting_phase9_invoice_note_payment_methods/migration.sql' 'src/modules/accounting/validators.ts' 'src/modules/accounting/service.ts' 'src/components/monolith/accounting-invoice-form.tsx' 'src/app/(dashboard)/accounting/sales-invoices/new/page.tsx' 'src/app/(dashboard)/accounting/purchase-invoices/new/page.tsx' 'src/app/(dashboard)/accounting/credit-notes/new/page.tsx' 'src/app/(dashboard)/accounting/debit-notes/new/page.tsx' 'src/app/(dashboard)/accounting/sales-invoices/new/new-invoice-client.tsx' 'src/app/(dashboard)/accounting/purchase-invoices/new/new-invoice-client.tsx' 'src/app/(dashboard)/accounting/credit-notes/new/new-note-client.tsx' 'src/app/(dashboard)/accounting/debit-notes/new/new-note-client.tsx'`:
  passed, aside from the normal Windows line-ending warnings in the worktree.

Open follow-up:

- authenticated browser verification still cannot run in this Codex session
  because the browser runtime exposes zero available browser backends, even
  though the local app is healthy on `http://127.0.0.1:3000`;
- effective-dated pricing/rate consumption is still not fully wired through the
  shared-commercial document-entry surfaces;
- this still does not complete Slices 9.13 through 9.23.

## 2026-07-31 Accounting commercial document shared-master continuation

Continued the active Accounting Phase 9.13 shared-commercial work by wiring the
Accounting payment-term and price-list masters into sales-order and
purchase-order entry.

Delivered:

- updated `src/app/(dashboard)/accounting/_components/commercial-document-form-page.tsx`
  so the commercial-document page now fetches live `AccountingPaymentTerm` and
  `AccountingPriceList` records;
- updated `src/components/monolith/accounting-commercial-document-form.tsx`
  so the Accounting commercial document form uses live payment terms for
  due-date behavior and selected price lists for default line pricing and
  currency behavior;
- updated `src/modules/crm/actions.ts` so submitted commercial documents now
  persist selected terms through the existing `CrmInvoice.terms` field.

Verification on Friday, July 31, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/app/(dashboard)/accounting/_components/commercial-document-form-page.tsx' 'src/components/monolith/accounting-commercial-document-form.tsx'`:
  passed;
- `git diff --check -- 'src/app/(dashboard)/accounting/_components/commercial-document-form-page.tsx' 'src/components/monolith/accounting-commercial-document-form.tsx' 'src/modules/crm/actions.ts'`:
  passed, aside from the normal Windows line-ending warnings in the worktree.

Open follow-up:

- browser-level authenticated verification is still unavailable;
- this still does not complete Slices 9.13 through 9.23.

## 2026-07-31 Accounting invoice shared-master continuation

Continued the active Accounting Phase 9.13 shared-commercial work by wiring the
new Accounting payment-term and unit-of-measure masters into the live invoice
and note entry routes.

Delivered:

- updated `src/components/monolith/accounting-invoice-form.tsx` so the Terms
  selector and due-date calculation use live `AccountingPaymentTerm` options,
  with the earlier hardcoded terms retained only as fallback defaults;
- updated
  `src/app/(dashboard)/accounting/sales-invoices/new/page.tsx`,
  `src/app/(dashboard)/accounting/purchase-invoices/new/page.tsx`,
  `src/app/(dashboard)/accounting/credit-notes/new/page.tsx`, and
  `src/app/(dashboard)/accounting/debit-notes/new/page.tsx`
  so those routes now source units from `AccountingUnitOfMeasure` and terms
  from `AccountingPaymentTerm`;
- passed the new shared-master props through the current invoice/note client
  wrappers so the Monolith document-entry surfaces consume persisted Accounting
  commercial configuration rather than the older generic unit source and
  hardcoded term list.

Verification on Friday, July 31, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/components/monolith/accounting-invoice-form.tsx' 'src/app/(dashboard)/accounting/sales-invoices/new/page.tsx' 'src/app/(dashboard)/accounting/purchase-invoices/new/page.tsx' 'src/app/(dashboard)/accounting/credit-notes/new/page.tsx' 'src/app/(dashboard)/accounting/debit-notes/new/page.tsx' 'src/app/(dashboard)/accounting/sales-invoices/new/new-invoice-client.tsx' 'src/app/(dashboard)/accounting/purchase-invoices/new/new-invoice-client.tsx' 'src/app/(dashboard)/accounting/credit-notes/new/new-note-client.tsx' 'src/app/(dashboard)/accounting/debit-notes/new/new-note-client.tsx'`:
  passed;
- `git diff --check -- 'src/components/monolith/accounting-invoice-form.tsx' 'src/app/(dashboard)/accounting/sales-invoices/new/page.tsx' 'src/app/(dashboard)/accounting/purchase-invoices/new/page.tsx' 'src/app/(dashboard)/accounting/credit-notes/new/page.tsx' 'src/app/(dashboard)/accounting/debit-notes/new/page.tsx' 'src/app/(dashboard)/accounting/sales-invoices/new/new-invoice-client.tsx' 'src/app/(dashboard)/accounting/purchase-invoices/new/new-invoice-client.tsx' 'src/app/(dashboard)/accounting/credit-notes/new/new-note-client.tsx' 'src/app/(dashboard)/accounting/debit-notes/new/new-note-client.tsx'`:
  passed, aside from the normal Windows line-ending warnings in the worktree.

Open follow-up:

- browser-level authenticated verification is still unavailable;
- effective-dated pricing and price-list lifecycle consumption are still not
  fully wired through document-entry and later lifecycle flows.

## 2026-07-31 Accounting item master persistence continuation

Continued the active Accounting Phase 9.13 shared-commercial work by replacing
the current Monolith Accounting item-master path with a persisted,
API-backed catalogue.

Delivered:

- added additive `AccountingItemMaster` Prisma schema and migration foundation;
- added authenticated item-master API handlers in
  `src/app/api/accounting/items/route.ts` and
  `src/app/api/accounting/items/[id]/route.ts`;
- added `src/lib/items/accounting-item-client.ts` as the shared client fetch
  helper for the new Accounting item-master surface;
- updated `src/components/monolith/accounting-items.tsx` so the register,
  create form, detail view, import flow, status updates, and delete action use
  the persisted item master;
- updated `src/components/monolith/accounting-invoice-form.tsx` and
  `src/components/monolith/accounting-commercial-document-form.tsx` so their
  live item suggestions and default rate/unit behavior come from the persisted
  Accounting catalogue instead of `src/lib/items/item-store.ts` and
  `src/lib/items/mock-data.ts`.

Verification on Friday, July 31, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx prisma validate`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run db:generate`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint src/components/monolith/accounting-items.tsx src/components/monolith/accounting-invoice-form.tsx src/components/monolith/accounting-commercial-document-form.tsx src/app/api/accounting/items/route.ts src/app/api/accounting/items/[id]/route.ts src/lib/items/accounting-item-client.ts src/modules/accounting/item-master.ts src/lib/db.ts`:
  passed;
- `git diff --check -- src/components/monolith/accounting-items.tsx src/components/monolith/accounting-invoice-form.tsx src/components/monolith/accounting-commercial-document-form.tsx src/app/api/accounting/items/route.ts src/app/api/accounting/items/[id]/route.ts src/lib/items/accounting-item-client.ts src/modules/accounting/item-master.ts src/lib/db.ts prisma/schema.prisma prisma/migrations/20260801000110_accounting_phase9_item_master_foundation/migration.sql`:
  passed, aside from the normal Windows line-ending warnings in the worktree.

Open follow-up:

- no browser-level authenticated verification has been run because the in-app
  browser session is still unavailable;
- this does not complete Slices 9.13 through 9.23: deeper shared-commercial
  parity, full Sales and Purchases lifecycle coverage, approvals expansion,
  communications, reporting, API surface, and specification-derived tests are
  still open.

## 2026-07-31 item-table currency and exchange-rate alignment

Updated the current live item-table layouts so Currency and Exchange Rate are
explicit columns and the row controls stay on one line instead of stacking
under `Item Details`.

Delivered:

- rebuilt the shared Accounting item table in
  `src/components/monolith/accounting-invoice-form.tsx` so `Currency` and
  `Exchange Rate` now sit in their own columns beside `Item Details`, `Unit`,
  `Quantity`, `Rate`, `Tax`, `TDS`, and `Amount`;
- kept the Accounting item-table cells, headers, amount values, and unit helper
  action in single-line formatting;
- applied matching single-line column tightening to the CRM quote item table in
  `src/app/(dashboard)/crm/quotes/_components/LineItemsTable.tsx` and the CRM
  invoice item table in
  `src/app/(dashboard)/crm/invoices/invoice-form.tsx`.

Verification on Friday, July 31, 2026:

- `git diff --check -- 'src/components/monolith/accounting-invoice-form.tsx' 'src/app/(dashboard)/crm/quotes/_components/LineItemsTable.tsx' 'src/app/(dashboard)/crm/invoices/invoice-form.tsx'`:
  passed, aside from the usual Windows line-ending warnings in this worktree;
- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/components/monolith/accounting-invoice-form.tsx' 'src/app/(dashboard)/crm/quotes/_components/LineItemsTable.tsx' 'src/app/(dashboard)/crm/invoices/invoice-form.tsx'`:
  is still red on pre-existing lint debt in these legacy item-form files,
  including existing `no-explicit-any` and `react-hooks/set-state-in-effect`
  findings not introduced by this slice.

## 2026-07-31 accounting sidebar submenu format correction

Fixed the current Accounting shell regression where grouped submenu items no
longer matched the standard sidebar format after subsection headings were
introduced.

Delivered:

- widened the shared sidebar submenu selectors in
  `src/styles/monolith-system.css` so links inside
  `.mnx-sidebar-subnav-item` render with the same grid, spacing, hover, and
  active states as the older direct-child submenu links;
- updated the shared shell safeguard test in
  `src/app/(dashboard)/_components/dashboard-shell-layout.test.ts` to assert
  the grouped submenu wrapper and its CSS coverage.

Verification on Friday, July 31, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx vitest run 'src/app/(dashboard)/_components/dashboard-shell-layout.test.ts'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/app/(dashboard)/_components/dashboard-shell-layout.test.ts' 'src/styles/monolith-system.css'`:
  returned only the existing expected warning that the raw CSS file is ignored
  by the active ESLint config;
- `git diff --check -- 'src/styles/monolith-system.css' 'src/app/(dashboard)/_components/dashboard-shell-layout.test.ts'`:
  passed, aside from the normal Windows line-ending warnings in this worktree.

## 2026-07-31 Accounting Phase 9.13 restart and traceability correction

Re-opened the Accounting Phase 9 continuation after confirming the prior
`task.md` was stale: it marked Phase 9 complete at Slice 9.12, while the
attached continuation specification explicitly defines Slices 9.13 through 9.23
as remaining work.

Delivered:

- read the attached
  `Accounting_Software_Build_Specification (1).docx` end to end through local
  DOCX XML extraction;
- replaced the stale `task.md` with an in-progress tracker that now reflects
  9.13 as the active slice and lists 9.14 through 9.23 as remaining;
- created
  `docs/accounting/phase-9-specification-traceability.md` as the required
  continuation traceability record for the attached specification;
- added additive Prisma schema and migration foundation for shared commercial
  master data:
  `AccountingPaymentTerm`,
  `AccountingPaymentMethod`,
  `AccountingPriceList`,
  `AccountingUnitOfMeasure`, and
  `AccountingReportingTag`;
- wired those five new masters into the existing
  `src/modules/accounting/configuration-admin.ts`,
  `src/modules/accounting/configuration-admin-actions.ts`, and
  `src/app/(dashboard)/accounting/configuration/admin/page.tsx` flow so the
  admin workspace now has persisted Monolith forms and registers for them.

Files:

- `prisma/schema.prisma`
- `prisma/migrations/20260801000100_accounting_phase9_shared_commercial_masters_foundation/migration.sql`
- `docs/accounting/phase-9-specification-traceability.md`
- `task.md`

Verification on Friday, July 31, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx prisma validate`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run db:generate`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- targeted ESLint for the touched configuration-admin files: passed;
- targeted `git diff --check` for the four touched files: passed.

Open follow-up:

- the current `/accounting/items` flow still uses the client-side
  `src/lib/items/item-store.ts` mock/localStorage path, so item-master parity
  remains a primary 9.13 blocker for the later Sales and Purchases slices;
- no claim is made yet that Slices 9.13 through 9.23 are complete.

## 2026-07-31 Accounting configuration admin Phase 9 completion

Completed the remaining Accounting Phase 9 continuation inside the already
migrated `/accounting/configuration/admin` workspace.

Delivered:

- Slice 9.10 cross-module integrations:
  - added canonical `AccountingSourceMappingProfile`;
  - surfaced read-only integration inbox, integration outbox, posting-attempt,
    and payroll-run-snapshot evidence in the admin workspace.
- Slice 9.11 reports and period close:
  - added canonical `AccountingPeriodCloseRun`;
  - added canonical `AccountingReportExportProfile`.
- Slice 9.12 portals, exports, and polish:
  - added canonical `AccountingPortalPublicationProfile`;
  - extended the existing Monolith configuration-admin route with the final
    Phase 9 control sections so all Phase 9 configuration surfaces now sit in
    one workspace.

Files:

- `prisma/schema.prisma`
- `prisma/migrations/20260801000040_accounting_phase9_close_portal_integration_foundation/migration.sql`
- `src/modules/accounting/configuration-admin.ts`
- `src/modules/accounting/configuration-admin-actions.ts`
- `src/app/(dashboard)/accounting/configuration/admin/page.tsx`
- `task.md`

Verification on Friday, July 31, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npm run db:generate`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx prisma validate`: passed;
- targeted ESLint for the touched Accounting configuration files: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run accounting:phase9:verify`:
  passed.

Notes:

- this is a continuation inside an already migrated route, not a new route
  migration batch;
- no production deployment was performed;
- no historical accounting migration was run.

## 2026-07-31 payments draft visibility and approval flow

Aligned the active Accounting payments flow with the reported operator issue:
saved drafts were being written to legacy `PaymentEntry` records but were not
visible on `/accounting/payments`, which only listed canonical
`AccountingPayment` rows.

Delivered:

- `/accounting/payments` now renders a `Draft payments` section using the
  existing shared legacy-draft register so editable payment drafts appear in the
  same workspace as canonical payments;
- `/accounting/payment-entries/new` now exposes explicit `Save as draft` and
  `Submit for approval` actions;
- direct submit now creates the legacy draft, submits it immediately through the
  existing adapter flow, and routes to the canonical payment detail page;
- draft create/submit actions now also revalidate `/accounting/payments`, so the
  workspace refreshes immediately after either action.

Files:

- `src/app/(dashboard)/accounting/payments/page.tsx`
- `src/app/(dashboard)/accounting/payment-entries/new/new-payment-client.tsx`
- `src/modules/accounting/actions.ts`

Verification:

- targeted ESLint for the touched files is still pending in this slice;
- no in-app browser instance is available, so authenticated visual verification
  remains blocked.

## 2026-07-31 Accounting configuration admin 9.9 follow-up

Extended the existing migrated `/accounting/configuration/admin` workspace for
Accounting Phase 9.9 customer/vendor finance controls. This is a continuation
inside an already migrated route, not a new route migration batch.

Delivered:

- added canonical `AccountingCustomerProfile` and `AccountingVendorProfile`
  schema foundations plus additive migrations for finance-owned CRM
  counterparty extensions;
- added contained configuration-admin save/query wiring for receivable/payable
  control accounts, currency, credit/payment terms, hold states, policy
  versions, statement-delivery mode, and optional vendor tax-profile linkage;
- added matching Monolith admin sections and tables on
  `/accounting/configuration/admin` without introducing any alternate customer,
  vendor, AR, or AP posting path.

Verification on Friday, July 31, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npm run db:generate`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx prisma validate`: passed;
- targeted ESLint for the touched Accounting configuration files: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run accounting:phase9:verify`:
  passed.

Blocked:

- full `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`
  is currently red in untouched files:
  `src/app/(dashboard)/accounting/accounts/accounts-client.tsx`,
  `src/app/(dashboard)/accounting/accounts/page.tsx`, and
  `src/modules/accounting/service.ts`;
- those TypeScript errors are outside the 9.9 files changed in this slice and
  should be treated as concurrent or pre-existing branch drift unless the next
  slice explicitly takes them on.

## Current state

- Branch: `main`.
- Final combined route inventory: **229 discovered, 228 migrated, 229
  source/type/test/build verified, 0 migration routes remaining**, across 14
  layouts.
- Protected reference: `/dashboard` was verified without redesign and is the
  one discovered route excluded from the migrated count.
- The production-browser audit covers the 213-route final-audit baseline. The
  16 later Accounting Phase 5 routes retain their documented authenticated
  theme/viewport evidence gap because no attached browser was available.
- All 12 customer portal routes now use the shared production portal shell,
  workspace compositions, theme provider, tables, forms, and mobile navigation.
- Both employee invitation routes now use the shared production public shell;
  the invitation validation, password policy, API calls, and redirects are
  unchanged.
- Legacy authenticated shells, duplicate data table/button components, unused
  landing/HRMS visual systems, obsolete theme providers/classes, Purple theme,
  Kiona font loading, and active legacy CSS compatibility selectors were
  removed after archival.
- The final source verifier and all eight module source verifiers pass.
- Production TypeScript and focused merge ESLint pass. The guarded optimized
  production build generates all 342 static pages.
- Production Playwright passes 60 checks across 17 module families, Light,
  Night, Violet, 1440 px desktop, and 390 px mobile coverage. It checks route
  ownership, the live Admin production catalogue, overflow, one-scroller
  boundaries, mobile navigation, theme tokens, page exceptions, and HTTP 500s.
- The combined full test suite was rerun against guarded staging: 410
  tests pass and three pre-existing CHA integration expectations remain red.
  Repository-wide lint was also run and retains the existing business-code
  backlog; no final-audit scoped lint finding remains.
- Browser evidence is stored in
  `artifacts/ui-migration/final-runtime/verification.json` with representative
  screenshots.

## Production component catalogue

The obsolete design-decision showcase at `/admin/design-system` was replaced
from source, not reskinned.

Implementation:

1. The catalogue imports production module namespaces and derives its complete
   index from their runtime exports.
2. It covers AppShell/theme, foundation, workspace, shared async state, People,
   Performance/Learning, CHA, Accounting, CRM, Communication, Admin, and
   public/authentication composition groups.
3. It renders real production primitives and representative module
   compositions, including menus, filters, warnings, dialogs, tables, uploads,
   summaries, details, status, public surfaces, and all 23 shared/module state
   variants.
4. `MonolithThemePicker` is now shared by the AppShell and catalogue. The
   catalogue intentionally exposes Light, Night, and Violet while using the
   shell's existing root classes and `localStorage.theme` persistence.
5. The obsolete `.mnx-showcase-*` CSS and
   `docs/design-system-showcase.md` were removed.

Backup:

- `OLD UI code/legacy-ui-before-admin-design-system-catalogue-4f93df4.zip`;
- source commit `4f93df4`;
- 38,803 bytes;
- SHA-256
  `643FF25A031F1B8ED7A50F6A04E643564BB77F698A817EF586CD32ACDEC82E34`;
- checksum, size, and required entries pass through
  `scripts/verify-monolith-design-system-catalogue.mjs`.

Verification:

- static catalogue/import/state/theme/archive gate: passed;
- route audit: 211 pages, 14 layouts, 198 migrated, 12 pending;
- scoped ESLint: passed;
- focused and full production TypeScript with the required heap: passed;
- 39 focused tests across 12 suites: passed;
- production build and all 315 application pages: passed;
- 9 authenticated Light/Night/Violet × desktop/tablet/mobile checks: passed;
- shared theme selection and persistence, 207 unique runtime components,
  module state selection, dialog open/Escape behavior, semantic theme tokens,
  application errors, and horizontal overflow: passed;
- 9 screenshots and
  `artifacts/ui-migration/design-system-catalogue/verification.json`: reviewed;
- full repository lint remains red on the existing 1,429-error business/module
  backlog; no catalogue-scoped lint finding remains;
- the build retains the six existing non-fatal broad filesystem/NFT trace
  warnings.

## Authentication and Miscellaneous route inventory

Repository page discovery, not navigation links, found exactly:

- `/`
- `/login`
- `/setup`
- `/verify/[id]`
- `/google-chat-link`

## Batch 007 implementation record

1. Archived the complete active legacy presentation before replacement in
   `OLD UI code/legacy-ui-before-monolith-auth-misc-db4bc60.zip`, then made a
   supplemental pre-change archive for the shared ScrollNavigator.
2. Added `src/components/monolith/public-workspace.tsx` as the centralized
   public shell, brand, stage, panel, header, inset, action, status, detail,
   and footer composition layer.
3. Rebuilt credential/Google SSO login, one-time organization setup, public
   secure-document verification, Google Chat account linking, and root module
   control from shared Monolith production components.
4. Preserved all authentication callbacks, remember-me behavior, session
   cleanup, root-account authorization, module-toggle PATCH operations, setup
   validation/API handling, verification reads and privacy masking, link-token
   verification/replacement, redirects, and error behavior.
5. Removed the obsolete 1,416-line login stylesheet and unused login visual
   type module. Isolated legacy global form rules from the public shell and
   suppressed the global ScrollNavigator only on this route family.
6. Added semantic Light/Night/Violet public styling and responsive behavior at
   desktop, tablet, and mobile widths without inline fixed-palette colors.
7. Added repeatable static/archive and production Playwright verifiers and
   regenerated the exhaustive route audit.

Backup evidence:

- Primary archive: 13 files, 62,758 bytes, SHA-256
  `7A958A708AA5CBCAC2797E9BA59E2CAE2AC2233573C8310AD9CC6F62C0A05C8B`.
- Supplemental ScrollNavigator archive: 1 file, 2,339 bytes, SHA-256
  `90B173D7BB29187683E4C7277D0E83F9B0F09F7FE65F0772FC5B4DD6D67ED84C`.
- Exact paths, counts, sizes, checksums, and required entries pass through
  `scripts/verify-monolith-auth-misc-ui.mjs`.

Verification evidence:

- static route/presentation/archive/protected-behavior verifier: passed;
- scoped ESLint for every changed TypeScript/TSX/MJS source: passed;
- focused and production TypeScript with the required 8 GB heap: passed;
- 9 focused public-workspace/foundation/workspace tests: passed;
- production build with Prisma generation, Next.js compilation, production
  TypeScript, and all 315 application routes: passed;
- 45 production route/theme/viewport checks: passed across all five routes,
  Light/Night/Violet, and 1440x1000 desktop, 1024x900 tablet, and 390x844
  mobile;
- safe login validation/password reveal and mocked Google Chat link-success
  interactions: passed;
- reversible public verification fixture cleanup: passed;
- 45 screenshots and
  `artifacts/ui-migration/auth-misc/verification.json`: reviewed.

The production build retains six existing non-fatal broad filesystem/NFT trace
warnings in HRMS/customer-portal code and `next.config.ts`. Repository-wide
`npm run lint -- --quiet` retains the documented pre-existing seed,
maintenance-script, hook-effect, and unrelated business-module backlog; Batch
007 scoped lint is clean.

## Communication, Admin, and Recruit route inventory

Repository discovery—not sidebar links—found:

- Communication: `/communication`, `/communication/calendar`,
  `/communication/chat`, `/communication/drive`,
  `/communication/google-chat-live-view`, `/communication/job-spaces`,
  `/communication/mail`, `/communication/meetings`, `/communication/search`,
  and `/communication/settings`.
- Admin: `/admin`, `/admin/data-tools`, `/admin/design-system`,
  `/admin/google-chat`, `/admin/notifications`, `/admin/passkeys`,
  `/admin/roles`, `/admin/sessions`, `/admin/settings`, and
  `/admin/simulation`.
- Recruit: all 15 routes rooted at `/hrms/recruit`, including audit, career,
  applications, assistant, jobs, profile, resumes, employer applications,
  candidates/new, jobs/new, and settings. These were already verified in
  Batch 002 and were re-tested without source changes.

## Batch 006 implementation record

1. Archived all active legacy Communication/Admin visual source before
   replacement.
2. Activated exact Communication/Admin paths in the shared Monolith shell and
   added centralized workspace frames, metadata, local navigation, semantic
   controls/tables, and asynchronous states.
3. Rebuilt the Communication overview, calendar, meetings, Drive, search,
   job spaces, live-view fallback/diagnostics, settings, Mail, and Chat
   presentation while preserving connected Google APIs and job workflows.
4. Rebuilt Admin overview, data import, Google Chat monitoring, notifications,
   passkeys, roles, sessions, settings, and simulation presentation while
   preserving RBAC, actions, validation, destructive confirmations, and data
   operations.
5. Replaced Mail/Chat route-local overlays with the shared focus-managed dialog
   layer and removed the obsolete Communication navbar from active source.
6. Added tablet/mobile behavior for dense Mail/Chat panes and corrected the
   shared Violet active-tab contrast found during screenshot review.
7. Regenerated the exhaustive route audit and added repeatable static and
   authenticated runtime verifiers.

- The expanded HRMS employee profile and its HRMS Settings custom-field
  builder are implemented, migrated to the database, and pass targeted lint,
  production TypeScript, focused tests, and the production build. A new
  interactive visual pass remains pending because the same Browser service
  currently exposes no browser instance.

## HRMS employee profile expansion

Implemented on 2026-07-29:

- `/hrms/employees/[id]` now presents the full editable employee record:
  basic and work information, reporting hierarchy, personal and identity
  details, contacts and addresses, separation, payroll, bank details, work
  experience, education, dependants, system audit fields, roles, and account
  actions.
- Its information sections are compact full-width horizontal cards stacked in
  sequence, using up to four value columns on desktop so short cards no longer
  inherit unused height from larger neighbouring sections.
- `/hrms/employees` now fills the inherited workspace width. Each role card
  uses an explicit nine-column desktop grid for combined employee identity,
  joining date, roles, department, location, employment status, login status,
  annual gross, and actions, with horizontal overflow retained for narrower
  viewports. The toolbar reports the current filtered total.
- Its centralized filter now covers broad employee search, role, branch,
  department, employee status, account status, and onboarding status. The
  broad search includes employee number, designation, organisation assignment,
  and role as well as name and email.
- The adjacent export action opens a shared Monolith dialog for XLS, XLSX,
  CSV, or TSV. The permission-checked server route exports up to 10,000 records
  from the exact current filter query, never includes password data, and
  guards employee-controlled cells against spreadsheet formula execution.
- A shared People Operations account toggle was added for authorised HR users.
  It prevents self-lockout, preserves organisation scoping, and routes account
  disablement through the existing session-revoking user update logic.
- Imported payroll JSON is retained as a non-destructive fallback while new
  edits persist to `EmployeeHrmsProfile` and the established `User` and
  `EmploymentRecord` fields.
- `/hrms/settings` now uses a two-column responsive composition; the new
  employee-profile column manages organisation-scoped text, long-text, number,
  date, select, and yes/no fields.
- Profile update validation enforces tenant-scoped organisation/reporting
  references, custom-field required/type/select contracts, and self-reporting
  prevention. Existing session revocation and appraisal synchronization remain
  active.
- Migration `20260729183000_add_employee_hrms_profiles` was applied
  successfully to the configured database.
- Archive:
  `OLD UI code/legacy-ui-before-hrms-employee-profile-expansion-20260729.zip`,
  9,468 bytes, SHA-256
  `96BB11CA91858C2E76E10D6825CB33CA40B188B4337F85F5465EDF5B77A047BA`.
- Directory archive:
  `OLD UI code/legacy-ui-before-hrms-employee-directory-expansion-20260729.zip`,
  6,845 bytes, SHA-256
  `438C73350E07CB606053F4767A33E173C302E693584E571CCAC1036D65871C0D`.
- Passed with the required 8 GB Node heap: Prisma generation, targeted ESLint,
  `npx tsc --noEmit`, three focused Vitest cases, and `npm run build` (316
  static pages). The build retains the existing non-fatal `next.config.ts` NFT
  trace warning.
- The directory alignment follow-up also passes targeted ESLint, production
  TypeScript, six focused People Operations/profile tests, the static 45-route
  verifier, diff hygiene, and a fresh 316-page production build.
- The filter/export follow-up passes targeted ESLint, production TypeScript,
  12 focused People Operations/profile/export tests, the 45-route verifier,
  and a 317-page production build that includes
  `/api/hrms/employees/export`.
- Browser setup and the one permitted availability query returned no browser
  instance, so interactive save/add-row/custom-field and
  Light/Night/Violet desktop/tablet/mobile checks, including the filter menu,
  export dialog, and a safe test download, must be run when a browser is
  attached.

## Accounting route inventory

Routes were discovered from repository page sources, not sidebar links:

- `/accounting`
- `/accounting/accounts`
- `/accounting/balance-sheet`
- `/accounting/banking`
- `/accounting/general-ledger`
- `/accounting/invoices-sales`
- `/accounting/invoices-sales/new`
- `/accounting/items`
- `/accounting/items/[id]`
- `/accounting/items/new`
- `/accounting/jobs`
- `/accounting/journal-entries`
- `/accounting/journal-entries/[id]`
- `/accounting/journal-entries/new`
- `/accounting/payment-entries`
- `/accounting/payment-entries/[id]`
- `/accounting/payment-entries/new`
- `/accounting/profit-loss`
- `/accounting/purchase-invoices`
- `/accounting/purchase-invoices/[id]`
- `/accounting/purchase-invoices/new`
- `/accounting/purchase-orders`
- `/accounting/purchase-orders/new`
- `/accounting/quotations`
- `/accounting/reports`
- `/accounting/sales-invoices`
- `/accounting/sales-invoices/[id]`
- `/accounting/sales-invoices/new`
- `/accounting/sales-orders`
- `/accounting/sales-orders/new`
- `/accounting/settings`
- `/accounting/trial-balance`

## Implementation record

1. Backed up the legacy Accounting route tree and its active CRM invoice-form,
   CRM delete-button, and shared item visual dependencies before replacement.
2. Activated exact `/accounting` and `/accounting/**` paths in the production
   Monolith shell.
3. Added the shared Accounting layout, route metadata/header, loading and error
   boundaries, metrics, semantic panels, sections, toolbars, forms, details,
   tables, statuses, dialogs, and responsive styles.
4. Replaced every Accounting route's old markup instead of applying a CSS skin.
5. Added centralized specialized components for:
   - sales and purchase invoice forms and details;
   - commercial invoice/order creation and registers;
   - item catalogue, item creation, and item details;
   - Accounting delete actions.
6. Migrated chart-of-accounts hierarchy, banking transfers, job costing,
   journal vouchers, payment allocations, quotations, customer notes,
   statements, registers, report execution/export, and settings.
7. Preserved authentication, organisation context, RBAC, service and Prisma
   reads, server actions, balanced-journal validation, invoice posting,
   payment allocation, note submission, quotation conversion, imports/exports,
   and CRM commercial-document integration.
8. Removed active Accounting imports from the legacy CRM invoice form, legacy
   CRM delete button, and legacy item presentation.
9. Updated the shell route gate, exhaustive route audit generator, route audit,
   migration status, focused workspace test, static verifier, and authenticated
   runtime verifier.

## CRM implementation

1. Discovered all 57 CRM routes by scanning every `src/app/**/page.tsx`; the
   inventory includes the catch-all plus approvals, calls, campaigns,
   contacts, customers, dashboard, deals, documents, efficiency, enquiries,
   events, forecasts, invoices, items, lead sources and JustDial, leads, price
   books, products, projects, purchase and sales orders, quotes, sales inbox,
   services, social, solutions, tasks, tickets, vendors, visits, and VOC.
2. Archived 131 active legacy CRM route, view, shared CRM, and item-presentation
   sources before presentation replacement.
3. Activated exact `/crm` and `/crm/**` paths in the production Monolith shell
   and replaced the legacy CRM layout with the centralized workspace frame.
4. Added centralized CRM route metadata and production components for
   workspace headers, connected metrics, numbered sections, panels, toolbars,
   tabs, actions, fields, controls, tables, record links, statuses, dialogs,
   and permission/configuration/empty/loading/error states.
5. Replaced raw route controls, tables, route-local overlays, fixed-palette
   utilities, inline colors, and legacy CRM visual class families with shared
   Monolith components and semantic theme tokens.
6. Migrated CRM dialogs for approvals, item creation/confirmation, lead
   remarks/conversion/follow-up/interest, perishable details, quote
   confirmation, and the JustDial viewport.
7. Added a scoped semantic boundary to the shared item views and retained the
   specialized Monolith Accounting item compositions from the parallel batch.
8. Removed verified obsolete active CRM visual imports and local page-width
   wrappers. No code in `OLD UI code` or `_design-reference` is compiled or
   imported.
9. Preserved authentication, RBAC/module gates, Prisma and data operations,
   server actions, validation, record lifecycle behavior, approvals, imports,
   notifications, and integrations.
10. Regenerated the exhaustive route audit and added repeatable CRM archive,
    presentation, route, and protected-behavior verification.

## Backup record

Archives:

`OLD UI code/legacy-ui-before-monolith-communication-admin-ed1bf68.zip`

- Source commit: `ed1bf68`.
- Original files: 45, with relative paths retained.
- Size: 130,499 bytes.
- SHA-256:
  `65DDD40D29C8FEA5AF6D86A00F71CBD3E1E4927E18DC5944F9AECF74D2303EC8`.
- Checksum, size, exact file count, and required entries pass through
  `scripts/verify-monolith-communication-admin-ui.mjs`.

`OLD UI code/legacy-ui-before-monolith-accounting-fd1cbe7.zip`

- Source commit: `fd1cbe7`.
- Original files: 68, with relative paths retained.
- ZIP entries including directories: 102.
- Size: 147,861 bytes.
- SHA-256:
  `B6B7D58BB2A20166829C80B1D395A521B30239159C06AC03ABFA9C1574939DFC`.
- Checksum, size, exact file count, and required entries pass through
  `scripts/verify-monolith-accounting-ui.mjs`.

## Accounting key files

- `docs/ui-route-audit.md`: regenerated route-by-route source record.
- `docs/ui-migration-status.md`: batch status, counts, archive, and quality log.
- `scripts/audit-ui-routes.mjs`: recognizes Accounting batch 005.
- `scripts/verify-monolith-accounting-ui.mjs`: route, archive, presentation,
  responsive-style, and protected-workflow static gate.
- `scripts/verify-monolith-accounting-runtime.mjs`: reversible fixtures and
  complete authenticated route/theme/viewport verification.
- `src/components/monolith/accounting-workspace.tsx`: centralized route
  metadata and Accounting production compositions.
- `src/components/monolith/accounting-invoice-form.tsx`: shared sales/purchase
  invoice editor.
- `src/components/monolith/accounting-invoice-detail.tsx`: shared invoice
  details and posting controls.
- `src/components/monolith/accounting-commercial-document-form.tsx`: shared
  CRM-backed invoice/order editor for Accounting aliases.
- `src/components/monolith/accounting-items.tsx`: catalogue register, item
  editor, and details.
- `src/app/(dashboard)/accounting/layout.tsx`: Accounting workspace boundary.
- `src/styles/monolith-system.css`: semantic Accounting theme and responsive
  presentation.

`OLD UI code/legacy-ui-before-monolith-crm-fd1cbe7.zip`

- Source commit: `fd1cbe7`.
- Original files: 131, with relative paths retained.
- Size: 282,113 bytes.
- SHA-256:
  `E24B74587E9D6FC8F596920BCAE7A69738685385B46E975CE94274A149E973C1`.
- Checksum, size, exact listing, and required entries pass through
  `scripts/verify-monolith-crm-ui.mjs`.

Earlier foundation and batch archives remain in `OLD UI code`, including the
uncommitted Batch 004 glass-correction archive.

CHA dialog reference archive:
`OLD UI code/legacy-ui-before-cha-dialog-reference-20260729-fd1cbe7.zip`

- 22 pre-correction CHA/shared floating-surface sources.
- Size: 197,905 bytes.
- SHA-256:
  `EBFB1DB5B9C49479391B94549DC047DABAA699AA13FDF4F10B3635CF638E4F0F`.
- Checksum, exact listing, and required entries pass through the Expense/CHA
  verifier.

## CRM and shared key files

- `docs/ui-route-audit.md`: exhaustive route-by-route source record.
- `docs/ui-migration-status.md`: current counts and verification gates.
- `scripts/audit-ui-routes.mjs`: recognizes all 57 CRM routes as migrated.
- `scripts/verify-monolith-crm-ui.mjs`: archive, route, presentation, semantic
  theme, and protected-behavior source gate.
- `src/components/monolith/crm-workspace.tsx`: centralized CRM metadata and
  workspace/control/table/dialog/state compositions.
- `src/components/monolith/crm-workspace.test.tsx`: shared CRM composition
  contract tests.
- `src/app/(dashboard)/crm/layout.tsx`: CRM workspace boundary.
- `src/app/(dashboard)/crm/loading.tsx` and `error.tsx`: centralized route
  states.
- `src/app/(dashboard)/_components/dashboard-shell-switcher.tsx`: exact CRM
  Monolith-shell activation.
- `src/styles/monolith-system.css`: CRM semantic and responsive presentation.
- `src/components/monolith/cha-workspace.tsx`: centralized CHA modal, custom
  select, native select, filter-menu, warning-popover, and dialog adapters.
- `src/components/cha/create-job-dialog.tsx`: reference-composed create/success
  dialogs and centralized autocomplete surfaces.
- `scripts/verify-monolith-expense-cha-ui.mjs`: exhaustive CHA popup/dropdown,
  behavior, and archive gate.

## Verification record

Passed:

Communication, Admin, and Recruit:

- static route/presentation/archive/protected-behavior verifier for all 20
  Communication/Admin routes and the 19 newly migrated surfaces;
- route audit: 211 pages, 14 layouts, 193 migrated, 17 pending;
- scoped ESLint for all changed production and migration sources;
- production TypeScript with the required 8 GB heap;
- 2 focused shared-workspace tests;
- production build with Prisma generation, Next.js compilation, production
  TypeScript, and all 315 application routes;
- 306 authenticated Playwright checks across 34 Communication, Admin, and
  Recruit routes, all three themes, and desktop/tablet/mobile widths;
- exact paths, workspace ownership, active semantic theme/tokens, standardized
  controls/tables, no legacy visual composition, no application/server errors,
  and no page-level horizontal overflow;
- 81 representative screenshots plus
  `artifacts/ui-migration/communication-admin/verification.json`;
- screenshot review across Light, Night, Violet, desktop, tablet, and mobile;
- `git diff --check`.

The full repository lint command was also executed. It remains red on the
documented pre-existing seed, maintenance-script, and unrelated business-module
backlog; Batch 006 scoped ESLint passes.

Accounting:

- `node scripts/verify-monolith-accounting-ui.mjs`;
- route audit: 211 pages, 13 layouts, 174 migrated, 36 pending;
- targeted ESLint for Accounting routes, shared Accounting components, shell,
  migration scripts, runtime script, and tests;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit`;
- 22 tests in 5 focused Accounting/workspace/dialog/shell suites;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build`;
- Prisma generation, Next.js compilation, production TypeScript, and 315
  static pages;
- 288 authenticated runtime checks:
  - 32 routes;
  - Light, Night, and Violet;
  - 1440×1000 desktop, 1024×900 tablet, and 390×844 mobile;
  - loaded item, journal, payment, sales-invoice, and purchase-invoice dynamic
    details;
  - exact path, final workspace/header, theme/tokens, standardized controls,
    browser/server errors, legacy composition, and horizontal overflow;
  - mobile quotation-dialog size and Escape dismissal;
  - 72 representative screenshots and
    `artifacts/ui-migration/accounting/verification.json`;
- temporary database fixture cleanup independently confirmed at zero;
- `git diff --check`.

The production build retains six existing non-fatal broad filesystem/NFT trace
warnings in HRMS/customer-portal code and `next.config.ts`. They are outside
the Accounting batch and do not affect compilation or the verified routes.

CRM and shared corrections:

- legacy archive checksum, size, and 131-file listing;
- route audit: 211 pages, 13 layouts, 174 migrated, 36 pending;
- static CRM verifier for all 57 routes and every dynamic route family;
- targeted ESLint for new infrastructure, boundaries, shell, verifier, and
  tests;
- `npx tsc --noEmit -p tsconfig.ui-migration.json`;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit`;
- 21 focused tests in 7 suites;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build`, including Prisma
  generation, Next.js compilation, production TypeScript, and 315 pages;
- production HTTP smoke for `/crm`, returning the expected authenticated `307`
  login redirect;
- `git diff --check`.

Repository-wide ESLint retains the known business-code backlog. The latest
scan reported 1,616 errors and 497 warnings, with the CRM-scoped scan reporting
222 errors and 98 warnings. Findings are concentrated in pre-existing
`no-explicit-any`, hook-effect, unused-symbol, and related debt in large CRM
lead/enquiry views and service/action modules. New migration infrastructure
passes targeted lint. No business behavior was rewritten merely to hide that
debt.

The build retains the existing non-fatal Turbopack broad file-trace warning
through `next.config.ts` and the customer-portal checklist-file route.

## Merge integration validation

The Accounting and CRM branches were reconciled additively on 2026-07-29.
Both route families remain active in the Monolith shell. Batch 007 subsequently
advanced the generated inventory to 211 pages, 14 layouts, 198 migrated routes,
and 12 pending routes.

Passed on the combined tree with the required 8 GB Node heap:

- Accounting, CRM, and Expense/CHA static migration verifiers;
- targeted ESLint for the merged audit, shell, and CRM infrastructure;
- production TypeScript with `npx tsc --noEmit`;
- 24 tests in 6 Accounting, CRM, CHA, dialog, and shell suites;
- production build, including Prisma generation, Next.js compilation,
  production TypeScript, and all 315 static pages;
- `git diff --check` for both working and staged changes.

The production build retains the six previously documented non-fatal broad
filesystem/NFT trace warnings in HRMS, customer-portal, and `next.config.ts`.

## Important constraints

- Do not redesign `/dashboard`.
- Do not modify Accounting or CRM permissions, validation, server actions,
  integrations, posting rules, or data operations for presentation-only work.
- Do not compile or import from `OLD UI code`.
- Do not compile, import, or modify `_design-reference`.
- Keep Node.js processes at `NODE_OPTIONS=--max-old-space-size=8192`.

## Remaining historical visual blocker

The production application started successfully at
`http://127.0.0.1:3100` with the required 8 GB Node heap. The Browser skill was
initialized against that URL. Browser selection reported `No browser is
available`; after reading the required troubleshooting documentation, the
one-time availability query `agent.browsers.list()` returned `[]`.

That historical connected-browser blocker applies to the earlier CRM and
Expense/CHA verification claims only. It does not apply to Batch 006, whose
local authenticated production Playwright matrix completed successfully.
The following earlier claims remain outstanding:

- Light, Night, Violet, and Purple visual verification for every CHA modal,
  native/custom select, filter, warning, autocomplete, and success surface;
- CHA desktop, tablet, and mobile popup/overflow/focus verification;
- authenticated loaded-state verification for all 57 CRM routes;
- Light, Night, and Violet visual verification;
- desktop, tablet, and mobile responsive verification;
- all 513 route/theme/viewport combinations;
- dynamic contact/customer/deal/enquiry/invoice/item/lead/quote/ticket state;
- dialog, popover, menu, overflow, exact-theme, and application-error runtime
  assertions;
- CRM and Expense/CHA visual-verification commits.

## Next action

Continue the remaining migration program:

1. Attach an in-app Browser instance and verify every reachable CHA
   dialog/dropdown family in Light, Night,
   Violet, and Purple at desktop, tablet, and mobile widths. Include create-job,
   success, permission, warning, filter, native/custom select, autocomplete,
   document, expense, workflow, and destructive-confirmation states.
2. Use authenticated, read-only fixtures for every dynamic CRM route.
3. Exercise all 57 CRM routes in Light, Night, and Violet at desktop, tablet, and
   mobile widths (513 combinations), asserting the exact path, CRM workspace,
   theme, absence of application errors, and no horizontal overflow.
4. Open every safe CRM dialog and representative dropdown, select, filter,
   warning, Mona, toast, and shared Batch 004 popup consumer. Verify themed
   glass, focus handling, one bounded content scroller, mobile safe-area
   behavior, and focus restoration without mutating workflow data.
5. Fix any visual defects, rerun static/type/test/build gates, and commit those
   verified earlier batches.
6. Migrate the 12 remaining discovered routes, all in the customer portal
   family, without changing protected `/dashboard`.

## 2026-07-29 HRMS employee invitation handoff

The employee invitation and self-service lifecycle is implemented, migrated,
and production-build clean.

Delivered:

- HR creates an inactive pending employee and sends a secure organisation
  invitation instead of assigning a temporary password.
- Invitation tokens are hashed at rest, expire after 72 hours by default, are
  revoked on resend, and are consumed exactly once in the same transaction that
  activates the employee and stores the bcrypt password hash.
- The public employee invite page validates the link, shows the organisation
  context, enforces a strong password, and redirects to a workspace-ready thank
  you page.
- Pending employees are visible in the Employee directory/profile immediately,
  including delivery, expiry, and resend states.
- The redundant `Onboard Employee` sidebar/dashboard entry was removed;
  invitation creation remains available only from the Employees directory.
- Employee self-service can update only the explicit server-side basic/KYC
  allowlist. Critical employment, organisation, bank, joining, reporting,
  salary, role, work-contact, custom, and system data remains HR-only.
- Generic user updates cannot bypass invitation acceptance by activating a
  pending invited user.
- The shell exposes `My employee profile` to employees who have employee-read
  capability.

Persistence:

- `EmployeeInvitation`, `User.emailVerifiedAt`, and `User.activatedAt` were
  added by `20260729201500_add_employee_invitations`.
- The migration was deployed successfully to the configured PostgreSQL
  database.
- Email delivery uses the existing Resend/SMTP provider configuration.

Verification:

- targeted ESLint: passed;
- production TypeScript: passed;
- focused HRMS invitation/profile/export tests: 19 passed;
- People Operations static verifier: 45 routes passed;
- route audit: 213 pages, 14 layouts;
- production build: 321 pages passed;
- full production-source tests: 208 passed and 3 unrelated CHA integration
  expectations failed;
- repository-wide ESLint remains blocked by the documented legacy backlog;
- browser selection returned no available browser (`[]`), so live Light, Night,
  and Violet visual/responsive checks remain pending.

Backup:

- `OLD UI code/legacy-ui-before-hrms-employee-invitations-20260729.zip`
- 24,105 bytes
- SHA-256
  `7A7B1DF27B5B3BD28CA363909E3920161B7E0A346F95D9652E88A69C1BDBA5CF`

Next visual action:

1. Attach an in-app Browser instance.
2. Verify `/hrms/employees/new`, invited Employee directory/profile states,
   `/invite/employee` with valid/invalid/expired/used tokens, the password
   requirement/error states, `/invite/employee/ready`, and employee
   self-service at desktop, tablet, and mobile widths in Light, Night, and
   Violet.
3. Confirm keyboard focus, no horizontal overflow, email failure/resend
   messaging, and that HR-only controls never enter edit mode for an employee.

## 2026-07-29 HRMS work report workflow handoff

The daily work report expansion is implemented and deployed to the configured
database.

Delivered:

- `/hrms/work-reports` uses a wide rectangular shared dialog with up to 25
  independent job/description line items.
- The dialog refreshes GPS on submission, resolves the current address with a
  coordinate fallback, and saves coordinates, accuracy, address, and a
  server-side timestamp. The address is read-only in the form.
- `/hrms/settings` now has a third Work Report Setup column for dynamic report
  fields, one-level versus two-level approval, and the approved-report OT
  requirement.
- The employee's existing primary manager is approval level 1 and secondary
  reporting manager is level 2. Level 2 remains waiting until level 1 approves.
- Managers receive durable notification-center records and queued email
  notifications. They can approve/reject from the report timeline or HRMS
  Approvals inbox. Employees receive the final decision.
- The Attendance OT engine emits `WORK_REPORT_REQUIRED` with zero OT whenever
  the setting is enabled and that date has no finally approved report. Final
  approval triggers recalculation for the report date.

Persistence:

- Migration `20260729233000_upgrade_work_reports` is deployed.
- `WorkReport` now stores repeatable items, dynamic values, and GPS evidence.
- `WorkReportApproval` stores level, waiting/pending/final state, decision time,
  and an enforced approver relation.
- `WorkReportSettings` and `WorkReportField` are organisation scoped.

Verification:

- targeted ESLint: passed with no findings;
- production TypeScript: passed;
- focused work-report and OT tests: 9 passed in 2 suites;
- People Operations static verifier: all 45 HRMS and Attendance routes passed;
- production build: 323 pages passed;
- database migration status: up to date;
- backup:
  `OLD UI code/legacy-ui-before-work-report-upgrade-20260729.zip`, 9,674 bytes,
  SHA-256
  `C2695E8858C51DFF58A2848C59C541745BD05225144490184E7AE23D2E91D490`;
- the existing non-fatal customer-portal NFT trace warning remains;
- browser selection returned no available browser (`[]`).

Next visual action:

1. Attach an in-app Browser instance.
2. Verify `/hrms/work-reports`, `/hrms/settings`, and `/hrms/approvals` at
   desktop, tablet, and mobile widths in Light, Night, and Violet.
3. Exercise add/remove line items, every dynamic field type, location allow/
   deny/timeout/refresh states, primary approval, secondary handoff, rejection,
   final decision notification, and OT recalculation.
4. Confirm focus trapping/restoration, one bounded dialog scroller, no
   horizontal overflow, and correct semantic-token contrast in every theme.

## 2026-07-29 HRMS document drive handoff

The HR document drive is reworked, backed by the configured organisation Shared
Drive, and deployed to the configured database.

Delivered:

- `Monolith HR Document Drive` is the managed main folder. It contains
  `My Space Files`, `Company Files`, and `Employee Shared`.
- My Space and Employee Shared provision employee folders named
  `Employee Name - ID {employeeNumber}`, falling back to the internal user ID.
- My Space is private to its owning employee inside HRMS.
- Company Files are visible organisation-wide, while only HR document
  administrators can upload them.
- Employee Shared is visible only to its employee, current primary/secondary
  reporting managers, and HR. Managers see only direct reports and cannot upload
  on a report's behalf; HR can.
- The API accepts real files up to 25 MB, uploads them to Drive, stores only the
  secure metadata/index in PostgreSQL, and removes an orphaned Drive file if the
  metadata transaction fails.
- No raw Drive ID or link reaches the client. Open/download requests repeat the
  access decision and proxy the bytes with no-store and nosniff headers. Only
  PDF and safe raster-image MIME types may render inline.
- Upload/download audit events are persisted.

Persistence:

- Migration `20260729234500_rework_hr_document_drive` is deployed.
- `HrDocumentDriveConfig` records the managed root/category folder IDs.
- `HrDocumentFolder` records the employee-category Drive folder mapping.
- `HrDocumentFile` records the protected file index and owner/uploader metadata.
- Final migration status reports the schema is up to date.

Verification:

- targeted ESLint: passed with no findings;
- production TypeScript: passed;
- focused document hierarchy/access tests: 7 passed;
- production build: all 323 pages passed;
- full suite: 222 passed, with one unrelated protected-dashboard visual
  expectation and three unrelated existing CHA integration expectations
  failing;
- backup:
  `OLD UI code/legacy-ui-before-hr-document-drive-rework-20260729.zip`, 5,933
  bytes, SHA-256
  `25E1C5B3DF3CFA282A1BA8694F697A44FFEEA898F5BFFE5620194F12E630F775`;
- browser selection returned no available browser (`[]`), so the page is not
  marked visually Verified.

Next visual action:

1. Attach an in-app Browser instance.
2. Verify `/hrms/files` at desktop, tablet, and mobile widths in Light, Night,
   and Violet.
3. Exercise empty, loading, search, upload, 25 MB validation, disconnected
   Drive, HR Company Files upload, employee self-upload, HR employee selection,
   manager direct-report selection, forbidden forged employee IDs, open, and
   download states.
4. Confirm table overflow, keyboard focus, no horizontal page overflow, semantic
   token contrast, and that My Space/Employee Shared controls never appear for
   an unauthorised user.

## 2026-07-29 HRMS quick add employee handoff

The minimal employee creation path is implemented on `/hrms/employees`.

Delivered:

- HR users with `hrms.employee.create` now see `Add Employee` and `Full
Onboarding` as separate choices.
- `Add Employee` opens the shared Monolith dialog and requires only Employee ID,
  first name, last name, and email.
- `Generate` reads the organisation's last Employee ID and proposes an unused
  numeric ID above the current global maximum. Manual IDs remain supported and
  are checked again on submission.
- The quick API assigns the default Employee role, creates an inactive pending
  user and empty HRMS profile, and sends the existing secure invitation.
- It deliberately does not create an `EmploymentRecord`. HR supplies the actual
  joining date and remaining details later from the employee profile, whose
  existing save flow creates that record and appraisal schedule.
- Email delivery failure preserves the pending employee and uses the existing
  resend action. Duplicate email/ID and permission checks are server-side.
- Full onboarding remains unchanged for cases where HR already has complete
  employment, organisation, salary, bank, and personal information.

Persistence:

- No schema or database migration was required.
- The existing User, EmployeeHrmsProfile, EmployeeInvitation, role, security
  event, and email delivery models are reused.

Verification:

- targeted ESLint: passed;
- production TypeScript: passed;
- focused quick-add/invitation/profile/export tests: 22 passed across 5 suites;
- production build: all 324 pages passed;
- backup:
  `OLD UI code/legacy-ui-before-hrms-quick-add-employee-20260729.zip`, 5,951
  bytes, SHA-256
  `C7E9AECEFC7886C09FE778959DD42F4F2C91C94E972C523ECCA94706E9EBB841`;
- the existing non-fatal customer-portal NFT trace warning remains;
- browser selection returned no available browser, so the quick dialog is not
  marked visually Verified.

Next visual action:

1. Attach an in-app Browser instance.
2. Verify `/hrms/employees` in Light, Night, and Violet at desktop, tablet, and
   mobile widths.
3. Exercise generated and manual IDs, duplicate email/ID responses, required
   fields, invalid email, invitation delivery success/failure, cancel, Escape,
   focus trap/restoration, and navigation to the new pending employee profile.
4. Confirm non-HR viewers never receive either creation action and forged quick
   API requests return the permission error.

## 2026-07-29 CHA Jobs datatable controls

The `/cha/jobs` Active and Completed Jobs datatable toolbars now match the
shared Monolith table reference: left-aligned icon search, right-aligned New Job
and Filter controls, no extra Apply Search button, and shared search/control
sizing.

Backup:
`OLD UI code/ui-iteration-backups/cha-jobs-datatable-controls-reference-20260729/`

Verification:

- targeted ESLint for `src/app/(dashboard)/cha/jobs/jobs-client.tsx`: passed;
- `npx tsc --noEmit -p tsconfig.ui-migration.json`: passed;
- `node scripts/verify-monolith-expense-cha-ui.mjs`: passed;
- visual verification remains covered by the existing CHA browser-instance
  blocker.

## 2026-07-29 Login animated character restore

The `/login` page was restored to the earlier animated Monolith character scene
by request, without changing login behavior. The restore is limited to the
login component, its CSS module, and the small scene type helper. Current
credential login, Google SSO, remember-me, callback URL safety, stale-session
cleanup, validation, success delay, and redirect behavior are preserved.

Backup:
`OLD UI code/ui-iteration-backups/login-animated-character-restore-20260729/`

## 2026-07-29 Dashboard module graphics correction

The protected `/dashboard` module command center graphics are repaired. The
merge had left the active React illustration components without their shared
`mnx-dashboard-graphic` and `mnx-dg-*` semantic CSS tokens, causing the card art
to render as broken outline fragments. The shared graphic token block and a
stable module-card art canvas are restored in `src/styles/monolith-system.css`.

Backup:
`OLD UI code/ui-iteration-backups/dashboard-module-graphics-fix-20260729/`

## 2026-07-29 CHA dashboard workspace style restore

The protected `/cha` command workspace styles are repaired. The active
components were still rendering the shared Monolith class names, but the merge
had dropped the CSS for the outside section headings, Assigned Jobs table
toolbar/search/filter/status text, and the Operations Overview pending action,
expiry, empty-state, job-reference, and recent-activity timeline surfaces.
The Assigned Jobs action controls were also normalized so New Job, Filter, View
All, and Settings use the Monolith datatable pill sizing rather than legacy
compact/unstyled controls.

Backup:
`OLD UI code/ui-iteration-backups/cha-dashboard-styles-restore-20260729/`

Follow-up backup:
`OLD UI code/ui-iteration-backups/cha-dashboard-action-buttons-fix-20260729/`

The follow-up button correction was then scoped back out of the global design
system primitives. `mnx-button-outline` and `mnx-filter-button` are no longer
globally restyled by this repair; only the CHA Assigned Jobs toolbar receives
the datatable-specific sizing.

Revert backup:
`OLD UI code/ui-iteration-backups/design-system-button-revert-20260729/`

## 2026-07-29 Monolith button and filter primitive recreation

The shared button and filter primitives have been recreated from the v11
reference source. `mnx-button` now carries the reference 48px pill proportions,
variant fills/shadows/borders, compact and disabled states, and 15px action
icons. `mnx-filter-button` / `filter-button` now carries the reference 35px
datatable filter control with the small accent count chip. The
`/admin/design-system` Actions and status preview now renders the same
reference button hierarchy plus text and icon action examples.

Backup:
`OLD UI code/ui-iteration-backups/monolith-buttons-filter-reference-recreate-20260729/`

## 2026-07-29 performance audit handoff

The performance pass preserves the active Monolith presentation. Create Job
options on `/cha/jobs` and Organization-tab data on `/dashboard` are now lazy;
their loading surfaces use existing shared components.

Passed: targeted ESLint, production TypeScript, 9 focused tests, 328-route
production build, public `/login` Playwright smoke, and a controlled Turbopack
Fast Refresh check with one page load and no console errors.

Blocked: authenticated theme/viewport and performance measurements require an
explicitly approved local/staging database and safe credentials. The repository
`.env` remote Neon target was deliberately not used.

## 2026-07-30 login credential-query fix

The `/login` double-entry symptom and credential-bearing URL were traced to the
browser's native pre-hydration form submission. The login controls now stay
disabled until hydration, the form declares POST as its safe native fallback,
and the client removes any legacy `email`, `password`, or `rememberMe` query
parameters without removing a valid `callbackUrl`.

Passed: hydrated and JavaScript-disabled Playwright checks, targeted ESLint,
the UI migration and production TypeScript projects, and `git diff --check`.
No real user credentials or remote database authentication were used during
verification. The historical Batch 007 static verifier remains stale against
the current root authentication source and stops on its unrelated literal
`await auth()` assertion; this fix does not modify the root flow.

Backup:
`OLD UI code/ui-iteration-backups/login-native-submit-credential-leak-fix-20260730/`

## 2026-07-30 performance phase 2 continuation

The current uncommitted performance tree now contains request-scoped dashboard
context, lazy Team/Organization data, two-query cached dashboard metrics,
side-effect-free widget reads, lazy/dynamic CHA Create Job options, visible-job
warning scoping, aggregated CHA metrics, joined activity actors, database/pool
telemetry, a dedicated non-overlapping Justdial worker, explicit Turbopack
scripts, and Playwright security/motion checks.

Measured local-staging latency targets pass. The exact measurements, pool/SQL
telemetry, commands and limitations are in
`docs/performance-phase-2-results.md`.

Do not mark this phase complete yet:

- measured complete-request query counts remain 29 for `/cha` and 22 for
  `/cha/jobs`, above the required maximum of eight;
- the full suite passes 283/286 tests, with the three previously recorded CHA
  fixture failures;
- repository-wide lint exceeded the 120-second run window;
- production per-query/pool telemetry still needs a representative run.

No commit, push, reset, stash, clean or discard operation was performed.

## 2026-07-30 Accounting Phase 5 handoff

Phase 5 operational Accounting UI and application integration is implemented
locally from required starting HEAD `2f37936b07cfea8b9f7b1c993d342811278b7af6`.
No commit, push, deployment, production/Neon/Zoho/provider connection, real-data
migration, or Phase 6 cutover was performed.

Primary implementation:

- centralized route access, exact-money helpers, bounded tenant read models,
  stable error mapping, and canonical server actions under
  `src/modules/accounting/operational-*`;
- shared operational registers, details, dialogs, policy gates, and exact money
  display under `src/components/monolith/accounting-operational-*`;
- operational routes listed in
  `docs/accounting/phase-5-operational-ui.md`;
- permission-aware navigation with existing functional Accounting routes
  retained;
- compatibility draft creation remains additive, while submit converges on the
  canonical Phase 4 adapters and canonical detail routes;
- manual journals use draft → independent checker → canonical engine;
- no Phase 5 schema or migration files.

Safety:

- all new operational reads are organization-scoped and bounded;
- all mutation actions reauthorize server-side;
- expected row versions protect approval, rejection, reversal, and outbox
  controls;
- exact decimal strings are preserved across UI boundaries;
- immediate-post controls and unreachable direct invoice/payment writer
  branches were removed;
- email and external publication remain disabled/not configured.

Backup:
`OLD UI code/legacy-ui-before-accounting-phase5-2f37936.zip`, SHA-256
`3260DD7EE1DAC71D3FB4AAE3AA149668A450EF9F944D817C2461679DD8D1C8A8`.

The verification table in `docs/accounting/phase-5-operational-ui.md` records
the final static, test, build, guarded staging, catalogue, and browser
availability results. Authenticated visual verification remains the only
environmental evidence gap because no in-app or attached browser was available.
## 2026-07-30 Accounting Phase 7 rollout-preparation handoff

Phase 7 is implemented as preparation only from required starting HEAD
`498eb8364858da2c45e2b4c86d09098ae05f2443`. No commit, push, PR, deployment,
production/Neon/Zoho/provider access, real-data access, port-5432 access,
database schema change, production migration, cutover, or go-live occurred.

Delivered:

- 20-decision fail-closed policy register;
- secret-free production configuration contract that rejects port 5432,
  provider/outbound enablement, staging fallback, incomplete authorization,
  and all Phase 7 production execution;
- versioned manifest integrity, deterministic go/no-go, backup readiness, and
  evidence-gated cutover state machine;
- deterministic small/medium/large synthetic profiles and a database-free
  in-memory rehearsal covering dry-run, interruption/resume, replay,
  reconciliation mismatch, and provider-disabled behavior;
- monitoring, alerts, role-based acceptance, deployment sequencing,
  rollback/forward-fix, hypercare, incident response, and future production
  smoke-test runbooks;
- complete requirements and security traceability.

Evidence:

- Phase 7 focused tests: 20 passed;
- Phase 6 independent rerun: 48 passed;
- guarded full suite: 410 passed; the same three unrelated CHA expectations
  failed (mock Drive attachment, estimated filing date, legacy direct-delete
  audit event);
- bounded 1,500-record benchmark: 62.54 ms dry-run, 64.75 ms in-memory
  execution, 1,423,384-byte heap delta, zero queries;
- TypeScript, targeted ESLint, Prisma format/validate, static verification,
  safety scan, `git diff --check`, and the 342-page production build passed.

Current rollout result remains `NO_GO`. Required next actions are external
policy decisions, accepted production configuration and authorization
evidence, backup/restore rehearsal evidence, a final real-source manifest under
an approved freeze, guarded canonical/database performance evidence, named
staffing, business/security/technical approvals, and a separately authorized
future production-enablement change.

## 2026-07-31 Accounting schema repair handoff

The root `.env` target and local staging test database are migrated and report
all 66 repository migrations up to date. The root target is Neon `neondb` in
`public`; credentials were not printed or changed.

Delivered:

- reconciled four historical migration records only after verifying their
  complete table footprint in PostgreSQL;
- deployed the pending canonical Accounting Phase 2–4 and Phase 6 chain plus
  the pre-existing Phase 9 migrations;
- added idempotent baseline and metadata-alignment migrations;
- added `accounting:schema:verify`, a read-only 70-model column/index/unique/
  foreign-key/migration verifier;
- added development and deployment preflight commands;
- added a Docker migrator service that must complete successfully before the
  application starts;
- sanitized the Accounting error boundary with a correlation ID, retry action,
  authenticated server-side diagnostic logging, and no raw browser-visible
  diagnostics.

Verification:

- schema format, validation, migration status, Client generation, and empty
  schema diff passed;
- schema verifier passed: 70 models, 1,076 indexes, 581 foreign keys, 24
  required migrations;
- production TypeScript, repair-scoped ESLint, focused boundary test, and
  production build passed;
- full tests returned 491 passed and the same three unrelated CHA failures;
- repository lint retains its existing 1,360-error/312-warning backlog;
- all 29 Accounting navigation routes returned an authentication redirect
  rather than 404/500, and server logs contain no P2021/missing-table/invalid
  Prisma invocation;
- authenticated visual and loaded-state verification is still blocked because
  no in-app browser instance was available.

No reset, seed, Zoho import, historical Accounting record migration, synthetic
transaction insert, destructive table/column operation, or credential change
was performed.

## 2026-07-31 localhost:3000 single-server handoff

Only one interactive Monolith server is permitted. Use `npm run dev` and review
changes at `http://localhost:3000`; do not start or recreate a staging web
application. `dev`, `dev:webpack`, and `dev:turbopack` explicitly pass port
3000 after the read-only Accounting schema preflight. `staging:dev`,
`staging:app:check`, and `staging:login:verify` now exit with a clear disabled
message. The staging environment runner permits only Prisma, tsx, and Vitest
command-line work.

The clean restart performed in this session:

- found the existing Monolith listener on port 3000 and no listener on 3100;
- stopped only the verified repository Next.js process tree;
- removed `.next`;
- regenerated Prisma Client;
- started `npm run dev` with the required 8 GB Node heap;
- confirmed Next.js loaded `.env` and announced
  `Local: http://localhost:3000`;
- reconfirmed port 3000 readiness and no port-3100 listener after the
  production build.

Database environment:

- Next.js and Prisma CLI resolve the root `.env`;
- Vitest uses `.env.staging.local` for isolated database tests only;
- UI audits use only the existing port-3000 app and never load the staging
  environment to start Next.js;
- safe target: Neon host
  `ep-lucky-paper-ao7k5ek6-pooler.c-2.ap-southeast-1.aws.neon.tech`, port 5432,
  database `neondb`, SSL enabled; credentials were not displayed.

All 66 migrations were already applied. The read-only Accounting verifier
passed 70 models, 1,076 indexes, 581 foreign keys, and all 24 required
Accounting migrations. No database mutation was required or attempted.

Validation passed: modified-script ESLint, Phase 9 static checks, 14 focused
tests, TypeScript, Prisma validate/status/generate, Accounting schema
verification, port-3000 readiness, and the 346-page production build.
Repository-wide lint remains red on the existing unrelated backlog.

All 16 requested Accounting URLs returned the expected same-origin HTTP 307
authentication redirect on port 3000, with no 404/500, port change,
missing-table message, or raw Prisma error in the server log.

Remaining browser gate: the in-app browser inventory returned no available
browser. Therefore the requested authenticated route rendering, stale-UI,
cross-tenant, mock-data, raw-error, redirect, and network-origin checks across
the 16 Accounting routes are not claimed. Once a browser is available, run
`npm run accounting:ui:verify` with normal-development `UI_TEST_EMAIL` and
`UI_TEST_PASSWORD`; the script is read-only, creates no fixtures, refuses
non-3000 targets, and records its result under
`artifacts/ui-migration/accounting/localhost-3000-verification.json`.

No commit, push, reset, seed, migration deploy, fixture insert, or environment
credential change was performed in this localhost-only slice.

## 2026-07-31 customer/vendor master continuation handoff

Finished the partial customer and vendor master implementation that had been
started locally.

Delivered:

- the CHA customer new/edit clients now compile cleanly with the GST
  auto-population flow and continue to wire `taxPreference` into the server
  actions;
- `/crm/customers`, `/crm/customers/new`, and
  `/crm/customers/[id]/edit` now redirect to the CHA customer master routes so
  there is one operational customer-maintenance surface instead of parallel CRM
  and CHA entry points;
- a shared `VendorMasterCreateForm` now powers vendor creation with GST-assisted
  name/address autofill on `/crm/vendors`;
- `/accounting/vendor-master` now exists as the Accounting-facing vendor
  register, with the same shared creation form available only to viewers who
  also hold `crm.vendor.manage`;
- `src/components/monolith/accounting-workspace.tsx` includes route metadata
  for the new Accounting vendor-master workspace.

Verification:

- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit`: passed;
- targeted ESLint for the touched customer/vendor/accounting files: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build`: passed with 349
  generated pages and the new `/accounting/vendor-master` route present;
- `git diff --check` for the touched files: passed.

Open follow-up:

- this continuation added one new route, so the historical top-level route
  counts in the migration audit docs are now stale until the next full audit
  regeneration;
- browser-backed visual verification is still blocked by the same missing
  in-app browser inventory.

## 2026-07-31 Accounting item master rework handoff

The Accounting item master was reworked to better match the requested
reference layout and data-entry flow without changing the existing protected
dashboard, reference project, or shared Monolith shell conventions.

Delivered:

- `/accounting/items` now renders as a denser item-master register focused on
  the operational columns shown in the reference: name, SKU, purchase
  description, purchase rate, description, rate, HSN/SAC, usage unit, and
  status, with image presence visible in the item identity cell;
- `/accounting/items/new` now provides a fuller item-master entry form with an
  item image drop/browse surface, sales and purchase sections, GST/tax default
  display, additional operational fields, inventory toggles, and
  multi-currency price rows;
- Preferred Vendor now pulls from the live shared vendor master by fetching
  Accounting-scoped CRM vendor records on the server page and passing them into
  the item form;
- the shared client-side item model and Zod validation now persist the extra
  item-master metadata needed by the new UI;
- the older CRM item dialog and CRM new-item page were updated only as needed
  to stay compatible with the expanded shared item schema.

Backup:

- `OLD UI code/ui-iteration-backups/accounting-item-master-rework-20260731/`
  contains the pre-change Accounting item-master component and new-item page
  backups taken before the rewrite.

Verification:

- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit`: passed;
- targeted ESLint for
  `src/components/monolith/accounting-items.tsx`,
  `src/app/(dashboard)/accounting/items/new/page.tsx`,
  `src/lib/items/types.ts`,
  `src/lib/items/validation.ts`,
  `src/components/items/NewItemDialog.tsx`, and
  `src/components/items/NewItemPage.tsx`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build`: passed with 349
  generated routes and the Accounting item and vendor-master routes present.

Blocked:

- authenticated browser verification is still blocked by the same missing
  in-app browser inventory, so no claim is made yet about pixel-level parity
  with the supplied screenshots across Light, Night, and Violet at all
  breakpoints.

## 2026-07-31 GST portal manual fallback handoff

Added a hybrid GST lookup fallback to the current customer/vendor master flows.

Delivered:

- the CHA customer new form, CHA customer edit form, and shared vendor-master
  create form now surface a `Verify on GST Portal` link next to GSTIN entry;
- when `fetchGstDetailsAction` fails because backend GST credentials are not
  configured, the forms now show a clear fallback message telling the operator
  to use the official public GST search portal and enter the values manually;
- the fallback note explicitly states that the public portal requires manual
  captcha verification, so this path is treated as assisted manual lookup
  rather than silent auto-population.

Files:

- `src/lib/gst-public-search.ts`
- `src/app/(dashboard)/cha/customers/new/new-customer-client.tsx`
- `src/app/(dashboard)/cha/customers/[id]/edit/edit-customer-client.tsx`
- `src/components/monolith/vendor-master-create-form.tsx`

Verification:

- targeted ESLint for the fallback helper and the three touched GST-aware
  client forms: passed.

Notes:

- a full `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit` run is
  currently blocked by unrelated pre-existing `CustomerContactPayload` typing
  errors in `src/modules/crm/actions.ts`; this GST fallback change did not
  introduce new TypeScript errors in the touched files;
- authenticated browser verification remains blocked by the same missing
  in-app browser inventory.

## 2026-07-31 customer master contact and address expansion handoff

Extended the active CHA customer new/edit wizard to match the requested
operational contact and address flow.

Delivered:

- primary contact is now explicit in the Contact step and captures contact
  person name, designation, email, and phone;
- operators can add and remove additional contacts inline, and those save back
  into linked `CrmContact` rows on the customer account;
- the Address step now supports Billing, Shipping, and Courier addresses, with
  `Billing As Shipping` and `Billing As Courier` toggles;
- 6-digit Indian PIN entry now calls a new server-side lookup and auto-fills
  read-only City and State fields for all three address blocks;
- edit loading now includes active contacts plus courier/toggle metadata from
  the persisted remarks payload so the new fields round-trip on edit.

Files:

- `src/app/(dashboard)/cha/customers/new/new-customer-client.tsx`
- `src/app/(dashboard)/cha/customers/[id]/edit/edit-customer-client.tsx`
- `src/app/(dashboard)/cha/customers/[id]/edit/page.tsx`
- `src/modules/crm/actions.ts`

Verification:

- targeted ESLint for the touched customer files: passed;
- filtered `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit` output
  showed no errors from the touched customer files or the new customer-master
  action changes.

Blocked:

- full production TypeScript remains blocked by unrelated pre-existing
  `src/components/monolith/vendor-master-create-form.tsx` failures;
- authenticated browser verification remains blocked by the same missing
  in-app browser instance.

## 2026-07-31 staging web runtime re-enabled handoff

At the user's request, the earlier single-server restriction is superseded.
The normal Monolith development server remains available at
`http://localhost:3000`, and `npm run staging:dev` now runs the same current
source at `http://127.0.0.1:3100` against the isolated local staging database.

Safety and isolation:

- the staging launcher validates the exact loopback PostgreSQL target at
  `127.0.0.1:56432/monolith_accounting_staging`;
- it binds Next.js only to `127.0.0.1:3100` and uses
  `.monolith-staging/next`, so it does not share port or build output with the
  port-3000 server;
- staging session, CSRF, and callback cookies use dedicated names so port-3000
  sessions cannot be decrypted or overwritten by port 3100;
- Accounting provider execution remains disabled;
- startup refuses configured outbound email or OAuth delivery credentials;
- staging database/admin passwords and the staging login password are removed
  from the Next.js child environment.

The staging database was healthy but seven Accounting Phase 9 migrations
behind the active source. `npm run staging:db:migrate` applied those migrations,
`npm run staging:db:status` reported all 73 migrations current, and
`npm run staging:db:verify` passed. Both `/login` endpoints returned HTTP 200,
and representative Accounting routes on ports 3000 and 3100 returned expected
HTTP 307 authentication redirects with no 404 or 500.

## 2026-07-31 customer master finance and KYC expansion handoff

Extended the same active CHA customer wizard further for multi-branch opening
balances and the extra cancelled-cheque document requirement.

Delivered:

- Finance now supports multiple branch opening-balance rows instead of a single
  branch/amount pair;
- the first row still maps onto the legacy account-level opening-balance fields
  for compatibility with existing readers, while the full list is stored in the
  customer remarks metadata as `openingBalancesByBranch`;
- KYC now includes `Cancelled Cheque` in both create and edit flows and in the
  review/status surfaces;
- create and update actions now persist the new branch-balance list and the new
  KYC document alongside the existing remarks/KYC metadata contract.

Files:

- `src/app/(dashboard)/cha/customers/new/new-customer-client.tsx`
- `src/app/(dashboard)/cha/customers/[id]/edit/edit-customer-client.tsx`
- `src/modules/crm/actions.ts`

Verification:

- targeted ESLint for the two touched customer wizard files remains clean;
- filtered `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit` output
  showed no matches from the touched customer/customer-action branch-balance
  and cancelled-cheque changes.

Blocked:

- repository ESLint remains red on the pre-existing broad `no-explicit-any`
  backlog in `src/modules/crm/actions.ts`;
- full production TypeScript remains blocked by the unrelated pre-existing
  `src/components/monolith/vendor-master-create-form.tsx` failures;
- authenticated browser verification remains blocked by the same missing
  in-app browser instance.

## 2026-07-31 journal entries reference refresh handoff

Updated the active Accounting journal register and manual-journal draft route
to behave more like the supplied reference while preserving the current
business contract that journal creation only prepares a draft for separate
approval/posting.

Delivered:

- `/accounting/journal-entries` now accepts `search`, `status`, `dateFrom`,
  `dateTo`, and `page` query parameters and renders a denser manual-journal
  register with location, narration, amount, maker, and reporting-method
  visibility;
- `listCanonicalJournals` now resolves branch names and maker names and applies
  bounded search over voucher number, notes, source id/type, and branch name;
- `/accounting/journal-entries/new` now uses a fuller journal-header form,
  table-like line entry grid, inline remove actions, and a right-aligned totals
  summary card closer to the requested layout;
- the form still persists only posting date, branch, narration, and balanced
  lines because those are the real server-supported journal draft fields today;
- no unsupported reverse-date, attachment, recurring, or immediate-publish
  behavior was added.

Files:

- `src/app/(dashboard)/accounting/journal-entries/page.tsx`
- `src/app/(dashboard)/accounting/journal-entries/new/page.tsx`
- `src/app/(dashboard)/accounting/journal-entries/new/new-jv-client.tsx`
- `src/components/monolith/accounting-operational-views.tsx`
- `src/modules/accounting/operational-queries.ts`
- `src/styles/monolith-system.css`

Backup:

- `OLD UI code/ui-iteration-backups/journal-entries-reference-refresh-20260731/`

Verification:

- targeted ESLint for the touched journal route/query/view files: passed;
  the current ESLint configuration still prints its normal warning that the raw
  CSS file is ignored;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build`: passed with 351
  generated routes including the journal register and new-journal route;
- `git diff --check` for the touched files: passed.

Blocked:

- authenticated browser verification remains blocked by the same missing
  in-app browser instance, so no final claim is made yet about exact
  theme/viewport parity with the supplied screenshots.

### Follow-up: ledger contact toggle handoff

Extended the same journal work so ledger master now decides whether a manual
journal line can pick a contact/counterparty.

Delivered:

- added `allowJournalContact` to `Account` in `prisma/schema.prisma` and added
  migration `prisma/migrations/20260731113000_add_account_allow_journal_contact/migration.sql`;
- updated account creation in
  [accounts-client.tsx](C:/Users/SilverCloud/Documents/Adarsh-Shipping-and-Services-Management-Software/src/app/(dashboard)/accounting/accounts/accounts-client.tsx)
  to expose `Enable contact selection in manual journals`, and qualifying
  ledger rows now render a `Contact` badge in the chart;
- updated
  [new/page.tsx](C:/Users/SilverCloud/Documents/Adarsh-Shipping-and-Services-Management-Software/src/app/(dashboard)/accounting/journal-entries/new/page.tsx)
  and
  [new-jv-client.tsx](C:/Users/SilverCloud/Documents/Adarsh-Shipping-and-Services-Management-Software/src/app/(dashboard)/accounting/journal-entries/new/new-jv-client.tsx)
  so manual journal lines render the requested Contact column and enable it
  only when the selected ledger has the toggle enabled;
- the contact selector reuses the existing journal `partyType` / `partyId`
  contract and offers active customers, vendors, and employees.

Verification:

- targeted ESLint for the touched account/journal/validator files: passed;
- `npx prisma validate`: passed;
- `npx prisma generate`: passed;
- `git diff --check` for the touched files: passed.

Blocked:

- repository-wide ESLint on `src/modules/accounting/service.ts` still fails on
  the pre-existing broad `no-explicit-any` backlog unrelated to this slice;
- full production TypeScript is currently blocked by unrelated pre-existing
  Accounting page errors in `/accounting/bulk-update`,
  `/accounting/currency-adjustments`, and `/accounting/fixed-assets`;
- authenticated browser verification remains blocked by the same missing
  in-app browser instance.

## 2026-07-31 staging-to-Monolith Accounting integration handoff

Port 3000 and port 3100 already serve the same current source tree. The menu
difference was caused by RBAC/database drift: Monolith stored and granted only
18 original Accounting permissions to its system `Admin` role.

The new
`prisma/migrations/20260731235945_accounting_permission_catalogue_sync`
migration synchronizes all 67 Accounting permission definitions and grants
them only to system `Admin` roles. It does not broaden maker, checker,
Management, or custom roles. The migration was rehearsed on staging before
Monolith deployment.

Staging and Monolith now both report 75 migrations current, including banking,
recurring, permission synchronization, and the concurrently added asset
foundation. The Monolith schema verifier passed with zero failures, the system
Admin account resolves all 67 Accounting permissions, and 12 representative
routes returned expected HTTP 307 authentication redirects without 404/500.
Port 3000 was restarted to clear RBAC caches and is serving `/login` with HTTP
200 and no stderr; port 3100 remains available.

The Windows launcher also now treats an empty port-3000 listener check as a
successful result after restart. Authenticated browser verification remains
pending because no in-app browser is available.

## 2026-07-31 banking regrouping and workspace connectors handoff

Grouped the current Accounting bank functions under a single Banking subsection
and refreshed the Banking route into a proper hub without changing the existing
transfer business logic.

Delivered:

- `/accounting/banking` now goes through `requireAccountingRouteAccess` and the
  shared Accounting payments permission group in
  `src/modules/accounting/operational-access.ts`;
- shared Accounting navigation now supports second-level subsection labels via
  `sectionLabel`, and the Accounting workspace uses that to group
  `Overview`, `Payments`, `Customer Receipts`, `Vendor Payments`, and
  `Allocations` under `Banking`;
- the Banking page now shows connected workflow cards linking to the related
  banking pages plus header actions for `All payments` and `New payment draft`;
- the transfer modal on `/accounting/banking` still calls the existing
  `recordBankTransferAction` and is only surfaced when the user has payment
  preparation permission;
- the affected Banking route metadata now uses a consistent `Banking`
  eyebrow/title treatment in
  `src/components/monolith/accounting-workspace.tsx`.

Files:

- `src/app/(dashboard)/accounting/banking/page.tsx`
- `src/app/(dashboard)/accounting/banking/banking-client.tsx`
- `src/components/monolith/accounting-workspace.tsx`
- `src/components/monolith/app-shell.tsx`
- `src/lib/navigation.ts`
- `src/modules/accounting/operational-access.ts`
- `src/styles/monolith-system.css`

Backup:

- `OLD UI code/ui-iteration-backups/accounting-banking-grouping-20260731/`

Verification:

- targeted ESLint for the touched files: passed; the raw CSS file produced the
  current expected “ignored by config” warning only;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit`: passed;
- targeted `git diff --check` for the touched files: passed, aside from the
  usual Windows line-ending warnings;
- default `NODE_OPTIONS=--max-old-space-size=8192 npm run build`: blocked by
  `EBUSY` while unlinking `.next\\monolith-dev-3.stderr.log`, which is being
  held by the active local Next.js runtime rather than this Banking slice.

Blocked:

- no in-app browser instance is available, so authenticated visual verification
  of the regrouped Banking subsection and the Banking hub remains pending;
- if a clean production build artifact is needed in this same workspace, stop
  or isolate the active dev runtime first so `.next` is no longer locked.

## 2026-07-31 accountant regrouping and connected workspaces handoff

Grouped the accountant-facing Accounting tools under a single `Accountant`
subsection and created focused connector pages for the requested accountant
items that previously lacked dedicated routes.

Delivered:

- Accounting sidebar items now show the requested accountant grouping:
  `Manual Journals`, `Recurring Journals`, `Bulk Update`,
  `Currency Adjustments`, `Chart of Accounts`,
  `Transaction Locking`, and `Fixed Assets`;
- added new routes:
  `/accounting/bulk-update`,
  `/accounting/currency-adjustments`,
  `/accounting/transaction-locking`, and
  `/accounting/fixed-assets`;
- each new route uses Monolith sections plus the shared
  `AccountingWorkflowCards` component to connect into the real existing
  Accounting flows rather than dead placeholder pages;
- `/accounting/transaction-locking` uses the existing
  `updateTransactionLockAction` and current transaction-lock data, so lock
  updates remain functional from the new accountant workspace;
- `/accounting/currency-adjustments` surfaces live functional-currency and FX
  evidence data from `getAccountingConfigurationOverview`;
- `/accounting/fixed-assets` surfaces live fixed-asset readiness and the same
  depreciation capability gate already used by the existing depreciation route;
- `/accounting/accounts` and `/accounting/settings` now use the shared
  `requireAccountingRouteAccess` path instead of direct session checks.

Files:

- `src/lib/navigation.ts`
- `src/components/monolith/accounting-workspace.tsx`
- `src/components/monolith/accounting-workflow-cards.tsx`
- `src/modules/accounting/operational-access.ts`
- `src/app/(dashboard)/accounting/accounts/page.tsx`
- `src/app/(dashboard)/accounting/settings/page.tsx`
- `src/app/(dashboard)/accounting/bulk-update/page.tsx`
- `src/app/(dashboard)/accounting/currency-adjustments/page.tsx`
- `src/app/(dashboard)/accounting/fixed-assets/page.tsx`
- `src/app/(dashboard)/accounting/transaction-locking/page.tsx`
- `src/app/(dashboard)/accounting/transaction-locking/transaction-locking-client.tsx`
- `src/app/(dashboard)/accounting/banking/banking-client.tsx`
- `src/styles/monolith-system.css`

Backup:

- `OLD UI code/ui-iteration-backups/accounting-accountant-grouping-20260731/`

Verification:

- targeted ESLint for the touched accountant/nav/workspace files: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit`: passed;
- targeted `git diff --check` for the touched files: passed, aside from the
  normal line-ending warnings in the current Windows worktree;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build`: still blocked by the
  active local Next.js runtime holding
  `.next\\monolith-dev-3.stderr.log` open (`EBUSY` on unlink), not by an
  accountant-route type or compile failure.

Blocked:

- no in-app browser instance is available, so authenticated visual verification
  of the new Accountant submenu and routes remains pending;
- these new accountant pages increase the Accounting route count, so the
  historical route-total summaries in the migration docs are stale until the
  next route-audit regeneration.

## 2026-07-31 chart of accounts reference refresh handoff

Reworked `/accounting/accounts` around the supplied chart-of-accounts
references so the route now behaves like an accountant workspace rather than a
basic tree plus form.

Delivered:

- the route now uses a split layout with a searchable filtered ledger hierarchy
  on the left and a live account detail pane on the right;
- selecting an account reloads the route with the chosen account context and
  shows live closing balance, opening totals, posted debit/credit totals, and
  rolled-up descendant balances for group accounts;
- recent transactions are now loaded from real `GeneralLedgerEntry` data for
  the selected account set, with transaction search and voucher/debit/credit
  filters in the detail pane;
- added Monolith `Add account` and `Edit account` dialogs to the chart page so
  account maintenance stays in-context;
- extended `updateAccount` so edits now persist `accountCode`,
  `parentAccountId`, `rootType`, `accountType`, `isGroup`, `isActive`,
  `allowJournalContact`, opening balances, and branch changes, with duplicate
  code, invalid parent, descendant-cycle, and group-child validation;
- added dedicated chart-of-accounts styling in
  `src/styles/monolith-system.css` for the hierarchy pane, balance hero, detail
  grid, and transaction workspace.

Files:

- `src/app/(dashboard)/accounting/accounts/page.tsx`
- `src/app/(dashboard)/accounting/accounts/accounts-client.tsx`
- `src/modules/accounting/service.ts`
- `src/styles/monolith-system.css`

Backup:

- `OLD UI code/ui-iteration-backups/accounting-chart-of-accounts-reference-refresh-20260731/`

Verification:

- targeted ESLint for the two chart page files: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit`: passed;
- targeted `git diff --check` for the touched chart files: passed, aside from
  the normal Windows line-ending warnings in this worktree;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build`: failed before
  `next build` because `prisma generate` currently cannot validate
  untouched `prisma/schema.prisma` references to missing models
  `AccountingSourceMappingProfile`, `AccountingPeriodCloseRun`,
  `AccountingReportExportProfile`, and
  `AccountingPortalPublicationProfile`.

Blocked:

- no in-app browser instance is available, so authenticated screenshot
  verification against the supplied Chart of Accounts references remains
  pending;
- a clean production build is currently blocked by the unrelated Prisma schema
  validation errors above rather than by the chart-of-accounts implementation.

## 2026-07-31 optional note invoice-linking handoff

Original-invoice linking is now optional end to end for customer and vendor
credit/debit notes.

Delivered:

- the new shared
  `src/components/monolith/accounting-optional-invoice-link.tsx` control shows
  `Link with invoice` first and swaps to the invoice chooser only after it is
  pressed;
- `AccountingInvoiceForm` uses the control for all four note kinds:
  sales credit, sales debit, purchase credit, and purchase debit;
- the customer-adjustment dialog in `/accounting/quotations` now uses the same
  interaction instead of an always-visible selector;
- draft creation continues to persist `originalInvoiceId` as null when no
  invoice is chosen;
- canonical preparation now permits unlinked notes, derives their tax category
  from the current validated note policy/rule, and emits no causation or
  supporting-invoice reference; linked notes keep the existing posted-invoice,
  party, currency, policy, and correction-capacity checks;
- approval and rejection continue to require
  `accounting.correction.approve` based on debit/credit-note document type, so
  an unlinked note cannot fall back to the generic approval permission.

Files:

- `src/components/monolith/accounting-optional-invoice-link.tsx`
- `src/components/monolith/accounting-invoice-form.tsx`
- `src/app/(dashboard)/accounting/quotations/quotations-client.tsx`
- `src/modules/accounting/document-adapters.ts`
- `scripts/__tests__/accounting-phase4-documents-payments.integration.test.ts`

Backup:

- `OLD UI code/ui-iteration-backups/accounting-optional-invoice-link-20260731/`

Verification:

- TypeScript passed with the required 8 GB Node heap;
- server-render verification passed for the initial link-action state and the
  post-activation chooser state;
- focused unlinked-credit-note staging integration passed;
- ESLint passed for the new component and the changed quotation, adapter, and
  test files; the shared invoice form retains unrelated pre-existing lint errors
  from its earlier in-progress expansion;
- the full Phase 4 file cannot currently pass on staging because the database
  lacks `Account.allowJournalContact`; the new focused case passes independently;
- authenticated browser QA is pending because there is no available in-app
  browser instance.

## 2026-07-31 debit-note reason classification handoff

Debit-note reason choices now follow the liability effect of each note type.

Delivered:

- `src/components/monolith/accounting-note-reason-select.tsx` centralizes the
  reason selector and separate reason sets;
- `sales-debit` uses customer-liability increase reasons such as additional
  charges/underbilling, rate increases, tax short charged, and late fees;
- `purchase-debit` uses vendor-liability reduction reasons such as purchase
  returns, short supply, rejected goods, vendor overbilling, rebates, and tax
  overcharges;
- `AccountingInvoiceForm` selects the correct list from its fixed note kind;
- the `/accounting/quotations` adjustment dialog uses the sales-debit list only
  when `DEBIT` is selected and preserves its free-text credit-note reason;
- switching the dialog note type clears the previous reason so an incompatible
  credit reason cannot be submitted with a debit note.

Files:

- `src/components/monolith/accounting-note-reason-select.tsx`
- `src/components/monolith/accounting-note-reason-select.test.tsx`
- `src/components/monolith/accounting-invoice-form.tsx`
- `src/app/(dashboard)/accounting/quotations/quotations-client.tsx`

Backup:

- `OLD UI code/ui-iteration-backups/accounting-debit-note-reasons-20260731/`

Verification:

- targeted ESLint passed;
- focused Vitest coverage passed: 3 tests;
- TypeScript passed with the required 8 GB Node heap;
- authenticated visual QA remains pending because no in-app browser instance
  is available.

## 2026-07-31 purchase-credit reason classification handoff

The shared reason selector now treats purchase credit notes as vendor-liability
increases.

Delivered:

- added `purchaseCreditNoteReasons` in
  `src/components/monolith/accounting-note-reason-select.tsx`;
- the reasons cover vendor underbilling, rate increases, quantities received but
  not billed, vendor freight/handling, tax short charged, reversal of a purchase
  return or debit note, late charges, and purchase-invoice correction;
- `noteReasonsFor("purchase-credit")` now returns only this list, instead of the
  sales-credit list;
- focused coverage confirms purchase-credit reasons exclude both sales-return
  and vendor-liability-reduction choices.

Backup:

- `OLD UI code/ui-iteration-backups/accounting-purchase-credit-note-reasons-20260731/`

Verification:

- targeted ESLint passed;
- focused Vitest coverage passed: 4 tests;
- TypeScript passed with the required 8 GB Node heap;
- authenticated browser QA remains pending because no browser instance is
  available.

## 2026-08-01 journal draft editing and submitted review-flow handoff

Manual journals now use a clearer maker-checker path with draft editing,
explicit submission, and approve-or-reject review.

Delivered:

- `src/app/(dashboard)/accounting/journal-entries/[id]/page.tsx` now shows
  draft edit/submit controls only when the record is still `DRAFT`, the current
  user is the maker, and `accounting.journal.prepare` is granted;
- `src/app/(dashboard)/accounting/journal-entries/new/page.tsx` and
  `new-jv-client.tsx` support `?edit=<journalId>` draft hydration so the maker
  can revise an existing draft from the shared journal composer instead of a
  separate one-off screen;
- `src/modules/accounting/actions.ts` and
  `src/modules/accounting/service.ts` now split journal lifecycle work into
  create draft, update draft, submit for approval, approve/post, and reject;
- submitted journals are no longer editable and the approvals queue now reads
  from `SUBMITTED` status in
  `src/app/(dashboard)/accounting/approvals/page.tsx`;
- `src/components/monolith/accounting-operational-actions.tsx` now gives the
  checker two outcomes on submitted journals: `Approve and post` or `Reject`,
  with rejection requiring a reason and ending in `CANCELLED`;
- contact-enabled ledgers now require a selected contact before draft save,
  submission, or approval-posting can succeed.

Files:

- `src/app/(dashboard)/accounting/journal-entries/[id]/page.tsx`
- `src/app/(dashboard)/accounting/journal-entries/new/page.tsx`
- `src/app/(dashboard)/accounting/journal-entries/new/new-jv-client.tsx`
- `src/app/(dashboard)/accounting/journal-entries/page.tsx`
- `src/app/(dashboard)/accounting/approvals/page.tsx`
- `src/components/monolith/accounting-operational-actions.tsx`
- `src/modules/accounting/actions.ts`
- `src/modules/accounting/operational-actions.ts`
- `src/modules/accounting/operational-helpers.ts`
- `src/modules/accounting/service.ts`
- `src/modules/accounting/__tests__/posting-boundary.architecture.test.ts`

Verification:

- TypeScript passed with the required 8 GB Node heap;
- targeted ESLint passed for the touched journal UI/action/test files;
- the focused posting-boundary architecture test still has one unrelated
  historical failure because it expects `QUOTATION_CONVERSION_GATED` in
  `src/modules/accounting/service.ts`;
- authenticated browser QA is still pending because no in-app browser instance
  is available in this session.

## 2026-08-01 accounting sidebar heading alignment handoff

The shared Accounting navigation now matches the intended Banking and Accountant
grouping more closely instead of fragmenting those items across mixed headings.

Delivered:

- `src/lib/navigation.ts` now keeps sales invoices, sales credit notes,
  purchase invoices, purchase debit notes, and vendor master inside the Banking
  heading block alongside overview, payments, customer receipts, vendor
  payments, and allocations;
- General Ledger now carries the same Accountant section label as manual
  journals and the adjacent accountant tools, preventing the heading from
  restarting unexpectedly;
- Recurring Journals was moved into the main Accountant cluster so it behaves as
  part of the same control area instead of surfacing later as a separate label
  break;
- `src/components/monolith/accounting-workspace.tsx` now exposes Banking route
  chrome as `Overview` for `/accounting/banking` and `Payments` for
  `/accounting/payments`;
- `src/app/(dashboard)/accounting/banking/banking-client.tsx` now uses the same
  `Payments` wording in its connected-workflow shortcuts.

Files:

- `src/lib/navigation.ts`
- `src/components/monolith/accounting-workspace.tsx`
- `src/app/(dashboard)/accounting/banking/banking-client.tsx`

Verification:

- targeted ESLint passed for the touched navigation and Banking workspace files;
- TypeScript passed with the required 8 GB Node heap;
- authenticated browser QA remains pending because no in-app browser instance
  is available in this session.

## 2026-08-01 Banking foundation audit and hardening handoff

The Banking overview and account workspace foundation were audited after the
initial delivery, and the Banking slice now has tighter server-side invariants
plus fuller focused coverage.

Delivered:

- `src/modules/accounting/banking-service.ts` now validates supported account
  kinds, rejects duplicate bank-ledger mappings before persistence, blocks
  unsafe currency or ledger changes after dependent Banking activity exists,
  treats inactivation idempotently, and uses stricter posted-ledger filtering
  for book-balance and running-balance queries;
- the browser still receives only serializable DTOs and masked identifiers;
- `src/app/(dashboard)/accounting/banking/loading.tsx` now provides a Banking
  route loading state using the shared Monolith accounting loading surface;
- focused Banking tests now cover route read access, manage permission
  enforcement, masking edge cases, duplicate mapping protection, balance
  separation, and opening carry-forward behavior.

Files:

- `src/modules/accounting/banking-service.ts`
- `src/modules/accounting/__tests__/banking-service.test.ts`
- `src/modules/accounting/__tests__/banking-actions.test.ts`
- `src/modules/accounting/__tests__/banking-route-access.test.ts`
- `src/app/(dashboard)/accounting/banking/banking-client.test.tsx`
- `src/app/(dashboard)/accounting/banking/loading.tsx`

Verification on Saturday, August 1, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/modules/accounting/banking-shared.ts' 'src/modules/accounting/banking-service.ts' 'src/modules/accounting/banking-actions.ts' 'src/modules/accounting/__tests__/banking-service.test.ts' 'src/modules/accounting/__tests__/banking-actions.test.ts' 'src/modules/accounting/__tests__/banking-route-access.test.ts' 'src/app/(dashboard)/accounting/banking/page.tsx' 'src/app/(dashboard)/accounting/banking/banking-client.tsx' 'src/app/(dashboard)/accounting/banking/banking-client.test.tsx' 'src/app/(dashboard)/accounting/banking/loading.tsx' 'src/app/(dashboard)/accounting/banking/[bankAccountId]/page.tsx' 'src/app/(dashboard)/accounting/banking/[bankAccountId]/bank-account-client.tsx'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx vitest run 'src/modules/accounting/__tests__/banking-service.test.ts' 'src/modules/accounting/__tests__/banking-actions.test.ts' 'src/modules/accounting/__tests__/banking-route-access.test.ts' 'src/app/(dashboard)/accounting/banking/banking-client.test.tsx' --reporter verbose`:
  passed, 4 files / 22 tests;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx prisma validate`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build`: passed, while the
  existing Turbopack NFT tracing warning remains from `next.config.ts` through
  `src/app/api/customer-portal/checklist-files/[id]/route.ts`.

Known limits:

- Banking access denial still resolves through the shared
  `/accounting/access-denied` route gate before page rendering, not a
  Banking-local denied page;
- the explicit confirmation dialog itself is still exercised primarily through
  the shared dialog system and static Banking render coverage rather than a
  separate interactive Banking-specific browser test in this session;
- no connectors, statement imports, reconciliation, rules, or other later
  Banking phases were started here.

## 2026-08-01 Banking statement import and uncategorized review handoff

The Banking overview and account workspace now include the next functional
Banking phase: manual CSV statement import, statement import history, imported
Amount in Bank updates, and a read-only Uncategorized Transactions view.

Delivered:

- `src/modules/accounting/banking-import.ts` was added for CSV tokenization,
  explicit date-format parsing, decimal normalization, duplicate fingerprinting,
  bounded preview summarization, and tenant-scoped local storage under
  `storage/accounting-banking-imports`;
- `src/modules/accounting/banking-statements-service.ts` was added and
  `src/modules/accounting/banking-service.ts` / `src/modules/accounting/banking-actions.ts`
  were extended so Banking can preview and commit CSV statements, record
  account-scoped history, keep Amount in Bank tied only to completed statement
  imports, and surface uncategorized unresolved statement lines without posting
  journals;
- `src/app/(dashboard)/accounting/banking/statement-dialog.tsx` was added and
  both Banking clients now use it for a working Bank Statements experience from
  the overview and the per-account workspace;
- `src/app/(dashboard)/accounting/banking/[bankAccountId]/bank-account-client.tsx`
  now exposes a read-only `Uncategorized transactions` view with server-backed
  search, date filters, direction filters, pagination, and source-statement
  status data;
- focused Banking tests now cover 5 files / 26 tests, including the new
  `src/modules/accounting/__tests__/banking-import.test.ts` parser and
  duplicate-handling coverage.

Files:

- `src/modules/accounting/banking-import.ts`
- `src/modules/accounting/banking-statements-service.ts`
- `src/modules/accounting/banking-service.ts`
- `src/modules/accounting/banking-actions.ts`
- `src/modules/accounting/__tests__/banking-import.test.ts`
- `src/modules/accounting/__tests__/banking-service.test.ts`
- `src/app/(dashboard)/accounting/banking/page.tsx`
- `src/app/(dashboard)/accounting/banking/statement-dialog.tsx`
- `src/app/(dashboard)/accounting/banking/banking-client.tsx`
- `src/app/(dashboard)/accounting/banking/banking-client.test.tsx`
- `src/app/(dashboard)/accounting/banking/[bankAccountId]/page.tsx`
- `src/app/(dashboard)/accounting/banking/[bankAccountId]/bank-account-client.tsx`

Verification on Saturday, August 1, 2026:

- `NODE_OPTIONS=--max-old-space-size=8192 npx eslint 'src/modules/accounting/banking-import.ts' 'src/modules/accounting/banking-statements-service.ts' 'src/modules/accounting/banking-service.ts' 'src/modules/accounting/banking-actions.ts' 'src/app/(dashboard)/accounting/banking/statement-dialog.tsx' 'src/app/(dashboard)/accounting/banking/banking-client.tsx' 'src/app/(dashboard)/accounting/banking/[bankAccountId]/bank-account-client.tsx' 'src/app/(dashboard)/accounting/banking/page.tsx' 'src/app/(dashboard)/accounting/banking/[bankAccountId]/page.tsx'`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx vitest run 'src/modules/accounting/__tests__/banking-import.test.ts' 'src/modules/accounting/__tests__/banking-service.test.ts' 'src/modules/accounting/__tests__/banking-actions.test.ts' 'src/modules/accounting/__tests__/banking-route-access.test.ts' 'src/app/(dashboard)/accounting/banking/banking-client.test.tsx' --reporter verbose`:
  passed, 5 files / 26 tests;
- `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit --pretty false`:
  passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npx prisma validate`: passed;
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build`: passed, while the
  existing Turbopack NFT tracing warning remains from `next.config.ts` through
  `src/app/api/customer-portal/document-versions/[id]/route.ts`.

Known limits:

- supported statement format is CSV only in this phase; no OFX/QFX/QIF/MT940,
  CAMT, XLSX, PDF, OCR, or connector import paths were started;
- the import flow is synchronous and bounded by file-size and row-count limits
  rather than using a separate Banking background job framework;
- the Banking UI deliberately omits rules, quick categorize, matching,
  reconciliation, undo import, and external connector controls until those
  backing services exist.

## 2026-08-04 Shared filter active-link design-system handoff

The compact filter summary row is now part of the shared filter design system
instead of being a CHA Jobs-only implementation.

Delivered:

- `src/components/forms/filter-menu.tsx` now exports `FilterActiveLinks`, a
  shared tiny text-link summary row for active filters and clear actions;
- `src/styles/monolith-system.css` now defines the compact active-link spacing,
  reduced row height, small font size, and hover/focus treatment for that
  shared summary pattern;
- `src/app/(dashboard)/cha/jobs/jobs-client.tsx` now consumes the shared
  summary component instead of route-local inline classes;
- `src/app/(dashboard)/cha/customers/customers-filter-bar.tsx` now shows the
  same compact active-filter summary row beneath the filter/search controls so
  CHA customer filters match the shared pattern.

Verification on Tuesday, August 4, 2026:

- pending focused ESLint on the touched shared filter files and CHA consumers in
  this pass.

Known limits:

- AMS appraisal filters and HRMS employee directory filters still use their
  existing custom panel bodies because they are not yet built on the shared
  categorized filter-panel pattern;
- this pass standardizes the compact active-filter summary treatment and does
  not change saved-view persistence behavior.
