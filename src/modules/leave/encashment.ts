import { Prisma } from "@/generated/prisma/client";
import { postLedgerEntry, getMaterializedBalance } from "@/modules/leave/ledger";
import { getActivePolicyVersion, parsePolicyConfig } from "@/modules/leave/policy";
import { writeLeaveAudit } from "@/modules/leave/audit";
import { notify } from "@/lib/notify";

export class EncashmentNotAllowedError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = "EncashmentNotAllowedError";
  }
}

export interface RequestEncashmentInput {
  orgId: string;
  userId: string;
  leaveTypeId: string;
  units: number;
  actorId: string; // who initiated: the employee themselves, or HR
  source: "EMPLOYEE_INITIATED" | "HR_INITIATED" | "ON_EXIT" | "RESET_TIME";
}

/**
 * Encashment workflow (spec §16). Converts unused leave units into a
 * LeaveLedgerEntry of type ENCASHMENT (a debit against the balance) and
 * hands the payroll-facing side (employeeId/leaveTypeId/units/
 * effectiveDate) back to the caller — this module does NOT calculate a
 * currency amount, since salary-rate calculation belongs to Payroll (spec
 * §16's explicit boundary, same principle already applied to LOP).
 */
export async function requestEncashment(input: RequestEncashmentInput) {
  const policyVersion = await getActivePolicyVersion(input.leaveTypeId, new Date());
  if (!policyVersion) {
    throw new EncashmentNotAllowedError("No published policy version is active for this leave type.");
  }
  const config = parsePolicyConfig(policyVersion.configuration);

  if (config.encashment.mode === "DISABLED") {
    throw new EncashmentNotAllowedError("Encashment is disabled for this leave type.");
  }
  if (input.source === "EMPLOYEE_INITIATED" && config.encashment.mode !== "EMPLOYEE_INITIATED") {
    throw new EncashmentNotAllowedError("This leave type does not allow employee-initiated encashment.");
  }
  if (input.source === "HR_INITIATED" && config.encashment.mode !== "HR_INITIATED") {
    throw new EncashmentNotAllowedError("This leave type does not allow HR-initiated encashment.");
  }

  if (config.encashment.maxEncashableUnits != null && input.units > config.encashment.maxEncashableUnits) {
    throw new EncashmentNotAllowedError(
      `Cannot encash more than ${config.encashment.maxEncashableUnits} unit(s) under this policy.`,
    );
  }

  const year = new Date().getFullYear();
  const currentBalance = await getMaterializedBalance(input.userId, input.leaveTypeId, year);
  const minRetained = new Prisma.Decimal(config.encashment.minBalanceRetained);
  const balanceAfterEncashment = currentBalance.minus(input.units);

  if (balanceAfterEncashment.lessThan(minRetained) && input.source !== "ON_EXIT") {
    // On-exit encashment can drain the balance fully (there's no future
    // accrual to protect); every other source must respect the configured
    // minimum retained balance.
    throw new EncashmentNotAllowedError(
      `Encashing ${input.units} unit(s) would leave a balance below the required minimum of ${minRetained}.`,
    );
  }

  const entry = await postLedgerEntry({
    orgId: input.orgId,
    userId: input.userId,
    leaveTypeId: input.leaveTypeId,
    policyVersionId: policyVersion.id,
    type: "ENCASHMENT",
    quantity: -input.units,
    effectiveDate: new Date(),
    year,
    source: input.source === "EMPLOYEE_INITIATED" ? "EMPLOYEE" : "ADMIN",
    actorId: input.actorId,
    reason: `Encashment (${input.source})`,
    metadata: { encashmentSource: input.source },
    idempotencyKey: `encashment:${input.userId}:${input.leaveTypeId}:${Date.now()}`,
    allowNegative: input.source === "ON_EXIT",
  });

  await writeLeaveAudit({
    orgId: input.orgId,
    userId: input.actorId,
    action: "LEAVE_ENCASHMENT_PROCESSED",
    details: { targetUserId: input.userId, leaveTypeId: input.leaveTypeId, units: input.units, source: input.source },
  });

  await notify({
    userId: input.userId,
    orgId: input.orgId,
    kind: "LEAVE_ENCASHMENT_PROCESSED",
    title: "Leave encashed",
    body: `${input.units} unit(s) of leave have been encashed and forwarded to payroll for payout calculation.`,
    link: "/attendance/leaves",
    payload: { ledgerEntryId: entry.id },
  });

  // Structured data for Payroll to compute the actual payout — this module
  // never calculates a currency amount (spec §16).
  return {
    entry,
    payrollHandoff: {
      employeeId: input.userId,
      leaveTypeId: input.leaveTypeId,
      units: input.units,
      effectiveDate: new Date(),
      source: input.source,
    },
  };
}
