import { sanitizeFilename } from "@/lib/security";

/**
 * Shared upload validation. Every file uploader must run its `File` through
 * `validateUpload()` before persisting.
 *
 * Checks (in order):
 *  1. size ceiling
 *  2. extension allowlist (from the sanitised name)
 *  3. declared Content-Type allowlist
 *  4. magic-byte sniff of the first bytes — the real content type must be
 *     consistent with the declared type / extension
 *
 * It intentionally does NOT trust the browser-supplied filename, extension or
 * Content-Type on their own. Storage-name generation, path-traversal defence
 * (`resolveInside`) and download authorisation are the caller's responsibility.
 */

export type UploadKind = "document" | "image" | "spreadsheet" | "data";

const KIND_EXTENSIONS: Record<UploadKind, string[]> = {
  document: ["pdf", "png", "jpg", "jpeg", "webp"],
  image: ["png", "jpg", "jpeg", "webp", "gif"],
  spreadsheet: ["xlsx", "xls", "csv"],
  data: ["csv", "txt", "json"],
};

const KIND_MIME: Record<UploadKind, string[]> = {
  document: [
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/webp",
  ],
  image: ["image/png", "image/jpeg", "image/webp", "image/gif"],
  spreadsheet: [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "text/csv",
    "application/octet-stream",
  ],
  data: ["text/csv", "text/plain", "application/json", "application/octet-stream"],
};

const DEFAULT_MAX_BYTES: Record<UploadKind, number> = {
  document: 25 * 1024 * 1024,
  image: 10 * 1024 * 1024,
  spreadsheet: 15 * 1024 * 1024,
  data: 15 * 1024 * 1024,
};

export interface ValidateUploadOptions {
  kind: UploadKind;
  maxBytes?: number;
  /** Extra extensions to permit for this specific call. */
  extraExtensions?: string[];
  /** Extra MIME types to permit for this specific call. */
  extraMimeTypes?: string[];
}

export interface ValidatedUpload {
  safeName: string;
  extension: string;
  declaredType: string;
  sniffedType: string | null;
  size: number;
}

export class UploadValidationError extends Error {
  constructor(
    message: string,
    readonly code:
      | "TOO_LARGE"
      | "EMPTY"
      | "BAD_EXTENSION"
      | "BAD_MIME"
      | "CONTENT_MISMATCH",
  ) {
    super(message);
    this.name = "UploadValidationError";
  }
}

function extOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
}

function bytesStartWith(buf: Uint8Array, sig: number[], offset = 0): boolean {
  if (buf.length < offset + sig.length) return false;
  for (let i = 0; i < sig.length; i++) {
    if (buf[offset + i] !== sig[i]) return false;
  }
  return true;
}

