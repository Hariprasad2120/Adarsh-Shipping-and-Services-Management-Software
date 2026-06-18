import * as fs from "fs";

const content = fs.readFileSync("prisma/schema.prisma", "utf8");
const lines = content.split("\n");

lines.forEach((line, idx) => {
  if (line.includes("recurringJournals") || line.includes("partnerAccounts")) {
    console.log(`${idx + 1}: ${line}`);
  }
});
