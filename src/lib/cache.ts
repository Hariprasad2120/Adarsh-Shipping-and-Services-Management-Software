import { db } from "@/lib/db";
import { cache } from "react";
import { revalidateTag } from "next/cache";

const ORG_METADATA_TAG = "org:metadata";

const metadataMemCache = new Map<string, { data: any; expiresAt: number }>();
const MEM_TTL = 3 * 60 * 1000; // 3 minutes TTL for static org metadata

export function invalidateOrgMetadataCache() {
  metadataMemCache.clear();
  try {
    revalidateTag(ORG_METADATA_TAG, "max");
  } catch (error) {
    if (!(error instanceof Error && error.message.includes("incrementalCache missing"))) {
      throw error;
    }
  }
}

export const getCachedBranches = cache(async (orgId: string) => {
  const cacheKey = `branches:${orgId}`;
  const now = Date.now();
  const hit = metadataMemCache.get(cacheKey);
  if (hit && hit.expiresAt > now) return hit.data;

  const branches = await db.branch.findMany({
    where: { orgId },
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });

  metadataMemCache.set(cacheKey, { data: branches, expiresAt: now + MEM_TTL });
  return branches;
});

export const getCachedUsers = cache(async (orgId: string) => {
  const cacheKey = `users:${orgId}`;
  const now = Date.now();
  const hit = metadataMemCache.get(cacheKey);
  if (hit && hit.expiresAt > now) return hit.data;

  const users = await db.user.findMany({
    where: { orgId, active: true },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  metadataMemCache.set(cacheKey, { data: users, expiresAt: now + MEM_TTL });
  return users;
});

export const getCachedCustomers = cache(async (orgId: string) => {
  const cacheKey = `customers:${orgId}`;
  const now = Date.now();
  const hit = metadataMemCache.get(cacheKey);
  if (hit && hit.expiresAt > now) return hit.data;

  const customers = await db.crmAccount.findMany({
    where: { orgId, type: "Customer" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  metadataMemCache.set(cacheKey, { data: customers, expiresAt: now + MEM_TTL });
  return customers;
});

export const getCachedLeaveTypes = cache(async (orgId: string) => {
  const cacheKey = `leaveTypes:${orgId}`;
  const now = Date.now();
  const hit = metadataMemCache.get(cacheKey);
  if (hit && hit.expiresAt > now) return hit.data;

  const leaveTypes = await db.leaveType.findMany({
    where: { orgId },
    orderBy: { name: "asc" },
  });

  metadataMemCache.set(cacheKey, { data: leaveTypes, expiresAt: now + MEM_TTL });
  return leaveTypes;
});
