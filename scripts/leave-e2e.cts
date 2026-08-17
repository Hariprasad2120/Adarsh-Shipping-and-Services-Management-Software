// Real DB end-to-end test (round 17, spec §25/§48). Runs the actual
// production module functions (submitLeaveRequest, decideLeaveRequest,
// runMonthlyAccrual, runDueResets, cron scheduler) against the live
// database in an isolated test organisation, then deletes every row it
// created (cascade via org/user FK relations) at the end — success or
// failure. Nothing here is mocked; this is the real code path.
import "dotenv/config";
import { db } from "../src/lib/db";
import { Prisma } from "../src/generated/prisma/client";
import { createLeaveType, createPolicyVersion, publishPolicyVersion } from "../src/modules/leave/policy";
import { submitLeaveRequest, decideLeaveRequest, cancelLeaveRequestPartial } from "../src/modules/leave/request";
import { runMonthlyAccrual } from "../src/modules/leave/accrual";
import { refreshResetSchedule, runDueResets } from "../src/modules/leave/reset";
import { getMaterializedBalance } from "../src/modules/leave/ledger";
import { reconcileOrgBalances } from "../src/modules/leave/reconciliation";
import type { LeavePolicyConfig } from "../src/modules/leave/policy-config.schema";

const results: Record<string, unknown> = {};
let orgId = "";

function ok(label: string, value: unknown) {
  results[label] = { ok: true, ...(typeof value === "object" && value !== null ? value : { value }) };
}
function fail(label: string, error: unknown) {
  results[label] = {
    ok: false,
    message: error instanceof Error ? error.message : String(error),
    code: error instanceof Prisma.PrismaClientKnownRequestError ? error.code : null,
  };
}

async function cleanup() {
  if (!orgId) return;
  // LeaveRequest.leaveType has no onDelete: Cascade (defaults to RESTRICT)
  // — a deliberate real-world safety choice so deleting a leave TYPE can
  // never silently vaporize historical leave request records. That means
  // Organisation's cascade alone cannot clean this up in one shot: delete
  // in FK-dependency order instead (users cascade-delete their own
  // LeaveRequest rows via onDelete: Cascade on LeaveRequest.userId, which
  // then lets LeaveType and finally Organisation delete cleanly).
  await db.user.deleteMany({ where: { orgId } }).catch((e) => {
    results.cleanupError = { step: "users", message: e instanceof Error ? e.message : String(e) };
  });
  await db.organisation.delete({ where: { id: orgId } }).catch((e) => {
    results.cleanupError = { step: "organisation", message: e instanceof Error ? e.message : String(e) };
  });
}

