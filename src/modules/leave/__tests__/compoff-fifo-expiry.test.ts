import { describe, expect, it, vi, beforeEach } from "vitest";
import { Prisma } from "@/generated/prisma/client";

// In-memory CompOffCredit table so lot-level consume/release/expiry logic
// (createdAt/earnedDate ordering, partial consumption, remainder-only
// expiry) exercises real control flow instead of trivially stubbed calls.
let lots: Array<{
  id: string;
  orgId: string;
  userId: string;
  earnedDate: Date;
  units: Prisma.Decimal;
  consumedUnits: Prisma.Decimal;
  unit: string;
  status: string;
  expiresAt: Date | null;
}>;

const postedEntries = vi.hoisted(() => ({ calls: [] as Record<string, unknown>[] }));

vi.mock("@/lib/db", () => ({
  db: {
    compOffCredit: {
      findMany: vi.fn(async ({ where }: { where: Record<string, unknown> }) =>
        lots.filter((l) => {
          if (where.orgId && l.orgId !== where.orgId) return false;
          if (where.userId && l.userId !== where.userId) return false;
          const statusFilter = where.status as { in?: string[] } | string | undefined;
          if (statusFilter) {
            const allowed = typeof statusFilter === "string" ? [statusFilter] : statusFilter.in ?? [];
            if (!allowed.includes(l.status)) return false;
          }
          const expiresFilter = where.expiresAt as { lte?: Date; gt?: Date } | undefined;
          if (expiresFilter?.lte && (!l.expiresAt || l.expiresAt > expiresFilter.lte)) return false;
          if (expiresFilter?.gt && (!l.expiresAt || l.expiresAt <= expiresFilter.gt)) return false;
          return true;
        }).sort((a, b) => a.earnedDate.getTime() - b.earnedDate.getTime()),
      ),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => lots.find((l) => l.id === where.id) ?? null),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const lot = lots.find((l) => l.id === where.id)!;
        Object.assign(lot, data);
        return lot;
      }),
    },
    leaveType: { findFirst: vi.fn(async () => ({ id: "comp-off-type-1" })) },
  },
}));

vi.mock("@/modules/leave/ledger", async () => {
  const actual = await vi.importActual<typeof import("../ledger")>("../ledger");
  return {
    ...actual,
    postLedgerEntry: vi.fn(async (input: Record<string, unknown>) => {
      postedEntries.calls.push(input);
      return { id: `entry-${postedEntries.calls.length}` };
    }),
  };
});
vi.mock("@/modules/leave/audit", () => ({ writeLeaveAudit: vi.fn() }));
vi.mock("@/lib/notify", () => ({ notify: vi.fn() }));

import { consumeCompOffFifo, releaseCompOffFifo, expireStaleCompOffCredits, notifyExpiringCompOffCredits } from "../compoff";
import { notify } from "@/lib/notify";

function lot(id: string, earnedDate: string, units: number, consumedUnits = 0, expiresAt: string | null = null, status = "APPROVED") {
  return {
    id,
    orgId: "org-1",
    userId: "user-1",
    earnedDate: new Date(earnedDate),
    units: new Prisma.Decimal(units),
    consumedUnits: new Prisma.Decimal(consumedUnits),
    unit: "DAY",
    status,
    expiresAt: expiresAt ? new Date(expiresAt) : null,
  };
}

