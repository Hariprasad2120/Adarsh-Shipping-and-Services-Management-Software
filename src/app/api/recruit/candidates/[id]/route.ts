import { NextRequest } from "next/server";
import { z } from "zod";
import { getSessionOrUnauth, ok, err } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/rbac";
import { isRecruitEnabled } from "@/lib/recruit-flag";
import { getCandidate } from "@/modules/recruit/employer-service";
import { auditRecruit } from "@/modules/recruit/audit";
import { db } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isRecruitEnabled()) return err("Recruit module is not enabled", 404);
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  await requirePermission(session!.user.id, "recruit.candidate.view");

  const { id } = await params;
  const candidate = await getCandidate(session!.user.orgId!, id);
  if (!candidate) return err("Candidate not found", 404);
  return ok(candidate);
}

const editSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phone: z.string().max(20).optional().nullable(),
  currentLocation: z.string().max(200).optional().nullable(),
  currentCompany: z.string().max(200).optional().nullable(),
  currentTitle: z.string().max(200).optional().nullable(),
  totalExperienceYears: z.number().min(0).max(60).optional().nullable(),
  noticePeriodDays: z.number().int().min(0).optional().nullable(),
  expectedCompensation: z.number().min(0).optional().nullable(),
  skills: z.array(z.string()).max(50).optional(),
  tags: z.array(z.string()).max(20).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isRecruitEnabled()) return err("Recruit module is not enabled", 404);
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  await requirePermission(session!.user.id, "recruit.candidate.edit");

  const { id } = await params;
  const orgId = session!.user.orgId!;
  const existing = await db.recruitCandidate.findFirst({ where: { id, orgId } });
  if (!existing) return err("Candidate not found", 404);

  const parsed = editSchema.safeParse(await req.json());
  if (!parsed.success) return err("Invalid input: " + parsed.error.message);

  const updated = await db.recruitCandidate.update({
    where: { id },
    data: { ...parsed.data, updatedById: session!.user.id },
  });

  await auditRecruit({
    orgId,
    actorId: session!.user.id,
    action: "recruit.candidate.updated",
    entityType: "RecruitCandidate",
    entityId: id,
    changedFields: parsed.data as Record<string, unknown>,
    source: "UI",
  });

  return ok(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isRecruitEnabled()) return err("Recruit module is not enabled", 404);
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  await requirePermission(session!.user.id, "recruit.candidate.delete");

  const { id } = await params;
  const orgId = session!.user.orgId!;
  const existing = await db.recruitCandidate.findFirst({ where: { id, orgId, deletedAt: null } });
  if (!existing) return err("Candidate not found", 404);

  const { searchParams } = new URL(req.url);
  const anonymize = searchParams.get("anonymize") === "true";

  if (anonymize) {
    await db.recruitCandidate.update({
      where: { id },
      data: {
        firstName: "ANONYMIZED",
        lastName: "ANONYMIZED",
        email: `anon-${id}@redacted.internal`,
        phone: null,
        anonymizedAt: new Date(),
      },
    });
    await auditRecruit({ orgId, actorId: session!.user.id, action: "recruit.candidate.anonymized", entityType: "RecruitCandidate", entityId: id, source: "UI" });
  } else {
    await db.recruitCandidate.update({ where: { id }, data: { deletedAt: new Date() } });
    await auditRecruit({ orgId, actorId: session!.user.id, action: "recruit.candidate.deleted", entityType: "RecruitCandidate", entityId: id, source: "UI" });
  }

  return ok({ ok: true });
}
