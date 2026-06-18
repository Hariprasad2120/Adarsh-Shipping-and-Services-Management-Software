import * as fs from "fs";

const content = fs.readFileSync("prisma/schema.prisma", "utf8");
const matches = content.match(/model\s+(\w+)\s+\{/g);
if (matches) {
  console.log("Models found in schema.prisma:");
  matches.forEach((m) => {
    console.log(m.replace(/model\s+/, "").replace(/\s*\{/, ""));
  });
} else {
  console.log("No models found.");
}
