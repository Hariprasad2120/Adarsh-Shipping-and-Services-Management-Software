# Design-system migration matrix

| Family | Current implementations | Canonical implementation | Migration status | Visual status | Old files removed |
| --- | --- | --- | --- | --- | --- |
| Tokens/themes | `monolith-tokens.css`, system aliases, active global compatibility rules | `src/styles/monolith-tokens.css` | Canonical; no values changed | Existing Light/Night/Violet evidence retained; cleanup adds no visual change | Nested duplicate reference CSS removed |
| Actions/forms/surfaces/dialogs | Production Monolith modules plus feature compositions | `src/components/monolith` | Canonical imports retained | Existing migration status applies | No active primitive removed |
| Data table | Loose shared table plus Monolith feature tables | `src/components/shared/data-table.tsx` for current portal API; Monolith compositions for migrated workspaces | Ownership corrected without API change | Build/type verification required | No duplicate proven equivalent |
| Navigation/breadcrumbs | Four loose files | `src/components/navigation` | Complete | Structural-only, no markup change | Old loose paths removed via `git mv` |
| Shell/layout | Four loose files | `src/components/layout` | Complete | Protected dashboard markup unchanged | Old loose paths removed via `git mv` |
| Accounting feature forms | Three feature-aware files inside the Monolith folder | `src/modules/accounting/components` composing canonical Monolith primitives | Complete | Markup and APIs unchanged | Old shared-system paths removed via `git mv` |
| Module home | Unused legacy hardcoded card composition | Monolith workspace/metric/section compositions | Removed | No consumer, therefore no rendered delta | `src/components/module-home.tsx` |

No semantic variant, behavior, prop API, CSS token, or visual styling was
changed in this cleanup batch.
