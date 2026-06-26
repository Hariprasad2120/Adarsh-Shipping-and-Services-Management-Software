import { db } from "@/lib/db";
import { cache } from "react";
import { revalidateTag, unstable_cache } from "next/cache";
import { NextResponse } from "next/server";

import { timeBlock } from "./performance";

export type Caps = Record<string, boolean>;

const RBAC_PERMISSIONS_TAG = "rbac:user-permissions";

// Process-level in-memory cache — shared across all concurrent requests in the same
// Node process. Eliminates thundering herd when unstable_cache TTL expires and multiple
// simultaneous requests (page + API routes) all miss the cross-request cache at once.
const permMemCache = new Map<string, { keys: string[]; expiresAt: number }>();
const PERM_MEM_TTL = 5 * 60 * 1000; // 5 minutes, matches unstable_cache revalidate

async function loadPermissionKeysFromDb(userId: string): Promise<string[]> {
  const rows = await db.$queryRaw<{ key: string }[]>`
    SELECT DISTINCT p."key"
    FROM "UserRole" ur
    INNER JOIN "RolePermission" rp ON rp."roleId" = ur."roleId"
    INNER JOIN "Permission" p ON p."id" = rp."permissionId"
    WHERE ur."userId" = ${userId}
  `;

  return rows.map((row) => row.key);
}

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

const loadCachedPermissionKeys = unstable_cache(
  loadPermissionKeysFromDb,
  ["rbac:user-permission-keys"],
  {
    tags: [RBAC_PERMISSIONS_TAG],
    revalidate: 300,
  },
);

async function loadPermissionKeys(userId: string): Promise<string[]> {
  const now = Date.now();
  const hit = permMemCache.get(userId);
  if (hit && hit.expiresAt > now) return hit.keys;

  let keys: string[];
  try {
    keys = await loadCachedPermissionKeys(userId);
  } catch (error) {
    if (error instanceof Error && error.message.includes("incrementalCache missing")) {
      keys = await loadPermissionKeysFromDb(userId);
    } else {
      throw error;
    }
  }

  permMemCache.set(userId, { keys, expiresAt: now + PERM_MEM_TTL });
  return keys;
}

export function invalidateRbacCache() {
  permMemCache.clear();
  try {
    revalidateTag(RBAC_PERMISSIONS_TAG, "max");
  } catch (error) {
    if (!(error instanceof Error && error.message.includes("incrementalCache missing"))) {
      throw error;
    }
  }
}

// Load all permission keys for a user (in-memory cache → unstable_cache → DB)
export const loadUserPermissions = cache(async (userId: string): Promise<Set<string>> => {
  return timeBlock(`rbac:loadUserPermissions`, async () => {
    const keys = await loadPermissionKeys(userId);
    return new Set(keys);
  }, 50);
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
