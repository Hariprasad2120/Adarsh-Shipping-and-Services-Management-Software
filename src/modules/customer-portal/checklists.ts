import { getNow } from "@/lib/clock";
import { db } from "@/lib/db";
import type { getPortalSession } from "./auth";

type PortalSession = NonNullable<Awaited<ReturnType<typeof getPortalSession>>>;

export async function submitPortalChecklistDecision(
  session: Pick<PortalSession, "orgId" | "portalUser">,
  checklistId: string,
  decision: "APPROVED" | "REJECTED",
  remarks?: string,
) {
  const now = await getNow();

  const checklist = await db.chaChecklist.findFirst({
    where: {
      id: checklistId,
      job: {
        orgId: session.orgId,
        customerId: session.portalUser.customerId,
        deletedAt: null,
      },
    },
    select: {
      id: true,
      jobId: true,
      currentFileVersionId: true,
      status: true,
      currentApprovalStage: true,
      customerApprovalVisibleAt: true,
      createdById: true,
      updatedById: true,
      job: {
        select: {
          id: true,
          jobNumber: true,
          primaryOwnerId: true,
        },
      },
    },
  });

  if (!checklist || !checklist.currentFileVersionId) {
    throw new Error("Checklist not found.");
  }
  const portalCustomerApprovalOpen =
    checklist.currentApprovalStage === "CUSTOMER" ||
    checklist.currentApprovalStage === "PENDING_CUSTOMER_APPROVAL" ||
    checklist.status === "CUSTOMER_APPROVAL_PENDING";
  if (!portalCustomerApprovalOpen) {
    throw new Error("Checklist is not awaiting customer approval.");
  }
  if (!checklist.customerApprovalVisibleAt) {
    throw new Error("Checklist is not visible in the customer portal yet.");
  }
  if (checklist.customerApprovalVisibleAt.getTime() > now.getTime()) {
    throw new Error("Checklist approval is not available yet.");
  }

  const actingUserId =
    checklist.job.primaryOwnerId ||
    checklist.updatedById ||
    checklist.createdById;

  const result = await db.$transaction(async (tx) => {
    const existingResponse = await tx.customerChecklistResponse.findFirst({
      where: {
        orgId: session.orgId,
        customerId: session.portalUser.customerId,
        jobId: checklist.jobId,
        checklistId: checklist.id,
      },
      select: {
        id: true,
        decision: true,
      },
    });

    if (existingResponse) {
      throw new Error("This checklist already has a customer decision.");
    }

    await tx.customerChecklistResponse.create({
      data: {
        orgId: session.orgId,
        customerId: session.portalUser.customerId,
        jobId: checklist.jobId,
        checklistId: checklist.id,
        portalUserId: session.portalUser.id,
        decision,
        remarks: remarks?.trim() || null,
        submittedAt: now,
      },
    });

    if (decision === "REJECTED") {
      await tx.chaChecklist.update({
        where: { id: checklist.id },
        data: {
          status: "CUSTOMER_REWORK_REQUIRED",
          currentApprovalStage: "UPLOAD",
          customerRejectedOnce: true,
          customerApprovalAttempted: true,
          updatedById: actingUserId,
        },
      });

      await tx.chaJob.update({
        where: { id: checklist.jobId },
        data: { stage: "CHECKLIST_PREPARATION" },
      });

      return { outcome: "REJECTED" as const, jobId: checklist.jobId };
    }

    await tx.chaChecklist.update({
      where: { id: checklist.id },
      data: {
        status: "CUSTOMER_APPROVED",
        currentApprovalStage: "FILING",
        customerApprovalAttempted: true,
        updatedById: actingUserId,
      },
    });

    await tx.chaJob.update({
      where: { id: checklist.jobId },
      data: { stage: "FILING" },
    });

    const filing = await tx.chaFiling.upsert({
      where: { jobId: checklist.jobId },
      update: {},
      create: {
        jobId: checklist.jobId,
        status: "PENDING",
      },
      select: {
        id: true,
        estimatedFilingDate: true,
      },
    });

    if (!filing.estimatedFilingDate) {
      const estimatedFilingDate = new Date(now.getTime());
      estimatedFilingDate.setDate(estimatedFilingDate.getDate() + 3);

      await tx.chaFiling.update({
        where: { jobId: checklist.jobId },
        data: { estimatedFilingDate },
      });

      await tx.chaFilingDateHistory.create({
        data: {
          filingId: filing.id,
          estimatedFilingDate,
          setById: actingUserId,
        },
      });
    }

    return { outcome: "APPROVED" as const, jobId: checklist.jobId };
  });

  return {
    ...result,
    checklistId: checklist.id,
    jobNumber: checklist.job.jobNumber,
  };
}
