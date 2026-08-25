import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import * as XLSX from "xlsx";
import { z } from "zod";
import type { RateWorkflowSnapshot, StandardRateReference } from "../rate-workflow";
import { suggestCanonicalCharge } from "../rate-workflow";
import {
  detectStandardRateSignal,
  getApplicableStandardBuyRates,
  getStandardRateQuantityBasis,
  getStandardRateReferenceForLine,
  type StandardBuyRateRecord,
  type StandardRateSignal,
} from "./standard-buy-rates.service";

const execFileAsync = promisify(execFile);

type SourceDocument = {
  id: string;
  kind: "EMAIL_TEXT" | "EMAIL_HTML" | "ATTACHMENT";
  name: string;
  mimeType: string;
  text: string;
};

type AttachmentInput = {
  id: string;
  name: string;
  mimeType: string;
  content: Buffer;
};

type ParseReplyParams = {
  workflow: RateWorkflowSnapshot;
  receivedAt: string;
  messageId: string;
  threadId: string | null;
  vendorName: string;
  messageSubject: string;
  emailText: string;
  emailHtml: string;
  attachments: AttachmentInput[];
};

const parserLineSchema = z.object({
  originalDescription: z.string().trim().min(1).default("Not Provided"),
  canonicalChargeCode: z.string().trim().default(""),
  canonicalChargeName: z.string().trim().default(""),
  amount: z.union([z.number(), z.string()]).optional().default("Not Provided"),
  currency: z.string().trim().default("Not Provided"),
  unit: z.string().trim().default("Not Provided"),
  quantityBasis: z.string().trim().default("Not Provided"),
  quantity: z.string().trim().default("Not Provided"),
  containerText: z.string().trim().default("Not Provided"),
  minimumCharge: z.string().trim().default("Not Provided"),
  taxText: z.string().trim().default("Not Provided"),
  freeDaysText: z.string().trim().default("Not Provided"),
  inclusionStatus: z.enum(["INCLUDED", "EXCLUDED", "UNSPECIFIED"]).default("UNSPECIFIED"),
  notes: z.string().trim().default(""),
  sourceName: z.string().trim().default("Email body"),
  evidenceText: z.string().trim().default("Not Provided"),
  confidenceScore: z.number().min(0).max(1).default(0.35),
});

const parserResponseSchema = z.object({
  currency: z.string().trim().default("Not Provided"),
  validity: z.string().trim().default("Not Provided"),
  carrier: z.string().trim().default("Not Provided"),
  routing: z.string().trim().default("Not Provided"),
  transit: z.string().trim().default("Not Provided"),
  remarks: z.string().trim().default(""),
  lines: z.array(parserLineSchema).default([]),
});

type ParserStructuredLine = z.infer<typeof parserLineSchema>;
type ParserStructuredResponse = z.infer<typeof parserResponseSchema>;

export type ParsedAgentRateDraft = {
  receivedAt: string;
  currency: string;
  validity: string;
  carrier: string;
  routing: string;
  transit: string;
  remarks: string;
  standardRateSignal: StandardRateSignal;
  parserStatus: "AI_REVIEW_REQUIRED" | "AUTO_MAPPED";
  parserModel: string;
  overallConfidence: number;
  sources: Array<{
    id: string;
    name: string;
    kind: SourceDocument["kind"];
    mimeType: string;
  }>;
  warnings: string[];
  lines: Array<{
    id: string;
    canonicalChargeCode: string;
    canonicalChargeName: string;
    originalDescription: string;
    amount: number;
    amountSourceText: string | null;
    amountMissing: boolean;
    currency: string;
    unit: string;
    quantityBasis: string;
    quantityText: string | null;
    containerText: string | null;
    minimumCharge: string | null;
    taxText: string | null;
    freeDaysText: string | null;
    inclusionStatus: "INCLUDED" | "EXCLUDED" | "UNSPECIFIED";
    notes: string | null;
    confidenceScore: number;
    confidenceLabel: "HIGH" | "MEDIUM" | "LOW";
    reviewStatus: "REVIEW_REQUIRED" | "AUTO_MAPPED";
    standardRateReference: StandardRateReference | null;
    evidence: Array<{
      field: string;
      sourceType: SourceDocument["kind"];
      sourceName: string;
      excerpt: string;
      confidenceScore: number;
    }>;
    missingFields: string[];
  }>;
};

