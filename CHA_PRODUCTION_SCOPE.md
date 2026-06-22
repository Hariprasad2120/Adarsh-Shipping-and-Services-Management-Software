# CHA Production Scope

## Included

- `CHA` routes, actions, Prisma models, and workflow services.
- Shared authentication, session revocation, RBAC, dashboard shell, sidebar, and global design system.
- `Admin`, `To-Do`, and `Notifications` surfaces needed to manage CHA users, approvals, and follow-up work.
- Core organisation data used by CHA: users, roles, permissions, branches, departments, divisions, manager assignments.
- Shared audit and notification persistence already used by CHA workflows.

## Exposed In CHA Edition

- `/cha`
- `/admin`
- `/todo`
- `/notifications`
- `/dashboard` redirects to `/cha`
- `/api/auth/*`
- `/api/cron/*`
- `/api/health`

## Disabled In CHA Edition

- Route prefixes: `/accounting`, `/ams`, `/attendance`, `/communication`, `/crm`, `/expense`, `/hrms`, `/lms`, `/product-catalogue`
- API prefixes: `/api/google-chat`, `/api/hrms`, `/api/mona`, `/api/recruit`

## Why

- These modules are not required for CHA runtime in the current implementation.
- CHA depends on shared core records and services, not on unrelated business module UIs.
- The isolation strategy favors safe production gating at navigation, route, and API layers instead of risky physical code removal from a dirty repository.

## Remaining Gaps

- File storage is metadata-driven today (`fileKey`) and still needs a real production object-storage integration before sensitive document workflows can be considered fully production-ready.
- A first-login forced password change flow does not exist yet in the current auth model; the bootstrap script therefore creates the admin idempotently but does not add a bespoke password-rotation UX.
