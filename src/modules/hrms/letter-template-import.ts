import * as fs from "fs";
import * as path from "path";
import { promisify } from "util";
import { exec } from "child_process";
import { LetterFieldSchema, ImportedLetterTemplate } from "@/modules/hrms/letter-template-types";

const execAsync = promisify(exec);

const TEMPLATE_STORAGE_DIR = path.join(process.cwd(), "public", "import-output", "letters", "templates");
const DOCX_SOURCE_DIR = path.join(process.cwd(), "import-output", "letters", "Letter Formats");

const DOCX_TEMPLATE_TYPES: Record<string, { name: string; type: string }> = {
  "01_Initial_Offer_Letter.docx": { name: "Initial Offer Letter", type: "INITIAL_OFFER" },
  "02_Offer_Letter.docx": { name: "Offer Letter", type: "OFFER_LETTER" },
  "03_Appointment_Letter_7_Pages.docx": { name: "Appointment Letter", type: "APPOINTMENT" },
  "04_Internship_Acceptance_Letter.docx": { name: "Internship Acceptance Letter", type: "INTERNSHIP_ACCEPTANCE" },
  "05_Internship_Completion_Letter.docx": { name: "Internship Completion Letter", type: "INTERNSHIP_COMPLETION" },
  "06_Relieving_Letter.docx": { name: "Relieving Letter", type: "RELIEVING" },
  "07_Termination_Letter.docx": { name: "Termination Letter", type: "TERMINATION" },
  "08_Consultant_Contract.docx": { name: "Consultant Contract", type: "CONSULTANT_CONTRACT" },
  "09_Experience_Letter.docx": { name: "Experience Letter", type: "EXPERIENCE" },
};

const FIELD_OVERRIDES: Record<string, Partial<LetterFieldSchema>> = {
  issue_date: { inputType: "date", defaultSource: "system", readOnly: true, required: true },
  letter_number: { inputType: "text", defaultSource: "system", readOnly: true, required: true },
  acceptance_date: { inputType: "date", defaultSource: "manual" },
  offer_expiry_date: { inputType: "date", defaultSource: "manual" },
  offer_expiry_time: { inputType: "text", defaultSource: "manual", placeholder: "e.g. 5:00 PM" },
  joining_date: { inputType: "date", defaultSource: "employee" },
  joining_date_or_to_be_confirmed: { inputType: "text", defaultSource: "employee", placeholder: "Date or To Be Confirmed" },
  start_date: { inputType: "date", defaultSource: "manual" },
  end_date: { inputType: "date", defaultSource: "manual" },
  separation_request_date: { inputType: "date", defaultSource: "manual" },
  last_working_date: { inputType: "date", defaultSource: "manual" },
  contract_start_date: { inputType: "date", defaultSource: "manual" },
  contract_end_date: { inputType: "date", defaultSource: "manual" },
  agreement_date: { inputType: "date", defaultSource: "manual" },
  termination_effective_date: { inputType: "date", defaultSource: "manual" },
  monthly_gross_salary: { inputType: "currency", defaultSource: "computed" },
  annual_ctc: { inputType: "currency", defaultSource: "computed" },
  monthly_basic: { inputType: "currency", defaultSource: "computed" },
  annual_basic: { inputType: "currency", defaultSource: "computed" },
  monthly_da: { inputType: "currency", defaultSource: "computed" },
  annual_da: { inputType: "currency", defaultSource: "computed" },
  monthly_hra: { inputType: "currency", defaultSource: "computed" },
  annual_hra: { inputType: "currency", defaultSource: "computed" },
  monthly_other_allowance: { inputType: "currency", defaultSource: "computed" },
  annual_other_allowance: { inputType: "currency", defaultSource: "computed" },
  monthly_gross: { inputType: "currency", defaultSource: "computed" },
  annual_fixed: { inputType: "currency", defaultSource: "computed" },
  annual_gross: { inputType: "currency", defaultSource: "computed" },
  employer_social_security_contribution: { inputType: "currency", defaultSource: "computed" },
  gratuity_ctc_provision: { inputType: "currency", defaultSource: "computed" },
  annual_variable_pay: { inputType: "currency", defaultSource: "computed" },
  stipend: { inputType: "currency", defaultSource: "computed" },
  consultancy_fee_and_schedule: { inputType: "textarea", defaultSource: "manual" },
  fees: { inputType: "currency", defaultSource: "manual" },
  company_seal: { inputType: "image", defaultSource: "settings" },
  authorised_signatory_signature: { inputType: "image", defaultSource: "settings" },
  employee_signature: { inputType: "image", defaultSource: "manual", required: false },
  candidate_address: { inputType: "textarea", defaultSource: "employee" },
  employee_address: { inputType: "textarea", defaultSource: "employee" },
  consultant_registered_address: { inputType: "textarea", defaultSource: "manual" },
  intern_address: { inputType: "textarea", defaultSource: "employee" },
  detailed_scope_of_services: { inputType: "textarea", defaultSource: "manual" },
  deliverables: { inputType: "textarea", defaultSource: "manual" },
  milestones_and_due_dates: { inputType: "textarea", defaultSource: "manual" },
  objective_acceptance_criteria: { inputType: "textarea", defaultSource: "manual" },
  factually_verified_termination_reason_and_chronology: { inputType: "textarea", defaultSource: "manual" },
  notice_pay_retrenchment_compensation_gratuity_leave_and_other_applicable_items: { inputType: "textarea", defaultSource: "manual" },
  verified_responsibility_summary: { inputType: "textarea", defaultSource: "manual" },
  approved_factual_performance_statement: { inputType: "textarea", defaultSource: "manual" },
  verified_areas_of_exposure: { inputType: "textarea", defaultSource: "manual" },
  verified_performance_summary: { inputType: "textarea", defaultSource: "manual" },
  primary_duty_1: { inputType: "textarea", defaultSource: "manual" },
  primary_duty_2: { inputType: "textarea", defaultSource: "manual" },
  primary_duty_3: { inputType: "textarea", defaultSource: "manual" },
};

