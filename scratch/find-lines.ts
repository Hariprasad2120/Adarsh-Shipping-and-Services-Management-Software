import * as fs from "fs";

const content = fs.readFileSync("prisma/schema.prisma", "utf8");
const lines = content.split("\n");

const targets = ["Organisation", "Branch", "SalesInvoice", "PurchaseInvoice", "GeneralLedgerEntry"];

targets.forEach((target) => {
  const startIdx = lines.findIndex((line) => line.trim().startsWith(`model ${target} `));
  if (startIdx !== -1) {
    // find matching closing brace
    let endIdx = startIdx;
    let braceCount = 0;
    for (let i = startIdx; i < lines.length; i++) {
      if (lines[i].includes("{")) braceCount++;
      if (lines[i].includes("}")) braceCount--;
      if (braceCount === 0 && i > startIdx) {
        endIdx = i;
        break;
      }
    }
    console.log(`${target}: Lines ${startIdx + 1} to ${endIdx + 1}`);
  } else {
    console.log(`${target} not found`);
  }
});
