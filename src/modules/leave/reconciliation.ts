import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { postLedgerEntry } from "@/modules/leave/ledger";
import { writeLeaveAudit } from "@/modules/leave/audit";

export interface ReconciliationRow {
  userId: string;
  userName: string;
  leaveTypeId: string;
  leaveTypeName: string;
  year: number;
  materializedBalance: number;
  ledgerDerivedBalance: number;
  difference: number;
  inSync: boolean;
}

/**
 * HR/admin diagnostic (spec §30): compares the materialized LeaveBalance
 * snapshot against the sum of all LeaveLedgerEntry rows for the same
 * user/leaveType/year. Read-only — never auto-corrects. A non-zero
 * difference indicates either a bug in postLedgerEntry's balance-update
 * path or (more likely in practice) a legacy row created before the
 * ledger existed, or via a code path that bypassed postLedgerEntry.
 */
export async function reconcileOrgBalances(orgId: string, year: number): Promise<ReconciliationRow[]> {
  const balances = await db.leaveBalance.findMany({
    where: { year, leaveType: { orgId } },
    include: {
      user: { select: { name: true } },
      leaveType: { select: { name: true } },
    },
  });

  const rows: ReconciliationRow[] = [];
  for (const balance of balances) {
    const ledgerSum = await db.leaveLedgerEntry.aggregate({
      where: { userId: balance.userId, leaveTypeId: balance.leaveTypeId, orgId },
      _sum: { quantity: true },
    });
    const ledgerDerived = (ledgerSum._sum.quantity ?? new Prisma.Decimal(0)).toNumber();
    const materialized = balance.balance.toNumber();
    const difference = Math.round((materialized - ledgerDerived) * 10000) / 10000; // avoid float display noise

    rows.push({
      userId: balance.userId,
      userName: balance.user.name,
      leaveTypeId: balance.leaveTypeId,
      leaveTypeName: balance.leaveType.name,
      year,
      materializedBalance: materialized,
      ledgerDerivedBalance: ledgerDerived,
      difference,
      inSync: Math.abs(difference) < 0.0001,
    });
  }

  return rows.filter((r) => !r.inSync).sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference));
}

/**
 * Controlled repair: posts an ADJUSTMENT ledger entry to bring the
 * materialized balance back in line with the ledger-derived sum — i.e.
 * this corrects the MATERIALIZED value to match the ledger (the ledger is
 * always the accounting authority, per spec §4's design principle), never
 * the reverse. Requires an explicit reason and actor; never runs
 * automatically.
 */
export async function repairBalanceDrift(
  orgId: string,
  userId: string,
  leaveTypeId: string,
  year: number,
  actorId: string,
  reason: string,
) {
  const [balance, ledgerSum] = await Promise.all([
    db.leaveBalance.findUniqueOrThrow({
      where: { userId_leaveTypeId_year: { userId, leaveTypeId, year } },
    }),
    db.leaveLedgerEntry.aggregate({
      where: { userId, leaveTypeId, orgId },
      _sum: { quantity: true },
    }),
  ]);

  const ledgerDerived = ledgerSum._sum.quantity ?? new Prisma.Decimal(0);
  const drift = ledgerDerived.minus(balance.balance);

  if (drift.isZero()) {
    return { repaired: false, message: "No drift found — balance already matches the ledger." };
  }

  const entry = await postLedgerEntry({
    orgId,
    userId,
    leaveTypeId,
    type: "ADJUSTMENT",
    quantity: drift,
    effectiveDate: new Date(),
    year,
    source: "ADMIN",
    actorId,
    reason: `Reconciliation repair: ${reason}`,
    idempotencyKey: `reconcile-repair:${userId}:${leaveTypeId}:${year}:${Date.now()}`,
    allowNegative: true,
  });

  await writeLeaveAudit({
    orgId,
    userId: actorId,
    action: "LEAVE_BALANCE_RECONCILIATION_REPAIR",
    details: { targetUserId: userId, leaveTypeId, year, drift: drift.toString(), reason },
  });

  return { repaired: true, entry };
}
