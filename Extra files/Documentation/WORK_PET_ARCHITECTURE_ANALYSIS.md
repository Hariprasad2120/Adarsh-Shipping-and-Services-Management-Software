# Work Pet Architecture Analysis

Last updated: 2026-08-25
Scope: Phase 0 discovery only
Requested feature name: `Monolith Work Pet`
Current related implementation already present in repo: `Mona`

## 1. Executive summary

The repository already contains a meaningful assistant foundation under `src/modules/mona` plus a partially implemented floating desktop companion UI in the current worktree. The best path for `Monolith Work Pet` is to evolve and harden that foundation instead of creating a second AI stack.

The current codebase already provides:

- authenticated App Router shelling with persistent dashboard chrome;
- strong server-side session enforcement on top of NextAuth;
- reusable RBAC permission loading and route gating;
- organization, employee, CRM, communication, accounting, payroll, notification, and todo data models in Prisma;
- a notification center and email queue;
- Google Workspace mail/chat/drive integration surfaces;
- module/feature toggles at organization scope;
- a current AI assistant pipeline (`Mona`) with tool calling and a lightweight offline fallback;
- a current floating/pet-style UI surface (`MonaDesktopPet`) wired into the app shell.

The current foundation is good enough to avoid greenfield work, but it is not yet sufficient for the full Work Pet brief. The largest gaps are:

- no durable conversation persistence;
- no event-sourced Work Pet audit model;
- no context engine beyond `currentPath` + permissions;
- no citations or retrieval layer;
- no action safety registry with confirmations and audit guarantees;
- no per-user pet settings model;
- no streaming responses;
- no robust feature flag or pilot rollout dedicated to Work Pet;
- no module-specialist skill system beyond a small Mona tool registry;
- no explicit prompt-injection and trusted/untrusted context separation for document-driven AI.

## 2. Discovery notes

- The mandatory UI design doc exists at `docs/MONOLITH_UI_DESIGN_SYSTEM.md`.
- `docs/engineering/CODE_ORGANIZATION.md` is not present.
- `docs/engineering/PERFORMANCE.md` is not present.
- The worktree is dirty and includes unrelated plus partially related changes. Phase 0 should avoid touching existing implementation files unless explicitly requested.

## 3. Current application architecture

### 3.1 Platform shape

- Framework: Next.js App Router (`src/app`)
- Language: TypeScript
- Runtime split: server components, client components, route handlers, server actions
- ORM: Prisma with PostgreSQL (`prisma/schema.prisma`)
- Auth: NextAuth v5 beta with credentials + Google OAuth
- UI: Monolith design system with shared components and tokenized themes

### 3.2 Major source areas

- `src/app`: routes, layouts, API handlers
- `src/modules`: domain modules and business services
- `src/lib`: cross-cutting auth, RBAC, session, email, integrations, helpers
- `src/components`: shared design-system UI
- `src/styles`: token and system styles
- `prisma`: schema, migrations, seeds

### 3.3 Module breadth relevant to Work Pet

The repo already exposes the domain surface the Work Pet prompt expects:

- CRM
- CHA / shipping operations
- Communication
- HRMS
- Attendance
- Payroll
- Accounting
- Notifications
- Todo
- Recruit
- Customer portal
- Freight forwarding

That means Work Pet should be built as a cross-module orchestration layer, not as a new business module that recreates domain logic.

## 4. Authentication and session security

Primary files:

- `src/lib/auth.ts`
- `src/lib/session-config.ts`
- `src/lib/session-service.ts`

Current characteristics:

- NextAuth credentials and Google OAuth are already configured.
- Sessions are not trusted from the JWT alone; the JWT carries an opaque nonce.
- `UserSession` in Prisma is the source of truth for revocation, idle timeout, absolute timeout, and logout.
- Cookies are isolated with Monolith-specific names.
- Security logging already exists for login success, login failure, lockouts, and logout.

Implication for Work Pet:

