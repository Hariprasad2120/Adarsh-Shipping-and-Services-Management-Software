import * as fs from "fs";
import * as path from "path";

const txtFolder = "C:\\Users\\SilverCloud\\Documents\\monolith-engine\\import-output\\letters\\Letter Formats\\extracted_txt";

const files = fs.readdirSync(txtFolder).filter(f => f.endsWith(".txt") && !f.includes("00_Template_Usage_Guide"));

for (const file of files) {
  const content = fs.readFileSync(path.join(txtFolder, file), "utf8");
  const variables = Array.from(content.matchAll(/\{\{([a-zA-Z0-9_]+)\}\}/g)).map(m => m[1]);
  const uniqueVars = Array.from(new Set(variables));
  console.log(`FILE: ${file}`);
  console.log(`UNIQUE VARIABLES:`, uniqueVars);
  console.log(`CONTENT LENGTH:`, content.length);
  console.log("-----------------------------------------");
}
