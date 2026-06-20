import { chromium } from "playwright";
import * as fs from "fs";
import * as path from "path";

async function analyzeImage(imagePath: string) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Read image as base64
  const data = fs.readFileSync(imagePath).toString("base64");
  const dataUrl = `data:image/png;base64,${data}`;

  const colors = await page.evaluate(async (url) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve({ error: "No context" });
        ctx.drawImage(img, 0, 0);

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        
        // Count color occurrences
        const colorCounts: Record<string, number> = {};
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i+1];
          const b = data[i+2];
          const a = data[i+3];
          if (a === 0) continue; // skip transparent
          
          const rgb = `${r},${g},${b}`;
          colorCounts[rgb] = (colorCounts[rgb] || 0) + 1;
        }

        // Sort colors by occurrence
        const sorted = Object.entries(colorCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 30);

        // Also check sample points around the center to see the icon color specifically
        // Find non-background colors in the middle
        const midX = Math.floor(canvas.width / 2);
        const midY = Math.floor(canvas.height / 2);
        
        const samplePoints: Record<string, string> = {};
        for (let dy = -15; dy <= 15; dy += 2) {
          for (let dx = -15; dx <= 15; dx += 2) {
            const px = midX + dx;
            const py = midY + dy;
            if (px >= 0 && px < canvas.width && py >= 0 && py < canvas.height) {
              const idx = (py * canvas.width + px) * 4;
              const r = data[idx];
              const g = data[idx+1];
              const b = data[idx+2];
              const hex = "#" + [r, g, b].map(x => x.toString(16).padStart(2, "0")).join("");
              samplePoints[`${dx},${dy}`] = hex;
            }
          }
        }

        resolve({ sorted, samplePoints });
      };
      img.src = url;
    });
  }, dataUrl);

  await browser.close();
  return colors;
}

async function main() {
  const img1 = "C:\\Users\\SilverCloud\\.gemini\\antigravity-ide\\brain\\565f4346-0834-4f59-9b7d-b100a4d08717\\media__1781929783687.png";
  const img2 = "C:\\Users\\SilverCloud\\.gemini\\antigravity-ide\\brain\\565f4346-0834-4f59-9b7d-b100a4d08717\\media__1781930128073.png";

  console.log("Analyzing Image 1 (Before):");
  const res1: any = await analyzeImage(img1);
  console.log("Top 5 dominant colors (RGB):");
  res1.sorted.slice(0, 5).forEach(([rgb, count]: any) => {
    const parts = rgb.split(",").map(Number);
    const hex = "#" + parts.map((x: any) => x.toString(16).padStart(2, "0")).join("");
    console.log(`  ${rgb} (${hex}): ${count} pixels`);
  });

  console.log("\nAnalyzing Image 2 (After):");
  const res2: any = await analyzeImage(img2);
  console.log("Top 5 dominant colors (RGB):");
  res2.sorted.slice(0, 5).forEach(([rgb, count]: any) => {
    const parts = rgb.split(",").map(Number);
    const hex = "#" + parts.map((x: any) => x.toString(16).padStart(2, "0")).join("");
    console.log(`  ${rgb} (${hex}): ${count} pixels`);
  });

  // Let's look at the icon color (usually a darker color in the middle region)
  console.log("\nSample colors in center area of Image 2 (After):");
  const counts: Record<string, number> = {};
  Object.values(res2.samplePoints).forEach((hex: any) => {
    counts[hex] = (counts[hex] || 0) + 1;
  });
  console.log(counts);
}

main().catch(console.error);
