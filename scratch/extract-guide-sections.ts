import * as fs from "fs";

const content = fs.readFileSync("scratch/guide-text.txt", "utf-8");
const sections = [
  "CUSTOMER ACCOUNTS",
  "VENDOR ACCOUNTS",
  "BANKING",
  "ACCOUNTANT",
  "OTHERS",
  "REPORTS"
];

sections.forEach((section, idx) => {
  const startIdx = content.indexOf(section);
  if (startIdx === -1) return;
  
  const endIdx = idx < sections.length - 1 
    ? content.indexOf(sections[idx + 1]) 
    : content.length;
    
  const sectionContent = content.substring(startIdx, endIdx);
  
  // Log first 1500 chars of each section
  console.log(`\n=================== ${section} ===================`);
  console.log(sectionContent.substring(0, 1500) + "...\n");
});
