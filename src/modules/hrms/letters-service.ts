/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from "@/lib/db";
import { exec } from "child_process";
import * as path from "path";
import * as fs from "fs";
import { promisify } from "util";
import { createNotification } from "@/modules/notifications/service";
import {
  getBundledDocxTemplateFiles,
  importDocxTemplateFile,
  saveEditorHtmlAsDocx,
} from "@/modules/hrms/letter-template-import";
import {
  ImportedLetterTemplate,
  LetterFieldSchema,
  LetterTemplateEditorDocument,
} from "@/modules/hrms/letter-template-types";

const execAsync = promisify(exec);

function parseStoredJson<T>(value: unknown, fallback: T): T {
  if (!value) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
}

function resolvePublicPath(input: string | null | undefined) {
  if (!input) return null;
  return path.isAbsolute(input) ? input : path.join(process.cwd(), "public", input.replace(/^\//, ""));
}

function stripHtmlToText(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h1|h2|h3|h4|li|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function serializeTemplate(template: any) {
  return {
    ...template,
    variables: parseStoredJson<string[]>(template.variables, []),
    fieldSchema: parseStoredJson<LetterFieldSchema[]>(template.fieldSchema, []),
    editorDocument: parseStoredJson<LetterTemplateEditorDocument>(template.editorDocument, { html: template.previewHtml || "" }),
  };
}

function numberToWords(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "zero";
  const belowTwenty = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
  const tens = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
  const units = [
    { value: 10000000, label: "crore" },
    { value: 100000, label: "lakh" },
    { value: 1000, label: "thousand" },
    { value: 100, label: "hundred" },
  ];

  const toWords = (n: number): string => {
    if (n < 20) return belowTwenty[n];
    if (n < 100) return `${tens[Math.floor(n / 10)]}${n % 10 ? ` ${belowTwenty[n % 10]}` : ""}`;
    for (const unit of units) {
      if (n >= unit.value) {
        const quotient = Math.floor(n / unit.value);
        const remainder = n % unit.value;
        const prefix = `${toWords(quotient)} ${unit.label}`;
        return remainder ? `${prefix} ${toWords(remainder)}` : prefix;
      }
    }
    return "";
  };

  return toWords(Math.round(value)).trim();
}

// Formatting Helpers
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

export function maskAadhaar(aadhaar: string | null | undefined): string {
  if (!aadhaar) return "";
  const cleaned = aadhaar.replace(/\s/g, "");
  if (cleaned.length < 4) return "****";
  return `XXXX-XXXX-${cleaned.slice(-4)}`;
}

// ─── Templates Service ────────────────────────────────────────────────────────

export async function getHRLetterTemplates(orgId: string) {
  const rows = await db.hRLetterTemplate.findMany({
    where: { orgId },
    orderBy: [{ name: "asc" }, { version: "desc" }],
  });
  return rows.map(serializeTemplate);
}

export async function getHRLetterTemplateById(id: string, orgId: string) {
  const template = await db.hRLetterTemplate.findFirst({
    where: { id, orgId },
  });
  return template ? serializeTemplate(template) : null;
}

export async function createHRLetterTemplate(orgId: string, data: {
  name: string;
  type: string;
  content: string;
  variables: string[];
  sourceDocxPath?: string;
  previewHtml?: string;
  fieldSchema?: LetterFieldSchema[];
  editorDocument?: LetterTemplateEditorDocument;
  sourceFileName?: string;
}) {
  return db.hRLetterTemplate.create({
    data: {
      orgId,
      name: data.name,
      type: data.type,
      content: data.content,
      variables: data.variables,
      sourceDocxPath: data.sourceDocxPath,
      previewHtml: data.previewHtml,
      fieldSchema: data.fieldSchema,
      editorDocument: data.editorDocument,
      sourceFileName: data.sourceFileName,
      isActive: false,
      isLegalReviewed: false,
      version: 1,
    },
  });
}

export async function replaceHRLetterTemplatesFromImports(orgId: string, imported: ImportedLetterTemplate[]) {
  await db.hRLetterTemplate.deleteMany({ where: { orgId } });
  for (const template of imported) {
    await db.hRLetterTemplate.create({
      data: {
        orgId,
        name: template.name,
        type: template.type,
        content: template.content,
        variables: template.variables,
        sourceDocxPath: template.sourceDocxPath,
        previewHtml: template.previewHtml,
        fieldSchema: template.fieldSchema,
        editorDocument: template.editorDocument,
        sourceFileName: template.sourceFileName,
        isActive: true,
        isLegalReviewed: true,
        legalReviewedAt: new Date(),
        version: 1,
      },
    });
  }
  return getHRLetterTemplates(orgId);
}

export async function importBundledHRLetterTemplates(orgId: string) {
  const imported: ImportedLetterTemplate[] = [];
  for (const file of getBundledDocxTemplateFiles()) {
    imported.push(await importDocxTemplateFile(file));
  }
  return replaceHRLetterTemplatesFromImports(orgId, imported);
}

export async function uploadHRLetterTemplateDocx(orgId: string, filePath: string) {
  const imported = await importDocxTemplateFile(filePath);
  return db.hRLetterTemplate.create({
    data: {
      orgId,
      name: imported.name,
      type: imported.type,
      content: imported.content,
      variables: imported.variables,
      sourceDocxPath: imported.sourceDocxPath,
      previewHtml: imported.previewHtml,
      fieldSchema: imported.fieldSchema,
      editorDocument: imported.editorDocument,
      sourceFileName: imported.sourceFileName,
      isActive: false,
      isLegalReviewed: false,
      version: 1,
    },
  });
}

export async function updateHRLetterTemplate(id: string, orgId: string, data: {
  name?: string;
  content?: string;
  previewHtml?: string;
  variables?: string[];
  fieldSchema?: LetterFieldSchema[];
  editorDocument?: LetterTemplateEditorDocument;
  sourceDocxPath?: string;
  isActive?: boolean;
}) {
  const current = await db.hRLetterTemplate.findFirst({ where: { id, orgId } });
  if (!current) throw new Error("Template not found");

  const newVersion = current.version + 1;
  return db.hRLetterTemplate.update({
    where: { id },
    data: {
      name: data.name,
      content: data.content,
      previewHtml: data.previewHtml,
      variables: data.variables,
      fieldSchema: data.fieldSchema,
      editorDocument: data.editorDocument,
      sourceDocxPath: data.sourceDocxPath,
      isActive: data.isActive ?? current.isActive,
      isLegalReviewed: false,
      legalReviewedAt: null,
      legalReviewedById: null,
      version: newVersion,
    },
  });
}

export async function saveHRLetterTemplateEditorRevision(id: string, orgId: string, html: string) {
  const current = await db.hRLetterTemplate.findFirst({ where: { id, orgId } });
  if (!current) throw new Error("Template not found");

  const sourceDocxPath = resolvePublicPath(current.sourceDocxPath);
  if (!sourceDocxPath) throw new Error("Template DOCX path is missing");

  const revisionFolder = path.dirname(sourceDocxPath);
  const revisionDocxPath = path.join(revisionFolder, `template-v${current.version + 1}.docx`);
  await saveEditorHtmlAsDocx(html, revisionDocxPath);

  const variables = Array.from(new Set(Array.from(stripHtmlToText(html).matchAll(/\{\{([a-zA-Z0-9_]+)\}\}/g)).map((match) => match[1])));
  const existingFieldSchema = parseStoredJson<LetterFieldSchema[]>(current.fieldSchema, []);
  const nextFieldSchema: LetterFieldSchema[] = variables.map((key) => (
    existingFieldSchema.find((field) => field.key === key) ?? {
      key,
      label: key.replace(/_/g, " ").replace(/\b\w/g, (match) => match.toUpperCase()),
      inputType: "text" as const,
      required: true,
      defaultSource: "manual" as const,
    }
  ));

  return updateHRLetterTemplate(id, orgId, {
    content: stripHtmlToText(html),
    previewHtml: html,
    variables,
    fieldSchema: nextFieldSchema,
    editorDocument: { html },
    sourceDocxPath: path.relative(path.join(process.cwd(), "public"), revisionDocxPath).replace(/\\/g, "/"),
  });
}

export async function approveHRLetterTemplateLegal(id: string, orgId: string, legalUserId: string) {
  return db.hRLetterTemplate.updateMany({
    where: { id, orgId },
    data: {
      isLegalReviewed: true,
      legalReviewedAt: new Date(),
      legalReviewedById: legalUserId,
      isActive: true,
    },
  });
}

// ─── Pre-population Service ───────────────────────────────────────────────────

function buildComputedTemplateDefaults(user: any, settings: any) {
  const contact = user.hrmsContact;
  const record = user.employmentRecord;

  const aadhaar = user.aadhaar ? maskAadhaar(user.aadhaar) : "";
  const address = [
    contact?.addressLine1,
    contact?.addressLine2,
    contact?.city,
    contact?.state,
    contact?.zipCode ? `${contact.state} - ${contact.zipCode}` : contact?.state,
  ].filter(Boolean).join(", ");

  const basicVal = record?.basic ?? 0;
  const hraVal = record?.hra ?? 0;
  const stipendVal = record?.stipend ?? 0;
  const allowanceVal = (record?.conveyance ?? 0) + (record?.transport ?? 0) + (record?.travelling ?? 0) + (record?.fixedAllowance ?? 0);
  const grossVal = basicVal + hraVal + allowanceVal;
  const annualBasic = basicVal * 12;
  const annualHra = hraVal * 12;
  const annualAllowance = allowanceVal * 12;
  const annualGross = grossVal * 12;
  const annualCTCValue = record?.ctc ?? annualGross;
  const employerContribution = Math.round((basicVal * 0.12) * 12);
  const gratuityProvision = Math.round((basicVal * 0.0481) * 12);

  const reportingManagerText = user.manager?.designation ? `${user.manager.name} - ${user.manager.designation}` : user.manager?.name ?? "HR Manager";

  return {
    employee_name: user.name ?? "",
    candidate_name: user.name ?? "",
    intern_name: user.name ?? "",
    consultant_or_entity_name: user.name ?? "",
    employee_id: user.employeeNumber ? String(user.employeeNumber) : "",
    employee_address: address,
    candidate_address: address,
    intern_address: address,
    consultant_registered_address: address,
    personal_email: contact?.personalEmail ?? user.email,
    designation: user.designation ?? "Associate",
    last_designation: user.designation ?? "Associate",
    department: user.department?.name ?? "Logistics Operations",
    reporting_manager: user.manager?.name ?? "HR Manager",
    reporting_manager_name_and_designation: reportingManagerText,
    mentor_name: user.manager?.name ?? "HR Manager",
    employment_type: user.employmentType ?? "Regular",
    grade_or_level: record?.grade ?? "L1",
    skill_category: "Skilled",
    joining_date: record?.joinDate ? formatDate(record.joinDate) : formatDate(new Date()),
    date_of_joining: record?.joinDate ? formatDate(record.joinDate) : formatDate(new Date()),
    joining_date_or_to_be_confirmed: record?.joinDate ? formatDate(record.joinDate) : "To Be Confirmed",
    work_location: user.branch?.name ?? "Chennai",
    probation_period: `${settings.probationDaysDefault} days`,
    probation_notice: "7 days",
    notice_period: `${settings.noticePeriodDaysDefault} days`,
    masked_aadhaar: aadhaar,
    uan_number: user.uan ?? "",
    esic_number: "",
    lin: "LIN Pending",
    establishment_registration_number: "Registration Pending",
    jurisdiction: settings.legalJurisdiction,
    monthly_gross_salary: formatCurrency(grossVal),
    monthly_gross_salary_words: numberToWords(grossVal),
    annual_ctc: formatCurrency(annualCTCValue),
    monthly_basic: formatCurrency(basicVal),
    annual_basic: formatCurrency(annualBasic),
    monthly_da: formatCurrency(0),
    annual_da: formatCurrency(0),
    monthly_hra: formatCurrency(hraVal),
    annual_hra: formatCurrency(annualHra),
    monthly_other_allowance: formatCurrency(allowanceVal),
    annual_other_allowance: formatCurrency(annualAllowance),
    monthly_gross: formatCurrency(grossVal),
    annual_fixed: formatCurrency(annualGross),
    annual_gross: formatCurrency(annualGross),
    employer_social_security_contribution: formatCurrency(employerContribution),
    gratuity_ctc_provision: formatCurrency(gratuityProvision),
    annual_variable_pay: formatCurrency(0),
    stipend: formatCurrency(stipendVal),
    variable_pay_terms: "As per approved incentive scheme",
    employer_contributions: "EPF / ESI as applicable",
    applicable_statutory_and_company_benefits: "As per company policy and applicable law",
    company_registered_address: "Adarsh Shipping and Services, No.4/57, Periya thambi Street, Thattankulam, Choolai, Chennai, Tamil Nadu - 600112",
    authorised_signatory_name: settings.signatoryName,
    authorised_signatory_designation: settings.signatoryDesignation,
    authorised_signatory_signature: settings.signatorySignatureUrl || "",
    company_seal: settings.companySealUrl || "",
    employee_signature: "",
    issue_date: formatDate(new Date()),
    letter_number: "",
  };
}

export async function getEmployeePrepopulatedDetails(userId: string, orgId: string, templateId?: string) {
  const user = await db.user.findFirst({
    where: { id: userId, orgId },
    include: {
      branch: true,
      department: true,
      manager: true,
      employmentRecord: true,
      hrmsContact: true,
    },
  });

  if (!user) throw new Error("User not found");

  const settings = await getHRLetterSettings(orgId);
  const defaults = buildComputedTemplateDefaults(user, settings);

  if (!templateId) {
    return defaults;
  }

  const template = await db.hRLetterTemplate.findFirst({ where: { id: templateId, orgId } });
  const fieldSchema = parseStoredJson<LetterFieldSchema[]>(template?.fieldSchema, []);
  const scopedDefaults: Record<string, string> = {};

  for (const field of fieldSchema) {
    const raw = defaults[field.key as keyof typeof defaults];
    scopedDefaults[field.key] = raw === undefined || raw === null ? "" : String(raw);
  }

  return scopedDefaults;
}

// ─── Requests & Document Lifecycle ──────────────────────────────────────────

export async function getHRLetterRequests(orgId: string, userId: string, roleKeys: string[]) {
  const isPrivileged = roleKeys.some((r) => ["admin", "hr", "management", "auditor", "legal"].includes(r.toLowerCase()));

  if (isPrivileged) {
    return db.hRLetterRequest.findMany({
      where: { orgId },
      include: { user: { select: { id: true, name: true, email: true, employeeNumber: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  return db.hRLetterRequest.findMany({
    where: { orgId, userId },
    include: { user: { select: { id: true, name: true, email: true, employeeNumber: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getHRLetterRequestById(id: string, orgId: string) {
  return db.hRLetterRequest.findFirst({
    where: { id, orgId },
    include: { user: { select: { id: true, name: true, email: true, employeeNumber: true } } },
  });
}

export async function createHRLetterRequest(orgId: string, templateId: string, userId: string, creatorId: string, details: any) {
  const year = new Date().getFullYear();
  const letterNumber = `DRAFT-${year}-${Math.random().toString(36).substring(7).toUpperCase()}`;

  const creator = await db.user.findFirst({ where: { id: creatorId } });
  const auditLog = [
    {
      timestamp: new Date().toISOString(),
      userId: creatorId,
      userName: creator?.name ?? "System",
      action: "DRAFT_CREATED",
      details: "Draft document initialized",
    }
  ];

  return db.hRLetterRequest.create({
    data: {
      orgId,
      userId,
      templateId,
      letterNumber,
      status: "DRAFT",
      details,
      auditTrail: auditLog,
    },
  });
}

export async function updateHRLetterRequest(id: string, orgId: string, details: any) {
  return db.hRLetterRequest.updateMany({
    where: { id, orgId },
    data: {
      details,
    },
  });
}

export async function transitionHRLetterRequest(
  id: string,
  orgId: string,
  action: "SUBMIT" | "HR_APPROVE" | "LEGAL_APPROVE" | "MGMT_APPROVE" | "ISSUE" | "REJECT" | "CANCEL" | "REISSUE",
  operatorId: string,
  notes?: string
) {
  const request = await db.hRLetterRequest.findFirst({
    where: { id, orgId },
    include: { user: true }
  });
  if (!request) throw new Error("Request not found");

  const operator = await db.user.findFirst({ where: { id: operatorId } });
  const operatorName = operator?.name ?? "System";

  let nextStatus = request.status;
  const auditEntries = parseStoredJson<any[]>(request.auditTrail, []);

  if (action === "SUBMIT") {
    if (request.status !== "DRAFT") throw new Error("Can only submit a draft");
    nextStatus = "HR_REVIEW";
  } else if (action === "HR_APPROVE") {
    if (request.status !== "HR_REVIEW") throw new Error("Can only approve from HR Review");
    const template = await db.hRLetterTemplate.findFirst({ where: { id: request.templateId } });
    nextStatus = template && !template.isLegalReviewed ? "LEGAL_REVIEW" : "MGMT_APPROVAL";
  } else if (action === "LEGAL_APPROVE") {
    if (request.status !== "LEGAL_REVIEW") throw new Error("Can only approve from Legal Review");
    nextStatus = "MGMT_APPROVAL";
  } else if (action === "MGMT_APPROVE") {
    if (request.status !== "MGMT_APPROVAL") throw new Error("Can only approve from Management Approval");
    nextStatus = "READY_TO_ISSUE";
  } else if (action === "REJECT") {
    nextStatus = "DRAFT";
  } else if (action === "CANCEL") {
    nextStatus = "CANCELLED";
  } else if (action === "ISSUE") {
    if (request.status !== "READY_TO_ISSUE") throw new Error("Can only issue from Ready to Issue state");
    return compileAndIssueDocument(request, orgId, operatorId, operatorName, auditEntries);
  } else if (action === "REISSUE") {
    if (request.status !== "ISSUED" && request.status !== "ACCEPTED") throw new Error("Can only reissue issued or accepted documents");

    const cloned = await db.hRLetterRequest.create({
      data: {
        orgId,
        userId: request.userId,
        templateId: request.templateId,
        letterNumber: `REISSUE-DRAFT-${new Date().getFullYear()}-${Math.random().toString(36).substring(7).toUpperCase()}`,
        status: "DRAFT",
        details: request.details as any,
        parentLetterId: request.id,
        auditTrail: [{
          timestamp: new Date().toISOString(),
          userId: operatorId,
          userName: operatorName,
          action: "REISSUE_INITIALIZED",
          details: `Reissued from parent document ${request.letterNumber}. Reason: ${notes || "None"}`,
        }],
      }
    });

    await db.hRLetterRequest.update({
      where: { id: request.id },
      data: {
        status: "SUPERSEDED",
        auditTrail: [...auditEntries, {
          timestamp: new Date().toISOString(),
          userId: operatorId,
          userName: operatorName,
          action: "SUPERSEDED",
          details: `Document superseded by reissued draft ${cloned.id}. Reason: ${notes || "None"}`,
        }],
      }
    });

    return cloned;
  }

  auditEntries.push({
    timestamp: new Date().toISOString(),
    userId: operatorId,
    userName: operatorName,
    action: `${action}_ACTION`,
    details: notes || `State transitioned to ${nextStatus}`,
  });

  return db.hRLetterRequest.update({
    where: { id },
    data: {
      status: nextStatus,
      approvedById: action === "MGMT_APPROVE" ? operatorId : undefined,
      auditTrail: auditEntries,
    },
  });
}

export async function acceptHRLetterRequest(
  id: string,
  orgId: string,
  userId: string,
  ip: string,
  userAgent: string,
  nameSignature: string
) {
  const request = await db.hRLetterRequest.findFirst({
    where: { id, orgId, userId, status: "ISSUED" }
  });
  if (!request) throw new Error("Issued letter not found or not open for acceptance");

  const auditEntries = parseStoredJson<any[]>(request.auditTrail, []);
  auditEntries.push({
    timestamp: new Date().toISOString(),
    userId,
    userName: nameSignature,
    action: "ACCEPTED_BY_EMPLOYEE",
    details: `Digitally signed and accepted. IP: ${ip}, User-Agent: ${userAgent}`,
  });

  return db.hRLetterRequest.update({
    where: { id },
    data: {
      status: "ACCEPTED",
      acceptedAt: new Date(),
      acceptanceIp: ip,
      acceptanceUserAgent: userAgent,
      auditTrail: auditEntries,
    },
  });
}

// ─── Compilation & Document Generation Bridge ──────────────────────────────────

async function compileAndIssueDocument(request: any, orgId: string, operatorId: string, operatorName: string, auditEntries: any[]) {
  const settings = await getHRLetterSettings(orgId);
  const template = await db.hRLetterTemplate.findFirst({ where: { id: request.templateId } });
  if (!template) throw new Error("Template not found");

  const detailsObj = parseStoredJson<Record<string, string>>(request.details, {});
  const year = new Date().getFullYear();
  const lastRequest = await db.hRLetterRequest.findFirst({
    where: { orgId, letterNumber: { startsWith: `ME/HR/${year}` } },
    orderBy: { letterNumber: "desc" },
  });

  let seq = 1;
  if (lastRequest?.letterNumber) {
    const parts = lastRequest.letterNumber.split("/");
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSeq)) seq = lastSeq + 1;
  }

  const finalLetterNumber = `ME/HR/${year}/${String(seq).padStart(3, "0")}`;
  detailsObj.letter_number = finalLetterNumber;
  detailsObj.issue_date = formatDate(new Date());
  detailsObj.authorised_signatory_name = settings.signatoryName;
  detailsObj.authorised_signatory_designation = settings.signatoryDesignation;

  const rootDir = process.cwd();
  const relativeDocxPath = `public/import-output/letters/${request.id}.docx`;
  const relativePdfPath = `public/import-output/letters/${request.id}.pdf`;
  const fullDocxPath = path.join(rootDir, relativeDocxPath);
  const fullPdfPath = path.join(rootDir, relativePdfPath);
  const fullTemplatePath = resolvePublicPath(template.sourceDocxPath);

  if (!fullTemplatePath || !fs.existsSync(fullTemplatePath)) {
    throw new Error("Template DOCX source is missing");
  }

  const verificationUrl = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/verify/${request.id}`;
  const buildJson = {
    templatePath: fullTemplatePath,
    outputPath: fullDocxPath,
    pdfOutputPath: fullPdfPath,
    placeholders: detailsObj,
    signaturePath: resolvePublicPath(settings.signatorySignatureUrl),
    sealPath: resolvePublicPath(settings.companySealUrl),
    employeeSignaturePath: detailsObj.employee_signature ? resolvePublicPath(detailsObj.employee_signature) : null,
    verificationUrl,
  };

  const tempJsonPath = path.join(rootDir, `public/import-output/letters/${request.id}.json`);
  if (!fs.existsSync(path.dirname(tempJsonPath))) {
    fs.mkdirSync(path.dirname(tempJsonPath), { recursive: true });
  }
  fs.writeFileSync(tempJsonPath, JSON.stringify(buildJson, null, 2));

  try {
    const psScript = path.join(rootDir, "scripts/generate-document-from-template.ps1");
    const { stdout, stderr } = await execAsync(
      `powershell.exe -ExecutionPolicy Bypass -File "${psScript}" -jsonPath "${tempJsonPath}"`
    );

    if (stderr?.trim()) console.error("PowerShell warnings/stderr:", stderr);
    const psResult = JSON.parse(stdout.trim());
    if (!psResult.ok) throw new Error(psResult.error || "PowerShell execution failed");

    fs.unlinkSync(tempJsonPath);

    auditEntries.push({
      timestamp: new Date().toISOString(),
      userId: operatorId,
      userName: operatorName,
      action: "ISSUED",
      details: `Document compiled and issued. PDF Hash: ${psResult.pdfHash}`,
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + settings.letterValidityDaysDefault);

    await db.emailQueue.create({
      data: {
        to: detailsObj.personal_email || request.user.email,
        subject: `Your ${template.name} has been issued - Adarsh Shipping`,
        html: `Dear ${request.user.name},\n\nPlease review and accept your ${template.name} (Ref: ${finalLetterNumber}) in the employee letters portal.\n\nLink: ${verificationUrl}\n\nValid until: ${formatDate(expiresAt)}`,
        status: "PENDING",
      }
    });

    await createNotification({
      orgId,
      userId: request.userId,
      kind: "HR_LETTER_ISSUED",
      title: `${template.name} Issued`,
      body: `Your ${template.name} (Ref: ${finalLetterNumber}) is ready for review and acceptance.`,
      link: `/hrms/letters/view/${request.id}`,
      priority: "important",
    });

    return db.hRLetterRequest.update({
      where: { id: request.id },
      data: {
        status: "ISSUED",
        letterNumber: finalLetterNumber,
        details: detailsObj,
        pdfPath: relativePdfPath.replace(/^public\//, ""),
        docxPath: relativeDocxPath.replace(/^public\//, ""),
        documentHash: psResult.pdfHash,
        expiresAt,
        issuedById: operatorId,
        issuedAt: new Date(),
        auditTrail: auditEntries,
      }
    });
  } catch (err: any) {
    if (fs.existsSync(tempJsonPath)) fs.unlinkSync(tempJsonPath);
    console.error("Compilation error details:", err);
    throw new Error(`Word PDF Compilation failed: ${err.message}`);
  }
}

// ─── Settings Service ─────────────────────────────────────────────────────────

export async function getHRLetterSettings(orgId: string) {
  let settings = await db.hRLetterSetting.findFirst({ where: { orgId } });
  if (!settings) {
    settings = await db.hRLetterSetting.create({
      data: {
        orgId,
        numberingPattern: "ME/HR/{year}/{seq}",
        probationDaysDefault: 90,
        noticePeriodDaysDefault: 30,
        letterValidityDaysDefault: 7,
        legalJurisdiction: "Chennai, Tamil Nadu",
        complianceVersion: "2026.1",
        signatoryName: "HR Manager",
        signatoryDesignation: "Manager - HR",
        companySealUrl: "",
      }
    });
  }
  return settings;
}

export async function updateHRLetterSettings(orgId: string, data: any) {
  const current = await getHRLetterSettings(orgId);
  return db.hRLetterSetting.update({
    where: { id: current.id },
    data: {
      numberingPattern: data.numberingPattern,
      probationDaysDefault: data.probationDaysDefault ? parseInt(data.probationDaysDefault, 10) : undefined,
      noticePeriodDaysDefault: data.noticePeriodDaysDefault ? parseInt(data.noticePeriodDaysDefault, 10) : undefined,
      letterValidityDaysDefault: data.letterValidityDaysDefault ? parseInt(data.letterValidityDaysDefault, 10) : undefined,
      legalJurisdiction: data.legalJurisdiction,
      complianceVersion: data.complianceVersion,
      signatoryName: data.signatoryName,
      signatoryDesignation: data.signatoryDesignation,
      signatorySignatureUrl: data.signatorySignatureUrl,
      companySealUrl: data.companySealUrl,
      emailTemplate: data.emailTemplate,
    }
  });
}

// ─── Public Document Verification ─────────────────────────────────────────────

export async function verifyHRDocument(idOrNumberOrHash: string) {
  const doc = await db.hRLetterRequest.findFirst({
    where: {
      OR: [
        { id: idOrNumberOrHash },
        { letterNumber: idOrNumberOrHash },
        { documentHash: idOrNumberOrHash }
      ]
    },
    include: {
      user: { select: { name: true, employeeNumber: true } },
    }
  });

  if (!doc) return null;

  const template = await db.hRLetterTemplate.findFirst({ where: { id: doc.templateId } });
  const details = parseStoredJson<Record<string, string>>(doc.details, {});

  return {
    letterNumber: doc.letterNumber,
    documentType: template?.name ?? "Dynamic Certificate",
    recipientName: doc.user.name,
    issueDate: formatDate(doc.issuedAt),
    status: doc.status,
    documentHash: doc.documentHash,
    verificationTimestamp: new Date().toISOString(),
    validityStatus: doc.expiresAt && new Date() > new Date(doc.expiresAt) ? "EXPIRED" : "VALID",
    complianceVersion: "2026.1",
    maskedEmail: details.personal_email ? details.personal_email.replace(/(?<=.)[^@\n](?=[^@\n]*?[@\n])/g, "*") : "",
    maskedAadhaar: details.masked_aadhaar ?? "",
  };
}
