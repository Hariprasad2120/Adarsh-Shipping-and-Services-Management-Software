import { NextRequest } from "next/server";
import { getSessionOrUnauth, ok, err } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/rbac";
import { db } from "@/lib/db";
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
  await requirePermission(session!.user.id, "hrms.employee.create");

  const { id: userId } = await params;
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return err("Invalid input");

  const { annualCTC, monthlyGross, breakup } = parsed.data;

  // Upsert employment record, setting ctc + payrollMeta
  await db.employmentRecord.upsert({
    where: { userId },
    update: {
      ctc: annualCTC,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      payrollMeta: { monthlyGross, breakup } as any,
    },
    create: {
      userId,
      joinDate: new Date(),
      ctc: annualCTC,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      payrollMeta: { monthlyGross, breakup } as any,
    },
  });

  return ok({ updated: true, monthlyGross });
}
