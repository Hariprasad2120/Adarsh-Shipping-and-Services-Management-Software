"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { addBusinessDays } from "@/modules/ams/due-dates";

type Result = { ok: true } | { ok: false; error: string };

async function checkIsAdmin(userId: string): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { roles: { include: { role: true } } },
  });
  const roles = user?.roles.map((r) => r.role.name) ?? [];
  return roles.some((r) => ["Admin", "HR", "Management", "Director"].includes(r));
}

export async function requestExtensionAction(formData: FormData): Promise<Result> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const appraisalId = formData.get("appraisalId") as string;
    const reason = formData.get("reason") as string;

    if (!appraisalId || !reason) {
      return { ok: false, error: "Missing required parameters" };
    }

    const appraisal = await db.appraisal.findUnique({
      where: { id: appraisalId },
      include: { reviewers: true },
    });

    if (!appraisal) return { ok: false, error: "Appraisal not found" };

    const isEmployee = appraisal.employeeId === session.user.id;
    const isReviewer = appraisal.reviewers.some((r) => r.userId === session.user.id);

    if (!isEmployee && !isReviewer) {
      return {
        ok: false,
        error: "You are not authorized to request an extension for this appraisal",
      };
    }

    // Check if there is already a PENDING request
    const existing = await db.appraisalExtensionRequest.findFirst({
      where: {
        appraisalId,
        requesterId: session.user.id,
        status: "PENDING",
      },
    });

    if (existing) {
      return { ok: false, error: "You already have a pending extension request for this appraisal" };
    }

    await db.appraisalExtensionRequest.create({
      data: {
        appraisalId,
        requesterId: session.user.id,
        reason,
        status: "PENDING",
      },
    });

    revalidatePath("/ams/extensions");
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to request extension" };
  }
}

export async function decideExtensionAction(formData: FormData): Promise<Result> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const requestId = formData.get("requestId") as string;
    const decision = formData.get("decision") as "APPROVED" | "REJECTED";

    if (!requestId || !decision) {
      return { ok: false, error: "Missing parameters" };
    }

    const isAdmin = await checkIsAdmin(session.user.id);
    if (!isAdmin) return { ok: false, error: "Forbidden" };

    const ext = await db.appraisalExtensionRequest.findUnique({
      where: { id: requestId },
      include: {
        appraisal: true,
      },
    });

    if (!ext) return { ok: false, error: "Request not found" };
    if (ext.status !== "PENDING") return { ok: false, error: "Already decided" };

    // Fetch org holidays for business days calculation
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Organisation missing" };

    const holidays = await db.holiday.findMany({ where: { orgId } });
    const holidayISOSet = new Set(holidays.map((h) => h.date.toISOString().split("T")[0]));

    // Extend by 2 business days
    const extendedUntil = decision === "APPROVED" ? addBusinessDays(new Date(), 2, holidayISOSet) : null;

    await db.$transaction(async (tx) => {
      // Update extension request
      await tx.appraisalExtensionRequest.update({
        where: { id: requestId },
        data: {
          status: decision,
          extendedUntil,
          decidedById: session.user.id,
        },
      });

      // Update relevant deadline on appraisal depending on requester
      if (decision === "APPROVED" && extendedUntil) {
        const isEmployee = ext.appraisal.employeeId === ext.requesterId;
        if (isEmployee) {
          await tx.appraisal.update({
            where: { id: ext.appraisalId },
            data: { selfAssessmentDeadline: extendedUntil },
          });
        } else {
          await tx.appraisal.update({
            where: { id: ext.appraisalId },
            data: { reviewerRatingDeadline: extendedUntil },
          });
        }
      }

      // Add audit log
      await tx.appraisalAuditLog.create({
        data: {
          appraisalId: ext.appraisalId,
          actorId: session.user.id,
          fromStage: ext.appraisal.stage,
          toStage: ext.appraisal.stage,
          note: `Extension request ${decision}. Extended until ${
            extendedUntil ? extendedUntil.toLocaleDateString("en-IN") : "N/A"
          }`,
        },
      });
    });

    // Create notification for requester
    await db.notification.create({
      data: {
        userId: ext.requesterId,
        orgId,
        kind: "EXTENSION_DECISION",
        title: `Appraisal Extension ${decision}`,
        body:
          decision === "APPROVED"
            ? `Your request for extension has been approved. You have 2 additional business days.`
            : `Your request for extension was rejected. Please submit ratings immediately.`,
        link: `/ams/my-appraisal`,
      },
    }).catch(() => {});

    revalidatePath("/ams/extensions");
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to process decision" };
  }
}
