/**
 * verify-ui-primitive-usage.mjs
 * -----------------------------------------------------------------------------
 * Design-system drift guard. Fails when authenticated application code hand-
 * rolls a reusable visual control instead of using the ONE canonical
 * primitive:
 *
 *   raw <button>              -> @/components/ui  Button / ButtonLink
 *   raw <select>              -> @/components/ui  NativeSelect / DropdownSelect
 *   raw <input type=checkbox> -> @/components/ui  Checkbox (neon-checkbox)
 *   raw <input type=radio>    -> @/components/ui  Radio
 *   class "ds-card" / "ds-btn"-> canonical <Card> / <Button>
 *
 * Existing offenders are grandfathered through scripts/ui-primitive-allowlist.json
 * (path + rule + reason). The point of the gate is to stop NEW ones: any
 * raw control that is not on the allow-list is a hard failure.
 *
 * Semantic, non-reusable HTML is intentionally NOT flagged — only the control
 * elements above, and only inside the scanned application trees.
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const SCAN_DIRS = ["src/app/(dashboard)", "src/modules"];
const ALLOWLIST_FILE = path.join(root, "scripts/ui-primitive-allowlist.json");

// Files that are allowed to contain raw controls because they ARE the
// primitive implementation, the design-system catalogue, or dev-only tooling.
const EXEMPT_PREFIXES = [
  "src/components/ui/",
  "src/app/(dashboard)/admin/design-system/", // living catalogue renders raw specimens for comparison
];

const RULES = [
  { id: "raw-button", re: /<button(\s|>|\/)/g, hint: "use <Button>/<ButtonLink> from @/components/ui" },
  { id: "raw-select", re: /<select(\s|>|\/)/g, hint: "use <NativeSelect>/<DropdownSelect> from @/components/ui" },
  { id: "raw-checkbox", re: /<input[^>]*type=["']checkbox["']/g, hint: "use <Checkbox> from @/components/ui" },
  { id: "raw-radio", re: /<input[^>]*type=["']radio["']/g, hint: "use <Radio> from @/components/ui" },
  { id: "legacy-ds-class", re: /className=\{?["'`][^"'`]*\bds-(card|btn)\b/g, hint: "render canonical <Card>/<Button>" },
];

function walk(dir) {
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs, { withFileTypes: true }).flatMap((entry) => {
    const rel = path.posix.join(dir, entry.name);
    if (entry.isDirectory()) return walk(rel);
    return entry.isFile() && rel.endsWith(".tsx") ? [rel] : [];
  });
}

function isExempt(file) {
  return EXEMPT_PREFIXES.some((prefix) => file.startsWith(prefix));
}

let allowlist = [];
try {
  allowlist = JSON.parse(fs.readFileSync(ALLOWLIST_FILE, "utf8"));
} catch {
  allowlist = [];
}
const allowKeys = new Set(
  allowlist
    .filter((e) => e && typeof e.file === "string" && typeof e.rule === "string")
    .map((e) => `${e.file}#${e.rule}`),
);
const invalidAllow = allowlist.filter(
  (e) => !e || !e.file || !e.rule || !e.reason || typeof e.reason !== "string" || !e.reason.trim(),
);

const files = SCAN_DIRS.flatMap(walk).filter((f) => !isExempt(f));
const violations = [];
const usedAllowKeys = new Set();

for (const file of files) {
  const source = fs
    .readFileSync(path.join(root, file), "utf8")
    .replaceAll("\r\n", "\n")
    // strip line + block comments so commented-out markup is ignored
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

  for (const rule of RULES) {
    rule.re.lastIndex = 0;
    if (!rule.re.test(source)) continue;
    const key = `${file}#${rule.id}`;
    if (allowKeys.has(key)) {
      usedAllowKeys.add(key);
      continue;
    }
    const count = (source.match(rule.re) || []).length;
    violations.push({ file, rule: rule.id, count, hint: rule.hint });
  }
}

const staleAllow = [...allowKeys].filter((k) => !usedAllowKeys.has(k));

if (process.argv.includes("--write-allowlist")) {
  const next = [...allowlist];
  const have = new Set(allowlist.map((e) => `${e.file}#${e.rule}`));
  for (const v of violations) {
    const k = `${v.file}#${v.rule}`;
    if (!have.has(k)) {
      next.push({ file: v.file, rule: v.rule, reason: "Pre-existing raw control; scheduled for canonical-primitive migration." });
      have.add(k);
    }
  }
  next.sort((a, b) => a.file.localeCompare(b.file) || a.rule.localeCompare(b.rule));
  fs.writeFileSync(ALLOWLIST_FILE, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`ui-primitive-usage: wrote ${next.length} allow-list entries.`);
  process.exit(0);
}

const failures = [];
for (const e of invalidAllow) failures.push(`Invalid allow-list entry (needs file, rule, reason): ${JSON.stringify(e)}`);
for (const k of staleAllow) failures.push(`Stale allow-list entry — no longer needed, remove it: ${k}`);
for (const v of violations) failures.push(`${v.file}: ${v.count}× ${v.rule} — ${v.hint}`);

if (failures.length > 0) {
  console.error(`UI primitive usage failed with ${failures.length} issue(s):`);
  for (const f of failures) console.error(`- ${f}`);
  process.exit(1);
}

console.log(
  `UI primitive usage passed: ${files.length} files scanned, ${allowKeys.size} grandfathered exceptions.`,
);
