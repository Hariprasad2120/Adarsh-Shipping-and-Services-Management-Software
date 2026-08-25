# Work Pet Implementation Plan

Last updated: 2026-08-25
Scope: plan derived from current repository state

## 1. Delivery strategy

Implement `Monolith Work Pet` as a structured evolution of the existing `Mona` stack.

Guiding rule:

- reuse current auth, RBAC, shell, notification, todo, communication, CRM, HRMS, accounting, and payroll services;
- do not build a second assistant system beside `Mona`;
- minimize broad renames while the architecture is still being stabilized.

## 2. Phase 0 outcome

Phase 0 deliverables are:

- `WORK_PET_ARCHITECTURE_ANALYSIS.md`
- `WORK_PET_IMPLEMENTATION_PLAN.md`

No production behavior changes are required for this phase.

## 3. Proposed architecture by layer

### 3.1 Character layer

Owns:

- pet rendering
- panel open/close
- drag position
- reduced-motion support
- theme support
- lightweight idle/alert/assist states

Primary starting points:

- `src/modules/mona/components/mona-desktop-pet.tsx`
- `src/modules/mona/components/mona-chat.tsx`
- `src/modules/core/components/monolith-app-shell.tsx`

### 3.2 Context engine

Owns:

- current user identity
- role and permissions
- current route/module/page/tab
- current record identity
- lightweight related metadata
- current actionable summary

Primary new surface:

- `src/modules/mona/context/` or `src/modules/work-pet/context/`

### 3.3 Orchestrator

Owns:

- intent routing
- skill selection
- model/provider routing
- tool filtering
- answer assembly

Primary starting points:

- `src/modules/mona/service.ts`
- `src/modules/mona/system-prompt.ts`
- `src/modules/mona/tools.ts`

### 3.4 Knowledge layer

Owns:

- retrieval
- citations
- structured summaries
- untrusted-content isolation

Primary new surface:

- `src/modules/mona/knowledge/` or `src/modules/work-pet/knowledge/`

### 3.5 Action engine

Owns:

- registered tools
- safety levels
- confirmation cards
- action audit
- service delegation

Primary new surface:

- `src/modules/mona/actions/` or `src/modules/work-pet/actions/`

## 4. Database plan

### 4.1 Reuse first

Reuse existing models wherever possible:

- `User`
- `UserSession`
- `Notification`
- `NotificationActivity`
- `TodoTask`
- `EmployeePreference`
- `CommunicationAuditEvent`

### 4.2 New data likely required

Recommended first-pass schema additions:

- `WorkPetConversation`
- `WorkPetMessage`
- `WorkPetActionAudit`
- `WorkPetFeedback`

Deferred decision:

- `WorkPetSettings`

Use a dedicated settings model if per-user pet preferences go beyond a small JSON addition to `EmployeePreference`.

### 4.3 Schema caution

- Avoid touching unrelated CRM/accounting/payroll schema during the first Work Pet foundation batch.
- Keep migrations narrow and self-describing.
- Prefer additive schema over invasive refactors.

## 5. Feature flag and rollout plan

Recommended rollout states:

- `DISABLED`
- `PILOT`
- `ENABLED`

Recommended storage:

- organization-level toggle via `SystemSetting` pattern
- optional allowlist of pilot user IDs or role IDs

Suggested config keys:

- `work_pet.rollout_mode`
- `work_pet.pilot_user_ids`
- `work_pet.enabled_name`
- `work_pet.default_proactivity`

## 6. Phase-by-phase implementation plan

## Phase 1: Shell hardening

Goal:

- stabilize the existing floating pet and chat shell without broad AI expansion

Deliver:

- formal shell ownership and component cleanup around current Mona pet
- consistent reduced-motion handling
- responsive layout verification
- persistent position behavior review
- clear open/close/search hooks
- initial per-user visible settings shape

Primary files:

- `src/modules/mona/components/mona-desktop-pet.tsx`
- `src/modules/mona/components/mona-chat.tsx`
- `src/modules/mona/components/mona-provider.tsx`
- `src/modules/core/components/monolith-app-shell.tsx`

Risks:

- current worktree already includes active Mona pet changes
- shell regressions affect all routes

## Phase 2: Context engine

Goal:

- replace `currentPath`-only context with structured workspace context

Deliver:

- normalized context object
- route-to-module resolution
- selected entity extraction
- server-side context builders per module
- developer diagnostics endpoint/panel

New files likely:

- `src/modules/mona/context/types.ts`
- `src/modules/mona/context/build-context.ts`
- `src/modules/mona/context/route-context.ts`
- `src/modules/mona/context/entity-context.ts`

Integration points:

- CRM enquiry pages
- quote pages
- HRMS employee pages
- communication thread pages
- accounting detail pages

## Phase 3: Assistant core hardening

Goal:

- make the current assistant production-capable

Deliver:

- provider abstraction over current Gemini-only integration
- streaming responses
- persistent conversations
- per-user model/settings instead of process-global model selection
- assistant-specific audit logging
- error boundaries and graceful degraded mode

Primary files:

- `src/modules/mona/service.ts`
- `src/modules/mona/gemini-client.ts`
- `src/app/api/mona/chat/route.ts`
- new Prisma models and migrations

## Phase 4: Knowledge and citations

Goal:

- support grounded, permission-aware answers

Deliver:

- retrieval interfaces
- source metadata format
- citations in assistant responses
- trusted vs untrusted content boundaries
- first indexed/document-backed knowledge sources

