import { isAbsolute, normalize, sep } from "node:path";

const SENSITIVE_KEY =
  /(?:password|secret|token|credential|authorization|cookie|connection|string|database.?url|private.?key|api.?key)/i;
const ALLOWED_ATTACHMENT_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;

export function assertNoSensitiveFields(
  value: unknown,
  path = "root",
): void {
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      assertNoSensitiveFields(entry, `${path}[${index}]`),
    );
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, entry] of Object.entries(value)) {
    if (SENSITIVE_KEY.test(key)) {
      throw new Error(`SENSITIVE_FIELD_FORBIDDEN:${path}.${key}`);
    }
    assertNoSensitiveFields(entry, `${path}.${key}`);
  }
}
export function redactSensitiveFields(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSensitiveFields);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      SENSITIVE_KEY.test(key) ? "[REDACTED]" : redactSensitiveFields(entry),
    ]),
  );
}

export function safeSpreadsheetCell(value: unknown): string {
  const text = String(value ?? "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .slice(0, 4_096);
  return /^[=+\-@]/.test(text.trimStart()) ? `'${text}` : text;
}

export function assertSafeRelativePath(relativePath: string): string {
  const trimmed = relativePath.trim();
  if (
    !trimmed ||
    isAbsolute(trimmed) ||
    /^[a-zA-Z]:/.test(trimmed) ||
    trimmed.includes("\0")
  ) {
    throw new Error("ATTACHMENT_PATH_INVALID");
  }
  const normalized = normalize(trimmed);
  if (
    normalized === ".." ||
    normalized.startsWith(`..${sep}`) ||
    normalized.split(/[\\/]/).includes("..")
  ) {
    throw new Error("ATTACHMENT_PATH_TRAVERSAL");
  }
  return normalized.replaceAll("\\", "/");
}

export function validateAttachmentMetadata(input: {
  relativePath: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
}) {
  const relativePath = assertSafeRelativePath(input.relativePath);
  if (!ALLOWED_ATTACHMENT_MIME_TYPES.has(input.mimeType)) {
    throw new Error("ATTACHMENT_TYPE_UNSUPPORTED");
  }
  if (
    !Number.isSafeInteger(input.sizeBytes) ||
    input.sizeBytes <= 0 ||
    input.sizeBytes > MAX_ATTACHMENT_BYTES
  ) {
    throw new Error("ATTACHMENT_SIZE_INVALID");
  }
  if (!/^[a-f0-9]{64}$/i.test(input.sha256)) {
    throw new Error("ATTACHMENT_HASH_INVALID");
  }
  return {
    ...input,
    relativePath,
    sha256: input.sha256.toLowerCase(),
    scanStatus: "SCAN_REQUIRED" as const,
  };
}

export function boundedSafeMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "Unknown migration error";
  return safeSpreadsheetCell(message)
    .replace(
      /(?:postgres(?:ql)?:\/\/|https?:\/\/)[^\s]+/gi,
      "[REDACTED_ENDPOINT]",
    )
    .slice(0, 512);
}
