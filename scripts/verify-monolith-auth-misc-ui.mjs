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
const appRoot = path.join(repositoryRoot, "src", "app");
const expectedRoutes = [
  "/",
  "/google-chat-link",
  "/login",
  "/setup",
  "/verify/[id]",
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function read(relativePath) {
  return readFileSync(path.join(repositoryRoot, relativePath), "utf8");
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

function routeFromPage(pagePath) {
  const relative = path.relative(appRoot, path.dirname(pagePath));
  const segments = relative
    .split(path.sep)
    .filter(Boolean)
    .filter((segment) => !(segment.startsWith("(") && segment.endsWith(")")))
    .filter((segment) => !segment.startsWith("@"));
  return segments.length ? `/${segments.join("/")}` : "/";
}

const discoveredRoutes = walk(appRoot, (file) =>
  file.endsWith(`${path.sep}page.tsx`),
)
  .map(routeFromPage)
  .filter((route) => expectedRoutes.includes(route))
  .sort();

assert(
  JSON.stringify(discoveredRoutes) ===
    JSON.stringify([...expectedRoutes].sort()),
  `Authentication/Miscellaneous route discovery mismatch: ${discoveredRoutes.join(", ")}`,
);

const routeSources = [
  "src/app/page.tsx",
  "src/app/(auth)/login/page.tsx",
  "src/app/(auth)/setup/page.tsx",
  "src/app/google-chat-link/page.tsx",
  "src/app/verify/[id]/page.tsx",
  "src/modules/auth/components/monolith-logistics-login.tsx",
  "src/modules/core/components/root-module-control-client.tsx",
  "src/modules/core/components/root-signout-button.tsx",
];

for (const relativePath of routeSources) {
  assert(
    existsSync(path.join(repositoryRoot, relativePath)),
    `Missing migrated source ${relativePath}.`,
  );
}

const forbiddenPatterns = [
  { pattern: /#[0-9a-f]{3,8}/i, label: "inline hexadecimal colour" },
  { pattern: /rgba?\(/i, label: "inline RGB colour" },
  {
    pattern:
      /\b(?:bg|text|border|ring|divide|accent|from|to|via|shadow|placeholder)-(?:slate|gray|zinc|neutral|stone|indigo|blue|sky|cyan|green|red|amber|orange|yellow|teal|emerald|purple|violet|rose|pink|fuchsia|black|white)(?:-\d+|\b)/,
    label: "fixed-palette utility",
  },
  {
    pattern: /\bmonolith-(?:h1|h2|h3|card|label|numeric|accent)\b/,
    label: "legacy Monolith visual class",
  },
  {
    pattern: /className="[^"]*(?:min-h-screen|bg-gray|bg-white|text-gray)/,
    label: "legacy full-page visual composition",
  },
  {
    pattern: /style=\{\{/,
    label: "route-local inline style",
  },
  {
    pattern: /@\/components\/(?:card|data-table|module-home|modal)/,
    label: "legacy shared visual import",
  },
];

for (const relativePath of routeSources) {
  const source = read(relativePath);
  for (const { pattern, label } of forbiddenPatterns) {
    assert(!pattern.test(source), `${relativePath} contains a ${label}.`);
  }
}

const publicWorkspace = read("src/modules/auth/components/public-workspace.tsx");
for (const component of [
  "PublicMonolithShell",
  "PublicBrand",
  "PublicStage",
  "PublicPanel",
  "PublicHeader",
  "PublicInset",
  "PublicActions",
  "PublicFooter",
  "PublicStatusBadge",
  "PublicStatus",
  "PublicDetailGrid",
  "PublicDetail",
]) {
  assert(
    publicWorkspace.includes(`function ${component}`),
    `Missing centralized public component ${component}.`,
  );
}

for (const removedFile of [
  "src/components/auth/monolith-logistics-login.module.css",
  "src/components/auth/login-scene.types.ts",
]) {
  assert(
    !existsSync(path.join(repositoryRoot, removedFile)),
    `Obsolete legacy UI file remains active: ${removedFile}.`,
  );
}

const activeSources = walk(path.join(repositoryRoot, "src"), (file) =>
  /\.(?:css|ts|tsx)$/.test(file),
);
for (const sourcePath of activeSources) {
  const source = readFileSync(sourcePath, "utf8");
  for (const legacySignal of [
    "monolith-logistics-login.module.css",
    "login-scene.types",
    "login-glow-border",
    "login-breathe-glow",
  ]) {
    assert(
      !source.includes(legacySignal),
      `${path.relative(repositoryRoot, sourcePath)} retains obsolete ${legacySignal}.`,
    );
  }
}

const styles = read("src/styles/monolith-system.css");
for (const className of [
  ".mnx-public-shell",
  ".mnx-public-frame",
  ".mnx-public-stage",
  ".mnx-public-panel",
  ".mnx-public-form",
  ".mnx-public-status",
  ".mnx-public-detail-grid",
  ".mnx-auth-stage",
  ".mnx-root-control-page",
  ".mnx-root-module-grid",
]) {
  assert(styles.includes(className), `Missing shared style ${className}.`);
}
for (const breakpoint of [
  "@media (max-width: 70rem)",
  "@media (max-width: 42rem)",
]) {
  assert(styles.includes(breakpoint), `Missing responsive rule ${breakpoint}.`);
}
assert(
  styles.includes(".mnx-public-shell,") ||
    styles.includes(",\n.mnx-public-shell,"),
  "Public shell does not inherit the shared semantic token aliases.",
);
assert(
  styles.includes("html:has(.mnx-public-shell)"),
  "Public routes do not own a semantic document/scrollbar surface.",
);
assert(
  read("src/styles/legacy-compatibility.css").includes(
    "main:not(.mnx-public-shell)",
  ),
  "Legacy global form rules are not scoped away from public Monolith pages.",
);
const scrollNavigator = read("src/components/navigation/scroll-navigator.tsx");
for (const routeSignal of [
  'pathname === "/"',
  'pathname === "/login"',
  'pathname === "/setup"',
  'pathname === "/google-chat-link"',
  'pathname.startsWith("/verify/")',
]) {
  assert(
    scrollNavigator.includes(routeSignal),
    `Scroll navigator is not suppressed for ${routeSignal}.`,
  );
}

const behaviorSources = {
  root: read("src/app/page.tsx"),
  rootControl: read("src/modules/core/components/root-module-control-client.tsx"),
  login: read("src/modules/auth/components/monolith-logistics-login.tsx"),
  setup: read("src/app/(auth)/setup/page.tsx"),
  verify: read("src/app/verify/[id]/page.tsx"),
  googleChatLink: read("src/app/google-chat-link/page.tsx"),
  proxy: read("src/proxy.ts"),
};

for (const [sourceName, signals] of Object.entries({
  root: [
    "await getSession()",
    "isRootControlEmail",
    'redirect("/dashboard")',
    "getEnabledModuleIds",
  ],
  rootControl: [
    'fetch("/api/admin/modules"',
    'method: "PATCH"',
    "enabledModuleIds",
  ],
  login: [
    'signIn("credentials"',
    'signIn("google"',
    "rememberMe",
    "getSafeCallbackUrl",
    "getSameOriginRedirectUrl",
    "clearStaleSessionData",
  ],
  setup: [
    'fetch("/api/setup"',
    'method: "POST"',
    "orgName",
    "getSetupDemoValues",
    'router.replace("/login")',
  ],
  verify: [
    "/api/hrms/letters/verify?q=",
    'documentRecord.status !== "CANCELLED"',
    'documentRecord.validityStatus === "VALID"',
    "documentHash",
  ],
  googleChatLink: [
    "/api/google-chat/link?token=",
    'fetch("/api/google-chat/link"',
    "replaceExisting",
    "USER_ALREADY_LINKED_OTHER_GOOGLE",
    "response.status === 401",
  ],
  proxy: ['"/login"', '"/setup"', '"/google-chat-link"', '"/verify"'],
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
  "legacy-ui-before-monolith-auth-misc-db4bc60.zip",
);
const expectedArchiveSize = 62_758;
const expectedArchiveHash =
  "7A958A708AA5CBCAC2797E9BA59E2CAE2AC2233573C8310AD9CC6F62C0A05C8B";

assert(existsSync(archivePath), `Missing backup archive ${archivePath}.`);
assert(
  statSync(archivePath).size === expectedArchiveSize,
  "Authentication/Miscellaneous backup archive size does not match.",
);
const hash = createHash("sha256");
for await (const chunk of createReadStream(archivePath)) hash.update(chunk);
assert(
  hash.digest("hex").toUpperCase() === expectedArchiveHash,
  "Authentication/Miscellaneous backup archive checksum does not match.",
);

const listing = spawnSync("tar", ["-tf", archivePath], {
  cwd: repositoryRoot,
  encoding: "utf8",
});
assert(
  listing.status === 0,
  listing.stderr || "Unable to list backup archive.",
);
const archiveFiles = listing.stdout
  .split(/\r?\n/)
  .filter((entry) => entry && !entry.endsWith("/"));
assert(
  archiveFiles.length === 13,
  `Expected 13 archived visual files, found ${archiveFiles.length}.`,
);
for (const requiredEntry of [
  "src/app/page.tsx",
  "src/app/(auth)/login/page.tsx",
  "src/app/(auth)/setup/page.tsx",
  "src/app/google-chat-link/page.tsx",
  "src/app/verify/[id]/page.tsx",
  "src/components/auth/monolith-logistics-login.module.css",
  "src/styles/monolith-system.css",
]) {
  assert(
    archiveFiles.includes(requiredEntry),
    `Backup archive is missing ${requiredEntry}.`,
  );
}

const scrollArchivePath = path.join(
  repositoryRoot,
  "OLD UI code",
  "legacy-ui-before-monolith-auth-misc-scroll-navigator-db4bc60.zip",
);
assert(
  existsSync(scrollArchivePath),
  `Missing supplemental backup archive ${scrollArchivePath}.`,
);
assert(
  statSync(scrollArchivePath).size === 2_339,
  "Scroll-navigator backup archive size does not match.",
);
const scrollHash = createHash("sha256");
for await (const chunk of createReadStream(scrollArchivePath)) {
  scrollHash.update(chunk);
}
assert(
  scrollHash.digest("hex").toUpperCase() ===
    "90B173D7BB29187683E4C7277D0E83F9B0F09F7FE65F0772FC5B4DD6D67ED84C",
  "Scroll-navigator backup archive checksum does not match.",
);
const scrollListing = spawnSync("tar", ["-tf", scrollArchivePath], {
  cwd: repositoryRoot,
  encoding: "utf8",
});
assert(
  scrollListing.status === 0,
  scrollListing.stderr || "Unable to list scroll-navigator backup archive.",
);
assert(
  scrollListing.stdout.trim() === "src/components/scroll-navigator.tsx",
  "Scroll-navigator backup archive listing does not match.",
);

console.log(
  "Verified 5 Authentication/Miscellaneous routes, centralized public/root compositions, protected behavior signals, semantic theme/responsive source, obsolete UI removal, the 13-file legacy archive, and supplemental scroll-navigator backup.",
);
