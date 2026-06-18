import * as fs from "fs";
import * as path from "path";

function searchDir(dir: string) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== "node_modules" && file !== ".git" && file !== ".next") {
        searchDir(fullPath);
      }
    } else if (file.endsWith(".ts") || file.endsWith(".tsx")) {
      const content = fs.readFileSync(fullPath, "utf8");
      if (content.includes("glEntries") || content.includes("generalLedger")) {
        // Look for references like .journalEntry or journalEntry
        if (content.includes("journalEntry") && (content.includes("include") || content.includes("select"))) {
          console.log(`Found reference in ${fullPath}`);
        }
      }
    }
  }
}

searchDir("src");
