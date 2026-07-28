import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const appRoot = path.join(repositoryRoot, "src", "app", "(dashboard)");
const scopedRouteRoots = [
  path.join(appRoot, "hrms"),
  path.join(appRoot, "attendance"),
];
const activeHrmsViews = [
  "approvals-view.tsx",
  "app-settings-page.tsx",
  "files-view.tsx",
  "letters-view.tsx",
  "on-duty-admin-view.tsx",
  "onboarding-view.tsx",
  "reimbursement-admin-view.tsx",
  "settings-services.tsx",
  "tasks-view.tsx",
  "tracking-dashboard-view.tsx",
  "travel-view.tsx",
  "user-control-page.tsx",
  "users-table.tsx",
  "work-reports.tsx",
].map((file) => path.join(repositoryRoot, "src", "components", "hrms", file));

function walk(directory, predicate, found = []) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(absolutePath, predicate, found);
    else if (predicate(absolutePath)) found.push(absolutePath);
  }
  return found;
}

function read(relativePath) {
  return readFileSync(path.join(repositoryRoot, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function routeFromPage(pagePath) {
  const relative = path.relative(appRoot, path.dirname(pagePath));
  return `/${relative
    .split(path.sep)
    .filter(Boolean)
    .filter((segment) => !(segment.startsWith("(") && segment.endsWith(")")))
    .join("/")}`;
}

const pageFiles = scopedRouteRoots.flatMap((root) =>
  walk(root, (file) => path.basename(file) === "page.tsx"),
);
const routes = pageFiles.map(routeFromPage).sort();
const hrmsRoutes = routes.filter((route) => route.startsWith("/hrms"));
const attendanceRoutes = routes.filter((route) =>
  route.startsWith("/attendance"),
);

assert(
  routes.length === 45,
  `Expected 45 people-operation routes, found ${routes.length}.`,
);
assert(
  hrmsRoutes.length === 38,
  `Expected 38 HRMS routes, found ${hrmsRoutes.length}.`,
);
assert(
  attendanceRoutes.length === 7,
  `Expected 7 Attendance routes, found ${attendanceRoutes.length}.`,
);

for (const relativePath of [
  "src/app/(dashboard)/hrms/layout.tsx",
  "src/app/(dashboard)/hrms/loading.tsx",
  "src/app/(dashboard)/hrms/error.tsx",
  "src/app/(dashboard)/attendance/layout.tsx",
  "src/app/(dashboard)/attendance/loading.tsx",
  "src/app/(dashboard)/attendance/error.tsx",
]) {
  assert(
    existsSync(path.join(repositoryRoot, relativePath)),
    `Missing ${relativePath}.`,
  );
}

const shellSwitcher = read(
  "src/app/(dashboard)/_components/dashboard-shell-switcher.tsx",
);
for (const signal of [
  'normalizedPathname === "/hrms"',
  'normalizedPathname.startsWith("/hrms/")',
  'normalizedPathname === "/attendance"',
  'normalizedPathname.startsWith("/attendance/")',
]) {
  assert(
    shellSwitcher.includes(signal),
    `Shell activation is missing ${signal}.`,
  );
}

const peopleWorkspace = read("src/components/monolith/people-workspace.tsx");
for (const route of routes.filter((route) => !route.includes("["))) {
  assert(
    peopleWorkspace.includes(`"${route}"`),
    `People workspace metadata is missing ${route}.`,
  );
}
assert(
  peopleWorkspace.includes("/^\\/hrms\\/employees\\/[^/]+$/"),
  "Dynamic employee-profile metadata is missing.",
);
assert(
  peopleWorkspace.includes("/^\\/hrms\\/letters\\/view\\/[^/]+$/"),
  "Dynamic employee-letter metadata is missing.",
);

const scopedSources = [
  ...scopedRouteRoots.flatMap((root) =>
    walk(root, (file) => file.endsWith(".tsx") || file.endsWith(".ts")),
  ),
  ...activeHrmsViews,
];

const forbiddenPatterns = [
  {
    pattern: /#[0-9a-f]{3,8}/i,
    label: "inline hexadecimal colour",
  },
  {
    pattern: /rgba?\(/i,
    label: "inline RGB colour",
  },
  {
    pattern:
      /\b(?:bg|text|border|ring|divide|accent|from|to|via|shadow)-(?:slate|gray|zinc|neutral|stone|indigo|blue|sky|cyan|green|red|amber|orange|yellow|teal|emerald|purple|violet|rose|black|white)-\d+/,
    label: "fixed-palette utility",
  },
  {
    pattern: /\bmonolith-[a-z0-9_-]+/,
    label: "legacy Monolith visual class",
  },
  {
    pattern: /@\/components\/data-table/,
    label: "legacy data-table import",
  },
  {
    pattern: /@\/components\/module-home/,
    label: "legacy module-home import",
  },
  {
    pattern: /<(button|input|textarea|table)\b/,
    label: "raw standard control",
  },
  {
    pattern: /className="[^"]*fixed\s+inset-0/,
    label: "one-off dialog overlay",
  },
];

for (const sourcePath of scopedSources) {
  const source = readFileSync(sourcePath, "utf8");
  for (const { pattern, label } of forbiddenPatterns) {
    assert(
      !pattern.test(source),
      `${path.relative(repositoryRoot, sourcePath)} contains a ${label}.`,
    );
  }
}

const peopleControls = read("src/components/monolith/people-controls.tsx");
for (const component of [
  "PeopleControlButton",
  "PeopleControlInput",
  "PeopleControlTextarea",
  "PeopleControlTable",
]) {
  assert(peopleControls.includes(component), `Missing shared ${component}.`);
}

const peopleDataTable = read("src/components/monolith/people-data-table.tsx");
for (const component of [
  "DataTable",
  "DataTableToolbar",
  "DataTablePrimaryLinkCell",
  "AvatarCell",
]) {
  assert(
    peopleDataTable.includes(component),
    `Missing shared people ${component}.`,
  );
}

const styles = read("src/styles/monolith-system.css");
for (const selector of [
  ".mnx-people-page",
  ".mnx-people-summary-grid",
  ".mnx-people-link-card",
  ".mnx-people-table-shell",
  ".mnx-people-dialog-compact",
]) {
  assert(styles.includes(selector), `Missing production selector ${selector}.`);
}
for (const theme of ["theme-light", "theme-night", "theme-violet"]) {
  assert(
    read("src/styles/monolith-tokens.css").includes(theme),
    `Missing ${theme} token contract.`,
  );
}

const catalogue = read(
  "src/app/(dashboard)/admin/design-system/design-system-client.tsx",
);
for (const catalogueEntry of [
  '["people", "People ops", "HR"]',
  "PeopleWorkspaceFrame",
  "PeopleControlButton",
  "PeopleDataTable",
  "WorkspaceDialog",
  "PeopleLoadingState",
]) {
  assert(
    catalogue.includes(catalogueEntry),
    `Admin Design System catalogue is missing ${catalogueEntry}.`,
  );
}

const behaviorSources = {
  biometric: read(
    "src/app/(dashboard)/attendance/biometric-sync/biometric-sync-client.tsx",
  ),
  overtime: read("src/app/(dashboard)/attendance/ot/ot-client.tsx"),
  overtimeActions: read("src/app/(dashboard)/attendance/ot/actions.ts"),
  punch: read("src/app/(dashboard)/attendance/punch/punch-card.tsx"),
  tracking: read("src/components/hrms/tracking-dashboard-view.tsx"),
};
for (const [label, signals] of Object.entries({
  biometric: ["biometric", "sync"],
  overtime: ["shift", "overtime", "compOff", "lop"],
  overtimeActions: [
    "requirePermission",
    "processMonthOtAction",
    "saveShiftAction",
  ],
  punch: ["punches", "day-punches", "employeeId"],
  tracking: ["GPS", "latitude", "longitude", "locationPoints"],
})) {
  for (const signal of signals) {
    assert(
      behaviorSources[label].toLowerCase().includes(signal.toLowerCase()),
      `${label} behavior signal ${signal} was not preserved.`,
    );
  }
}

console.log(
  `Verified ${routes.length} people-operation routes (${hrmsRoutes.length} HRMS, ${attendanceRoutes.length} Attendance), shared controls, dialogs, states, semantic colours, catalogue coverage, and protected behavior signals.`,
);
