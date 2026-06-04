import { NextRequest } from "next/server";
import { getSessionOrUnauth, ok, err } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/rbac";
import { submitSelfAssessment } from "@/modules/ams/service";
import { z } from "zod";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  await requirePermission(session!.user.id, "ams.appraisal.self_assess");

  const { id } = await params;
  const parsed = z
    .object({
      action: z.enum(["DRAFT", "SUBMITTED"]),
      answers: z.object({
        version: z.literal("v2"),
        employeeInfo: z.record(z.string(), z.string()).default({}),
        responses: z.record(
          z.string(),
          z.object({
            value: z.string().optional(),
            option: z.string().optional(),
            explanation: z.string().optional(),
          }),
        ).default({}),
        categoryPoints: z.record(z.string(), z.number().min(1).max(5)).default({}),
        feedback: z.string().default(""),
      }),
    })
    .safeParse(await req.json());
  if (!parsed.success) return err("Invalid input");

  const result = await submitSelfAssessment(id, session!.user.id, parsed.data.answers, parsed.data.action);
  return ok({ saved: true, editCount: result.editCount, status: result.status });
}
