import { db } from "@/lib/db";
import type { LeaveCalculationResult } from "@/modules/leave/calculation";
import { parsePolicyConfig } from "@/modules/leave/policy";
import type { ApprovalRoute } from "@/modules/leave/policy-config.schema";
import { resolveActiveApprover } from "@/modules/leave/delegation";

interface PolicyVersionLike {
  configuration: unknown;
}

function routeMatches(route: ApprovalRoute, calculation: LeaveCalculationResult): boolean {
  const { criteria } = route;
  if (criteria.maxUnits != null && calculation.requestedUnits > criteria.maxUnits) return false;
  if (criteria.minUnits != null && calculation.requestedUnits < criteria.minUnits) return false;
  if (criteria.requiresLop != null && (calculation.lopUnits > 0) !== criteria.requiresLop) return false;
  return true;
}

/**
 * Resolves an approverType + org context into a concrete userId. Snapshotted
 * at submission time so a later org-structure change never alters an
 * in-flight request's routing (ARCHITECTURE.md §5).
 */
async function resolveApprover(
  approverType: string,
  requesterId: string,
  roleId?: string,
  namedUserId?: string,
): Promise<string | null> {
  const requester = await db.user.findUnique({
    where: { id: requesterId },
    select: { managerId: true, departmentId: true, orgId: true },
  });
  if (!requester) return null;

  switch (approverType) {
    case "MANAGER":
      return requester.managerId ?? null;
    case "MANAGERS_MANAGER": {
      if (!requester.managerId) return null;
      const manager = await db.user.findUnique({
        where: { id: requester.managerId },
        select: { managerId: true },
      });
      return manager?.managerId ?? null;
    }
    case "DEPARTMENT_HEAD": {
      if (!requester.departmentId) return null;
      // No explicit "head of department" field exists on Department in this
      // schema — approximate via the department's users who hold a role
      // granting leave.manage, first match. Documented limitation.
      const headCandidate = await db.user.findFirst({
        where: {
          departmentId: requester.departmentId,
          roles: { some: { role: { permissions: { some: { permission: { key: "attendance.leave.manage" } } } } } },
        },
        select: { id: true },
      });
      return headCandidate?.id ?? null;
    }
    case "ROLE": {
      if (!roleId || !requester.orgId) return null;
      const holder = await db.user.findFirst({
        where: { orgId: requester.orgId, roles: { some: { roleId } } },
        select: { id: true },
      });
      return holder?.id ?? null;
    }
    case "NAMED_USER":
      return namedUserId ?? null;
    case "HR": {
      if (!requester.orgId) return null;
      const hrUser = await db.user.findFirst({
        where: {
          orgId: requester.orgId,
          roles: { some: { role: { permissions: { some: { permission: { key: "attendance.leave.manage" } } } } } },
        },
        select: { id: true },
      });
      return hrUser?.id ?? null;
    }
    default:
      return null;
  }
}

/**
 * Materializes concrete LeaveApprovalStep rows for a submitted request based
 * on the policy version's approvalRouting config. Returns [] when
 * autoApprove is set or no route matches (caller falls back to the legacy
 * getUsersWithPermission("attendance.leave.approve") behavior).
 */
export async function buildApprovalSteps(
  requestId: string,
  policyVersion: PolicyVersionLike,
  calculation: LeaveCalculationResult,
  requesterId: string,
) {
  const config = parsePolicyConfig(policyVersion.configuration);

  if (config.approvalRouting.autoApprove) {
    return [];
  }

  const matchedRoute = config.approvalRouting.routes.find((route) => routeMatches(route, calculation));
  if (!matchedRoute) {
    return [];
  }

  const created = [];
  for (const stepConfig of matchedRoute.steps) {
    const naturalApproverUserId = await resolveApprover(
      stepConfig.approverType,
      requesterId,
      stepConfig.roleId,
      stepConfig.userId,
    );
    // Delegation (spec §11): if the resolved approver has an active
    // backup-approver delegation, the step is assigned to the delegate
    // instead. Not re-checked once the step is created — a delegation
    // created/revoked mid-flight is instead re-resolved at decision time
    // in request.ts (delegation reflects "who can act right now," unlike
    // the pinned policy version).
    const approverUserId = naturalApproverUserId
      ? await resolveActiveApprover(naturalApproverUserId)
      : naturalApproverUserId;
    // SLA due date (spec §11): only the first step gets a due date at
    // creation time, since later steps aren't PENDING yet — decideLeaveRequest
    // sets slaDueAt on the newly-activated step when it advances (see
    // request.ts's !isFinalDecision branch).
    const slaDueAt =
      stepConfig.sequence === 1 && config.approvalRouting.slaHours
        ? new Date(Date.now() + config.approvalRouting.slaHours * 60 * 60 * 1000)
        : null;
    const step = await db.leaveApprovalStep.create({
      data: {
        requestId,
        sequence: stepConfig.sequence,
        approverType: stepConfig.approverType,
        approverUserId,
        status: "PENDING",
        slaDueAt,
      },
    });
    created.push(step);
  }

  if (created.length > 0) {
    await db.leaveRequest.update({
      where: { id: requestId },
      data: { currentApprovalStepId: created[0].id },
    });
  }

  return created;
}
