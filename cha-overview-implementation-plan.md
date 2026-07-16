# CHA Job Overview Implementation Plan

## Reference Inputs

- Primary visual reference: `C:\Users\Purushothaman\Downloads\ChatGPT Image Jul 16, 2026, 02_45_55 PM.png`
- Requested comparison target `/mnt/data/image(53).png` is not present in this workspace, so the Windows reference image above is the active source of truth.
- Baseline screenshot captured at `artifacts/cha-overview/cha-overview-before-light.png`

## Baseline Comparison Summary

- The current page still renders extra workspace chrome above the job overview:
  - due-date warning banner
  - filing breadcrumb/search toolbar
- The top overview is card-based, but it does not match the reference composition:
  - no full-width logistics hero image
  - metadata shown as separate tiles instead of a single frosted in-banner strip
  - progress strip layout is close structurally but not visually aligned to the reference
- The main overview grid is incomplete relative to the requested structure:
  - `Live Status` card is missing
  - current cards do not use the requested 4-column proportion
  - visual density, spacing, and hierarchy do not match the reference
- The page still uses the older CHA cyan treatment in places that must become royal-blue on this page.

## Section-to-Component Mapping

### 1. Minimal Job Title Header

- Implement in: `src/app/(dashboard)/cha/jobs/[jobId]/job-workspace-client.tsx`
- Current source block to replace for overview mode:
  - top header section beginning near the `Job Header` comment
- Data sources:
  - `topJobBadges`
  - `job.jobNumber`
  - `job.title`
  - delete permissions and existing delete actions already present in `JobWorkspaceClient`

### 2. Full-Width Logistics Banner

- Implement in: `src/app/(dashboard)/cha/jobs/[jobId]/job-workspace-client.tsx`
- New overview-only hero block rendered directly under the minimal header
- Data sources:
  - `job.shipmentType`
  - `job.jobType`
  - `job.branch`
  - `job.status`
- Asset strategy:
  - add a module-scoped banner image/background treatment dedicated to the overview only

### 3. Floating Job Information Panel Inside Banner

- Implement in: `src/app/(dashboard)/cha/jobs/[jobId]/job-workspace-client.tsx`
- Reuse and restyle:
  - `overviewMetaItems`
- Keep manager edit action wired to:
  - `setIsEditingManager(true)`

### 4. Workflow Stage Progress Strip

- Implement in: `src/app/(dashboard)/cha/jobs/[jobId]/job-workspace-client.tsx`
- Rework existing:
  - `workflowNavigator`
- Data sources to preserve:
  - `STAGES`
  - `activeStepIndex`
  - `docPercentage`
  - `additionalDataPercentage`
  - `checklistPrepPercentage`
  - `checklistApprovalPercentage`
  - `filingPercentage`
  - `filedPercentage`
  - `stageProgress`
  - `openWorkflowStage`
  - `navigateToWorkspaceTab`

### 5. Four-Column Overview Card Grid

- Implement in: `src/app/(dashboard)/cha/jobs/[jobId]/job-workspace-client.tsx`
- Replace current `activeTab === "overview"` card row with:
  - `Job Summary` from `overviewSummaryItems`
  - `Important Dates` from `overviewDateItems`
  - new `Live Status` card using existing job data
  - `Quick Actions` from `workspaceQuickActions`
- Existing overview block to replace:
  - current `activeTab === "overview"` section near the lower overview render block

### 6. Full-Width Recent Activity Section

- Implement in: `src/app/(dashboard)/cha/jobs/[jobId]/job-workspace-client.tsx`
- Reuse and restyle:
  - `overviewRecentLogs`
- Keep action wiring:
  - `navigateToWorkspaceTab("audit")`

## Files Planned For Modification

- `src/app/(dashboard)/cha/jobs/[jobId]/job-workspace-client.tsx`
- `cha-overview-implementation-plan.md`

## Guardrails

- Preserve all existing server data loading in `src/app/(dashboard)/cha/jobs/[jobId]/page.tsx`
- Preserve permissions, delete actions, manager change action, tab navigation, and workflow navigation
- Do not modify unrelated CHA pages or shared global app theme
- Scope new royal-blue overview tokens to the CHA Job Overview rendering only
