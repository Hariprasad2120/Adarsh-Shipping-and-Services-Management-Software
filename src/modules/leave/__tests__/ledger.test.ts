import { beforeEach, describe, expect, it, vi } from "vitest";
import { postLedgerEntry, InsufficientBalanceError } from "../ledger";

// In-memory fake mirroring the two tables postLedgerEntry touches, so the
// mocked $transaction callback can exercise real optimistic-lock and
// idempotency-dedup control flow rather than trivially stubbed responses.
let ledgerEntries: Array<Record<string, unknown>>;
let balanceRow: { id: string; balance: number; version: number } | null;
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
    balanceRow = { id: "balance-1", balance: 10, version: 0 };
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
            balanceRow = { id: "balance-1", balance: data.balance as number, version: data.version as number };
            return balanceRow;
          },
          updateMany: async ({
            where,
            data,
          }: {
            where: { id: string; version: number };
            data: { balance: number; version: { increment: number } };
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

    expect((entry as { balanceBefore: number }).balanceBefore).toBe(10);
    expect((entry as { balanceAfter: number }).balanceAfter).toBe(15);
    expect(balanceRow?.balance).toBe(15);
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
    expect(balanceRow?.balance).toBe(12); // only credited once, not 14
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

    expect(balanceRow?.balance).toBe(10); // unchanged
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

    expect((entry as { balanceAfter: number }).balanceAfter).toBe(-5);
    expect(balanceRow?.balance).toBe(-5);
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
    expect((entry as { balanceAfter: number }).balanceAfter).toBe(11);
    expect(mocks.transaction).toHaveBeenCalledTimes(2);
  });
});
