import * as fs from "fs";

const content = fs.readFileSync("scratch/guide-text.txt", "utf-8");
const lines = content.split("\n");

console.log("=== HEADINGS AND SUBHEADINGS ===");
lines.forEach((line, index) => {
  const trimmed = line.trim();
  if (trimmed.includes("<w:") || trimmed.includes("<pic:")) return;
  // Match lines that are all uppercase, not empty, and length > 3
  const isAllCaps = trimmed === trimmed.toUpperCase() && trimmed.length > 3;
  // Match lines starting with a number followed by a dot, like "1. Customer Data"
  const isNumbered = /^\d+\.\s+[A-Za-z]/.test(trimmed);
  if (isAllCaps || isNumbered) {
    console.log(`Line ${index + 1}: ${trimmed}`);
  }
});
