import { db } from "@/lib/db";
import { cache } from "react";
import { revalidateTag } from "next/cache";

const ORG_METADATA_TAG = "org:metadata";

const metadataMemCache = new Map<string, { data: unknown; expiresAt: number }>();
const MEM_TTL = 3 * 60 * 1000; // 3 minutes TTL for static org metadata

async function withMetadataCache<T>(
  cacheKey: string,
  loader: () => Promise<T>,
): Promise<T> {
  const now = Date.now();
  const hit = metadataMemCache.get(cacheKey);
  if (hit && hit.expiresAt > now) return hit.data as T;

  const data = await loader();
  metadataMemCache.set(cacheKey, { data, expiresAt: now + MEM_TTL });
  return data;
}

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
  return withMetadataCache(`branches:${orgId}`, () =>
    db.branch.findMany({
      where: { orgId },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    }),
  );
});

export const getCachedUsers = cache(async (orgId: string) => {
  return withMetadataCache(`users:${orgId}`, () =>
    db.user.findMany({
      where: { orgId, active: true },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
  );
});

export const getCachedCustomers = cache(async (orgId: string) => {
  return withMetadataCache(`customers:${orgId}`, () =>
    db.crmAccount.findMany({
      where: { orgId, type: "Customer" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  );
});

export const getCachedLeaveTypes = cache(async (orgId: string) => {
  return withMetadataCache(`leaveTypes:${orgId}`, () =>
    db.leaveType.findMany({
      where: { orgId },
      orderBy: { name: "asc" },
    }),
  );
});
