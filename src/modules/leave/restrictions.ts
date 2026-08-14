import { db } from "@/lib/db";
import type { LeavePolicyConfig } from "@/modules/leave/policy-config.schema";

export interface RestrictionViolation {
  code: string;
  message: string;
}

export interface ValidateRestrictionsInput {
  orgId: string;
  userId: string;
  leaveTypeId: string;
  fromDate: Date;
  toDate: Date;
  config: LeavePolicyConfig;
  now: Date;
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Validates the restriction rule set from the policy's configuration.restrictions
 * against a proposed request. Returns a list of violations (empty = valid).
 * This must account for existing approved and pending requests (spec §16),
 * so it queries LeaveRequest directly rather than trusting client state.
 */
export async function validateRestrictions(
  input: ValidateRestrictionsInput,
): Promise<RestrictionViolation[]> {
  const violations: RestrictionViolation[] = [];
  const { config } = input;
  const r = config.restrictions;

  const requestedCalendarDays = daysBetween(input.fromDate, input.toDate) + 1;

  if (r.minUnitsPerRequest != null && requestedCalendarDays < r.minUnitsPerRequest) {
    violations.push({
      code: "BELOW_MIN_UNITS",
      message: `This leave type requires a minimum of ${r.minUnitsPerRequest} unit(s) per request.`,
    });
  }
  if (r.maxUnitsPerRequest != null && requestedCalendarDays > r.maxUnitsPerRequest) {
    violations.push({
      code: "EXCEEDS_MAX_UNITS",
      message: `This leave type allows a maximum of ${r.maxUnitsPerRequest} unit(s) per request.`,
    });
  }
  if (r.maxConsecutiveUnits != null && requestedCalendarDays > r.maxConsecutiveUnits) {
    violations.push({
      code: "EXCEEDS_MAX_CONSECUTIVE",
      message: `Maximum consecutive leave under this policy is ${r.maxConsecutiveUnits} unit(s).`,
    });
  }

  if (!r.allowPastDated && input.fromDate < input.now) {
    violations.push({
      code: "PAST_DATED_NOT_ALLOWED",
      message: "Leave cannot be applied for past dates under this policy.",
    });
  }

  if (!r.allowSameDay) {
    const sameDay =
      input.fromDate.toDateString() === input.now.toDateString();
    if (sameDay) {
      violations.push({
        code: "SAME_DAY_NOT_ALLOWED",
        message: "Same-day leave requests are not allowed under this policy.",
      });
    }
  }

  if (r.minNoticeDays != null) {
    const noticeDays = daysBetween(input.now, input.fromDate);
    if (noticeDays < r.minNoticeDays) {
      violations.push({
        code: "INSUFFICIENT_NOTICE",
        message: `This leave type requires at least ${r.minNoticeDays} day(s) advance notice.`,
      });
    }
  }

  if (r.maxAdvanceBookingDays != null) {
    const advanceDays = daysBetween(input.now, input.fromDate);
    if (advanceDays > r.maxAdvanceBookingDays) {
      violations.push({
        code: "TOO_FAR_IN_ADVANCE",
        message: `This leave type cannot be booked more than ${r.maxAdvanceBookingDays} day(s) in advance.`,
      });
    }
  }

  if (r.waitingPeriodAfterJoiningDays > 0) {
    const record = await db.employmentRecord.findUnique({
      where: { userId: input.userId },
      select: { joinDate: true },
    });
    if (record) {
      const daysSinceJoining = daysBetween(record.joinDate, input.now);
      if (daysSinceJoining < r.waitingPeriodAfterJoiningDays) {
        violations.push({
          code: "WAITING_PERIOD_NOT_MET",
          message: `You must wait ${r.waitingPeriodAfterJoiningDays} day(s) after joining before applying for this leave type.`,
        });
      }
    }
  }

  if (r.maxOccurrencesPerYear != null) {
    const year = input.fromDate.getFullYear();
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31);
    const existingCount = await db.leaveRequest.count({
      where: {
        userId: input.userId,
        leaveTypeId: input.leaveTypeId,
        fromDate: { gte: yearStart, lte: yearEnd },
        status: { in: ["pending", "PENDING_APPROVAL", "approved", "APPROVED"] },
      },
    });
    if (existingCount >= r.maxOccurrencesPerYear) {
      violations.push({
        code: "MAX_OCCURRENCES_EXCEEDED",
        message: `This leave type allows a maximum of ${r.maxOccurrencesPerYear} request(s) per year.`,
      });
    }
  }

  // Clubbing rules: check adjacency/combination against existing approved
  // and pending requests for OTHER leave types (spec §16).
  if (config.clubbingRules.length > 0) {
    const nearbyFrom = new Date(input.fromDate);
    nearbyFrom.setDate(nearbyFrom.getDate() - 3);
    const nearbyTo = new Date(input.toDate);
    nearbyTo.setDate(nearbyTo.getDate() + 3);

    const nearbyRequests = await db.leaveRequest.findMany({
      where: {
        userId: input.userId,
        leaveTypeId: { not: input.leaveTypeId },
        status: { in: ["pending", "PENDING_APPROVAL", "approved", "APPROVED"] },
        fromDate: { lte: nearbyTo },
        toDate: { gte: nearbyFrom },
      },
    });

    for (const rule of config.clubbingRules) {
      const conflicting = nearbyRequests.filter((req) => req.leaveTypeId === rule.otherLeaveTypeId);
      if (conflicting.length === 0) continue;

      if (rule.mode === "FORBID_COMBINE") {
        const overlapping = conflicting.some(
          (req) => req.fromDate <= input.toDate && req.toDate >= input.fromDate,
        );
        if (overlapping) {
          violations.push({
            code: "CLUBBING_FORBIDDEN",
            message: "This leave type cannot be combined with an overlapping request of another restricted type.",
          });
        }
      } else if (rule.mode === "FORBID_ADJACENT") {
        const adjacent = conflicting.some((req) => {
          const gapBefore = daysBetween(req.toDate, input.fromDate);
          const gapAfter = daysBetween(input.toDate, req.fromDate);
          return gapBefore === 1 || gapAfter === 1;
        });
        if (adjacent) {
          violations.push({
            code: "CLUBBING_ADJACENT_FORBIDDEN",
            message: "This leave type cannot be taken on consecutive dates adjacent to the other restricted leave type.",
          });
        }
      }
    }
  }

  return violations;
}