function ensureTemplateStorageDir() {
  if (!fs.existsSync(TEMPLATE_STORAGE_DIR)) {
    fs.mkdirSync(TEMPLATE_STORAGE_DIR, { recursive: true });
  }
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function humanizeKey(key: string) {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase())
    .replace("Ctc", "CTC")
    .replace("Da", "DA")
    .replace("Hra", "HRA")
    .replace("Esic", "ESIC")
    .replace("Uan", "UAN")
    .replace("Lin", "LIN");
}

function deriveDefaultSource(key: string): LetterFieldSchema["defaultSource"] {
  if (key.includes("signatory") || key.includes("company_seal")) return "settings";
  if (key.includes("salary") || key.includes("ctc") || key.includes("monthly_") || key.includes("annual_") || key.includes("stipend")) return "computed";
  if (key.includes("employee") || key.includes("candidate") || key.includes("department") || key.includes("designation") || key.includes("work_location") || key.includes("reporting_manager") || key.includes("date_of_joining") || key.includes("joining_date")) return "employee";
  return "manual";
}

export function buildFieldSchema(variables: string[]): LetterFieldSchema[] {
  return variables.map((key) => {
    const override = FIELD_OVERRIDES[key] ?? {};
    return {
      key,
      label: override.label ?? humanizeKey(key),
      inputType: override.inputType ?? "text",
      required: override.required ?? !(key === "employee_signature"),
      defaultSource: override.defaultSource ?? deriveDefaultSource(key),
      placeholder: override.placeholder,
      helpText: override.helpText,
      readOnly: override.readOnly ?? false,
      options: override.options,
    };
  });
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

function rewriteHtmlAssetPaths(html: string, targetFolder: string) {
  return html.replace(/src="([^"]+)"/gi, (_, source) => {
    const normalized = source.replace(/\\/g, "/");
    const fileName = path.basename(normalized);
    return `src="/import-output/letters/templates/${targetFolder}/${fileName}"`;
  });
}