export async function parseAgentRateReply(
  params: ParseReplyParams,
): Promise<ParsedAgentRateDraft> {
  const extractedAttachments = await Promise.all(
    params.attachments.map(async (attachment) => ({
      id: attachment.id,
      kind: "ATTACHMENT" as const,
      name: attachment.name,
      mimeType: attachment.mimeType,
      text: await extractAttachmentText(attachment),
    })),
  );

  const sources: SourceDocument[] = [
    {
      id: "email-text",
      kind: "EMAIL_TEXT" as const,
      name: "Email body",
      mimeType: "text/plain",
      text: params.emailText.trim(),
    },
    {
      id: "email-html",
      kind: "EMAIL_HTML" as const,
      name: "Email HTML",
      mimeType: "text/html",
      text: htmlToText(params.emailHtml),
    },
    ...extractedAttachments.filter((attachment) => attachment.text.trim()),
  ].filter((entry) => entry.text.trim());

  const warnings: string[] = [];
  if (sources.length === 0) {
    warnings.push("No email or attachment text could be extracted from the reply.");
  }

  const aiResult = await tryAiExtraction(params, sources);
  if (!aiResult.ok && aiResult.warning) {
    warnings.push(aiResult.warning);
  }

  const structured =
    aiResult.data && aiResult.data.lines.length > 0
      ? aiResult.data
      : buildDeterministicFallback(params, sources);
  const standardRateSignal = detectStandardRateSignal(sources.map((source) => source.text));

  if (structured.lines.length === 0) {
    warnings.push("No rate lines were detected automatically. Review the reply manually.");
  }

  const normalizedLines = structured.lines.map((line, index) =>
    normalizeParsedLine(params.workflow, line, index),
  );
  const linesWithStandardMaster =
    standardRateSignal
      ? applyStandardMasterToLines({
          workflow: params.workflow,
          lines: normalizedLines,
          signal: standardRateSignal,
          receivedAt: params.receivedAt,
        })
      : normalizedLines;
  const overallConfidence =
    linesWithStandardMaster.length > 0
      ? linesWithStandardMaster.reduce((sum, line) => sum + line.confidenceScore, 0) /
        linesWithStandardMaster.length
      : 0.35;

  return {
    receivedAt: params.receivedAt,
    currency: normalizeNotProvided(structured.currency),
    validity: normalizeNotProvided(structured.validity),
    carrier: normalizeNotProvided(structured.carrier),
    routing: normalizeNotProvided(structured.routing),
    transit: normalizeNotProvided(structured.transit),
    remarks: structured.remarks.trim() || `Parsed from ${params.messageSubject}`,
    standardRateSignal,
    parserStatus: overallConfidence >= getHighConfidenceThreshold() ? "AUTO_MAPPED" : "AI_REVIEW_REQUIRED",
    parserModel: aiResult.model || "deterministic-fallback",
    overallConfidence,
    sources: sources.map((source) => ({
      id: source.id,
      name: source.name,
      kind: source.kind,
      mimeType: source.mimeType,
    })),
    warnings,
    lines: linesWithStandardMaster,
  };
}

async function tryAiExtraction(
  params: ParseReplyParams,
  sources: SourceDocument[],
): Promise<{
  ok: boolean;
  data: ParserStructuredResponse | null;
  model: string | null;
  warning: string | null;
}> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey || sources.length === 0) {
    return {
      ok: false,
      data: null,
      model: null,
      warning: apiKey ? null : "OPENAI_API_KEY is not configured, so the parser used deterministic fallback.",
    };
  }

  const promptPayload = buildAiSourceBundle(params, sources).slice(0, 18000);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.1,
        max_tokens: 2500,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You extract freight rate replies into structured JSON. Never invent missing amounts, currency, unit, validity, charge, tax, or container. If a value is missing, output the exact string 'Not Provided'. Only use values explicitly present in the provided email or attachment text. Return a JSON object with keys currency, validity, carrier, routing, transit, remarks, and lines. Each line must contain originalDescription, canonicalChargeCode, canonicalChargeName, amount, currency, unit, quantityBasis, quantity, containerText, minimumCharge, taxText, freeDaysText, inclusionStatus, notes, sourceName, evidenceText, confidenceScore.",
          },
          {
            role: "user",
            content: promptPayload,
          },
        ],
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const text = await response.text();
      return {
        ok: false,
        data: null,
        model: "gpt-4o-mini",
        warning: `AI parser request failed (${response.status}): ${text.slice(0, 160)}`,
      };
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);
    return {
      ok: true,
      data: parserResponseSchema.parse(parsed),
      model: "gpt-4o-mini",
      warning: null,
    };
  } catch (error) {
    return {
      ok: false,
      data: null,
      model: "gpt-4o-mini",
      warning: error instanceof Error ? error.message : "AI parser failed unexpectedly.",
    };
  }
}

