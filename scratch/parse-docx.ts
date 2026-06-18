import * as fs from "fs";
import * as path from "path";

function extractTextFromXml(xmlPath: string): string {
  if (!fs.existsSync(xmlPath)) {
    return `File not found: ${xmlPath}`;
  }
  const xmlContent = fs.readFileSync(xmlPath, "utf-8");
  
  // Extract all text inside <w:t> tags
  const matches = xmlContent.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g);
  if (!matches) return "";
  
  return matches
    .map((match) => {
      const text = match.replace(/<w:t[^>]*>|<\/w:t>/g, "");
      // Decode HTML entities if any
      return text
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'");
    })
    .join("\n");
}

const doc2Text = extractTextFromXml("C:\\Users\\Purushothaman\\Music\\Doc2_extracted\\word\\document.xml");
const guideText = extractTextFromXml("C:\\Users\\Purushothaman\\Downloads\\Accounting_Software_Module_Guide_extracted\\word\\document.xml");

fs.writeFileSync("scratch/doc2-text.txt", doc2Text, "utf-8");
fs.writeFileSync("scratch/guide-text.txt", guideText, "utf-8");

console.log("Extraction complete!");
console.log("Doc2 text length:", doc2Text.length);
console.log("Guide text length:", guideText.length);