async function readDocxTemplate(docxPath: string) {
  const psScript = path.join(process.cwd(), "scripts", "read-docx-template.ps1");
  const { stdout, stderr } = await execAsync(
    `powershell.exe -ExecutionPolicy Bypass -File "${psScript}" -docxPath "${docxPath}"`
  );
  if (stderr?.trim()) {
    console.warn(stderr);
  }
  const parsed = JSON.parse(stdout.trim());
  if (!parsed.ok) {
    throw new Error(parsed.error || "Failed to read DOCX template");
  }
  return parsed as {
    ok: true;
    text: string;
    html: string;
    assetsDir: string | null;
    tempRoot: string | null;
  };
}

export async function saveEditorHtmlAsDocx(html: string, outputDocxPath: string) {
  ensureTemplateStorageDir();
  const tempBase = path.join(TEMPLATE_STORAGE_DIR, `temp-editor-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const tempHtmlPath = `${tempBase}.html`;
  fs.writeFileSync(tempHtmlPath, html, "utf8");

  try {
    const psScript = path.join(process.cwd(), "scripts", "save-html-as-docx.ps1");
    const { stdout, stderr } = await execAsync(
      `powershell.exe -ExecutionPolicy Bypass -File "${psScript}" -htmlPath "${tempHtmlPath}" -outputDocx "${outputDocxPath}"`
    );
    if (stderr?.trim()) {
      console.warn(stderr);
    }
    const parsed = JSON.parse(stdout.trim());
    if (!parsed.ok) {
      throw new Error(parsed.error || "Failed to save HTML as DOCX");
    }
  } finally {
    if (fs.existsSync(tempHtmlPath)) {
      fs.unlinkSync(tempHtmlPath);
    }
  }
}

export async function importDocxTemplateFile(docxPath: string): Promise<ImportedLetterTemplate> {
  ensureTemplateStorageDir();

  const sourceFileName = path.basename(docxPath);
  const templateMeta = DOCX_TEMPLATE_TYPES[sourceFileName] ?? {
    name: sourceFileName.replace(/_/g, " ").replace(/\.docx$/i, ""),
    type: slugify(sourceFileName).toUpperCase(),
  };
  const templateFolder = `${slugify(templateMeta.type)}-${Date.now()}`;
  const targetDir = path.join(TEMPLATE_STORAGE_DIR, templateFolder);
  fs.mkdirSync(targetDir, { recursive: true });

  const managedDocxPath = path.join(targetDir, sourceFileName);
  fs.copyFileSync(docxPath, managedDocxPath);

  const parsed = await readDocxTemplate(managedDocxPath);
  if (parsed.assetsDir && fs.existsSync(parsed.assetsDir)) {
    for (const asset of fs.readdirSync(parsed.assetsDir)) {
      fs.copyFileSync(path.join(parsed.assetsDir, asset), path.join(targetDir, asset));
    }
  }

  const html = rewriteHtmlAssetPaths(parsed.html, templateFolder);
  const content = stripHtmlToText(html);
  const variables = Array.from(new Set(Array.from(content.matchAll(/\{\{([a-zA-Z0-9_]+)\}\}/g)).map((match) => match[1])));
  const fieldSchema = buildFieldSchema(variables);

  if (parsed.tempRoot && fs.existsSync(parsed.tempRoot)) {
    fs.rmSync(parsed.tempRoot, { recursive: true, force: true });
  }

  return {
    name: templateMeta.name,
    type: templateMeta.type,
    content,
    previewHtml: html,
    variables,
    fieldSchema,
    editorDocument: { html },
    sourceFileName,
    sourceDocxPath: `import-output/letters/templates/${templateFolder}/${sourceFileName}`,
  };
}

export function getBundledDocxTemplateFiles() {
  return fs
    .readdirSync(DOCX_SOURCE_DIR)
    .filter((file) => file.toLowerCase().endsWith(".docx") && !file.startsWith("00_") && !file.startsWith("~$"))
    .map((file) => path.join(DOCX_SOURCE_DIR, file));
}
