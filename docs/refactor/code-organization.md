# Code organization

## Boundaries

- `src/app`: Next.js route entrypoints and route composition.
- `src/components/monolith`: canonical design-system primitives and production
  workspace composites.
- `src/components/layout`: app shell and dashboard chrome.
- `src/components/navigation`: shared navigation and breadcrumbs.
- `src/components/feedback`: reusable loading/transition/error feedback.
- `src/components/shared`: business-neutral cross-module composites.
- `src/components/providers`: application-wide client providers.
- `src/modules/<feature>`: feature business code and feature-owned components.
- `src/lib`: cross-cutting infrastructure, auth, RBAC, integrations, and
  utilities.
- `src/styles`: semantic tokens and global system styling.

Shared UI must not import route code or private module business logic.
Design-system primitives must not import from `src/app` or `src/modules`.
Routes may compose shared components and feature public APIs. One feature must
not import another feature's private implementation.

## Canonical design system

`src/components/monolith` is the single production component system.
`src/styles/monolith-tokens.css` is the semantic token source and
`src/styles/monolith-system.css` is the system stylesheet. Existing specialized
feature components may compose this system but must not create a competing
primitive family.

## New-file decision

1. Route convention or thin route composition: `src/app`.
2. Business-neutral primitive/system composition: `components/monolith`.
3. Cross-module non-primitive: `components/shared`.
4. Shell/navigation/feedback/provider concern: its named shared folder.
5. One-feature concern: `modules/<feature>`.

Do not add unmanaged root scripts, generated reports, screenshots, logs, copied
repositories, or scratch implementations.

