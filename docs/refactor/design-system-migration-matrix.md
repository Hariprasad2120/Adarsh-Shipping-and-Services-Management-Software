# Design-system migration matrix

| Family | Canonical location | Result |
| --- | --- | --- |
| Tokens/themes | `src/styles/monolith-tokens.css` and `src/styles/monolith-system.css` | Unchanged |
| Primitive actions/forms/surfaces | `src/components/ui` | Moved from the retired Monolith migration folder |
| Generic data display | `src/components/data-display` | Explicit shared ownership |
| Generic form composition | `src/components/forms` | Filters, uploads, and development fill control colocated |
| Workspace/layout composition | `src/components/layout` | Business-neutral workspace and dialog layout |
| Feedback | `src/components/feedback` | Warning and asynchronous-state UI |
| Accounting/Admin/Auth/CHA/Communication/CRM | `src/modules/<module>/components` | Route-aware workspaces moved to module ownership |
| People/Performance | `src/modules/people/components`, `src/modules/performance/components` | Cross-route HRMS/Attendance and AMS/LMS workspaces exposed through public component barrels |
| Item UI | `src/modules/items/components` | Shared CRM item feature has explicit module ownership |
| Data table | `src/components/data-display/data-table.tsx` | Canonical generic foundation; People-specific adapter remains module-owned |
| Compatibility exports | none under retired paths | Monolith barrel and duplicate button shim removed |

No token, class, prop, markup, route, permission, action, or business behavior
was intentionally changed by this structural migration.