/** Best-effort content sniff. Returns a coarse type or null if unrecognised. */
export function sniffType(buf: Uint8Array): string | null {
  if (bytesStartWith(buf, [0x25, 0x50, 0x44, 0x46, 0x2d])) return "application/pdf"; // %PDF-
  if (bytesStartWith(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (bytesStartWith(buf, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (bytesStartWith(buf, [0x47, 0x49, 0x46, 0x38])) return "image/gif"; // GIF8
  if (
    bytesStartWith(buf, [0x52, 0x49, 0x46, 0x46]) &&
    bytesStartWith(buf, [0x57, 0x45, 0x42, 0x50], 8)
  )
    return "image/webp"; // RIFF....WEBP
  if (bytesStartWith(buf, [0x50, 0x4b, 0x03, 0x04])) return "application/zip"; // PK.. (xlsx/docx/zip)
  if (bytesStartWith(buf, [0x50, 0x4b, 0x05, 0x06])) return "application/zip"; // empty archive
  if (bytesStartWith(buf, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]))
    return "application/vnd.ms-excel"; // OLE2 (legacy .xls/.doc)
  return null;
}

const HTML_SNIFF = /^\s*(<!doctype html|<html|<script|<\?php|<svg)/i;

/**
 * Content-only guard for callers that already validated name/type/size with
 * another helper (e.g. `assertAllowedFile`) and just need the magic-byte /
 * active-content check added. Throws `UploadValidationError` on mismatch.
 *
 * @param head  first bytes of the file (>= 16 recommended)
 * @param extension  the sanitised, lower-case extension without a dot
 */
export function assertSafeFileContent(
  head: Uint8Array,
  extension: string,
  opts: { allowText?: boolean } = {},
): void {
  const asText = new TextDecoder("utf-8", { fatal: false }).decode(head);
  if (HTML_SNIFF.test(asText) && !opts.allowText) {
    throw new UploadValidationError(
      "File content looks like HTML/script, not a document.",
      "CONTENT_MISMATCH",
    );
  }
  const sniffed = sniffType(head);
  const expected: Record<string, string[]> = {
    pdf: ["application/pdf"],
    png: ["image/png"],
    jpg: ["image/jpeg"],
    jpeg: ["image/jpeg"],
    webp: ["image/webp"],
    gif: ["image/gif"],
    xlsx: ["application/zip"],
    xls: ["application/vnd.ms-excel"],
    docx: ["application/zip"],
  };
  const want = expected[extension];
  if (want && (!sniffed || !want.includes(sniffed))) {
    throw new UploadValidationError(
      `File content does not match its ".${extension}" extension.`,
      "CONTENT_MISMATCH",
    );
  }
}

export async function validateUpload(
  file: File,
  options: ValidateUploadOptions,
): Promise<ValidatedUpload> {
  const { kind } = options;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES[kind];

  if (file.size === 0) throw new UploadValidationError("File is empty.", "EMPTY");
  if (file.size > maxBytes) {
    throw new UploadValidationError(
      `File exceeds the ${(maxBytes / 1024 / 1024).toFixed(0)} MB limit.`,
      "TOO_LARGE",
    );
  }

  const safeName = sanitizeFilename(file.name);
  const extension = extOf(safeName);
  const allowedExt = [
    ...KIND_EXTENSIONS[kind],
    ...(options.extraExtensions ?? []),
  ].map((e) => e.toLowerCase());
  if (!extension || !allowedExt.includes(extension)) {
    throw new UploadValidationError(
      `File type ".${extension}" is not allowed here.`,
      "BAD_EXTENSION",
    );
  }

  const declaredType = (file.type || "application/octet-stream").toLowerCase();
  const allowedMime = [
    ...KIND_MIME[kind],
    ...(options.extraMimeTypes ?? []),
  ].map((m) => m.toLowerCase());
  if (!allowedMime.includes(declaredType)) {
    throw new UploadValidationError(
      `Content-Type "${declaredType}" is not allowed here.`,
      "BAD_MIME",
    );
  }

  const head = new Uint8Array(await file.slice(0, 64).arrayBuffer());
  const sniffedType = sniffType(head);

  // Reject anything that looks like markup/script regardless of extension.
  const asText = new TextDecoder("utf-8", { fatal: false }).decode(head);
  if (HTML_SNIFF.test(asText) && kind !== "data") {
    throw new UploadValidationError(
      "File content looks like HTML/script, not a document.",
      "CONTENT_MISMATCH",
    );
  }

  // Binary types must match their signature.
  const needsBinarySig: Record<string, string[]> = {
    pdf: ["application/pdf"],
    png: ["image/png"],
    jpg: ["image/jpeg"],
    jpeg: ["image/jpeg"],
    webp: ["image/webp"],
    gif: ["image/gif"],
    xlsx: ["application/zip"],
    xls: ["application/vnd.ms-excel"],
  };
  const expected = needsBinarySig[extension];
  if (expected) {
    if (!sniffedType || !expected.includes(sniffedType)) {
      throw new UploadValidationError(
        `File content does not match its ".${extension}" extension.`,
        "CONTENT_MISMATCH",
      );
    }
  }

  return { safeName, extension, declaredType, sniffedType, size: file.size };
}