function buildAiSourceBundle(params: ParseReplyParams, sources: SourceDocument[]) {
  return [
    `Vendor: ${params.vendorName}`,
    `Subject: ${params.messageSubject}`,
    `Received at: ${params.receivedAt}`,
    "",
    ...sources.map(
      (source) =>
        `[${source.kind}] ${source.name} (${source.mimeType})\n${source.text.slice(0, 6000)}`,
    ),
  ].join("\n\n");
}

function buildDeterministicFallback(
  params: ParseReplyParams,
  sources: SourceDocument[],
): ParserStructuredResponse {
  const mergedText = sources.map((source) => source.text).join("\n");
  const lines = sources.flatMap((source) => extractLinesFromText(source, params.workflow));
  return {
    currency: firstRegexMatch(mergedText, [
      /\b(INR|USD|EUR|AED|SGD)\b/i,
      /\bRs\.?\b/i,
      /\$/i,
    ]),
    validity: firstRegexGroup(mergedText, [
      /valid(?:ity)?\s*(?:until|till|up to|upto|:|-)?\s*([^\n.;]+)/i,
      /offer valid\s*([^\n.;]+)/i,
    ]),
    carrier: firstRegexGroup(mergedText, [
      /carrier\s*(?::|-)?\s*([^\n;]+)/i,
      /shipping line\s*(?::|-)?\s*([^\n;]+)/i,
      /airline\s*(?::|-)?\s*([^\n;]+)/i,
    ]),
    routing: firstRegexGroup(mergedText, [
      /routing\s*(?::|-)?\s*([^\n;]+)/i,
      /route\s*(?::|-)?\s*([^\n;]+)/i,
    ]),
    transit: firstRegexGroup(mergedText, [
      /transit(?:\s*time)?\s*(?::|-)?\s*([^\n;]+)/i,
      /tt\s*(?::|-)?\s*([^\n;]+)/i,
    ]),
    remarks: firstRegexGroup(mergedText, [
      /remarks?\s*(?::|-)?\s*([^\n]+)/i,
      /notes?\s*(?::|-)?\s*([^\n]+)/i,
    ]),
    lines,
  };
}

function extractLinesFromText(source: SourceDocument, workflow: RateWorkflowSnapshot) {
  const candidates = source.text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /[\d$]|rs\.?|inr|usd|eur|aed|sgd/i.test(line) && line.length > 3);

  return candidates
    .map((line): ParserStructuredLine => {
      const amountMatch = line.match(
        /(?:INR|USD|EUR|AED|SGD|Rs\.?|\$)?\s*([\d,]+(?:\.\d+)?)/i,
      );
      const amountValue = amountMatch?.[1] || "Not Provided";
      const description = line
        .replace(/(?:INR|USD|EUR|AED|SGD|Rs\.?|\$)?\s*[\d,]+(?:\.\d+)?/gi, " ")
        .replace(/\s+/g, " ")
        .replace(/[:=\-]+/g, " ")
        .trim();
      const suggested = suggestCanonicalCharge(workflow, description);

      return {
        originalDescription: description || "Not Provided",
        canonicalChargeCode: suggested?.code || "",
        canonicalChargeName: suggested?.name || "",
        amount: amountValue,
        currency: detectCurrency(line),
        unit: detectUnit(line),
        quantityBasis: detectQuantityBasis(line),
        quantity: firstRegexGroup(line, [/\bper\s+([^\s,;]+)/i, /\bqty\s*(?::|-)?\s*([^\s,;]+)/i]),
        containerText: firstRegexGroup(line, [/\b(20gp|40gp|40hc|20ft|40ft)\b/i]),
        minimumCharge: firstRegexGroup(line, [/minimum\s*(?::|-)?\s*([^\n;]+)/i, /min\.?\s*([^\n;]+)/i]),
        taxText: firstRegexGroup(line, [/\b(gst\s*\d+%?)\b/i, /\btax\s*(?::|-)?\s*([^\n;]+)/i]),
        freeDaysText: firstRegexGroup(line, [/free\s+days?\s*(?::|-)?\s*([^\n;]+)/i]),
        inclusionStatus: /\bincluded\b/i.test(line)
          ? ("INCLUDED" as const)
          : /\bexcluded\b/i.test(line)
            ? ("EXCLUDED" as const)
            : ("UNSPECIFIED" as const),
        notes: "",
        sourceName: source.name,
        evidenceText: line.slice(0, 240),
        confidenceScore: amountMatch ? 0.64 : 0.4,
      };
    })
    .filter((line) => line.originalDescription !== "Not Provided" || line.amount !== "Not Provided");
}

