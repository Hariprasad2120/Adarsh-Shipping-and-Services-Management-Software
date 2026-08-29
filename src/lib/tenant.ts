import { NextResponse } from "next/server";

/**
 * Tenant-boundary helpers (MON-S1 sections 9 & 10).
 *
 * The rule: authorisation for a tenant-owned object is
 *   authenticated session  +  verified org membership  +  object.orgId === session org
 * and the org context ALWAYS comes from the session, never from the URL, body,
 * query string or a client-supplied `organisationId`.
 *
 * Two safe patterns:
 *
 *  1. Scope the query itself (preferred — a wrong id just returns nothing):
 *       const inv = await db.invoice.findFirst({
 *         where: { id, ...tenantWhere(actor.orgId) },
 *       });
 *       assertFound(inv);
 *
 *  2. Fetch then check (when you must use findUnique / a shared loader):
 *       const inv = await db.invoice.findUnique({ where: { id } });
 *       assertSameOrg(inv, actor.orgId);   // throws 404 on mismatch/missing
 */

export class TenantAccessError extends Error {
  constructor(
    readonly status: 404 | 403 = 404,
    message = "Not found",
  ) {
    super(message);
    this.name = "TenantAccessError";
  }

  get response(): NextResponse {
    const code = this.status === 403 ? "FORBIDDEN" : "NOT_FOUND";
    return NextResponse.json(
      { ok: false, error: { code, message: this.message } },
      { status: this.status, headers: { "Cache-Control": "no-store" } },
    );
  }
}

/** `where` fragment that constrains a query to one organisation. */
export function tenantWhere(orgId: string): { orgId: string } {
  if (!orgId) throw new TenantAccessError(403, "No active organisation.");
  return { orgId };
}

/**
 * Assert an already-loaded record belongs to `orgId`. Returns the record
 * narrowed to non-null. Throws `TenantAccessError(404)` on missing OR mismatch
 * — the two are deliberately indistinguishable to the caller so a probe cannot
 * tell "exists in another org" from "does not exist".
 *
 * `orgKey` lets you point at a nested owner, e.g.
 *   assertSameOrg(job, orgId)                       // job.orgId
 *   assertSameOrg(row, orgId, (r) => r.job.orgId)   // nested
 */
export function assertSameOrg<T extends Record<string, unknown>>(
  record: T | null | undefined,
  orgId: string,
  orgKey: keyof T | ((r: T) => string | null | undefined) = "orgId" as keyof T,
): T {
  if (!orgId) throw new TenantAccessError(403, "No active organisation.");
  if (!record) throw new TenantAccessError(404);
  const owner =
    typeof orgKey === "function" ? orgKey(record) : (record[orgKey] as unknown);
  if (owner !== orgId) throw new TenantAccessError(404);
  return record;
}

/** Narrow a possibly-null lookup to non-null or throw a 404. */
export function assertFound<T>(record: T | null | undefined): T {
  if (record === null || record === undefined) throw new TenantAccessError(404);
  return record;
}

/**
 * Guard for any client-supplied organisation identifier. The only acceptable
 * value is the caller's own session org; anything else is a boundary probe.
 */
export function assertOrgMatchesSession(
  suppliedOrgId: string | null | undefined,
  sessionOrgId: string,
): void {
  if (!sessionOrgId) throw new TenantAccessError(403, "No active organisation.");
  if (suppliedOrgId && suppliedOrgId !== sessionOrgId) {
    throw new TenantAccessError(404);
  }
}
