import * as fs from "fs";

const content = fs.readFileSync("prisma/schema.prisma", "utf8");
const regex = new RegExp(`model\\s+Account\\s+\\{([\\s\\S]*?)\\}`, "g");
const match = regex.exec(content);
if (match) {
  console.log("Account model fields:");
  console.log(match[1].trim());
} else {
  console.log("Account not found.");
}