function normalizeParsedLine(
  workflow: RateWorkflowSnapshot,
  line: ParserStructuredLine,
  index: number,
): ParsedAgentRateDraft["lines"][number] {
  const originalDescription = normalizeNotProvided(line.originalDescription);
  const suggested = line.canonicalChargeCode
    ? {
        code: line.canonicalChargeCode.trim().toUpperCase(),
        name: line.canonicalChargeName.trim() || line.canonicalChargeCode.trim(),
      }
    : suggestCanonicalCharge(workflow, originalDescription);

  const confidenceScore = Math.min(1, Math.max(0, Number(line.confidenceScore) || 0.35));
  const confidenceLabel = classifyConfidence(confidenceScore);
  const amountText = normalizeNotProvided(String(line.amount ?? "Not Provided"));
  const amountMissing = amountText === "Not Provided";
  const missingFields = [
    originalDescription === "Not Provided" ? "charge" : null,
    amountMissing ? "amount" : null,
    normalizeNotProvided(line.currency) === "Not Provided" ? "currency" : null,
    normalizeNotProvided(line.unit) === "Not Provided" ? "unit" : null,
    normalizeNotProvided(line.taxText) === "Not Provided" ? "tax" : null,
    normalizeNotProvided(line.containerText) === "Not Provided" ? "container" : null,
  ].filter((value): value is string => Boolean(value));

  return {
    id: `parsed:${index + 1}:${createHash("sha1").update(`${originalDescription}:${line.evidenceText}`).digest("hex").slice(0, 10)}`,
    canonicalChargeCode: suggested?.code || "UNMAPPED_CHARGE",
    canonicalChargeName: suggested?.name || originalDescription,
    originalDescription,
    amount: amountMissing ? 0 : Number(amountText.replace(/,/g, "")) || 0,
    amountSourceText: amountText === "Not Provided" ? null : amountText,
    amountMissing,
    currency: normalizeNotProvided(line.currency),
    unit: normalizeNotProvided(line.unit),
    quantityBasis: normalizeNotProvided(line.quantityBasis),
    quantityText: toOptionalString(line.quantity),
    containerText: toOptionalString(line.containerText),
    minimumCharge: toOptionalString(line.minimumCharge),
    taxText: toOptionalString(line.taxText),
    freeDaysText: toOptionalString(line.freeDaysText),
    inclusionStatus: line.inclusionStatus,
    notes: toOptionalString(line.notes),
    confidenceScore,
    confidenceLabel,
    reviewStatus:
      confidenceScore >= getHighConfidenceThreshold() && missingFields.length === 0
        ? "AUTO_MAPPED"
        : "REVIEW_REQUIRED",
    standardRateReference: null,
    evidence: [
      {
        field: "rate-line",
        sourceType: line.sourceName === "Email body" ? "EMAIL_TEXT" : "ATTACHMENT",
        sourceName: line.sourceName,
        excerpt: normalizeNotProvided(line.evidenceText),
        confidenceScore,
      },
    ],
    missingFields,
  };
}

