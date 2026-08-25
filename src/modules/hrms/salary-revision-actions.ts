"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { fireAutomation } from "@/modules/payroll/automation";

type ActionResponse = { ok: true } | { ok: false; error: string };

// Phase 13-14: salary revision request + approval, layered on the existing
// payrollMeta.salaryRevisions history (docs/payroll/MONOLITH_PAYROLL_INTEGRATION_MAP.md).
// A revision never overwrites EmploymentRecord.ctc until approved — creation
// only logs a PENDING row so historical payroll stays intact.
export async function createSalaryRevisionAction(input: {
  employeeId: string;
  proposedCtcAnnual: number;
  effectiveFrom: string;
  reason: string;
}): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "hrms.salary.manage");

    if (!(input.proposedCtcAnnual > 0)) {
      return { ok: false, error: "Proposed CTC must be greater than zero" };
    }
    const effectiveFrom = new Date(input.effectiveFrom);
    if (Number.isNaN(effectiveFrom.getTime())) {
      return { ok: false, error: "Invalid effective date" };
    }

    const employee = await db.user.findFirst({
      where: { id: input.employeeId, orgId },
      select: { employeeNumber: true, employmentRecord: { select: { ctc: true, payrollMeta: true } } },
    });
    if (!employee?.employmentRecord) {
      return { ok: false, error: "Employee has no HRMS employment record yet" };
    }

    const meta = (employee.employmentRecord.payrollMeta ?? {}) as Record<string, unknown>;
    const existingRevisions = Array.isArray(meta.salaryRevisions) ? meta.salaryRevisions : [];

    const newRevision = {
      Id: randomUUID(),
      "Employee Number": employee.employeeNumber != null ? String(employee.employeeNumber) : "",
      Status: "PENDING",
      "Effective From": input.effectiveFrom,
      "Payout Month": input.effectiveFrom,
      "CTC (per annum)": employee.employmentRecord.ctc ?? 0,
      "Revised CTC (per annum)": input.proposedCtcAnnual,
      Reason: input.reason.trim(),
    };

    await db.employmentRecord.update({
      where: { userId: input.employeeId },
      data: {
        payrollMeta: {
          ...meta,
          salaryRevisions: [...existingRevisions, newRevision],
          latestSalaryRevision: newRevision,
        } as Prisma.InputJsonValue,
      },
    });

    revalidatePath("/payroll/approvals");
    revalidatePath(`/payroll/employees/${input.employeeId}/salary-details`);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to submit salary revision" };
  }
}

async function decideSalaryRevision(
  employeeId: string,
  revisionId: string,
  decision: "APPROVED" | "REJECTED",
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "hrms.salary.manage");

    const employee = await db.user.findFirst({
      where: { id: employeeId, orgId },
      select: { employmentRecord: { select: { payrollMeta: true } } },
    });
    if (!employee?.employmentRecord) return { ok: false, error: "Employee not found" };

    const meta = (employee.employmentRecord.payrollMeta ?? {}) as Record<string, unknown>;
    const revisions = Array.isArray(meta.salaryRevisions) ? meta.salaryRevisions : [];
    const index = revisions.findIndex((row) => (row as Record<string, unknown>)?.Id === revisionId);
    if (index === -1) return { ok: false, error: "Revision not found" };

    const revision = revisions[index] as Record<string, unknown>;
    if (revision.Status !== "PENDING") return { ok: false, error: "Revision already decided" };

    const updatedRevision = { ...revision, Status: decision };
    const updatedRevisions = [...revisions];
    updatedRevisions[index] = updatedRevision;

    const updates: Prisma.EmploymentRecordUpdateInput = {
      payrollMeta: {
        ...meta,
        salaryRevisions: updatedRevisions,
        latestSalaryRevision: updatedRevision,
      } as Prisma.InputJsonValue,
    };
    if (decision === "APPROVED") {
      const revisedCtc = Number(revision["Revised CTC (per annum)"]);
      if (Number.isFinite(revisedCtc) && revisedCtc > 0) {
        updates.ctc = revisedCtc;
      }
    }

    await db.employmentRecord.update({ where: { userId: employeeId }, data: updates });

    if (decision === "APPROVED") {
      await fireAutomation(orgId, "SALARY_REVISION_APPROVED", {
        type: "SALARY_REVISION",
        id: revisionId,
        employeeId,
        summary: "A salary revision has been approved.",
        link: `/payroll/employees/${employeeId}/salary-details`,
      });
    }

    revalidatePath("/payroll/approvals");
    revalidatePath(`/payroll/employees/${employeeId}/salary-details`);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to decide salary revision" };
  }
}

export async function approveSalaryRevisionAction(employeeId: string, revisionId: string) {
  return decideSalaryRevision(employeeId, revisionId, "APPROVED");
}

export async function rejectSalaryRevisionAction(employeeId: string, revisionId: string) {
  return decideSalaryRevision(employeeId, revisionId, "REJECTED");
}
