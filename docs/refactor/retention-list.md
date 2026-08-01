# Retention list

| Scope | Classification | Reason retained |
| --- | --- | --- |
| `_design-reference/**` | Canonical visual reference | Repository instructions prohibit modification and identify it as authoritative. |
| `OLD UI code/**` | Legacy migration evidence | Active static migration gates verify archive hashes/listings, and UI migration is not complete. It is excluded from production compilation/imports. Retain pending completion rather than break safeguards. |
| `prisma/migrations/**` | Migration/database utility | Immutable production migration history; cleanup explicitly forbids rewriting/deleting it. |
| `scripts/**` | Maintenance/verification/database utilities | Package/config entrypoints, path-sensitive gates, or plausible manual operational use. No deletion without owner evidence. |
| active CSS compatibility rules | Legacy compatibility code | Dynamic class usage and incomplete customer-portal/CHA/CRM visual verification make deletion uncertain. |
| module and route-local components | Active module-specific code | Route/business ownership is clear, but full colocation would require behavior and visual verification beyond name-based inference. |
| `mobile/**` | Active client | Separate Android application; no evidence it is generated or obsolete. |
| root accounting guides/plans | Documentation | Important implementation and transition history; not exact duplicates. |

Uncertain files remain in place by design.

