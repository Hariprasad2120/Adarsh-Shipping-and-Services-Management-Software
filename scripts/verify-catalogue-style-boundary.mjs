import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const stylesheet = path.join(
  root,
  "src/app/(dashboard)/admin/design-system/design-system-catalogue.css",
);

if (!fs.existsSync(stylesheet)) {
  console.error("Catalogue boundary failed: design-system-catalogue.css is missing.");
  process.exit(1);
}

const source = fs.readFileSync(stylesheet, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const failures = [];
const productionClass =
  /\.(?:mnx-(?:button|panel|badge|section-heading|field|workspace|cha|accounting|crm|people|performance|communication|admin)\b|mnx-(?!catalogue-)[\w-]+)/;

for (const match of source.matchAll(/([^{}]+)\{/g)) {
  const prelude = match[1].trim();
  if (!prelude || prelude.startsWith("@")) continue;
  for (const selector of prelude.split(",").map((value) => value.trim())) {
    if (!selector) continue;
    if (productionClass.test(selector)) {
      failures.push(`Production selector is forbidden: ${selector}`);
      continue;
    }
    const classNames = [...selector.matchAll(/\.([\w-]+)/g)].map((item) => item[1]);
    if (classNames.some((name) => !name.startsWith("mnx-catalogue-"))) {
      failures.push(`Non-catalogue class is forbidden: ${selector}`);
    }
    if (classNames.length === 0) {
      failures.push(`Unscoped selector is forbidden: ${selector}`);
    }
  }
}

if (failures.length > 0) {
  console.error("Catalogue style boundary failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Catalogue style boundary passed: layout CSS owns only .mnx-catalogue-* selectors.");
