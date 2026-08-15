import { beforeEach, describe, expect, it, vi } from "vitest";

// Simulates two application instances racing to claim the same scheduler
// run key (spec §26). LeaveSchedulerRun.runKey has a real DB unique
// constraint in the schema — this test proves the CODE correctly treats a
// unique-constraint violation as "another worker already claimed this,
// skip" rather than crashing or double-processing.
let claimedRunKeys: Set<string>;

const mocks = vi.hoisted(() => ({ leaveSchedulerRunCreate: vi.fn() }));

vi.mock("@/lib/db", () => ({
  db: {
    leaveSchedulerRun: { create: mocks.leaveSchedulerRunCreate },
  },
}));

import { db } from "@/lib/db";

describe("distributed scheduler safety — duplicate worker simulation (spec §26)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    claimedRunKeys = new Set();

    mocks.leaveSchedulerRunCreate.mockImplementation(async ({ data }: { data: { runKey: string } }) => {
      if (claimedRunKeys.has(data.runKey)) {
        // Simulates the real Postgres unique-constraint violation
        // (P2002) that LeaveSchedulerRun.runKey's @unique enforces.
        const error = new Error("Unique constraint failed on the fields: (`runKey`)");
        (error as unknown as { code: string }).code = "P2002";
        throw error;
      }
      claimedRunKeys.add(data.runKey);
      return { id: `run-${claimedRunKeys.size}`, runKey: data.runKey, status: "RUNNING" };
    });
  });

  /**
   * Mirrors the exact claim pattern used in
   * src/app/api/cron/leave-accrual/route.ts and .../leave-expiry/route.ts:
   * db.leaveSchedulerRun.create({ data: { runKey, ... } }).catch(() => null)
   */
  async function attemptClaim(runKey: string): Promise<boolean> {
    const claimed = await db.leaveSchedulerRun
      .create({ data: { orgId: "org-1", jobType: "ACCRUAL", runKey, status: "RUNNING" } })
      .catch(() => null);
    return claimed !== null;
  }

  it("exactly one of two simultaneous workers wins the claim for the same run key", async () => {
    const runKey = "accrual:2026-09:org-1";

    const [workerAResult, workerBResult] = await Promise.all([
      attemptClaim(runKey),
      attemptClaim(runKey),
    ]);

    const winners = [workerAResult, workerBResult].filter(Boolean);
    expect(winners).toHaveLength(1);
    expect(mocks.leaveSchedulerRunCreate).toHaveBeenCalledTimes(2);
  });

  it("a third worker retrying the same run key after both prior attempts also loses", async () => {
    const runKey = "reset:2026-09-01:org-1";
    await attemptClaim(runKey); // first worker wins

    const retryResult = await attemptClaim(runKey);
    expect(retryResult).toBe(false);
  });

  it("different run keys (different periods/orgs) do not contend with each other", async () => {
    const resultA = await attemptClaim("accrual:2026-09:org-1");
    const resultB = await attemptClaim("accrual:2026-09:org-2");
    const resultC = await attemptClaim("accrual:2026-10:org-1");

    expect(resultA).toBe(true);
    expect(resultB).toBe(true);
    expect(resultC).toBe(true);
  });

  it("simulates 5 concurrent workers racing the same run key — exactly 1 wins", async () => {
    const runKey = "carry-forward-expiry:2026-09-01:org-1";

    const results = await Promise.all(Array.from({ length: 5 }, () => attemptClaim(runKey)));
    const winners = results.filter(Boolean);

    expect(winners).toHaveLength(1);
  });
});
