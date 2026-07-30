# Component inventory

The complete AST-backed inventory is in
[`component-usage-map.md`](component-usage-map.md). It covers every TSX, JSX,
TS, JS, and CSS file under `src/components`, `src/app`, `src/modules`, and
`src/styles`, including exports, static and dynamic importers, ownership,
business/route/style signals, destination, and classification.

Final inventory summary:

- 899 files inspected;
- 537 TSX/JSX component files;
- zero remaining proposed path changes;
- 43 uncertain or cross-module review entries retained;
- no direct files under `src/components`;
- no `src/components/monolith`;
- no imports from retired component paths;
- no imports into another route's private `_components`;
- no duplicate primitive filenames outside `components/ui`.

Movement details and ownership rationale are recorded in
[`component-migration-map.md`](component-migration-map.md) and the final
[`component-reorganization-report.md`](component-reorganization-report.md).
