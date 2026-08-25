// Phase 0: walks the scraped Zoho Payroll corpus and builds a machine-readable
// + human-readable manifest. Run: node scripts/payroll-reference-index.mjs
import fs from "node:fs";
import path from "node:path";

const CORPUS = "C:\\Users\\SilverCloud\\Downloads\\scrapling-env\\scrapling-env\\scrapling_app_map";
const PAGES_DIR = path.join(CORPUS, "pages");
const OUT_JSON = path.join(process.cwd(), "docs", "payroll", "zoho-payroll-reference-manifest.json");
const OUT_MD = path.join(process.cwd(), "docs", "payroll", "ZOHO_PAYROLL_REFERENCE_MANIFEST.md");

function readJson(p, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return fallback;
  }
}

function readText(p, fallback = "") {
  try {
    return fs.readFileSync(p, "utf8");
  } catch {
    return fallback;
  }
}

function routeFromDirName(name) {
  // 00003_payroll.zoho.in_app_hash__approvals_proof-of-investment_57f1cf6903
  const m = name.match(/^\d+_payroll\.zoho\.in_app_hash__(.+?)_[0-9a-f]{10}$/);
  if (m) return "/" + m[1].replace(/_/g, "/");
  const m2 = name.match(/^\d+_payroll\.zoho\.in_portal_\d+_hash__?(.*?)_[0-9a-f]{10}$/);
  if (m2) return "/portal/" + (m2[1] ? m2[1].replace(/_/g, "/") : "");
  const m3 = name.match(/^\d+_payroll\.zoho\.in_(.+?)_[0-9a-f]{10}$/);
  if (m3) return m3[1];
  return name;
}

function isTechnicalNoise(name) {
  // WMS analytics/tracking-pixel captures (pconnect.sas beacons) are not
  // application pages — exclude them from the business page count per
  // Phase 0 acceptance criteria ("explain any excluded technical pages").
  return /wms_pconnect|_settings_true_prd_PY/.test(name);
}

function summarizeInteractive(elements) {
  if (!Array.isArray(elements)) return { count: 0, byTag: {}, labels: [] };
  const byTag = {};
  const labels = [];
  for (const el of elements) {
    const tag = el.tag || el.tagName || "unknown";
    byTag[tag] = (byTag[tag] || 0) + 1;
    const label = el.text || el.label || el.ariaLabel || el.placeholder || el.name;
    if (label && labels.length < 40) labels.push(String(label).trim().slice(0, 80));
  }
  return { count: elements.length, byTag, labels: [...new Set(labels)].filter(Boolean) };
}

function summarizeForms(forms) {
  if (!Array.isArray(forms)) return [];
  return forms.slice(0, 10).map((f) => ({
    name: f.name || f.id || null,
    fields: (f.fields || f.inputs || []).map((fld) => fld.name || fld.label || fld.id).filter(Boolean).slice(0, 60),
  }));
}

function main() {
  const dirs = fs.readdirSync(PAGES_DIR).filter((d) =>
    fs.statSync(path.join(PAGES_DIR, d)).isDirectory()
  ).sort();

  const manifest = [];
  for (const dirName of dirs) {
    const full = path.join(PAGES_DIR, dirName);
    const id = dirName.split("_")[0];
    const route = routeFromDirName(dirName);
    const doc = readJson(path.join(full, "document.json"), {});
    const visibleText = readText(path.join(full, "visible_text.txt"));
    const interactive = readJson(path.join(full, "interactive_elements.json"), []);
    const forms = readJson(path.join(full, "forms.json"), []);
    const actionMap = readJson(path.join(full, "action_map.json"), []);
    const apiManifest = readJson(path.join(full, "api_manifest.json"), []);

    let actionCount = 0;
    const actionsDir = path.join(full, "actions");
    if (fs.existsSync(actionsDir)) {
      actionCount = fs.readdirSync(actionsDir).filter((a) =>
        fs.statSync(path.join(actionsDir, a)).isDirectory()
      ).length;
    }

    const titleLine = visibleText.split("\n").map((l) => l.trim()).filter(Boolean)[0] || null;

    manifest.push({
      pageId: id,
      dirName,
      route,
      excludedTechnical: isTechnicalNoise(dirName),
      url: doc?.url || null,
      title: titleLine,
      hasScreenshot: fs.existsSync(path.join(full, "screenshot.png")),
      hasRenderedHtml: fs.existsSync(path.join(full, "rendered.html")),
      visibleTextPreview: visibleText.slice(0, 400).replace(/\s+/g, " ").trim(),
      interactive: summarizeInteractive(Array.isArray(interactive) ? interactive : interactive?.elements),
      forms: summarizeForms(Array.isArray(forms) ? forms : forms?.forms),
      actionStateCount: actionCount,
      actionMapEntries: Array.isArray(actionMap) ? actionMap.length : (actionMap ? Object.keys(actionMap).length : 0),
      apiEndpointsObserved: Array.isArray(apiManifest) ? apiManifest.length : 0,
      referenceDir: `scrapling_app_map/pages/${dirName}`,
      implementationTarget: null,
      implementationStatus: "NOT_STARTED",
    });
  }

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.writeFileSync(OUT_JSON, JSON.stringify(manifest, null, 2));

  const business = manifest.filter((p) => !p.excludedTechnical);
  const excluded = manifest.filter((p) => p.excludedTechnical);

  // group by top-level route segment for the markdown index
  const groups = {};
  for (const p of business) {
    const seg = (p.route || "/").split("/").filter(Boolean)[0] || "root";
    groups[seg] = groups[seg] || [];
    groups[seg].push(p);
  }

  let md = `# Zoho Payroll Reference Manifest\n\nGenerated from ${manifest.length} captured page states in \`scrapling_app_map/pages\`.\n\n`;
  md += `Source: \`${CORPUS}\`\n\n`;
  md += `Machine-readable: \`docs/payroll/zoho-payroll-reference-manifest.json\`\n\n`;
  md += `## Summary\n\n- Total captured states: ${manifest.length}\n- Business pages (Payroll app UI): ${business.length}\n- Excluded technical states: ${excluded.length} — \`wms_pconnect.sas\` beacons are WMS analytics/tracking-pixel network captures, not application screens. Not relevant to page/workflow reconstruction.\n\n`;
  md += `## Index by top-level area\n\n`;
  for (const [seg, pages] of Object.entries(groups).sort()) {
    md += `### ${seg} (${pages.length} states)\n\n`;
    md += `| ID | Route | Title | Actions captured | Forms | API calls |\n|---|---|---|---|---|---|\n`;
    for (const p of pages) {
      md += `| ${p.pageId} | \`${p.route}\` | ${p.title || ""} | ${p.actionStateCount} | ${p.forms.length} | ${p.apiEndpointsObserved} |\n`;
    }
    md += `\n`;
  }
  fs.writeFileSync(OUT_MD, md);

  console.log(`Indexed ${manifest.length} pages -> ${OUT_JSON}`);
  console.log(`Groups: ${Object.keys(groups).join(", ")}`);
}

main();
