import * as fs from "fs";

const raw = fs.readFileSync("scratch/guide-text.txt", "utf8");
const clean = raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").replace(/([0-9]+\.\s+[A-Za-z])/g, "\n\n$1");
fs.writeFileSync("scratch/clean-guide-text.txt", clean, "utf8");
console.log("Cleaned guide text written to scratch/clean-guide-text.txt");
