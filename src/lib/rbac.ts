import { db } from "@/lib/db";
import { cache } from "react";
import { NextResponse } from "next/server";

export type Caps = Record<string, boolean>;

export class ForbiddenError extends Error {
  constructor(key: string) {
    super(`Forbidden: missing permission ${key}`);
    this.name = "ForbiddenError";
  }
}

export function apiError(error: unknown) {
  if (error instanceof ForbiddenError) {
    return NextResponse.json({ ok: false, error: { code: "FORBIDDEN", message: error.message } }, { status: 403 });
  }
  const msg = error instanceof Error ? error.message : "Internal error";
  return NextResponse.json({ ok: false, error: { code: "INTERNAL_ERROR", message: msg } }, { status: 500 });
}

// Load all permission keys for a user (cached per request via React cache)
export const loadUserPermissions = cache(async (userId: string): Promise<Set<string>> => {
  const startedAt = performance.now();
  try {
    const rows = await db.rolePermission.findMany({
      where: { role: { userRoles: { some: { userId } } } },
      select: { permission: { select: { key: true } } },
    });
    return new Set(rows.map((r) => r.permission.key));
  } finally {
    const elapsedMs = performance.now() - startedAt;
    console.debug(`rbac:loadUserPermissions ${elapsedMs.toFixed(1)}ms`);
  }
});

export async function can(userId: string, permissionKey: string): Promise<boolean> {
  const perms = await loadUserPermissions(userId);
  return perms.has(permissionKey);
}

export async function canAll(userId: string, keys: string[]): Promise<boolean> {
  const perms = await loadUserPermissions(userId);
  return keys.every((k) => perms.has(k));
}

// Throws ForbiddenError if user lacks permission — use in server actions and route handlers
export async function requirePermission(userId: string, permissionKey: string): Promise<void> {
  const allowed = await can(userId, permissionKey);
  if (!allowed) {
    throw new ForbiddenError(permissionKey);
  }
}

// Serialisable caps object for client-side nav gating
export async function loadCaps(userId: string): Promise<Caps> {
  const perms = await loadUserPermissions(userId);
  const result: Record<string, boolean> = {};
  for (const key of perms) {
    result[key] = true;
  }
  return result;
}
