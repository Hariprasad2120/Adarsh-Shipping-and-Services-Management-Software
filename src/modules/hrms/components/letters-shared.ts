export type TemplateField = {
  key: string;
  label: string;
  inputType:
    | "text"
    | "textarea"
    | "date"
    | "number"
    | "currency"
    | "email"
    | "select"
    | "image";
  required: boolean;
  defaultSource: string;
  placeholder?: string;
  helpText?: string;
  readOnly?: boolean;
  options?: Array<{ label: string; value: string }>;
};

export type TemplateRecord = {
  id: string;
  name: string;
  type: string;
  version: number;
  isActive: boolean;
  isLegalReviewed: boolean;
  content: string;
  previewHtml: string | null;
  variables: string[];
  sourceDocxPath: string | null;
  sourceFileName: string | null;
  fieldSchema: TemplateField[];
  editorDocument: { html: string };
};

export type LetterPreviewSettings = {
  signatoryName: string;
  signatoryDesignation: string;
  signatorySignatureUrl: string;
  companySealUrl: string;
};

function escapePreviewValue(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderDraftPreviewHtml({
  template,
  details,
  settings,
}: {
  template: TemplateRecord | null;
  details: Record<string, unknown>;
  settings: LetterPreviewSettings;
}) {
  if (!template) return "";

  const sourceHtml =
    template.editorDocument?.html || template.previewHtml || template.content;
  const mergedValues: Record<string, string> = {
    ...Object.fromEntries(
      Object.entries(details || {}).map(([key, value]) => [key, String(value ?? "")]),
    ),
    authorised_signatory_name: String(
      details.authorised_signatory_name ?? settings.signatoryName ?? "",
    ),
    authorised_signatory_designation: String(
      details.authorised_signatory_designation ??
        settings.signatoryDesignation ??
        "",
    ),
    authorised_signatory_signature: String(
      details.authorised_signatory_signature ??
        settings.signatorySignatureUrl ??
        "",
    ),
    company_seal: String(details.company_seal ?? settings.companySealUrl ?? ""),
  };

  return sourceHtml.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_, key: string) => {
    const field = template.fieldSchema.find((item) => item.key === key);
    const value = mergedValues[key] ?? "";

    if (!value) {
      return '<span style="display:inline-block;min-width:5rem;border-bottom:1px solid #94a3b8;color:#64748b;">&nbsp;</span>';
    }

    if (
      field?.inputType === "image" ||
      key === "authorised_signatory_signature" ||
      key === "company_seal" ||
      key === "employee_signature"
    ) {
      const normalized = value.startsWith("/") ? value : `/${value}`;
      return `<img src="${escapePreviewValue(normalized)}" alt="${escapePreviewValue(
        field?.label || key,
      )}" style="display:inline-block;max-height:88px;max-width:220px;vertical-align:middle;" />`;
    }

    return escapePreviewValue(value).replace(/\n/g, "<br />");
  });
}
