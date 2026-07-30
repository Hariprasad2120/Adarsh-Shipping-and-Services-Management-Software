# Component inventory

## Canonical shared ownership

| Location | Responsibility |
| --- | --- |
| `src/components/monolith` | Production Monolith primitives and cross-module workspace compositions |
| `src/components/layout` | Dashboard chrome, shell, sidebar, and welcome bar |
| `src/components/navigation` | Breadcrumb rendering/labels and global scroll navigation |
| `src/components/feedback` | Page transition/animation feedback |
| `src/components/shared` | Cross-module data table, clickable row, and development fixture fill control |
| `src/components/providers` | Session synchronization provider |
| `src/modules/core/components` | Root-only module control and sign-out behavior |

## Moved active components

- `auto-breadcrumb.tsx`, `breadcrumb-label.tsx`, `breadcrumbs.tsx`, and
  `scroll-navigator.tsx` to `components/navigation`
- `dashboard-chrome.tsx`, `main-shell.tsx`, `sidebar.tsx`, and
  `welcome-bar.tsx` to `components/layout`
- `clickable-row.tsx`, `data-table.tsx`, and `demo-fill-button.tsx` to
  `components/shared`
- `page-animator.tsx` to `components/feedback`
- `session-sync.tsx` to `components/providers`
- root module control and sign-out clients to `modules/core/components`
- three Accounting forms/details that import feature actions to
  `modules/accounting/components`

Every static import and source-path test/verification reference was updated.
Component props and exports were not changed.

## Confirmed dead component

`src/components/module-home.tsx` had no production or test consumer. Its only
reference outside historical documentation was as an entry expected inside a
legacy ZIP archive. It duplicated module-card composition with hardcoded
palette values and was removed. The archive reference remains valid because
the archived path is historical.

## Retained component groups

Existing `ams`, `auth`, `cha`, `crm`, `hrms`, `items`, `landing-page`, `mona`,
`monolith`, and `notifications` component directories remain in place. Their
business ownership and/or cross-route consumption requires a separate,
feature-by-feature migration and visual matrix; similarity of names is not
proof that they can be merged.