- Work Pet must rely on existing `auth()` / `getSession()` / session validation flow.
- No separate assistant auth model should be created.
- Any long-running assistant or streaming endpoint must remain session-aware and respect session revocation.

## 5. RBAC and permission model

Primary file:

- `src/lib/rbac.ts`

Current characteristics:

- Permissions are modeled explicitly with `Role`, `Permission`, `RolePermission`, and `UserRole`.
- Permission loading is cached and department-aware.
- Compatibility expansion already exists for legacy/coarse permission bundles.
- Helpers already exist for `loadUserPermissions`, `can`, `canAll`, `requirePermission`, and client-serializable caps.

Implication for Work Pet:

- The assistant must use this permission layer as its only authorization source.
- Tool availability should be permission-filtered before the model sees tools.
- Read and write actions should never bypass `loadUserPermissions` or module-specific route access helpers.

## 6. Existing AI / assistant infrastructure

Primary files:

- `src/modules/mona/service.ts`
- `src/modules/mona/tools.ts`
- `src/modules/mona/system-prompt.ts`
- `src/modules/mona/gemini-client.ts`
- `src/modules/mona/local-engine.ts`
- `src/app/api/mona/chat/route.ts`
- `src/app/api/mobile/mona/chat/route.ts`
- `src/app/api/mona/model/route.ts`
- `src/modules/mona/components/*`

### 6.1 What already exists

- A named assistant: `Mona`
- API endpoints for chat on web and mobile
- A Gemini-backed tool-calling loop
- A small permission-filtered tool registry
- A fallback local/offline rule engine
- A current floating chat UI
- A current floating companion/pet UI (`MonaDesktopPet`)
- Model switching endpoint

### 6.2 Current limitations

- Conversation state is in-memory only, not persisted
- Model preference is process-global, not user-specific
- Chat responses are request/response JSON, not streamed
- Context sent to the assistant is shallow: user, org, current path, permissions
- Tools are read-heavy and limited in breadth
- No retrieval pipeline or citations
- No action confirmation cards
- No durable assistant audit trail
- No explicit context sanitation or trusted/untrusted segmentation
- No per-user pet settings model

### 6.3 Key conclusion

The repo already contains the seed of the Work Pet. The correct architectural move is:

`Work Pet = evolution of Mona brain + hardening of Mona pet UI + new context/retrieval/action infrastructure`

and not:

`Work Pet = a second assistant beside Mona`

## 7. Existing Work Pet-like UI surface

Primary files:

- `src/modules/core/components/monolith-app-shell.tsx`
- `src/modules/mona/components/mona-desktop-pet.tsx`
- `src/modules/mona/pet-events.ts`
- `src/modules/mona/components/mona-provider.tsx`
- `src/modules/mona/components/mona-chat.tsx`

Current characteristics:

- The app shell already mounts the Mona provider, pet, and chat surface.
- The pet supports:
  - floating persistent presence in shell
  - drag positioning via local storage
  - route-aware copy
  - notification-triggered state changes
  - open chat and open search affordances
- Styling already exists in `src/styles/monolith-system.css`.

Implication for Work Pet:

- Phase 1 is partially underway in current repo state.
- Any further shell work must preserve design-system rules and existing app-shell stability.
- The existing pet should be treated as a base implementation to normalize, not thrown away.

## 8. Existing user, preference, and feature-toggle infrastructure

Relevant schema/models/services:

- `EmployeePreference` in `prisma/schema.prisma`
- `src/modules/hrms/service.ts`
- `src/modules/core/organisation/module-settings.ts`
- `src/app/page.tsx`

Current characteristics:

- `EmployeePreference` currently stores dashboard widget config only.
- Organization-level enabled modules and features are stored in `SystemSetting`.
- Route visibility already depends on enabled modules and RBAC.

Implication for Work Pet:

- Per-user Work Pet settings can likely extend either:
  - `EmployeePreference` if kept lightweight, or
  - a dedicated `WorkPetSettings` model if settings become broader than HRMS dashboard concerns.
