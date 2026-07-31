import { createHash } from "node:crypto";

import { canonicalPayload } from "../request-integrity";
import type {
  ProductionIdentity,
  ProductionScope,
} from "./types";

export const SHA256_PATTERN = /^[a-f0-9]{64}$/;
export const STABLE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/;
export const SAFE_CODE_PATTERN = /^[A-Z][A-Z0-9_-]{2,127}$/;

const NON_PRODUCTION_TOKEN =
  /(^|[._:/-])(dev|development|stg|staging|test|testing|synthetic|sample|placeholder|local)(?=$|[._:/-])/i;
const INLINE_SECRET =
  /(?:postgres(?:ql)?:\/\/|mysql:\/\/|mongodb(?:\+srv)?:\/\/|-----BEGIN [A-Z ]*PRIVATE KEY-----|(?:password|secret|token|api[_-]?key)\s*[:=])/i;

export function sha256(value: unknown): string {
  return createHash("sha256").update(canonicalPayload(value)).digest("hex");
}

export function requireStableId(value: unknown, code: string): string {
  if (typeof value !== "string" || !STABLE_ID_PATTERN.test(value.trim())) {
    throw new Error(code);
  }
  return value.trim();
}

export function requireSha256(value: unknown, code: string): string {
  if (typeof value !== "string" || !SHA256_PATTERN.test(value)) {
    throw new Error(code);
  }
  return value;
}

export function requireMaterialSha256(value: unknown, code: string): string {
  const digest = requireSha256(value, code);
  if (/^0{64}$/.test(digest)) throw new Error(code);
  return digest;
}

export function requireText(
  value: unknown,
  code: string,
  maximum = 1_024,
): string {
  if (typeof value !== "string") throw new Error(code);
  const normalized = value.trim();
  if (!normalized || normalized.length > maximum) throw new Error(code);
  return normalized;
}

export function requireTimestamp(value: unknown, code: string): Date {
  if (typeof value !== "string") throw new Error(code);
  const parsed = new Date(value);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString() !== value
  ) {
    throw new Error(code);
  }
  return parsed;
}

export function assertProductionScope(
  actual: ProductionScope,
  expected: ProductionScope,
  code = "PHASE8_SCOPE_MISMATCH",
): void {
  if (
    actual.organizationId !== expected.organizationId ||
    actual.legalEntityId !== expected.legalEntityId ||
    actual.environment !== "PRODUCTION" ||
    expected.environment !== "PRODUCTION"
  ) {
    throw new Error(code);
  }
  requireStableId(actual.organizationId, `${code}:ORGANIZATION`);
  requireStableId(actual.legalEntityId, `${code}:LEGAL_ENTITY`);
}

export function assertProductionIdentity(input: {
  identity: ProductionIdentity;
  scope: ProductionScope;
  requiredPermission?: string;
  code?: string;
}): void {
  const code = input.code ?? "PRODUCTION_IDENTITY_INVALID";
  requireStableId(input.identity.identityId, `${code}:IDENTITY`);
  if (
    !input.identity.active ||
    input.identity.classification !== "PRODUCTION_HUMAN" ||
    input.identity.organizationId !== input.scope.organizationId ||
    !input.identity.legalEntityIds.includes(input.scope.legalEntityId)
  ) {
    throw new Error(code);
  }
  if (
    input.requiredPermission &&
    !input.identity.permissions.includes(input.requiredPermission)
  ) {
    throw new Error(`${code}:PERMISSION`);
  }
}

export function assertMakerChecker(
  makerIdentityId: string | null | undefined,
  checkerIdentityId: string | null | undefined,
  code = "MAKER_CHECKER_SEPARATION_REQUIRED",
): void {
  if (
    !makerIdentityId ||
    !checkerIdentityId ||
    makerIdentityId === checkerIdentityId
  ) {
    throw new Error(code);
  }
}

export function assertSecureExternalReference(
  value: unknown,
  code = "SECURE_REFERENCE_INVALID",
): string {
  const reference = requireText(value, code, 512);
  if (INLINE_SECRET.test(reference)) throw new Error(code);
  let parsed: URL;
  try {
    parsed = new URL(reference);
  } catch {
    throw new Error(code);
  }
  if (!["https:", "evidence:", "vault:"].includes(parsed.protocol)) {
    throw new Error(code);
  }
  if (
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash ||
    !parsed.hostname ||
    parsed.hostname === "localhost" ||
    parsed.hostname === "::1" ||
    /^127(?:\.\d{1,3}){3}$/.test(parsed.hostname)
  ) {
    throw new Error(code);
  }
  return reference;
}

export function assertNoInlineSecret(
  value: string,
  code = "INLINE_SECRET_FORBIDDEN",
): void {
  if (INLINE_SECRET.test(value)) throw new Error(code);
}

export function assertProductionIdentifier(
  value: string,
  code = "NON_PRODUCTION_IDENTITY_FORBIDDEN",
): void {
  requireStableId(value, code);
  if (NON_PRODUCTION_TOKEN.test(value)) throw new Error(code);
}

export function assertPositiveRowVersion(value: number): void {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error("ROW_VERSION_INVALID");
  }
}

export function assertExpectedSingleMutation(count: number): void {
  if (count !== 1) throw new Error("ATOMIC_MUTATION_COUNT_INVALID");
}

export function safeIssue(error: unknown): string {
  const message = error instanceof Error ? error.message : "PHASE8_INVALID";
  return message
    .replace(
      /(?:postgres(?:ql)?:\/\/|mysql:\/\/|mongodb(?:\+srv)?:\/\/|https?:\/\/)[^\s]+/gi,
      "[REDACTED_REFERENCE]",
    )
    .replace(
      /(?:password|secret|token|api[_-]?key)\s*[:=]\s*[^\s,;]+/gi,
      "$1=[REDACTED]",
    )
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .slice(0, 256);
}
