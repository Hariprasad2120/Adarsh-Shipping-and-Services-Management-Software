import fs from "node:fs";
import path from "node:path";
import postcss from "postcss";

const root = process.cwd();
const systemFile = path.join(root, "src/styles/monolith-system.css");
const systemRoot = postcss.parse(fs.readFileSync(systemFile, "utf8"), {
  from: systemFile,
});
const moduleTargets = {
  cha: "cha.css",
  accounting: "accounting.css",
  crm: "crm.css",
  people: "people.css",
  performance: "performance.css",
  communication: "communication-admin.css",
  admin: "communication-admin.css",
};
const moved = new Map();
let removedCatalogueRules = 0;

function wrappedRule(rule) {
  let output = rule.toString();
  let parent = rule.parent;
  while (parent && parent.type !== "root") {
    if (parent.type === "atrule") {
      output = `@${parent.name}${parent.params ? ` ${parent.params}` : ""} {\n${output}\n}`;
    }
    parent = parent.parent;
  }
  return output;
}

systemRoot.walkRules((rule) => {
  if (rule.selector.includes(".mnx-catalogue-")) {
    removedCatalogueRules += 1;
    rule.remove();
    return;
  }

  const moduleMatch = rule.selector.match(
    /\.mnx-(cha|accounting|crm|people|performance|communication|admin)-/,
  );
  if (!moduleMatch) return;
  const target = moduleTargets[moduleMatch[1]];
  const rules = moved.get(target) ?? [];
  rules.push(wrappedRule(rule));
  moved.set(target, rules);
  rule.remove();
});

let removedEmpty = true;
while (removedEmpty) {
  removedEmpty = false;
  systemRoot.walkAtRules((atRule) => {
    if (atRule.nodes?.length === 0) {
      atRule.remove();
      removedEmpty = true;
    }
  });
}

fs.writeFileSync(systemFile, systemRoot.toString());
for (const [target, rules] of moved) {
  const targetFile = path.join(root, "src/styles/modules", target);
  fs.appendFileSync(
    targetFile,
    `\n/* Ownership corrections moved from the shared stylesheet. */\n${rules.join("\n\n")}\n`,
  );
}

console.log(
  `Removed ${removedCatalogueRules} obsolete catalogue rules and moved ${[...moved.values()].reduce((sum, rules) => sum + rules.length, 0)} module rules.`,
);
