import * as fs from "fs";

const content = fs.readFileSync("src/modules/accounting/service.ts", "utf8");
const lines = content.split("\n");

lines.forEach((line, idx) => {
  if (line.includes("generalLedgerEntry.create")) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