Recommended first knowledge sources:

- CRM summaries
- notification/task aggregates
- communication thread summaries
- approved internal docs/templates

Deferred until later:

- full enterprise-wide semantic indexing of every document and message

## Phase 5: Skill system

Goal:

- split business intelligence into module-aware skills

Recommended first skill order:

1. dashboard/personal work
2. CRM
3. enquiry
4. quotation
5. communication
6. HRMS
7. accounting read-only
8. payroll read-only
9. jobs/operations

Deliver:

- skill registry
- capability metadata
- context requirements
- skill-specific tool routing

## Phase 6: Action engine

Goal:

- support safe, auditable assistant actions

Start with:

- `createTask`
- `createReminder`
- `draftEmail`

Then expand to:

- link to existing CRM follow-up/reminder creation
- communication draft save/send preview
- approved navigation/open-record actions

Mandatory requirements:

- explicit permission checks
- Zod or equivalent input validation
- confirmation levels
- audit logging
- no direct AI-to-database execution

## Phase 7: Proactive assistance

Goal:

- implement useful, non-noisy nudges

Deliver:

- `My Work Today`
- morning brief
- follow-up reminders
- overdue blockers
- pending approvals
- waiting-for items

Reuse sources:

- notifications
- todo
- HRMS task counts
- CRM reminders
- module dashboards

## Phase 8: Cross-module intelligence

Goal:

- synthesize across modules with permission-safe summaries

Examples:

- customer worth pursuing
- quotation follow-up priority
- job-risk overview
- outstanding payment plus CRM relationship summary

Dependencies:

- mature knowledge layer
- citations
- stronger context graph

## Phase 9: UI guidance

Goal:

- controlled interface guidance without arbitrary DOM access

Deliver:

- target registry
- guided hints
- page-help targeting
- controlled movement/highlight events

Recommended approach:

- data attributes like `data-workpet-target`
- explicit registry mapping, not selector generation by the model

## Phase 10: Admin and analytics

Goal:

- make Work Pet governable

Deliver:

- rollout controls
- model controls
- usage metrics
- failure metrics
- cost metrics
- pilot scope management
- feedback review

Potential locations:

- `src/app/(dashboard)/admin/**`
- `src/modules/admin/**`

## Phase 11: Security and quality hardening

Goal:

- validate real production safety boundaries

Must test:

- cross-role access denial
- payroll/accounting data isolation
- prompt injection from email/docs
- action confirmation enforcement
- stale session handling
- reduced-motion and performance behavior

## 7. Affected files and areas

High-probability touched areas over the whole program:

- `prisma/schema.prisma`
- `src/modules/mona/**`
- `src/modules/core/components/monolith-app-shell.tsx`
- `src/modules/notifications/**`
- `src/modules/todo/**`
- `src/lib/rbac.ts`
- `src/lib/auth.ts`
- `src/lib/google-gmail-client.ts`
- `src/lib/document-automation.ts`
- `src/modules/crm/**`
- `src/modules/hrms/**`
- `src/modules/accounting/**`
- `src/modules/payroll/**`
- `src/app/api/mona/**`
- admin settings/routes for rollout and observability

## 8. Proposed implementation guardrails

- Keep existing `Mona` infrastructure as the initial code home unless and until rename cost is justified.
- Avoid schema churn in unrelated modules.
- Keep all business writes behind existing service boundaries.
- Reuse notification and todo systems for early actionability.
- Treat communication, payroll, and accounting content as sensitive by default.
- Add citations before enabling broad business-answering claims.
- Do not rely on in-memory conversation state for production features.

## 9. Testing plan

### 9.1 Foundational tests

- session enforcement on assistant routes
- RBAC-based tool omission
- assistant action confirmation gating
- conversation persistence CRUD
- provider fallback behavior

### 9.2 Domain tests

- CRM route context recognition
- enquiry route context recognition
- quote route context recognition
- HRMS self vs manager visibility
- payroll denial for unauthorized users
- accounting denial for unauthorized users

### 9.3 UX tests

- pet position persistence
- theme coverage: Light, Night, Violet
- reduced motion
- mobile and desktop shell behavior
- chat open/close/focus flow

## 10. Recommended first code batch after Phase 0

The next implementation batch should be a narrow foundation batch, not broad intelligence:

1. formalize Work Pet rollout flagging using existing settings patterns
2. convert model selection from process-global to user-scoped
3. add persistent conversation storage
4. add assistant action/request audit storage
5. implement structured context builders for route + entity
6. keep the existing pet and chat shell, only hardening it

## 11. Definition of success for the foundation

The Work Pet foundation will be in a healthy state when:

- one assistant stack exists, not two
- auth and RBAC are inherited from Monolith
- conversation and action history are persisted and auditable
- current route/entity context is automatic and structured
- initial answers can show citations
- first actions use existing services with confirmation
- the pet remains lightweight and non-intrusive in the app shell

## 12. Open decisions

- whether to keep `mona` as code namespace or begin gradual rename
- whether `EmployeePreference` should store pet preferences or a new settings model should be created
- whether retrieval metadata belongs in Prisma tables, external search infrastructure, or both
- whether admin analytics should live under existing admin settings or a dedicated Work Pet admin workspace

## 13. Recommendation

Proceed by treating the current Mona implementation as the Work Pet seed. Harden it first, then widen its intelligence and actions in controlled phases. That path preserves current Monolith functionality, minimizes duplicate architecture, and aligns best with the repository as it exists today.