function applyStandardMasterToLines(params: {
  workflow: RateWorkflowSnapshot;
  lines: ParsedAgentRateDraft["lines"];
  signal: Exclude<StandardRateSignal, null>;
  receivedAt: string;
}) {
  const { workflow, lines, signal, receivedAt } = params;
  const applicableRates = getApplicableStandardBuyRates({
    workflow,
    asOfDate: receivedAt,
  });
  const remaining = [...applicableRates];

  const nextLines: ParsedAgentRateDraft["lines"] = lines.map((line) => {
    const standardReference = getStandardRateReferenceForLine({
      workflow,
      canonicalChargeCode: line.canonicalChargeCode,
      containerText: line.containerText,
      asOfDate: receivedAt,
    });
    if (!standardReference) {
      return line;
    }

    const reference = buildStandardReference(standardReference, signal, !line.amountMissing);
    const index = remaining.findIndex((entry) => entry.id === standardReference.id);
    if (index >= 0) {
      remaining.splice(index, 1);
    }

    if (line.amountMissing) {
      return {
        ...line,
        amount: standardReference.rate,
        amountSourceText: `${standardReference.rate}`,
        amountMissing: false,
        currency: standardReference.currency,
        unit: standardReference.unit,
        quantityBasis:
          line.quantityBasis === "Not Provided"
            ? getStandardRateQuantityBasis(standardReference)
            : line.quantityBasis,
        confidenceScore: Math.max(line.confidenceScore, 0.72),
        confidenceLabel: classifyConfidence(Math.max(line.confidenceScore, 0.72)),
        standardRateReference: reference,
        evidence: [
          ...line.evidence,
          {
            field: "standard-master",
            sourceType: "ATTACHMENT" as const,
            sourceName: standardReference.sourceDocument,
            excerpt: standardReference.sourceExcerpt,
            confidenceScore: 0.72,
          },
        ],
        missingFields: line.missingFields.filter(
          (entry) => entry !== "amount" && entry !== "currency" && entry !== "unit",
        ),
      };
    }

    return {
      ...line,
      standardRateReference: reference,
    };
  });

  for (const record of remaining) {
    nextLines.push({
      id: `standard:${record.id}`,
      canonicalChargeCode: record.canonicalChargeCode,
      canonicalChargeName: record.canonicalChargeName,
      originalDescription: record.canonicalChargeName,
      amount: record.rate,
      amountSourceText: `${record.rate}`,
      amountMissing: false,
      currency: record.currency,
      unit: record.unit,
      quantityBasis: getStandardRateQuantityBasis(record),
      quantityText: null,
      containerText: record.containerType,
      minimumCharge: null,
      taxText: null,
      freeDaysText: null,
      inclusionStatus: "UNSPECIFIED",
      notes: `Applied from standard master (${signal === "AS_AGREED" ? "as agreed" : "standard charges applicable"}).`,
      confidenceScore: 0.72,
      confidenceLabel: "MEDIUM",
      reviewStatus: "REVIEW_REQUIRED",
      standardRateReference: buildStandardReference(record, signal, false),
      evidence: [
        {
          field: "standard-master",
          sourceType: "ATTACHMENT" as const,
          sourceName: record.sourceDocument,
          excerpt: record.sourceExcerpt,
          confidenceScore: 0.72,
        },
      ],
      missingFields: [],
    });
  }

  return nextLines;
}

function buildStandardReference(
  record: StandardBuyRateRecord,
  signal: Exclude<StandardRateSignal, null>,
  explicitAgentOverride: boolean,
): StandardRateReference {
  return {
    id: record.id,
    canonicalChargeCode: record.canonicalChargeCode,
    canonicalChargeName: record.canonicalChargeName,
    currency: record.currency,
    unit: record.unit,
    rate: record.rate,
    effectiveFrom: record.effectiveFrom,
    effectiveTo: record.effectiveTo,
    branch: record.branch,
    revision: record.revision,
    containerType: record.containerType,
    sourceDocument: record.sourceDocument,
    sourceExcerpt: record.sourceExcerpt,
    appliedReason: signal,
    explicitAgentOverride,
  };
}

async function extractAttachmentText(attachment: AttachmentInput) {
  const lowerName = attachment.name.toLowerCase();
  const mimeType = attachment.mimeType.toLowerCase();

  if (
    mimeType.startsWith("text/") ||
    lowerName.endsWith(".txt") ||
    lowerName.endsWith(".csv")
  ) {
    return attachment.content.toString("utf8");
  }

  if (mimeType.includes("html") || lowerName.endsWith(".html") || lowerName.endsWith(".htm")) {
    return htmlToText(attachment.content.toString("utf8"));
  }

  if (
    lowerName.endsWith(".xlsx") ||
    lowerName.endsWith(".xls") ||
    mimeType.includes("spreadsheet") ||
    mimeType.includes("excel")
  ) {
    return extractSpreadsheetText(attachment.content);
  }

  if (
    lowerName.endsWith(".docx") ||
    mimeType.includes("wordprocessingml.document")
  ) {
    return extractDocxText(attachment.content, attachment.name);
  }

  if (lowerName.endsWith(".pdf") || mimeType === "application/pdf") {
    return extractPdfText(attachment.content, attachment.name);
  }

  return attachment.content.toString("utf8");
}

