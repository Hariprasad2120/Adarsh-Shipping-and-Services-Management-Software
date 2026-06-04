import { NextRequest } from "next/server";
import { getSessionOrUnauth, ok, err } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/rbac";
import { listAppraisals, createAppraisalForEmployee } from "@/modules/ams/service";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  await requirePermission(session!.user.id, "hrms.employee.read");

  const { searchParams } = new URL(req.url);
  return ok(await listAppraisals(session!.user.orgId!, {
    cycleId: searchParams.get("cycleId") ?? undefined,
    stage: searchParams.get("stage") ?? undefined,
    employeeId: searchParams.get("employeeId") ?? undefined,
  }));
}

const createSchema = z.object({
  employeeId: z.string(),
  dueDate: z.string(),
  kind: z.enum(["INTERMEDIATE", "ANNUAL"]),
});

export async function POST(req: NextRequest) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  await requirePermission(session!.user.id, "ams.appraisal.assign_reviewers");

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return err("Invalid input");

  const { employeeId, dueDate, kind } = parsed.data;
  const appraisal = await createAppraisalForEmployee(
    session!.user.orgId!,
    employeeId,
    new Date(dueDate),
    kind
  );
  return ok(appraisal);
}
