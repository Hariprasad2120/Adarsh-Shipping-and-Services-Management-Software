import * as fs from "fs";

const content = fs.readFileSync("prisma/schema.prisma", "utf8");
const regex = new RegExp(`model\\s+TimesheetJob\\s+\\{([\\s\\S]*?)\\}`, "g");
const match = regex.exec(content);
if (match) {
  console.log("TimesheetJob model fields:");
  console.log(match[1].trim());
} else {
  console.log("TimesheetJob not found.");
}