async function main() {
  try {
    // ── Seed: org, manager, employee, calendar, holiday ─────────────────
    const org = await db.organisation.create({
      data: { name: "__e2e_probe_org__", slug: `__e2e_probe_org_${Date.now()}__` },
    });
    orgId = org.id;

    const manager = await db.user.create({
      data: {
        orgId: org.id,
        name: "__e2e_probe_manager__",
        email: `e2e-mgr-${Date.now()}@example.invalid`,
        passwordHash: "__e2e_not_a_real_hash__",
        active: true,
      },
    });

    const employee = await db.user.create({
      data: {
        orgId: org.id,
        name: "__e2e_probe_employee__",
        email: `e2e-emp-${Date.now()}@example.invalid`,
        passwordHash: "__e2e_not_a_real_hash__",
        active: true,
        managerId: manager.id,
      },
    });

    await db.employmentRecord.create({
      data: { userId: employee.id, joinDate: new Date("2020-01-01") },
    });

    await db.workingCalendar.create({
      data: { id: `__e2e_probe_calendar_${org.id}__`, orgId: org.id, workingDays: "1,2,3,4,5,6" },
    });

    const holiday = await db.holiday.create({
      data: { orgId: org.id, name: "__e2e_probe_holiday__", date: new Date("2026-10-02") },
    });
    ok("seed", { orgId: org.id, managerId: manager.id, employeeId: employee.id, holidayId: holiday.id });

    // ── Policy: create + publish ─────────────────────────────────────────
    const leaveType = await createLeaveType({ orgId: org.id, name: "__e2e_probe_annual__", code: "E2EANNUAL" }, manager.id);

    const config: LeavePolicyConfig = {
      entitlement: { model: "FIXED", amount: 12, creditFrequency: "MONTHLY" },
      proration: { strategy: "NONE", rounding: "NEAREST" },
      reset: { cadence: "CALENDAR_YEAR" },
      carryForward: { mode: "FIXED_MAX", fixedMax: 3, expiryAfterDays: 90 },
      encashment: { mode: "DISABLED", minBalanceRetained: 0 },
      negativeLeave: { mode: "REJECT" },
      maxBalance: null,
      effectiveAfterServiceMonths: 0,
      partialPaySlabs: [],
      restrictions: {
        allowPastDated: true,
        allowSameDay: true,
        allowDuringProbation: true,
        waitingPeriodAfterJoiningDays: 0,
        minBalanceRequired: 0,
        requireAttachment: "NEVER",
        requireReason: true,
      },
      sandwich: { enabled: false, includeWeekends: true, includeHolidays: true, activationThresholdUnits: 0 },
      clubbingRules: [],
      approvalRouting: {
        autoApprove: false,
        routes: [{ criteria: {}, steps: [{ sequence: 1, approverType: "MANAGER" }] }],
        mandatoryApprovalComment: false,
        mandatoryRejectionComment: true,
      },
      availabilityStatus: "OUT_OF_OFFICE",
    };

    const version = await createPolicyVersion(
      { leaveTypeId: leaveType.id, classification: "PAID", unit: "DAY", effectiveFrom: new Date("2020-01-01"), configuration: config, applicabilityRules: [] },
      manager.id,
    );
    const published = await publishPolicyVersion(version.id, manager.id);
    ok("policyCreatePublish", { leaveTypeId: leaveType.id, versionId: version.id, status: (published as { status: string }).status });

    // ── Opening + accrual ledger entries ─────────────────────────────────
    const { postLedgerEntry } = await import("../src/modules/leave/ledger");
    await postLedgerEntry({
      orgId: org.id,
      userId: employee.id,
      leaveTypeId: leaveType.id,
      policyVersionId: version.id,
      type: "OPENING_BALANCE",
      quantity: 5,
      effectiveDate: new Date("2026-01-01"),
      year: 2026,
      source: "SYSTEM",
      reason: "E2E opening balance",
      idempotencyKey: `e2e-opening:${employee.id}:${leaveType.id}:2026`,
    });
    const balanceAfterOpening = await getMaterializedBalance(employee.id, leaveType.id, 2026);
    ok("openingBalance", { balance: balanceAfterOpening.toString() });

    const accrualResult = await runMonthlyAccrual(org.id, new Date("2026-03-01"));
    const balanceAfterAccrual = await getMaterializedBalance(employee.id, leaveType.id, 2026);
    ok("accrual", { creditedCount: accrualResult.creditedCount, balanceAfter: balanceAfterAccrual.toString() });

    // Accrual idempotency: re-run the SAME month, balance must not double-credit.
    await runMonthlyAccrual(org.id, new Date("2026-03-15"));
    const balanceAfterAccrualRerun = await getMaterializedBalance(employee.id, leaveType.id, 2026);
    ok("accrualIdempotency", {
      unchanged: balanceAfterAccrualRerun.equals(balanceAfterAccrual),
      balance: balanceAfterAccrualRerun.toString(),
    });

    // ── Submit + approve ──────────────────────────────────────────────────
    const submitResult = await submitLeaveRequest({
      orgId: org.id,
      userId: employee.id,
      leaveTypeId: leaveType.id,
      fromDate: new Date("2026-09-07"), // Monday
      toDate: new Date("2026-09-08"), // Tuesday
      halfDay: false,
      notes: "E2E test request",
    });
    ok("submit", { requestId: submitResult.request.id, paidUnits: submitResult.calculation.paidUnits });

    const balanceAfterReserve = await getMaterializedBalance(employee.id, leaveType.id, 2026);
    ok("balanceAfterReserve", { balance: balanceAfterReserve.toString() });

    const decideResult = await decideLeaveRequest({
      requestId: submitResult.request.id,
      approverId: manager.id,
      decision: "APPROVED",
      comment: "E2E approve",
    });
    ok("approve", { status: (decideResult as { status: string }).status });

    const balanceAfterApprove = await getMaterializedBalance(employee.id, leaveType.id, 2026);
    ok("balanceAfterApprove", { balance: balanceAfterApprove.toString() });

    const attendanceRows = await db.attendancePunch.findMany({
      where: { userId: employee.id, date: { gte: new Date("2026-09-07"), lte: new Date("2026-09-08") } },
    });
    ok("attendanceMarked", { count: attendanceRows.length });

    // ── Partial cancellation + reversal ──────────────────────────────────
    await cancelLeaveRequestPartial({
      requestId: submitResult.request.id,
      cancelFromDate: new Date("2026-09-08"),
      cancelToDate: new Date("2026-09-08"),
      actorId: employee.id,
      reason: "E2E partial cancellation",
    });
    const balanceAfterPartialCancel = await getMaterializedBalance(employee.id, leaveType.id, 2026);
    ok("partialCancelReversal", { balance: balanceAfterPartialCancel.toString() });

    // ── DoD scenario 2: multi-step (MANAGER then HR) approval + LOP/payroll handoff ──
    const hrRole = await db.role.create({ data: { orgId: org.id, name: "__e2e_probe_hr_role__" } });
    const hrPermission = await db.permission.findUnique({ where: { key: "attendance.leave.manage" } });
    if (!hrPermission) throw new Error("attendance.leave.manage permission not seeded in this environment");
    await db.rolePermission.create({ data: { roleId: hrRole.id, permissionId: hrPermission.id } });
    const hrUser = await db.user.create({
      data: {
        orgId: org.id,
        name: "__e2e_probe_hr__",
        email: `e2e-hr-${Date.now()}@example.invalid`,
        passwordHash: "__e2e_not_a_real_hash__",
        active: true,
      },
    });
    await db.userRole.create({ data: { userId: hrUser.id, roleId: hrRole.id } });

    const lopLeaveType = await createLeaveType({ orgId: org.id, name: "__e2e_probe_lop__", code: "E2ELOP" }, manager.id);
    const lopConfig: LeavePolicyConfig = {
      ...config,
      negativeLeave: { mode: "CONVERT_EXCESS_TO_LOP" },
      approvalRouting: {
        autoApprove: false,
        routes: [{ criteria: {}, steps: [{ sequence: 1, approverType: "MANAGER" }, { sequence: 2, approverType: "HR" }] }],
        mandatoryApprovalComment: false,
        mandatoryRejectionComment: true,
      },
    };
    const lopVersion = await createPolicyVersion(
      { leaveTypeId: lopLeaveType.id, classification: "PAID", unit: "DAY", effectiveFrom: new Date("2020-01-01"), configuration: lopConfig, applicabilityRules: [] },
      manager.id,
    );
    await publishPolicyVersion(lopVersion.id, manager.id);

    // No opening balance posted for this leave type — every requested unit
    // must convert to LOP under CONVERT_EXCESS_TO_LOP.
    const lopSubmit = await submitLeaveRequest({
      orgId: org.id,
      userId: employee.id,
      leaveTypeId: lopLeaveType.id,
      fromDate: new Date("2026-11-02"), // Monday
      toDate: new Date("2026-11-03"), // Tuesday
      halfDay: false,
      notes: "E2E LOP + multi-step approval test",
    });
    ok("lopSubmit", { requestId: lopSubmit.request.id, paidUnits: lopSubmit.calculation.paidUnits, lopUnits: lopSubmit.calculation.lopUnits });

    // Step 1: manager approval — must NOT finalize the request (2-step route).
    const managerDecision = await decideLeaveRequest({
      requestId: lopSubmit.request.id,
      approverId: manager.id,
      decision: "APPROVED",
      comment: "E2E manager approval (step 1 of 2)",
    });
    ok("managerApproval", { status: (managerDecision as { status: string }).status });

    // Step 2: HR approval — must finalize it.
    const hrDecision = await decideLeaveRequest({
      requestId: lopSubmit.request.id,
      approverId: hrUser.id,
      decision: "APPROVED",
      comment: "E2E HR approval (step 2 of 2, LOP)",
    });
    ok("hrApproval", { status: (hrDecision as { status: string }).status });

    const lopRecord = await db.employeeLop.findUnique({
      where: { userId_payrollMonth: { userId: employee.id, payrollMonth: new Date("2026-11-01") } },
    });
    ok("lopPayrollHandoff", {
      recordCreated: !!lopRecord,
      lopDays: lopRecord?.lopDays ?? 0,
    });

    // ── Reconciliation ────────────────────────────────────────────────────
    const reconciliation = await reconcileOrgBalances(org.id, 2026);
    ok("reconciliation", { driftRows: reconciliation.length, entries: reconciliation });

    // ── Reset / carry-forward + idempotency ──────────────────────────────
    await refreshResetSchedule(org.id, new Date("2026-12-31"));
    const resetResult1 = await runDueResets(org.id, new Date("2027-01-01"));
    ok("resetRun1", resetResult1);
    // Re-run the SAME reset call for the same org/date — runDueResets is
    // idempotent via each ledger entry's idempotencyKey (keyed to the
    // specific reset date), not via LeaveSchedulerRun.runKey (that lock
    // lives at the cron-route layer, not inside this function) — a
    // duplicate run must be a safe no-op, not a double reset/carry-forward.
    const resetResult2 = await runDueResets(org.id, new Date("2027-01-01"));
    ok("resetRun2_idempotent", resetResult2);

    const balanceAfterReset = await getMaterializedBalance(employee.id, leaveType.id, 2027);
    ok("balanceAfterReset", { balance: balanceAfterReset.toString() });

    results.allStepsCompleted = true;
  } catch (e) {
    fail("fatalError", e);
  } finally {
    await cleanup();
    await db.$disconnect();
  }

  console.log(JSON.stringify(results, null, 2));
}

main();
