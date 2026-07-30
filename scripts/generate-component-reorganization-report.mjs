import { writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const diff = execFileSync(
  "git",
  ["diff", "--name-status", "--find-renames=20%", "HEAD"],
  { cwd: root, encoding: "utf8" },
);
const renames = [];
const deletions = [];
const lowSimilarityMoves = new Map([
  ["src/components/monolith/index.ts", "src/components/ui/index.ts"],
  [
    "src/components/monolith/workspace-data-table.tsx",
    "src/modules/people/components/workspace-data-table.tsx",
  ],
]);

for (const line of diff.split(/\r?\n/).filter(Boolean)) {
  const fields = line.split("\t");
  if (/^R\d+/.test(fields[0] ?? "") && fields.length >= 3) {
    renames.push({ from: fields[1], to: fields[2] });
  } else if (fields[0] === "D") {
    deletions.push(fields[1]);
  }
}

for (const [from, to] of lowSimilarityMoves) {
  const deletionIndex = deletions.indexOf(from);
  if (deletionIndex >= 0) {
    deletions.splice(deletionIndex, 1);
    renames.push({ from, to });
  }
}

renames.sort((a, b) => a.from.localeCompare(b.from));
deletions.sort();

const report = `# Component reorganization report

Date: 2026-07-30

## Scope and source state

- Branch: \`codex/production-safe-structural-cleanup-20260730\`
- Starting commit: \`e891cdd7e240aa69155d3c89e0462512d8ebd1b3\`
- Starting working tree: clean
- Routes, URLs, API contracts, database behavior, permissions, server actions,
  validation, component props, markup, semantic tokens, and intentional visual
  presentation changed: no
- Commits created by this batch: none

The fresh pre-flight and accepted failures are recorded in
[\`component-reorganization-baseline.md\`](component-reorganization-baseline.md).

## Inventory

The AST audit inspected 899 TSX, JSX, TS, JS, and CSS files under
\`src/components\`, \`src/app\`, \`src/modules\`, and \`src/styles\`. It mapped
537 TSX/JSX components, static imports, string-literal dynamic imports, exports,
ownership, business/route/style signals, and proposed destinations.

- Final proposed path changes: 0
- Retained uncertain/cross-module review entries: 43
- Automated zero-import output used as deletion authority: no

Detailed evidence:

- [component usage map](component-usage-map.md)
- [component migration map](component-migration-map.md)
- [component deletion candidates](component-deletion-candidates.md)
- [component retention list](component-retention-list.md)

## Final component tree

\`\`\`text
src/
  app/                         Next.js conventions and route-private composition
  components/
    ui/                        canonical business-neutral primitives
    data-display/              generic tables and operational display
    forms/                     generic filters, uploads, and form composition
    layout/                    workspace/dialog/application layout
    navigation/                breadcrumbs and navigation helpers
    feedback/                  warnings and asynchronous states
    providers/                 cross-application providers
  modules/
    accounting/components/
    admin/components/
    ams/components/
    auth/components/
    cha/components/
    communication/components/
    core/components/
    crm/components/
    customer-portal/components/
    dashboard/components/
    hrms/components/
    items/components/
    mona/components/
    notifications/components/
    people/components/
    performance/components/
  styles/
    monolith-tokens.css
    monolith-system.css
\`\`\`

\`src/components/monolith\` no longer exists. No file is loose directly under
\`src/components\`.

## Consolidation and removals

- The former \`button-1.tsx\` compatibility re-export was temporarily mapped
  during the move, all consumers were migrated to
  \`@/components/ui/button\`, and the compatibility file was removed.
- The former Monolith barrel was removed after every consumer was split onto
  its canonical primitive, shared, or module path.
- \`workspace-data-table.tsx\` remains as the People module adapter and
  re-exports the People-specific table contract; the generic foundation is
  \`@/components/data-display/data-table\`.
- No uncertain component or CSS rule was deleted.
- No legacy backup/archive folder was created; tracked moves use Git history.

Deleted compatibility sources:

${deletions.length ? deletions.map((file) => `- \`${file}\``).join("\n") : "- none"}

## Every file moved

${renames.map(({ from, to }) => `- \`${from}\` → \`${to}\``).join("\n")}

## Boundary enforcement

\`npm run architecture:check\` now detects:

- loose files directly under \`src/components\`;
- a reintroduced \`src/components/monolith\`;
- deprecated component imports;
- UI primitives importing routes or feature modules;
- shared components or modules importing route implementations;
- cross-module imports of private component paths;
- imports from another route segment's \`_components\`;
- duplicate primitive filenames outside \`components/ui\`;
- tracked generated/copied/log clutter.

ESLint mirrors the UI, shared-component, and module-to-route restrictions.
Public component barrels are intentionally narrow; the Performance barrel was
kept client-safe after the production build exposed a server/client bundle
boundary.

## Validation

All Node commands used \`NODE_OPTIONS=--max-old-space-size=8192\`.

| Gate | Result |
| --- | --- |
| Architecture check | Passed: 1,345 tracked paths and 1,272 source/style files |
| Production TypeScript | Passed |
| Targeted ESLint | Passed with no findings |
| Accounting static verifier | Passed: 32 routes and 68-file archive |
| Communication/Admin static verifier | Passed: 20 routes and 45-file archive |
| People Operations static verifier | Passed: 45 routes |
| Performance/Learning static verifier | Passed: 23 routes and 47-file archive |
| Expense/CHA static verifier | Passed: 12 routes and four archives |
| CRM static verifier | Passed: 57 routes and 131-file archive |
| Auth/Misc static verifier | Existing stale failure: requires literal \`await auth()\` in the root source |
| Full Vitest | Existing blocker: marker-verified staging PostgreSQL offline at \`127.0.0.1:56432\` |
| Production build | Passed: Prisma generation, Next.js compilation, TypeScript, and 328 pages |
| Build warnings | One accepted non-fatal Turbopack NFT trace warning |
| Public Playwright smoke | Passed \`/login\` at 390×844: HTTP 200, meaningful content, Night theme, no console/page errors, no error overlay, no horizontal overflow |
| Screenshot | After screenshot: \`C:\\Users\\venka\\AppData\\Local\\Temp\\component-refactor-login.png\` |
| Diff hygiene | \`git diff --check\` passed |

The preferred \`agent-browser\` wrapper was unavailable in the workspace, so
the public smoke used the repository-installed Playwright runtime. No safe
authenticated credentials were supplied. Authenticated Light/Night/Violet
desktop/tablet/mobile matrices and before/after screenshots were therefore not
re-run; the pre-existing UI migration evidence remains authoritative and is
not reclassified by this structural batch.

## Regressions and remaining work

- Functional regressions known: none.
- Visual regressions observed: none in the public Playwright smoke.
- Authenticated visual regressions: not re-measured; existing credential/browser
  blocker remains.
- Remaining uncertain files: 43, retained in
  [component-retention-list.md](component-retention-list.md).
- Existing customer-portal UI migration and CHA/CRM authenticated visual gaps
  remain outside this structural refactor.
`;

writeFileSync(
  path.join(root, "docs/refactor/component-reorganization-report.md"),
  report,
);
console.log(
  `Wrote component reorganization report with ${renames.length} moves and ${deletions.length} deletions.`,
);
