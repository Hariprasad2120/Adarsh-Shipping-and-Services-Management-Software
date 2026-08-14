import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@/generated/prisma/client";
import { postLedgerEntry, InsufficientBalanceError } from "../ledger";

// In-memory fake mirroring the two tables postLedgerEntry touches, so the
// mocked $transaction callback can exercise real optimistic-lock and
// idempotency-dedup control flow rather than trivially stubbed responses.
// balance is a real Prisma.Decimal (not a plain number) because ledger.ts
// calls .plus()/.minus()/.isNegative() on it — matching what Postgres
// actually returns for a DECIMAL(10,4) column now that the ledger has been
// migrated off JS floats.
let ledgerEntries: Array<Record<string, unknown>>;
let balanceRow: { id: string; balance: Prisma.Decimal; version: number } | null;
let forceVersionConflictOnce: boolean;

const mocks = vi.hoisted(() => ({ transaction: vi.fn() }));

vi.mock("@/lib/db", () => ({
  db: {
    $transaction: mocks.transaction,
    leaveLedgerEntry: {
      findUnique: vi.fn(async ({ where }: { where: { idempotencyKey: string } }) =>
        ledgerEntries.find((e) => e.idempotencyKey === where.idempotencyKey) ?? null,
      ),
    },
    leaveBalance: {
      findUnique: vi.fn(async () => balanceRow),
    },
  },
}));

describe("postLedgerEntry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ledgerEntries = [];
    balanceRow = { id: "balance-1", balance: new Prisma.Decimal(10), version: 0 };
    forceVersionConflictOnce = false;

    mocks.transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        leaveLedgerEntry: {
          findUnique: async ({ where }: { where: { idempotencyKey: string } }) =>
            ledgerEntries.find((e) => e.idempotencyKey === where.idempotencyKey) ?? null,
          create: async ({ data }: { data: Record<string, unknown> }) => {
            const entry = { id: `entry-${ledgerEntries.length + 1}`, ...data };
            ledgerEntries.push(entry);
            return entry;
          },
        },
        leaveBalance: {
          findUnique: async () => balanceRow,
          create: async ({ data }: { data: Record<string, unknown> }) => {
            balanceRow = {
              id: "balance-1",
              balance: data.balance as Prisma.Decimal,
              version: data.version as number,
            };
            return balanceRow;
          },
          updateMany: async ({
            where,
            data,
          }: {
            where: { id: string; version: number };
            data: { balance: Prisma.Decimal; version: { increment: number } };
          }) => {
            if (forceVersionConflictOnce) {
              forceVersionConflictOnce = false;
              return { count: 0 }; // simulates another writer having already bumped the version
            }
            if (!balanceRow || balanceRow.id !== where.id || balanceRow.version !== where.version) {
              return { count: 0 };
            }
            balanceRow = { ...balanceRow, balance: data.balance, version: balanceRow.version + data.version.increment };
            return { count: 1 };
          },
        },
      };
      return callback(tx);
    });
  });

  it("credits the balance and returns balanceBefore/balanceAfter correctly", async () => {
    const entry = await postLedgerEntry({
      orgId: "org-1",
      userId: "user-1",
      leaveTypeId: "lt-1",
      type: "MANUAL_CREDIT",
      quantity: 5,
      effectiveDate: new Date("2026-08-14"),
      year: 2026,
      source: "ADMIN",
      idempotencyKey: "credit-1",
    });

    expect((entry as { balanceBefore: Prisma.Decimal }).balanceBefore.toNumber()).toBe(10);
    expect((entry as { balanceAfter: Prisma.Decimal }).balanceAfter.toNumber()).toBe(15);
    expect(balanceRow?.balance.toNumber()).toBe(15);
  });

  it("returns the existing entry unchanged on a duplicate idempotencyKey, without double-crediting", async () => {
    const key = "dup-key-1";
    const first = await postLedgerEntry({
      orgId: "org-1",
      userId: "user-1",
      leaveTypeId: "lt-1",
      type: "ACCRUAL",
      quantity: 2,
      effectiveDate: new Date("2026-08-14"),
      year: 2026,
      source: "SCHEDULER",
      idempotencyKey: key,
    });
    const second = await postLedgerEntry({
      orgId: "org-1",
      userId: "user-1",
      leaveTypeId: "lt-1",
      type: "ACCRUAL",
      quantity: 2,
      effectiveDate: new Date("2026-08-14"),
      year: 2026,
      source: "SCHEDULER",
      idempotencyKey: key,
    });

    expect((first as { id: string }).id).toBe((second as { id: string }).id);
    expect(balanceRow?.balance.toNumber()).toBe(12); // only credited once, not 14
  });

  it("throws InsufficientBalanceError when debit would go negative and allowNegative is false", async () => {
    await expect(
      postLedgerEntry({
        orgId: "org-1",
        userId: "user-1",
        leaveTypeId: "lt-1",
        type: "LEAVE_RESERVED",
        quantity: -15, // balance is only 10
        effectiveDate: new Date("2026-08-14"),
        year: 2026,
        source: "EMPLOYEE",
        idempotencyKey: "debit-1",
        allowNegative: false,
      }),
    ).rejects.toThrow(InsufficientBalanceError);

    expect(balanceRow?.balance.toNumber()).toBe(10); // unchanged
  });

  it("allows a debit past zero when allowNegative is true", async () => {
    const entry = await postLedgerEntry({
      orgId: "org-1",
      userId: "user-1",
      leaveTypeId: "lt-1",
      type: "LEAVE_RESERVED",
      quantity: -15,
      effectiveDate: new Date("2026-08-14"),
      year: 2026,
      source: "EMPLOYEE",
      idempotencyKey: "debit-2",
      allowNegative: true,
    });

    expect((entry as { balanceAfter: Prisma.Decimal }).balanceAfter.toNumber()).toBe(-5);
    expect(balanceRow?.balance.toNumber()).toBe(-5);
  });

  it("retries and succeeds after a single simulated version conflict", async () => {
    forceVersionConflictOnce = true;

    const entry = await postLedgerEntry({
      orgId: "org-1",
      userId: "user-1",
      leaveTypeId: "lt-1",
      type: "MANUAL_CREDIT",
      quantity: 1,
      effectiveDate: new Date("2026-08-14"),
      year: 2026,
      source: "ADMIN",
      idempotencyKey: "retry-1",
    });

    // First attempt hit the simulated conflict (count: 0) and retried;
    // second attempt succeeded against the still-current balanceRow.
    expect((entry as { balanceAfter: Prisma.Decimal }).balanceAfter.toNumber()).toBe(11);
    expect(mocks.transaction).toHaveBeenCalledTimes(2);
  });
});

