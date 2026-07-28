import { contentDisposition } from "@/lib/security";

const ONE_PIXEL_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

function escapePdfText(value: string) {
  return value
    .replace(/[^\x20-\x7E]/g, "?")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function padPdfOffset(offset: number) {
  return offset.toString().padStart(10, "0");
}

export function createPreviewPdfBuffer(params: {
  title: string;
  detail: string;
  sizeBytes?: number | null;
}) {
  const lines = [
    params.title,
    params.detail,
    params.sizeBytes && params.sizeBytes > 0 ? `Size: ${(params.sizeBytes / 1024).toFixed(1)} KB` : null,
  ].filter((line): line is string => Boolean(line));

  const textCommands = lines
    .map((line, index) => `${index === 0 ? "" : "0 -22 Td\n"}(${escapePdfText(line)}) Tj`)
    .join("\n");
  const stream = `BT\n/F1 14 Tf\n50 760 Td\n${textCommands}\nET`;

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 595 842] /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  offsets.slice(1).forEach((offset) => {
    pdf += `${padPdfOffset(offset)} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, "utf8");
}

function wrapPdfLine(line: string, maxChars: number) {
  const words = line.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  if (words.length === 0) return [""];
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export function createTextPdfBuffer(params: {
  title: string;
  subtitle?: string;
  lines: string[];
}) {
  const normalizedLines = [
    params.title,
    params.subtitle || null,
    "",
    ...params.lines,
  ].filter((line): line is string => line !== null);
  const wrappedLines = normalizedLines.flatMap((line) => {
    if (!line.trim()) return [""];
    const isHeading = /^[A-Z0-9][A-Z0-9 /&().:-]+$/.test(line.trim()) && line.length < 90;
    return wrapPdfLine(line, isHeading ? 58 : 86);
  });

  const linesPerPage = 44;
  const pages: string[][] = [];
  for (let i = 0; i < wrappedLines.length; i += linesPerPage) {
    pages.push(wrappedLines.slice(i, i + linesPerPage));
  }
  if (pages.length === 0) pages.push([""]);

  const pageObjectNumbers: number[] = [];
  const objects: string[] = ["", ""];
  const fontObjectNumber = pages.length * 2 + 3;

  pages.forEach((pageLines, pageIndex) => {
    const pageObjectNumber = 3 + pageIndex * 2;
    const contentObjectNumber = pageObjectNumber + 1;
    pageObjectNumbers.push(pageObjectNumber);

    const textCommands = pageLines
      .map((line, lineIndex) => {
        const trimmed = line.trim();
        const fontSize = lineIndex === 0 && pageIndex === 0 ? 17 : /^[A-Z0-9][A-Z0-9 /&().:-]+$/.test(trimmed) && trimmed.length < 90 ? 11 : 9;
        const leading = lineIndex === 0 ? 0 : -15;
        return `${lineIndex === 0 ? "" : `0 ${leading} Td\n`}/F1 ${fontSize} Tf\n(${escapePdfText(trimmed)}) Tj`;
      })
      .join("\n");
    const footer = `BT\n/F1 8 Tf\n50 38 Td\n(${escapePdfText(`Page ${pageIndex + 1} of ${pages.length}`)}) Tj\nET`;
    const stream = `BT\n50 800 Td\n${textCommands}\nET\n${footer}`;
    objects[pageObjectNumber - 1] =
      `<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 ${fontObjectNumber} 0 R >> >> /MediaBox [0 0 595 842] /Contents ${contentObjectNumber} 0 R >>`;
    objects[contentObjectNumber - 1] = `<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream`;
  });

  objects[0] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[1] = `<< /Type /Pages /Kids [${pageObjectNumbers.map((num) => `${num} 0 R`).join(" ")}] /Count ${pages.length} >>`;
  objects[fontObjectNumber - 1] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  offsets.slice(1).forEach((offset) => {
    pdf += `${padPdfOffset(offset)} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, "utf8");
}

export function createPlaceholderImageBuffer() {
  return Buffer.from(ONE_PIXEL_PNG_BASE64, "base64");
}

export function createFileResponseHeaders(params: {
  filename: string;
  mimeType: string;
  contentLength: number;
  forceDownload: boolean;
}) {
  const headers = new Headers();
  headers.set("Content-Type", params.mimeType);
  headers.set("Content-Length", params.contentLength.toString());
  headers.set("Content-Security-Policy", "default-src 'self'; frame-ancestors 'self';");
  headers.set("X-Frame-Options", "SAMEORIGIN");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Content-Disposition", contentDisposition(params.filename, params.forceDownload ? "attachment" : "inline"));
  return headers;
}
