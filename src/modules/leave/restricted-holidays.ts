import { db } from "@/lib/db";
import { getActivePolicyVersion, parsePolicyConfig } from "@/modules/leave/policy";
import { postLedgerEntry } from "@/modules/leave/ledger";
import { writeLeaveAudit } from "@/modules/leave/audit";
import { notify } from "@/lib/notify";

export class RestrictedHolidayError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RestrictedHolidayError";
  }
}

/**
 * Restricted/optional holidays (spec §20). Employees select which
 * RESTRICTED-type holidays they want to observe, up to the policy's
 * configured annual quota (config.restrictions.maxOccurrencesPerYear is
 * reused as the quota field rather than inventing a parallel config key —
 * "how many restricted holidays can I take" is structurally the same
 * shape as "how many occurrences of this leave type per year").
 * Approval requirement is read from the policy's approvalRouting.autoApprove.
 */
export async function selectRestrictedHoliday(input: {
  orgId: string;
  userId: string;
  holidayId: string;
  leaveTypeId: string; // must reference a RESTRICTED_HOLIDAY-classified policy
}) {
  const holiday = await db.holiday.findUniqueOrThrow({ where: { id: input.holidayId } });
  if (holiday.orgId !== input.orgId) {
    throw new RestrictedHolidayError("This holiday does not belong to your organisation.");
  }
  if (holiday.holidayType !== "RESTRICTED") {
    throw new RestrictedHolidayError("This holiday is not marked as a restricted/optional holiday.");
  }

  const year = holiday.date.getFullYear();
  const policyVersion = await getActivePolicyVersion(input.leaveTypeId, holiday.date);
  if (!policyVersion || policyVersion.classification !== "RESTRICTED_HOLIDAY") {
    throw new RestrictedHolidayError("No active RESTRICTED_HOLIDAY policy found for this leave type.");
  }
  const config = parsePolicyConfig(policyVersion.configuration);

  const quota = config.restrictions.maxOccurrencesPerYear;
  if (quota != null) {
    const existingCount = await db.restrictedHolidaySelection.count({
      where: {
        userId: input.userId,
        leaveTypeId: input.leaveTypeId,
        year,
        status: { in: ["SELECTED", "APPROVED"] },
      },
    });
    if (existingCount >= quota) {
      throw new RestrictedHolidayError(`You have already selected your quota of ${quota} restricted holiday(s) this year.`);
    }
  }

  const requiresApproval = !config.approvalRouting.autoApprove;
  const selection = await db.restrictedHolidaySelection.create({
    data: {
      orgId: input.orgId,
      userId: input.userId,
      holidayId: input.holidayId,
      leaveTypeId: input.leaveTypeId,
      year,
      status: requiresApproval ? "SELECTED" : "APPROVED",
    },
  });

  if (!requiresApproval) {
    await postSelectionToLedger(selection.id);
  }

  await writeLeaveAudit({
    orgId: input.orgId,
    userId: input.userId,
    action: "LEAVE_RESTRICTED_HOLIDAY_SELECTED",
    details: { selectionId: selection.id, holidayId: input.holidayId, requiresApproval },
  });

  return selection;
}

async function postSelectionToLedger(selectionId: string) {
  const selection = await db.restrictedHolidaySelection.findUniqueOrThrow({
    where: { id: selectionId },
    include: { holiday: true },
  });

  const entry = await postLedgerEntry({
    orgId: selection.orgId,
    userId: selection.userId,
    leaveTypeId: selection.leaveTypeId,
    type: "LEAVE_CONSUMED",
    quantity: -1,
    effectiveDate: selection.holiday.date,
    year: selection.year,
    source: "EMPLOYEE",
    reason: `Restricted holiday observed: ${selection.holiday.name}`,
    metadata: { restrictedHolidaySelectionId: selection.id },
    idempotencyKey: `restricted-holiday:${selection.id}`,
  });

  await db.restrictedHolidaySelection.update({
    where: { id: selectionId },
    data: { ledgerEntryId: entry.id },
  });

  return entry;
}

export async function approveRestrictedHolidaySelection(selectionId: string, approverId: string, actorOrgId: string) {
  const selection = await db.restrictedHolidaySelection.findUniqueOrThrow({ where: { id: selectionId } });
  if (selection.orgId !== actorOrgId) {
    throw new RestrictedHolidayError("This selection does not belong to your organisation.");
  }
  if (selection.status !== "SELECTED") {
    throw new RestrictedHolidayError(`Cannot approve a selection in status ${selection.status}`);
  }

  await db.restrictedHolidaySelection.update({
    where: { id: selectionId },
    data: { status: "APPROVED", approvedById: approverId },
  });
  await postSelectionToLedger(selectionId);

  await notify({
    userId: selection.userId,
    orgId: actorOrgId,
    kind: "LEAVE_DECISION",
    title: "Restricted holiday approved",
    body: "Your restricted holiday selection has been approved.",
    link: "/attendance/leaves",
    payload: { selectionId },
  });

  return selection;
}

export async function listAvailableRestrictedHolidays(orgId: string, branchId: string | null, year: number) {
  return db.holiday.findMany({
    where: {
      orgId,
      holidayType: "RESTRICTED",
      date: { gte: new Date(year, 0, 1), lte: new Date(year, 11, 31) },
      OR: [{ branchId: null }, { branchId }],
    },
    orderBy: { date: "asc" },
  });
}
