import * as fs from "fs";
import * as path from "path";
import * as XLSX from "xlsx";

const dirPath = "C:\\Users\\Purushothaman\\Downloads\\zohotoerpmigration";
const files = [
  "Bill.xlsx",
  "Contacts.xlsx",
  "Customer_Payment.xlsx",
  "Journal (1).xlsx",
  "Sales.xlsx",
  "Vendor_Payment.xlsx",
  "Vendors (2).xlsx"
];

let report = "Excel Inspection Report:\n\n";

files.forEach((file) => {
  const filePath = path.join(dirPath, file);
  if (!fs.existsSync(filePath)) {
    report += `File not found: ${file}\n\n`;
    return;
  }
  
  const workbook = XLSX.readFile(filePath);
  report += `File: ${file}\n`;
  report += `Sheets: ${workbook.SheetNames.join(", ")}\n`;
  
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
  
  if (data.length > 0) {
    report += `Columns (First Row): ${JSON.stringify(data[0])}\n`;
    report += `Row Count: ${data.length}\n`;
    if (data.length > 1) {
      report += `Sample Row 2: ${JSON.stringify(data[1])}\n`;
    }
  } else {
    report += `No data found in first sheet.\n`;
  }
  report += "\n--------------------------------------------------\n\n";
});

fs.writeFileSync("scratch/xlsx-inspection.txt", report, "utf-8");
console.log("Inspection complete! Logged to scratch/xlsx-inspection.txt");
