import * as fs from "fs";

function extract(filePath: string) {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");
  console.log(`\n=================== EXPORTS FROM ${filePath} ===================`);
  lines.forEach((line, idx) => {
    if (line.trim().startsWith("export async function") || line.trim().startsWith("export function")) {
      console.log(`${idx + 1}: ${line.trim()}`);
    }
  });
}

extract("src/modules/accounting/service.ts");
extract("src/modules/accounting/reports.ts");