describe("comp-off FIFO consumption and expiry (spec §24)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    postedEntries.calls = [];
    lots = [];
  });

  it("consumes the oldest lot first and spans into the next lot when the oldest is insufficient", async () => {
    lots = [lot("lot-1", "2026-01-01", 2), lot("lot-2", "2026-02-01", 3)];

    const allocation = await consumeCompOffFifo("org-1", "user-1", 4);

    expect(allocation.map((a) => ({ creditId: a.creditId, unitsApplied: a.unitsApplied.toString() }))).toEqual([
      { creditId: "lot-1", unitsApplied: "2" },
      { creditId: "lot-2", unitsApplied: "2" },
    ]);
    expect(lots[0].consumedUnits.toString()).toBe("2");
    expect(lots[0].status).toBe("CONSUMED");
    expect(lots[1].consumedUnits.toString()).toBe("2");
    expect(lots[1].status).toBe("APPROVED");
  });

  it("expires only the unconsumed remainder of a lot, not the full original grant", async () => {
    // Lot had 5 units, 3 already consumed by an approved leave request —
    // the bug this fixes would have posted a -5 expiry instead of -2,
    // double-counting the 3 units that were legitimately spent.
    lots = [lot("lot-1", "2026-01-01", 5, 3, "2026-01-10")];

    const result = await expireStaleCompOffCredits("org-1", new Date("2026-01-15"));

    expect(result.processed).toBe(1);
    expect(postedEntries.calls).toHaveLength(1);
    const entry = postedEntries.calls[0];
    expect((entry.quantity as Prisma.Decimal).toString()).toBe("-2");
    expect(lots[0].status).toBe("EXPIRED");
  });

  it("does not post an expiry entry at all when a lot was fully consumed before its expiry date", async () => {
    lots = [lot("lot-1", "2026-01-01", 5, 5, "2026-01-10", "CONSUMED")];

    const result = await expireStaleCompOffCredits("org-1", new Date("2026-01-15"));

    expect(result.processed).toBe(0);
    expect(postedEntries.calls).toHaveLength(0);
    expect(lots[0].status).toBe("EXPIRED");
  });

  it("releaseCompOffFifo reverses consumedUnits and reopens a fully-consumed lot back to APPROVED", async () => {
    lots = [lot("lot-1", "2026-01-01", 2, 2, null, "CONSUMED")];

    await releaseCompOffFifo([{ creditId: "lot-1", unitsApplied: 2 }]);

    expect(lots[0].consumedUnits.toString()).toBe("0");
    expect(lots[0].status).toBe("APPROVED");
  });

  it("releaseCompOffFifo never drives consumedUnits negative", async () => {
    lots = [lot("lot-1", "2026-01-01", 2, 1)];

    await releaseCompOffFifo([{ creditId: "lot-1", unitsApplied: 5 }]);

    expect(lots[0].consumedUnits.toString()).toBe("0");
  });
});

describe("notifyExpiringCompOffCredits (spec §36 notification-coverage gap)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    postedEntries.calls = [];
    lots = [];
  });

  it("notifies for a lot expiring within the warning window", async () => {
    lots = [lot("lot-1", "2026-01-01", 5, 0, "2026-01-10")];

    const result = await notifyExpiringCompOffCredits("org-1", new Date("2026-01-05"), 7);

    expect(result.notified).toBe(1);
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1", kind: "COMP_OFF_EXPIRING_SOON" }),
    );
  });

  it("does not notify for a lot expiring further out than the warning window", async () => {
    lots = [lot("lot-1", "2026-01-01", 5, 0, "2026-02-01")];

    const result = await notifyExpiringCompOffCredits("org-1", new Date("2026-01-05"), 7);

    expect(result.notified).toBe(0);
    expect(notify).not.toHaveBeenCalled();
  });

  it("does not notify for a lot that has already fully expired (that's expireStaleCompOffCredits' job)", async () => {
    lots = [lot("lot-1", "2026-01-01", 5, 0, "2026-01-01")];

    const result = await notifyExpiringCompOffCredits("org-1", new Date("2026-01-05"), 7);

    expect(result.notified).toBe(0);
  });

  it("does not notify for a lot that is fully consumed even if it's within the warning window", async () => {
    lots = [lot("lot-1", "2026-01-01", 5, 5, "2026-01-10")]; // consumedUnits === units

    const result = await notifyExpiringCompOffCredits("org-1", new Date("2026-01-05"), 7);

    expect(result.notified).toBe(0);
  });
});
