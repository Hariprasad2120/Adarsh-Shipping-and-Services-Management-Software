import { NextRequest } from "next/server";
import { z } from "zod";
import { getSessionOrUnauth, ok, err } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/rbac";
import { isRecruitEnabled } from "@/lib/recruit-flag";
import { getJobOpening, updateJobStatus } from "@/modules/recruit/employer-service";
import { db } from "@/lib/db";
import { auditRecruit } from "@/modules/recruit/audit";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isRecruitEnabled()) return err("Recruit module is not enabled", 404);
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  await requirePermission(session!.user.id, "recruit.view");

  const { id } = await params;
  const job = await getJobOpening(session!.user.orgId!, id);
  if (!job) return err("Job opening not found", 404);
  return ok(job);
}

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  internalCode: z.string().max(50).optional(),
  departmentId: z.string().optional().nullable(),
  location: z.string().max(200).optional(),
  openings: z.number().int().min(1).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  mandatorySkills: z.array(z.string()).max(30).optional(),
  preferredSkills: z.array(z.string()).max(30).optional(),
  responsibilities: z.string().max(10000).optional(),
  compensationMin: z.number().min(0).optional().nullable(),
  compensationMax: z.number().min(0).optional().nullable(),
  closingDate: z.string().optional().nullable(),
  jobDescriptionHtml: z.string().max(100000).optional(),
  requirementsJson: z.unknown().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isRecruitEnabled()) return err("Recruit module is not enabled", 404);
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  await requirePermission(session!.user.id, "recruit.job.edit");

  const { id } = await params;
  const orgId = session!.user.orgId!;
  const existing = await getJobOpening(orgId, id);
  if (!existing) return err("Job opening not found", 404);

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) return err("Invalid input: " + parsed.error.message);

  const { requirementsJson, closingDate, ...rest } = parsed.data;
  const updated = await db.recruitJobOpening.update({
    where: { id },
    data: {
      ...rest,
      closingDate: closingDate ? new Date(closingDate) : undefined,
      requirementsJson: requirementsJson as import("@/generated/prisma/client").Prisma.InputJsonValue ?? undefined,
      updatedById: session!.user.id,
    },
  });

  await auditRecruit({
    orgId,
    actorId: session!.user.id,
    action: "recruit.job.updated",
    entityType: "RecruitJobOpening",
    entityId: id,
    changedFields: parsed.data as Record<string, unknown>,
    source: "UI",
  });

  return ok(updated);
}

const statusSchema = z.object({
  status: z.enum(["DRAFT", "PENDING_APPROVAL", "APPROVED", "PUBLISHED", "PAUSED", "CLOSED", "CANCELLED", "ARCHIVED"]),
  reason: z.string().max(500).optional(),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isRecruitEnabled()) return err("Recruit module is not enabled", 404);
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;

  const { id } = await params;
  const orgId = session!.user.orgId!;
  const parsed = statusSchema.safeParse(await req.json());
  if (!parsed.success) return err("Invalid input");

  const { status, reason } = parsed.data;

  // Check permission based on target status
  if (status === "PUBLISHED" || status === "PAUSED") {
    await requirePermission(session!.user.id, "recruit.job.publish");
  } else if (status === "CLOSED" || status === "CANCELLED" || status === "ARCHIVED") {
    await requirePermission(session!.user.id, "recruit.job.close");
  } else {
    await requirePermission(session!.user.id, "recruit.job.edit");
  }

  const updated = await updateJobStatus(orgId, id, session!.user.id, status as never, reason);
  return ok(updated);
}
