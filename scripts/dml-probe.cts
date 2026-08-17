// One-shot DML capability probe (round 17). Each capability is tested in
// its own $transaction that always rolls back (throws a sentinel error to
// force rollback) — no data is left behind regardless of outcome. Split
// into separate transactions (rather than one big one) because Postgres
// aborts an entire transaction block after any statement error, including
// the deliberate duplicate-key violation used to prove the unique
// constraint is enforced — that must not poison the later capability
// checks in the same block.
import * as dotenv from "dotenv";
dotenv.config();
import { PrismaClient, Prisma } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });
const ROLLBACK = Symbol("intentional-rollback");
const results: Record<string, unknown> = {};

async function withRollback<T>(label: string, fn: (tx: Parameters<Parameters<typeof db.$transaction>[0]>[0]) => Promise<T>) {
  try {
    await db.$transaction(async (tx) => {
      await fn(tx);
      throw ROLLBACK;
    });
  } catch (e) {
    if (e === ROLLBACK) {
      results[`${label}_rolledBack`] = true;
    } else {
      results[label] = {
        ok: false,
        message: e instanceof Error ? e.message.slice(0, 300) : String(e),
        code: e instanceof Prisma.PrismaClientKnownRequestError ? e.code : null,
      };
      throw e;
    }
  }
}

async function probe() {
  try {
    let orgId = "";
    let userId = "";
    let leaveTypeId = "";

    // INSERT + UPDATE + DELETE, in their own rolled-back transaction
    await withRollback("insertUpdateDelete", async (tx) => {
      const org = await tx.organisation.create({
        data: { name: "__dml_probe_org__", slug: `__dml_probe_org_${Date.now()}__` },
      });
      orgId = org.id;
      results.insert = { ok: true, id: org.id };

      const updated = await tx.organisation.update({
        where: { id: org.id },
        data: { name: "__dml_probe_org_updated__" },
      });
      results.update = { ok: true, name: updated.name };

      const user = await tx.user.create({
        data: {
          orgId: org.id,
          name: "__dml_probe_user__",
          email: `dml-probe-${Date.now()}@example.invalid`,
          passwordHash: "__dml_probe_not_a_real_hash__",
          active: true,
        },
      });
      userId = user.id;

      const leaveType = await tx.leaveType.create({
        data: { orgId: org.id, name: "__dml_probe_leave_type__", code: "DMLPROBE" },
      });
      leaveTypeId = leaveType.id;

      const balance = await tx.leaveBalance.create({
        data: {
          userId: user.id,
          leaveTypeId: leaveType.id,
          year: new Date().getFullYear(),
          balance: new Prisma.Decimal(5),
          version: 0,
        },
      });
      results.ledgerPlusBalanceWrite = { ok: true, balanceId: balance.id };

      await tx.leaveBalance.delete({ where: { id: balance.id } });
      results.delete = { ok: true };
    });

    // Ledger insert, in its own transaction (needs org/user/leaveType to
    // exist for this one call — re-create them since the previous
    // transaction rolled back).
    let idemKeyEntryId = "";
    await withRollback("ledgerInsert", async (tx) => {
      const org = await tx.organisation.create({
        data: { name: "__dml_probe_org2__", slug: `__dml_probe_org2_${Date.now()}__` },
      });
      const user = await tx.user.create({
        data: {
          orgId: org.id,
          name: "__dml_probe_user2__",
          email: `dml-probe2-${Date.now()}@example.invalid`,
          passwordHash: "__dml_probe_not_a_real_hash__",
          active: true,
        },
      });
      const leaveType = await tx.leaveType.create({
        data: { orgId: org.id, name: "__dml_probe_leave_type2__", code: "DMLPROBE2" },
      });
      const entry = await tx.leaveLedgerEntry.create({
        data: {
          orgId: org.id,
          userId: user.id,
          leaveTypeId: leaveType.id,
          type: "OPENING_BALANCE",
          quantity: new Prisma.Decimal(5),
          unit: "DAY",
          effectiveDate: new Date(),
          balanceBefore: new Prisma.Decimal(0),
          balanceAfter: new Prisma.Decimal(5),
          source: "SYSTEM",
          idempotencyKey: "__dml_probe_idem_key_2__",
        },
      });
      idemKeyEntryId = entry.id;
      results.ledgerInsert = { ok: true, id: entry.id };
    });

    // Unique-constraint / idempotency test, in its own transaction so the
    // expected P2002 abort doesn't poison anything else.
    await withRollback("uniqueConstraintProbe", async (tx) => {
      const org = await tx.organisation.create({
        data: { name: "__dml_probe_org3__", slug: `__dml_probe_org3_${Date.now()}__` },
      });
      const user = await tx.user.create({
        data: {
          orgId: org.id,
          name: "__dml_probe_user3__",
          email: `dml-probe3-${Date.now()}@example.invalid`,
          passwordHash: "__dml_probe_not_a_real_hash__",
          active: true,
        },
      });
      const leaveType = await tx.leaveType.create({
        data: { orgId: org.id, name: "__dml_probe_leave_type3__", code: "DMLPROBE3" },
      });
      const dupKey = "__dml_probe_dup_key__";
      await tx.leaveLedgerEntry.create({
        data: {
          orgId: org.id,
          userId: user.id,
          leaveTypeId: leaveType.id,
          type: "OPENING_BALANCE",
          quantity: new Prisma.Decimal(5),
          unit: "DAY",
          effectiveDate: new Date(),
          balanceBefore: new Prisma.Decimal(0),
          balanceAfter: new Prisma.Decimal(5),
          source: "SYSTEM",
          idempotencyKey: dupKey,
        },
      });

      let raised: unknown = null;
      try {
        await tx.leaveLedgerEntry.create({
          data: {
            orgId: org.id,
            userId: user.id,
            leaveTypeId: leaveType.id,
            type: "OPENING_BALANCE",
            quantity: new Prisma.Decimal(5),
            unit: "DAY",
            effectiveDate: new Date(),
            balanceBefore: new Prisma.Decimal(0),
            balanceAfter: new Prisma.Decimal(5),
            source: "SYSTEM",
            idempotencyKey: dupKey, // same key, must fail
          },
        });
      } catch (e) {
        raised = e;
      }

      const isUniqueViolation = raised instanceof Prisma.PrismaClientKnownRequestError && raised.code === "P2002";
      results.uniqueConstraint = {
        ok: isUniqueViolation,
        code: raised instanceof Prisma.PrismaClientKnownRequestError ? raised.code : null,
        message: raised instanceof Error ? raised.message.split("\n")[0] : null,
      };
      if (!isUniqueViolation) {
        // Unexpected: either no error was raised, or a different error —
        // surface it as a real failure rather than silently passing.
        throw raised ?? new Error("Expected P2002 unique constraint violation but none was raised");
      }
      // Swallow the caught P2002 so the transaction stays valid and we can
      // still reach the sentinel-rollback below — the violation itself is
      // the thing being proven, not an unexpected fatal error.
    });

    results.allProbesCompleted = true;
  } catch (e) {
    results.fatalError = {
      message: e instanceof Error ? e.message : String(e),
      code: e instanceof Prisma.PrismaClientKnownRequestError ? e.code : null,
      meta: e instanceof Prisma.PrismaClientKnownRequestError ? e.meta : null,
    };
  } finally {
    await db.$disconnect();
    await pool.end();
  }

  console.log(JSON.stringify(results, null, 2));
}

probe();
