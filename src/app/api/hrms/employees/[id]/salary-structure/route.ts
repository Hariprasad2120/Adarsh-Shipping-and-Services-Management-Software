import { NextRequest } from "next/server";
import { getSessionOrUnauth, ok, err } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/rbac";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { z } from "zod";

const bodySchema = z.object({
  annualCTC: z.number().positive(),
  monthlyGross: z.number().positive(),
  breakup: z.record(z.string(), z.number()),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  await requirePermission(session!.user.id, "hrms.salary.manage");

  const { id: userId } = await params;
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return err("Invalid input");

  const { annualCTC, monthlyGross, breakup } = parsed.data;
  const existing = await db.employmentRecord.findUnique({
    where: { userId },
    select: { payrollMeta: true },
  });
  const currentMeta =
    existing?.payrollMeta && typeof existing.payrollMeta === "object" && !Array.isArray(existing.payrollMeta)
      ? (existing.payrollMeta as Record<string, unknown>)
      : {};
  const nextMeta = {
    ...currentMeta,
    monthlyGross,
    breakup,
  } satisfies Prisma.InputJsonValue;

  // Upsert employment record, setting ctc + payrollMeta
  await db.employmentRecord.upsert({
    where: { userId },
    update: {
      ctc: annualCTC,
      payrollMeta: nextMeta,
    },
    create: {
      userId,
      joinDate: new Date(),
      ctc: annualCTC,
      payrollMeta: nextMeta,
    },
  });

  return ok({ updated: true, monthlyGross });
}
