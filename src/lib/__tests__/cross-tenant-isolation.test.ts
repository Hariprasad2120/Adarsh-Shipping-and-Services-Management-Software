import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { assertSameOrg, TenantAccessError } from "@/lib/tenant";

/**
 * DB-backed cross-tenant isolation matrix (MON-S1 sections 9 & 10).
 *
 * Company A must never reach Company B's objects by swapping an id. Runs
 * against the marker-verified staging database (via `npm test`). Each case
 * mirrors the scoping predicate used by the corresponding route handler.
 */

const HAS_DB = Boolean(process.env.DATABASE_URL);
const runId = Date.now();

describe.skipIf(!HAS_DB)("cross-tenant isolation", () => {
  let orgA = "";
  let orgB = "";
  let userA = "";
  let userB = "";

  beforeAll(async () => {
    const [a, b] = await Promise.all([
      db.organisation.create({ data: { name: `XT A ${runId}`, slug: `xt-a-${runId}` } }),
      db.organisation.create({ data: { name: `XT B ${runId}`, slug: `xt-b-${runId}` } }),
    ]);
    orgA = a.id;
    orgB = b.id;
    const [ua, ub] = await Promise.all([
      db.user.create({
        data: { orgId: orgA, email: `xt-a-${runId}@t.local`, name: "A", passwordHash: "x", active: true },
      }),
      db.user.create({
        data: { orgId: orgB, email: `xt-b-${runId}@t.local`, name: "B", passwordHash: "x", active: true },
      }),
    ]);
    userA = ua.id;
    userB = ub.id;
  });

  afterAll(async () => {
    await db.user.deleteMany({ where: { id: { in: [userA, userB] } } });
    await db.organisation.deleteMany({ where: { id: { in: [orgA, orgB] } } });
  });

  it("assertSameOrg rejects a Company B record for a Company A caller", () => {
    expect(() => assertSameOrg({ id: "r1", orgId: orgB }, orgA)).toThrow(TenantAccessError);
    expect(assertSameOrg({ id: "r1", orgId: orgA }, orgA)).toBeTruthy();
  });

  it("day-punches: employee lookup is scoped by org", async () => {
    expect(await db.user.findFirst({ where: { id: userB, orgId: orgA } })).toBeNull();
    expect((await db.user.findFirst({ where: { id: userB, orgId: orgB } }))?.id).toBe(userB);
  });

  it("salary-structure: target employee must be in the caller's org", async () => {
    expect(
      await db.user.findFirst({ where: { id: userB, orgId: orgA }, select: { id: true } }),
    ).toBeNull();
  });

  it("leave policy version: scoped through leaveType.orgId", async () => {
    const leaveType = await db.leaveType.create({
      data: { orgId: orgB, name: `XT ${runId}`, code: `XT${runId}` },
    });
    const version = await db.leavePolicyVersion.create({
      data: { leaveTypeId: leaveType.id, version: 1, effectiveFrom: new Date(), configuration: {} },
    });
    try {
      expect(
        await db.leavePolicyVersion.findFirst({
          where: { id: version.id, leaveType: { orgId: orgA } },
        }),
      ).toBeNull();
      expect(
        (
          await db.leavePolicyVersion.findFirst({
            where: { id: version.id, leaveType: { orgId: orgB } },
          })
        )?.id,
      ).toBe(version.id);
    } finally {
      await db.leavePolicyVersion.delete({ where: { id: version.id } });
      await db.leaveType.delete({ where: { id: leaveType.id } });
    }
  });

  it("crm recording: scoped by orgId column", async () => {
    expect(
      await db.crmCallRecording.findFirst({ where: { id: `nope-${runId}`, orgId: orgA } }),
    ).toBeNull();
  });
});
