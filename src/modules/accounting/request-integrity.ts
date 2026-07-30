import { createHash, randomUUID } from "node:crypto";

import { Prisma } from "@/generated/prisma/client";

function canonicalize(value: unknown): unknown {
  if (value instanceof Prisma.Decimal) {
    return value.toString();
  }
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "bigint") {
    return value.toString();
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("Canonical payload cannot contain non-finite numbers");
    }
    return value;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, child]) => child !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, canonicalize(child)]),
    );
  }
  throw new Error(`Unsupported canonical payload value: ${typeof value}`);
}

export function canonicalPayload(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

export function payloadHash(value: unknown): string {
  return createHash("sha256").update(canonicalPayload(value)).digest("hex");
}

export function newAccountingRequestId(): string {
  return randomUUID();
}
