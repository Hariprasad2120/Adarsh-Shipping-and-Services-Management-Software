import "dotenv/config";
import * as fs from "fs";

async function main() {
  const schema = fs.readFileSync("prisma/schema.prisma", "utf8");
  const lines = schema.split("\n");
  const startIndex = lines.findIndex(l => l.includes("model ChaAuditLog"));
  if (startIndex !== -1) {
    console.log(lines.slice(startIndex, startIndex + 25).join("\n"));
  } else {
    console.log("Model ChaAuditLog not found in schema");
  }
  process.exit(0);
}

main();
