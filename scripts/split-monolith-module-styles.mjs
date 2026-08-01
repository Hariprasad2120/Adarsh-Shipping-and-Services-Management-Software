import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const sourceFile = path.join(root, "src/styles/monolith-system.css");
const source = fs.readFileSync(sourceFile, "utf8").replaceAll("\r\n", "\n");
const markers = [
  {
    marker: "/* Communication and administration workspaces */",
    file: "communication-admin.css",
    owner: "Communication and Admin",
  },
  {
    marker: "/* Customs House Agent and Expense operations */",
    file: "cha-expense.css",
    owner: "CHA and Expense",
  },
  {
    marker: "/* Accounting operations */",
    file: "accounting.css",
    owner: "Accounting",
  },
  {
    marker: "/* People operations: HRMS and Attendance */",
    file: "people.css",
    owner: "HRMS and Attendance",
  },
  {
    marker: "/* Performance and learning operations: AMS and LMS */",
    file: "performance.css",
    owner: "AMS and LMS",
  },
  {
    marker: "/* CRM workspace */",
    file: "crm.css",
    owner: "CRM",
  },
].map((entry) => ({ ...entry, index: source.indexOf(entry.marker) }));

if (markers.some((entry) => entry.index < 0)) {
  throw new Error("Cannot split module styles: one or more ownership markers are missing.");
}

const moduleDirectory = path.join(root, "src/styles/modules");
fs.mkdirSync(moduleDirectory, { recursive: true });

for (let index = 0; index < markers.length; index += 1) {
  const entry = markers[index];
  const end = markers[index + 1]?.index ?? source.length;
  const body = source.slice(entry.index, end).trim();
  const header = `/*\n * ${entry.owner} module composition styles.\n * Shared primitives remain owned by monolith-system.css.\n */\n\n`;
  fs.writeFileSync(path.join(moduleDirectory, entry.file), `${header}${body}\n`);
}

fs.writeFileSync(sourceFile, `${source.slice(0, markers[0].index).trimEnd()}\n`);
console.log(`Split ${markers.length} module style owners from monolith-system.css.`);
