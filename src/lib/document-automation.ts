type DocumentAutomationCommand =
  | "generate-document-from-template"
  | "read-docx-template"
  | "save-html-as-docx";

type DocumentAutomationResult<T> = T & {
  ok?: boolean;
  error?: string;
};

function trimTrailingSlash(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function getDocumentAutomationBaseUrl() {
  const value = process.env.DOCUMENT_AUTOMATION_URL?.trim();
  return value ? trimTrailingSlash(value) : null;
}

export function hasExternalDocumentAutomation() {
  return Boolean(getDocumentAutomationBaseUrl());
}

export function isServerlessDocumentRuntime() {
  return Boolean(
    process.env.VERCEL ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.AWS_EXECUTION_ENV,
  );
}

export function assertDocumentAutomationAvailable(feature: string) {
  if (hasExternalDocumentAutomation()) return;
  if (!isServerlessDocumentRuntime()) return;
  throw new Error(
    `${feature} requires DOCUMENT_AUTOMATION_URL when running in a serverless runtime.`,
  );
}

export async function runExternalDocumentAutomation<T>(
  command: DocumentAutomationCommand,
  payload: Record<string, unknown>,
): Promise<T> {
  const baseUrl = getDocumentAutomationBaseUrl();
  if (!baseUrl) {
    throw new Error("DOCUMENT_AUTOMATION_URL is not configured.");
  }

  const response = await fetch(`${baseUrl}/${command}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.DOCUMENT_AUTOMATION_TOKEN
        ? { Authorization: `Bearer ${process.env.DOCUMENT_AUTOMATION_TOKEN}` }
        : {}),
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Document automation request failed (${response.status}): ${text.slice(0, 300)}`,
    );
  }

  const data = (await response.json()) as DocumentAutomationResult<T>;
  if (data && typeof data === "object" && "ok" in data && data.ok === false) {
    throw new Error(data.error || "Document automation request failed.");
  }

  return data as T;
}
