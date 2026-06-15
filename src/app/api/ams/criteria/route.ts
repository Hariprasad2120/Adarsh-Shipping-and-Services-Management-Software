import { NextRequest } from "next/server";
import { getSessionOrUnauth, ok, err } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/rbac";
import { listCriteria, createCriterion, deleteCriterion } from "@/modules/ams/service";
import { invalidateReviewerCriteria } from "@/modules/ams/criteria-cache";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { z } from "zod";

export async function GET() {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  return ok(await listCriteria(session!.user.orgId!));
}

export async function POST(req: NextRequest) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  await requirePermission(session!.user.id, "ams.criteria.manage");

  const parsed = z.object({
    code: z.string().optional(),
    label: z.string().min(1),
    description: z.string().optional(),
    weight: z.number().min(0).default(1),
    group: z.string().default(""),
    roleId: z.string().optional(),
    phase: z.enum(["SELF", "REVIEWER", "MANAGEMENT"]).default("SELF"),
    parentId: z.string().optional(),
    order: z.number().int().default(0),
    maxPoints: z.number().int().min(0).default(0),
    kind: z.enum(["CATEGORY", "SUPPLEMENTARY"]).default("CATEGORY"),
    questions: z.array(z.string()).optional(),
    reviewerOnly: z.boolean().default(false),
    meta: z.record(z.string(), z.unknown()).optional(),
  }).safeParse(await req.json());
  if (!parsed.success) return err("Invalid input");

  const created = await createCriterion(session!.user.orgId!, parsed.data);
  invalidateReviewerCriteria(session!.user.orgId!);
  return ok(created, 201);
}

export async function PATCH(req: NextRequest) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  await requirePermission(session!.user.id, "ams.criteria.manage");

  const parsed = z.object({
    id: z.string(),
    code: z.string().optional(),
    label: z.string().min(1).optional(),
    description: z.string().optional(),
    weight: z.number().min(0).optional(),
    order: z.number().int().min(0).optional(),
    meta: z.record(z.string(), z.unknown()).optional(),
    maxPoints: z.number().int().min(0).optional(),
    reviewerOnly: z.boolean().optional(),
    questions: z.array(z.string()).optional(),
  }).safeParse(await req.json());
  if (!parsed.success) return err("Invalid input");

  const { id, ...data } = parsed.data;
  const criterion = await db.appraisalCriterion.findFirst({
    where: { id, orgId: session!.user.orgId! },
    select: { id: true },
  });
  if (!criterion) return err("Criterion not found", 404);

  const updated = await db.appraisalCriterion.update({
    where: { id: criterion.id },
    data: data as Prisma.AppraisalCriterionUpdateInput,
  });
  invalidateReviewerCriteria(session!.user.orgId!);
  return ok(updated);
}

export async function DELETE(req: NextRequest) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  await requirePermission(session!.user.id, "ams.criteria.manage");

  const parsed = z.union([
    z.object({ id: z.string() }),
    z.object({ clearAll: z.literal(true) }),
  ]).safeParse(await req.json());
  if (!parsed.success) return err("Invalid input");

  if ("clearAll" in parsed.data) {
    await db.appraisalCriterion.deleteMany({
      where: { orgId: session!.user.orgId! },
    });
    invalidateReviewerCriteria(session!.user.orgId!);
    return ok({ deleted: true, clearedAll: true });
  }

  await deleteCriterion(session!.user.orgId!, parsed.data.id);
  invalidateReviewerCriteria(session!.user.orgId!);
  return ok({ deleted: true });
}