describe("postLedgerEntry — decimal precision (no float drift)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ledgerEntries = [];
    balanceRow = { id: "balance-1", balance: new Prisma.Decimal(0), version: 0 };
    forceVersionConflictOnce = false;

    mocks.transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        leaveLedgerEntry: {
          findUnique: async ({ where }: { where: { idempotencyKey: string } }) =>
            ledgerEntries.find((e) => e.idempotencyKey === where.idempotencyKey) ?? null,
          create: async ({ data }: { data: Record<string, unknown> }) => {
            const entry = { id: `entry-${ledgerEntries.length + 1}`, ...data };
            ledgerEntries.push(entry);
            return entry;
          },
        },
        leaveBalance: {
          findUnique: async () => balanceRow,
          create: async ({ data }: { data: Record<string, unknown> }) => {
            balanceRow = {
              id: "balance-1",
              balance: data.balance as Prisma.Decimal,
              version: data.version as number,
            };
            return balanceRow;
          },
          updateMany: async ({
            where,
            data,
          }: {
            where: { id: string; version: number };
            data: { balance: Prisma.Decimal; version: { increment: number } };
          }) => {
            if (!balanceRow || balanceRow.id !== where.id || balanceRow.version !== where.version) {
              return { count: 0 };
            }
            balanceRow = { ...balanceRow, balance: data.balance, version: balanceRow.version + data.version.increment };
            return { count: 1 };
          },
        },
      };
      return callback(tx);
    });
  });

  it("0.1 + 0.2 style repeated credits sum to exactly 0.3, unlike JS float", async () => {
    // Proves the specific IEEE-754 failure mode named in the closure spec:
    // in plain JS, 0.1 + 0.2 === 0.30000000000000004. Decimal must not.
    expect(0.1 + 0.2).not.toBe(0.3); // sanity-check the premise itself
    await postLedgerEntry({
      orgId: "org-1", userId: "user-1", leaveTypeId: "lt-1", type: "MANUAL_CREDIT",
      quantity: 0.1, effectiveDate: new Date("2026-08-14"), year: 2026, source: "ADMIN",
      idempotencyKey: "drift-1",
    });
    const entry = await postLedgerEntry({
      orgId: "org-1", userId: "user-1", leaveTypeId: "lt-1", type: "MANUAL_CREDIT",
      quantity: 0.2, effectiveDate: new Date("2026-08-14"), year: 2026, source: "ADMIN",
      idempotencyKey: "drift-2",
    });
    expect((entry as { balanceAfter: Prisma.Decimal }).balanceAfter.toString()).toBe("0.3");
  });

  it("1000 quarter-day (0.25) accumulations sum to exactly 250, no drift", async () => {
    for (let i = 0; i < 1000; i++) {
      await postLedgerEntry({
        orgId: "org-1", userId: "user-1", leaveTypeId: "lt-1", type: "ACCRUAL",
        quantity: 0.25, effectiveDate: new Date("2026-08-14"), year: 2026, source: "SCHEDULER",
        idempotencyKey: `quarter-${i}`,
      });
    }
    expect(balanceRow?.balance.toString()).toBe("250");
  });

  it("15-minute-as-fraction-of-day accumulation (1/96 = 0.010416...) does not drift over many additions", async () => {
    // 15 minutes = 1/96 of a day. In float this repeating decimal
    // accumulates error over many additions; Decimal(10,4) rounds
    // consistently at 4 decimal places instead of silently drifting.
    const fifteenMinutes = new Prisma.Decimal(1).dividedBy(96).toDecimalPlaces(4);
    for (let i = 0; i < 96; i++) {
      await postLedgerEntry({
        orgId: "org-1", userId: "user-1", leaveTypeId: "lt-1", type: "ACCRUAL",
        quantity: fifteenMinutes, effectiveDate: new Date("2026-08-14"), year: 2026, source: "SCHEDULER",
        idempotencyKey: `fifteen-min-${i}`,
      });
    }
    // 96 * 0.0104 = 0.9984 (not exactly 1, because 1/96 itself isn't exact
    // at 4 decimal places — but it is EXACTLY 0.9984 every time, never
    // 0.99840000000000004 or similar float noise).
    expect(balanceRow?.balance.toString()).toBe("0.9984");
  });

  it("multiple partial cancellations reverse to the exact original balance, not an approximation", async () => {
    await postLedgerEntry({
      orgId: "org-1", userId: "user-1", leaveTypeId: "lt-1", type: "OPENING_BALANCE",
      quantity: 12.5, effectiveDate: new Date("2026-08-14"), year: 2026, source: "IMPORT",
      idempotencyKey: "opening-1",
    });
    // Reserve 5 days, then reverse it in three uneven partial chunks.
    await postLedgerEntry({
      orgId: "org-1", userId: "user-1", leaveTypeId: "lt-1", type: "LEAVE_RESERVED",
      quantity: -5, effectiveDate: new Date("2026-08-14"), year: 2026, source: "EMPLOYEE",
      idempotencyKey: "reserve-1",
    });
    await postLedgerEntry({
      orgId: "org-1", userId: "user-1", leaveTypeId: "lt-1", type: "CANCELLATION_REVERSAL",
      quantity: 1.1, effectiveDate: new Date("2026-08-14"), year: 2026, source: "EMPLOYEE",
      idempotencyKey: "reverse-1",
    });
    await postLedgerEntry({
      orgId: "org-1", userId: "user-1", leaveTypeId: "lt-1", type: "CANCELLATION_REVERSAL",
      quantity: 2.2, effectiveDate: new Date("2026-08-14"), year: 2026, source: "EMPLOYEE",
      idempotencyKey: "reverse-2",
    });
    await postLedgerEntry({
      orgId: "org-1", userId: "user-1", leaveTypeId: "lt-1", type: "CANCELLATION_REVERSAL",
      quantity: 1.7, effectiveDate: new Date("2026-08-14"), year: 2026, source: "EMPLOYEE",
      idempotencyKey: "reverse-3",
    });
    // 12.5 - 5 + 1.1 + 2.2 + 1.7 = 12.5 exactly (the 3 partial reversals sum
    // back to the original 5-day reservation).
    expect(balanceRow?.balance.toString()).toBe("12.5");
  });
});
