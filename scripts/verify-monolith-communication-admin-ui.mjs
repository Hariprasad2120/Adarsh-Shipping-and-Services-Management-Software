import { createHash } from "node:crypto";
import {
  createReadStream,
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const dashboardRoot = path.join(repositoryRoot, "src", "app", "(dashboard)");
const communicationRoot = path.join(dashboardRoot, "communication");
const adminRoot = path.join(dashboardRoot, "admin");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function walk(root, predicate = () => true) {
  const entries = [];
  for (const item of readdirSync(root, { withFileTypes: true })) {
    const source = path.join(root, item.name);
    if (item.isDirectory()) entries.push(...walk(source, predicate));
    else if (predicate(source)) entries.push(source);
  }
  return entries;
}

function read(relativePath) {
  return readFileSync(path.join(repositoryRoot, relativePath), "utf8");
}

function routesFor(root, prefix) {
  return walk(root, (file) => file.endsWith(`${path.sep}page.tsx`))
    .map((pagePath) => {
      const relative = path
        .relative(root, pagePath)
        .replaceAll(path.sep, "/")
        .replace(/\/?page\.tsx$/, "");
      return relative ? `${prefix}/${relative}` : prefix;
    })
    .sort();
}

const communicationRoutes = routesFor(communicationRoot, "/communication");
const adminRoutes = routesFor(adminRoot, "/admin");

assert(
  communicationRoutes.length === 10,
  `Expected 10 Communication routes, found ${communicationRoutes.length}.`,
);
assert(adminRoutes.length === 10, `Expected 10 Admin routes, found ${adminRoutes.length}.`);

for (const route of [
  "/communication",
  "/communication/calendar",
  "/communication/chat",
  "/communication/drive",
  "/communication/google-chat-live-view",
  "/communication/job-spaces",
  "/communication/mail",
  "/communication/meetings",
  "/communication/search",
  "/communication/settings",
]) {
  assert(communicationRoutes.includes(route), `Missing Communication route ${route}.`);
}

for (const route of [
  "/admin",
  "/admin/data-tools",
  "/admin/design-system",
  "/admin/google-chat",
  "/admin/notifications",
  "/admin/passkeys",
  "/admin/roles",
  "/admin/sessions",
  "/admin/settings",
  "/admin/simulation",
]) {
  assert(adminRoutes.includes(route), `Missing Admin route ${route}.`);
}

for (const requiredFile of [
  "src/app/(dashboard)/communication/layout.tsx",
  "src/app/(dashboard)/communication/loading.tsx",
  "src/app/(dashboard)/communication/error.tsx",
  "src/app/(dashboard)/admin/layout.tsx",
  "src/app/(dashboard)/admin/loading.tsx",
  "src/app/(dashboard)/admin/error.tsx",
  "src/modules/communication/components/workspace/communication-workspace.tsx",
  "src/modules/admin/components/admin-workspace.tsx",
]) {
  assert(existsSync(path.join(repositoryRoot, requiredFile)), `Missing ${requiredFile}.`);
}

const shellSwitcher = read(
  "src/app/(dashboard)/_components/dashboard-shell-switcher.tsx",
);
for (const signal of [
  'normalizedPathname === "/communication"',
  'normalizedPathname.startsWith("/communication/")',
  'normalizedPathname === "/admin"',
  'normalizedPathname.startsWith("/admin/")',
]) {
  assert(shellSwitcher.includes(signal), `Shell switcher is missing ${signal}.`);
}

const communicationWorkspace = read(
  "src/modules/communication/components/workspace/communication-workspace.tsx",
);
for (const route of communicationRoutes) {
  assert(
    communicationWorkspace.includes(`"${route}"`),
    `Communication route metadata is missing ${route}.`,
  );
}

const adminWorkspace = read("src/modules/admin/components/admin-workspace.tsx");
for (const route of adminRoutes.filter((route) => route !== "/admin/design-system")) {
  assert(
    adminWorkspace.includes(`"${route}"`),
    `Admin route metadata is missing ${route}.`,
  );
}
assert(
  adminWorkspace.includes('pathname === "/admin/design-system"'),
  "Admin design-system passthrough is missing.",
);

const scopedSources = [
  ...walk(communicationRoot, (file) => /\.(?:ts|tsx)$/.test(file)),
  ...walk(adminRoot, (file) =>
    /\.(?:ts|tsx)$/.test(file) && !file.includes(`${path.sep}design-system${path.sep}`),
  ),
];

const forbiddenPatterns = [
  { pattern: /#[0-9a-f]{3,8}/i, label: "inline hexadecimal colour" },
  { pattern: /rgba?\(/i, label: "inline RGB colour" },
  {
    pattern:
      /\b(?:bg|text|border|ring|divide|accent|from|to|via|shadow|placeholder)-(?:slate|gray|zinc|neutral|stone|indigo|blue|sky|cyan|green|red|amber|orange|yellow|teal|emerald|purple|violet|rose|pink|fuchsia|black|white)(?:-\d+|\b)/,
    label: "fixed-palette utility",
  },
  {
    pattern: /\bmonolith-[a-z0-9_-]+/,
    label: "legacy Monolith visual class",
  },
  {
    pattern: /<(button|input|select|textarea|table)\b/,
    label: "raw standard control",
  },
  {
    pattern: /className="[^"]*fixed\s+inset-0/,
    label: "one-off dialog overlay",
  },
  {
    pattern: /@\/components\/(?:data-table|module-home|modal)/,
    label: "legacy shared visual import",
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

for (const [source, components] of [
  [
    communicationWorkspace,
    [
      "CommunicationWorkspaceFrame",
      "CommunicationMetric",
      "CommunicationPanel",
      "CommunicationButton",
      "CommunicationInput",
      "CommunicationTextarea",
      "CommunicationSelect",
      "CommunicationTable",
      "CommunicationPermissionState",
      "CommunicationLoadingState",
      "CommunicationErrorState",
    ],
  ],
  [
    adminWorkspace,
    [
      "AdminWorkspaceFrame",
      "AdminMetric",
      "AdminPanel",
      "AdminButton",
      "AdminInput",
      "AdminTextarea",
      "AdminSelect",
      "AdminTable",
      "AdminPermissionState",
      "AdminLoadingState",
      "AdminErrorState",
    ],
  ],
]) {
  for (const component of components) {
    assert(source.includes(component), `Missing shared ${component}.`);
  }
}

const styles = `${read("src/styles/monolith-system.css")}\n${read("src/styles/modules/communication-admin.css")}`;
for (const className of [
  ".mnx-communication-page",
  ".mnx-communication-page-header",
  ".mnx-communication-nav",
  ".mnx-communication-content",
  ".mnx-communication-table",
  ".mnx-communication-settings-layout",
  ".mnx-admin-page",
  ".mnx-admin-page-header",
  ".mnx-admin-nav",
  ".mnx-admin-content",
  ".mnx-admin-table",
  ".mnx-admin-role-layout",
]) {
  assert(styles.includes(className), `Missing shared style ${className}.`);
}
for (const breakpoint of ["@media (max-width: 70rem)", "@media (max-width: 42rem)"]) {
  assert(styles.includes(breakpoint), `Missing responsive rule ${breakpoint}.`);
}
for (const denseLayout of [
  '[data-communication-mail="true"]',
  '[data-communication-chat="true"]',
  ".mnx-communication-legacy-dialog",
]) {
  assert(styles.includes(denseLayout), `Missing dense layout rule ${denseLayout}.`);
}

const behaviorSources = {
  communicationLayout: read("src/app/(dashboard)/communication/layout.tsx"),
  chatProvider: read(
    "src/app/(dashboard)/communication/_components/chat-provider.tsx",
  ),
  chat: read("src/app/(dashboard)/communication/chat/page.tsx"),
  mail: read("src/app/(dashboard)/communication/mail/page.tsx"),
  meetings: read("src/app/(dashboard)/communication/meetings/page.tsx"),
  jobSpaces: read("src/app/(dashboard)/communication/job-spaces/page.tsx"),
  communicationSettings: read(
    "src/app/(dashboard)/communication/settings/page.tsx",
  ),
  liveSettings: read(
    "src/modules/communication/components/google-chat-live-view-settings.tsx",
  ),
  dataTools: read("src/app/(dashboard)/admin/data-tools/workbook-import-form.tsx"),
  passkeys: read("src/app/(dashboard)/admin/passkeys/page.tsx"),
  roles: read("src/app/(dashboard)/admin/roles/roles-manager.tsx"),
  sessions: read("src/app/(dashboard)/admin/sessions/sessions-dashboard.tsx"),
  settings: read("src/app/(dashboard)/admin/settings/settings-client.tsx"),
  simulation: read("src/app/(dashboard)/admin/simulation/simulation-client.tsx"),
  notifications: read(
    "src/app/(dashboard)/admin/notifications/admin-notifications-client.tsx",
  ),
  googleChat: read("src/app/(dashboard)/admin/google-chat/page.tsx"),
};

for (const [sourceName, signals] of Object.entries({
  communicationLayout: [
    "googleWorkspaceConnection.findUnique",
    'signIn("google"',
  ],
  chatProvider: [
    "/api/communication/chat/list",
    "/api/communication/chat/check-new",
    "new Notification(",
  ],
  chat: [
    "/api/communication/chat/messages",
    "/api/communication/chat/space",
    "WorkspaceDialogLayer",
  ],
  mail: [
    "/api/communication/mail",
    "/api/communication/mail/send",
    "/api/communication/mail/modify",
    "WorkspaceDialogLayer",
  ],
  meetings: ["createEvent", "listUpcomingEvents"],
  jobSpaces: [
    "provisionJobWorkspace",
    "retryJobChatCleanupAction",
    'can(session.user.id, "cha.job.delete.approve")',
  ],
  communicationSettings: [
    "saveSettingsAction",
    "googleWorkspaceSetting.update",
    "communicationAuditEvent.create",
  ],
  liveSettings: ["toggleGoogleChatLiveView"],
  dataTools: ["importWorkbookAction", "FormData"],
  passkeys: ["decidePasskeyResetAction", "forcePasskeyResetAction"],
  roles: ["/api/roles", "/permissions"],
  sessions: [
    "getActiveSessionsAction",
    "adminRevokeSessionAction",
    "adminRevokeAllUserSessionsAction",
    "saveTimeoutAction",
  ],
  settings: ["/api/admin/settings", 'method: "PATCH"'],
  simulation: [
    "/api/admin/simulation",
    "/api/admin/ams-reset",
    "runDailyJob",
    "resetAmsData",
  ],
  notifications: ["/api/admin/notifications/", "resend"],
  googleChat: ["/api/google-chat/admin", "/api/google-chat/webhook"],
})) {
  for (const signal of signals) {
    assert(
      behaviorSources[sourceName].includes(signal),
      `${sourceName} is missing protected behavior signal ${signal}.`,
    );
  }
}

const archivePath = path.join(
  repositoryRoot,
  "OLD UI code",
  "legacy-ui-before-monolith-communication-admin-ed1bf68.zip",
);
const expectedArchiveSize = 130_499;
const expectedArchiveHash =
  "65DDD40D29C8FEA5AF6D86A00F71CBD3E1E4927E18DC5944F9AECF74D2303EC8";

assert(existsSync(archivePath), `Missing backup archive ${archivePath}.`);
assert(
  statSync(archivePath).size === expectedArchiveSize,
  "Communication/Admin backup archive size does not match.",
);
const hash = createHash("sha256");
for await (const chunk of createReadStream(archivePath)) hash.update(chunk);
assert(
  hash.digest("hex").toUpperCase() === expectedArchiveHash,
  "Communication/Admin backup archive checksum does not match.",
);

const listing = spawnSync("tar", ["-tf", archivePath], {
  cwd: repositoryRoot,
  encoding: "utf8",
});
assert(listing.status === 0, listing.stderr || "Unable to list backup archive.");
const archiveFiles = listing.stdout
  .split(/\r?\n/)
  .filter((entry) => entry && !entry.endsWith("/"));
assert(
  archiveFiles.length === 45,
  `Expected 45 archived visual files, found ${archiveFiles.length}.`,
);
for (const requiredEntry of [
  "src/app/(dashboard)/communication/layout.tsx",
  "src/app/(dashboard)/communication/mail/page.tsx",
  "src/app/(dashboard)/communication/chat/page.tsx",
  "src/app/(dashboard)/admin/page.tsx",
  "src/app/(dashboard)/admin/roles/roles-manager.tsx",
  "src/components/module-home.tsx",
  "src/components/data-table.tsx",
]) {
  assert(
    archiveFiles.includes(requiredEntry),
    `Backup archive is missing ${requiredEntry}.`,
  );
}

console.log(
  `Verified ${communicationRoutes.length} Communication routes, ${adminRoutes.length} Admin routes, 19 newly migrated route surfaces, centralized controls, semantic themes, protected behavior signals, and the 45-file legacy archive.`,
);
