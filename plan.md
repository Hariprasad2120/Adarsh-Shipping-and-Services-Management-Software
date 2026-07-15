## Customer Portal Remaining Integration Plan

### Current baseline

- Existing customer portal UI scaffold is in:
  - `src/app/customer-portal/layout.tsx`
  - `src/app/customer-portal/shipments/page.tsx`
  - `src/app/customer-portal/shipments/[shipmentId]/page.tsx`
  - `src/app/customer-portal/_components/client-actions.tsx`
- Current portal service exists in `src/modules/customer-portal/service.ts` and already provides:
  - `listPortalShipments()`: shipment list DTO derived from `ChaJob` plus `CustomerVisibleStageMapping`, `ChaChecklist`, customer document submissions, query threads, and ratings
  - `getPortalDashboard()`: counts plus recent shipments and portal notifications
  - `getPortalShipmentDetail()`: raw `job`, `stageMappings`, `currentStage`, and action flags
  - `listPortalRatingCategories()`: org rating categories from `ShipmentRatingCategory`
- Existing shortcuts that must be replaced:
  - hardcoded `DEFAULT_STAGE_MAPPINGS`
  - progress inferred from `ChaJob.stage`
  - generic filing/BOE fallbacks in the detail page
  - portal upload writes to `public/uploads/...`
  - portal checklist response directly mutates `ChaJob.stage`

### Existing source-of-truth systems to use

- Portal auth/session:
  - `src/modules/customer-portal/auth.ts`
  - Prisma models: `CustomerPortalUser`, `CustomerPortalSession`, `CustomerPortalAuditLog`, `CustomerPortalNotification`, `CustomerPortalNotificationPreference`
- CHA workflow engine:
  - `src/modules/cha/service.ts`
  - Prisma models: `FilingWorkflowTemplate`, `FilingWorkflowVersion`, `FilingWorkflowNode`, `FilingWorkflowEdge`, `FilingWorkflowInstance`, `FilingNodeRun`, related field/checklist/toggle/query/attachment models
- CHA checklist workflow:
  - Prisma models: `ChaChecklist`, `ChaChecklistFileVersion`, `ChaChecklistDecision`, `ChaChecklistMailLog`
  - service methods in `src/modules/cha/service.ts` already handle internal approval and customer approval transitions
- Customer document/query/rating storage:
  - Prisma models: `CustomerDocumentSubmission`, `CustomerDocumentVersion`, `CustomerChecklistResponse`, `CustomerQueryThread`, `CustomerQueryMessage`, `ShipmentRatingCategory`, `ShipmentServiceRating`
- Notifications/revalidation:
  - `src/modules/notifications/service.ts`
  - existing app heavily uses `revalidatePath`

### Planned changes

1. Refactor portal service DTOs
- Introduce typed portal DTOs for list/detail/workflow stages/documents/queries/checklist/rating actions.
- Replace raw `unknown` and raw Prisma payload exposure with customer-safe DTO shaping in the service layer.

2. Make workflow timeline data-driven
- Read the active `FilingWorkflowInstance` for the shipment when present.
- Build portal stage DTOs from published workflow nodes and node runs rather than `CustomerVisibleStageMapping` ordering.
- Resolve customer-facing node states:
  - `COMPLETED`
  - `IN_PROGRESS`
  - `LOCKED`
  - `WAITING_FOR_CUSTOMER`
  - `BLOCKED`
  - `OVERDUE`
  - `SKIPPED`
- Preserve fallback behavior for legacy jobs that do not yet have a filing workflow instance, but keep it isolated as legacy compatibility.

3. Replace generic filing fields with real safe stage data
- Surface read-only BOE / Shipping Bill / filing values from `ChaFiling`, current node field values, attachments, and job metadata.
- Create a customer-safe field renderer model from workflow node field definitions instead of hardcoding stage-specific UI values.

4. Tighten portal actions
- Uploads:
  - enforce requirement/job ownership
  - centralize size/type validation
  - preserve version history
  - stop exposing raw `public/` storage assumptions in DTOs
- Checklist responses:
  - delegate status progression to existing checklist workflow semantics instead of directly setting job stage strings
  - keep idempotency guard via existing `CustomerChecklistResponse` uniqueness
- Query replies:
  - enforce thread-open / customer-response-allowed checks

5. Portal UI cleanup
- Update shipment pages and client action components to consume the new DTOs.
- Keep the recreated design, but migrate temporary indigo/slate/light-only styles toward the Monolith token system where touched.
- Add customer-safe workflow history, action counts, stage metadata, and richer query/document presentation where supported by the DTO.

6. Revalidation and near-real-time groundwork
- Revalidate affected portal paths after uploads, checklist responses, query replies, and ratings.
- Inspect whether a lightweight shared SSE or polling pattern can be reused without introducing a parallel stack; if not feasible in this pass, document the exact blocker and keep the data layer ready for event-driven refresh.

7. Tests and verification
- Add/update customer portal service tests for:
  - isolation by portal user / customer
  - workflow stage mapping from real workflow instance
  - unauthorized document/query/checklist access
  - checklist duplicate response protection
- Run lint, typecheck, targeted tests, then catalogue update/check if feature surface changes require it.

### Likely schema changes

- Possible `FilingWorkflowNode` addition for completion interaction mode if not already present:
  - `BUTTON`
  - `SLIDE_TO_COMPLETE`
  - `AUTO_COMPLETE`
  - `APPROVAL_BASED`
- Possible read-state fields for customer query threads/messages if unread counts must be persisted server-side.
- Possible portal-safe file metadata / tokenized download support if existing file access model is insufficient.

### Dependencies and constraints

- Must preserve existing customer portal UI shell and not replace the recreated design.
- Must not expose internal-only node fields, uploads, or employee data.
- Must prefer existing CHA workflow/checklist logic over new parallel portal state machines.
- Must update product catalogue if feature/API/schema surface changes are introduced.