- Org-level rollout should reuse `SystemSetting`/feature-toggle patterns rather than inventing a separate flag framework.

## 9. Notification and event infrastructure

Primary files:

- `src/modules/notifications/service.ts`
- `src/modules/notifications/policy.ts`
- `src/modules/notifications/components/notification-provider.tsx`
- `src/modules/mona/pet-events.ts`

Current characteristics:

- Notifications are first-class persisted records.
- Notification activity is audited separately.
- Email queue and optional Google Chat routing already exist.
- Client notification provider already dispatches pet notification events.

Implication for Work Pet:

- Work Pet nudges should build on notification policies, not duplicate them.
- Event-driven pet behavior should subscribe to domain and notification events rather than polling.
- Nudge prioritization should likely map onto existing notification priority/appearance semantics where possible.

## 10. Tasks and reminders infrastructure

Primary file:

- `src/modules/todo/service.ts`

Current characteristics:

- Personal todo tasks, subtasks, due dates, reminder alerts, and reminder triggers already exist.
- HRMS task/checklist data also exists and is separately queryable.

Implication for Work Pet:

- Initial action engine targets like `createTask` and `createReminder` should wrap existing todo services.
- `My Work Today` can aggregate todo, HRMS tasks, notifications, approvals, and CRM reminders using existing data paths.

## 11. Communication and external workspace integration

Primary files/models:

- `src/lib/google-gmail-client.ts`
- `src/lib/email.ts`
- `src/lib/document-automation.ts`
- `GoogleWorkspaceConnection`
- `GoogleWorkspaceSetting`
- `JobWorkspaceProfile`
- `CommunicationAuditEvent`
- communication routes under `src/app/api/communication/**`

Current characteristics:

- Gmail send/list/thread/draft flows exist.
- Google Chat integration exists.
- Job-linked workspace metadata already exists.
- Document automation can delegate to an external service.
- Communication audit logging already exists.

Implication for Work Pet:

- Work Pet can reuse official mail/chat/document services instead of generating its own integrations.
- Communication-aware skills are a strong early candidate because much of the plumbing is already present.

## 12. CRM and quote/enquiry workflow readiness

Relevant areas:

- `src/modules/crm/service.ts`
- `src/modules/crm/actions.ts`
- `src/modules/crm/rate-workflow.ts`
- `src/modules/crm/services/*`
- `CrmServiceEnquiry`
- `Quotation`

Current characteristics:

- CRM contains deep business workflows, including service enquiries, pricing snapshots, rate comparison, recommendation logic, and quote traceability.
- A large amount of structured commercial context already lives in CRM JSON snapshots and quotation records.

Implication for Work Pet:

- CRM/Enquiry/Quotation skills should reuse current services instead of prompting over raw records.
- Context engine should understand current CRM route/entity and attach service-layer summaries, not dump whole JSON blobs into prompts.

## 13. HRMS, payroll, and accounting readiness

Relevant areas:

- `src/modules/hrms/service.ts`
- `src/modules/payroll/*`
- `src/modules/accounting/*`

Current characteristics:

- HRMS already exposes employee, attendance, leave, dashboard, and audit services.
- Payroll is extensive and sensitive.
- Accounting has granular operational auth and many server actions.

Implication for Work Pet:

- HRMS can support early read-only and productivity use cases.
- Payroll and accounting require stricter action safety and field-level minimization before broad assistant access.
- Sensitive financial or payroll actions must stay behind explicit confirmation cards and existing service boundaries.

## 14. Database structures reusable for Work Pet

Strong reuse candidates:

- `User`
- `UserSession`
- `Role` / `Permission` / `UserRole`
- `EmployeePreference`
- `Notification`
- `NotificationActivity`
- `TodoTask` / `TodoSubtask`
- `GoogleWorkspaceConnection`
- `CommunicationAuditEvent`
- existing CRM / HRMS / Accounting / Payroll domain models

Likely new structures needed:

- `WorkPetConversation`
- `WorkPetMessage`
- `WorkPetActionAudit` or a Work Pet-specific audit table
- `WorkPetMemory` or `WorkPetUserMemory`
- `WorkPetSettings` if `EmployeePreference` becomes too overloaded
- optional `WorkPetFeedback`
- optional `WorkPetEventLog`
- optional retrieval/index metadata tables if RAG is implemented in-database

Important caution:

- The repo already has rich audit and activity patterns. New Work Pet tables should be added only where existing audit tables cannot support assistant-specific needs.

## 15. Security implications

### 15.1 High-confidence strengths already present

- server-side session validation
- central RBAC resolution
- route/service-level permission helpers
- notification/activity logging patterns
- existing communication audit model

### 15.2 Major security gaps to close before broader rollout

- current assistant prompt receives broad product knowledge but limited structured trust boundaries
- no durable audit record for assistant requests and actions
- no action safety taxonomy with mandatory confirmation enforcement
- no explicit prompt-injection handling for untrusted document/email content
- no field-level redaction framework dedicated to assistant retrieval
- current in-memory conversation store is not suitable for compliance or supportability

## 16. Performance implications

Observed risks:

- current pet UI lives in the app shell, so any heavy logic here affects every authenticated route
- current conversation storage is in-memory per process
- current chat is non-streaming and can block on whole-response completion
- full cross-module context hydration on every render would be too expensive

Required design posture:

- lazy-load heavy assistant UI
- event-driven pet behavior
- route-aware lightweight context snapshots
- selective retrieval on demand
- background indexing where needed
- explicit cache boundaries around read-mostly context summaries

## 17. Proposed Work Pet architecture

Recommended shape:

1. `WorkPetCharacter`
   - current floating pet / panel / animations / route guidance

2. `WorkPetContextEngine`
   - current user
   - current route/module/page/tab
   - selected entity identity
   - permission-scoped quick facts

3. `WorkPetOrchestrator`
   - intent routing
   - skill selection
   - tool filtering
   - model/provider routing

4. `WorkPetKnowledgeLayer`
   - permission-aware retrieval
   - citations
   - trusted/untrusted content separation

5. `WorkPetActionEngine`
   - registered tools only
   - confirmation levels
   - audit trail

6. `WorkPetEvents`
   - notification-derived nudges
   - workflow blockers
   - reminder and overdue signals

## 18. Affected files and areas for future implementation

Existing areas most likely to be extended:

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

Likely new areas:

- `src/modules/work-pet/**` or a rename/convergence plan inside `src/modules/mona/**`
- new Prisma models and migrations
- new admin/settings routes if rollout and settings are broadened

## 19. Recommended naming strategy

Because `Mona` is already user-visible and pet-like, there are two safe options:

1. Keep internal module folder `mona` initially and introduce `Work Pet` as the product/program name.
2. Gradually converge code naming to `work-pet` while preserving a configurable visible pet name.

Recommendation:

- keep existing code in `mona` during initial hardening to minimize churn;
- introduce configuration for visible assistant name and pet presentation;
- defer a full rename until the architecture stabilizes.

## 20. Principal risks

- Parallel worktree changes may already be modifying Mona and shell files.
- Building a second assistant stack would create duplicate auth, tools, and UI.
- Shipping deeper module access without citations and audit would increase hallucination and compliance risk.
- Payroll/accounting access is sensitive and must not be exposed through broad generic tools.
- Overloading `EmployeePreference` too far could mix unrelated HRMS dashboard preferences with AI settings.
- Persisting conversations without redaction rules could create privacy and retention problems.
- App-shell regressions would affect every authenticated route.

## 21. Phase 0 conclusion

The repository is already materially prepared for a Work Pet foundation, but only if implementation is framed as an evolution of existing `Mona` infrastructure. The best immediate work after this discovery phase is not a fresh build; it is a controlled hardening program:

- formalize context;
- persist and audit conversations;
- introduce a safe tool/action registry;
- add retrieval and citations;
- add rollout/settings controls;
- continue from the existing pet UI instead of replacing it.