function extractSpreadsheetText(content: Buffer) {
  const workbook = XLSX.read(content, { type: "buffer" });
  return workbook.SheetNames.map((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return "";
    const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false });
    return `Sheet: ${sheetName}\n${csv}`;
  })
    .filter(Boolean)
    .join("\n\n");
}

async function extractDocxText(content: Buffer, fileName: string) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "crm-rate-docx-"));
  const docxPath = path.join(tempDir, fileName);

  try {
    await fs.writeFile(docxPath, content);
    const scriptPath = path.join(process.cwd(), "scripts", "read-docx-template.ps1");
    const { stdout } = await execFileAsync("powershell.exe", [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      scriptPath,
      "-docxPath",
      docxPath,
    ]);
    const payload = JSON.parse(stdout) as { ok?: boolean; text?: string };
    return payload.text?.trim() || "";
  } catch {
    return content.toString("utf8");
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

async function extractPdfText(content: Buffer, fileName: string) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "crm-rate-pdf-"));
  const pdfPath = path.join(tempDir, fileName);
  const txtPath = path.join(tempDir, `${fileName}.txt`);

  try {
    await fs.writeFile(pdfPath, content);
    await execFileAsync("pdftotext", ["-layout", pdfPath, txtPath]);
    return await fs.readFile(txtPath, "utf8");
  } catch {
    return fallbackPdfStringExtraction(content);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

function fallbackPdfStringExtraction(content: Buffer) {
  return content
    .toString("latin1")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, " ")
    .split(/\s{2,}/)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 3)
    .join("\n")
    .slice(0, 12000);
}

function htmlToText(value: string) {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function detectCurrency(value: string) {
  if (/\bUSD\b|\$/i.test(value)) return "USD";
  if (/\bEUR\b/i.test(value)) return "EUR";
  if (/\bAED\b/i.test(value)) return "AED";
  if (/\bSGD\b/i.test(value)) return "SGD";
  if (/\bINR\b|Rs\.?/i.test(value)) return "INR";
  return "Not Provided";
}

function detectUnit(value: string) {
  if (/\bkg\b/i.test(value)) return "KG";
  if (/\bwm\b|w\/m/i.test(value)) return "WM";
  if (/\bbl\b|b\/l/i.test(value)) return "BL";
  if (/\bcontainer\b|\b20gp\b|\b40gp\b|\b40hc\b/i.test(value)) return "CONTAINER";
  if (/\bshipment\b/i.test(value)) return "SHIPMENT";
  return "Not Provided";
}

function detectQuantityBasis(value: string) {
  if (/\bper\s+kg\b/i.test(value)) return "Per kg";
  if (/\bper\s+wm\b|\bw\/m\b/i.test(value)) return "Per W/M";
  if (/\bper\s+bl\b/i.test(value)) return "Per BL";
  if (/\bper\s+container\b|\b20gp\b|\b40gp\b|\b40hc\b/i.test(value)) return "Per container";
  if (/\bper\s+shipment\b/i.test(value)) return "Per shipment";
  return "Not Provided";
}

function firstRegexMatch(value: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match?.[0]) {
      return normalizeNotProvided(match[0]);
    }
  }
  return "Not Provided";
}

function firstRegexGroup(value: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match?.[1]) {
      return normalizeNotProvided(match[1]);
    }
  }
  return "Not Provided";
}

function normalizeNotProvided(value: string | null | undefined) {
  const normalized = String(value ?? "").trim();
  return normalized || "Not Provided";
}

function toOptionalString(value: string | null | undefined) {
  const normalized = normalizeNotProvided(value);
  return normalized === "Not Provided" ? null : normalized;
}

function classifyConfidence(score: number) {
  if (score >= getHighConfidenceThreshold()) return "HIGH" as const;
  if (score >= getMediumConfidenceThreshold()) return "MEDIUM" as const;
  return "LOW" as const;
}

function getHighConfidenceThreshold() {
  const parsed = Number(process.env.CRM_RATE_PARSER_HIGH_CONFIDENCE ?? "0.85");
  return Number.isFinite(parsed) ? parsed : 0.85;
}

function getMediumConfidenceThreshold() {
  const parsed = Number(process.env.CRM_RATE_PARSER_MEDIUM_CONFIDENCE ?? "0.6");
  return Number.isFinite(parsed) ? parsed : 0.6;
}
