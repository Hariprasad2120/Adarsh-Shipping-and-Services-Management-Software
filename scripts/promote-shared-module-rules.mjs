import fs from "node:fs";
import path from "node:path";
import postcss from "postcss";

const root = process.cwd();
const systemFile = path.join(root, "src/styles/monolith-system.css");
const peopleFile = path.join(root, "src/styles/modules/people.css");
const system = postcss.parse(fs.readFileSync(systemFile, "utf8"), { from: systemFile });
const people = postcss.parse(fs.readFileSync(peopleFile, "utf8"), { from: peopleFile });
const sharedClass =
  /\.mnx-(?:card-(?:header|content|title)|select-(?:shell|trigger|content|item)|choice-control|managed-input|numeric|accent-(?:edge|warning)|form-section|content-wide|icon-badge|interactive-surface|row-link|state-spinner|title-[123])\b/;
let promoted = 0;

function appendAtRoot(rule) {
  const atRules = [];
  let parent = rule.parent;
  while (parent && parent.type !== "root") {
    if (parent.type === "atrule") atRules.unshift(parent);
    parent = parent.parent;
  }
  if (atRules.length === 0) {
    let existing = null;
    system.walkRules((candidate) => {
      if (!existing && candidate.parent?.type === "root" && candidate.selector === rule.selector) {
        existing = candidate;
      }
    });
    if (existing) {
      for (const node of rule.nodes ?? []) existing.append(node.clone());
    } else {
      system.append(rule.clone());
    }
    return;
  }

  let container = null;
  for (const atRule of atRules) {
    const clone = postcss.atRule({ name: atRule.name, params: atRule.params });
    if (container) container.append(clone);
    else system.append(clone);
    container = clone;
  }
  container.append(rule.clone());
}

people.walkRules((rule) => {
  if (!sharedClass.test(rule.selector)) return;
  appendAtRoot(rule);
  rule.remove();
  promoted += 1;
});

people.walkAtRules((atRule) => {
  if (atRule.nodes?.length === 0) atRule.remove();
});

fs.writeFileSync(systemFile, system.toString());
fs.writeFileSync(peopleFile, people.toString());
console.log(`Promoted ${promoted} shared rules from people.css to monolith-system.css.`);
