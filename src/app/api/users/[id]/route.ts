import { NextRequest } from "next/server";
import { getSessionOrUnauth, ok, err } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/rbac";
import { getUser, updateUser, updateEmploymentRecord } from "@/modules/core/user/service";
import { z } from "zod";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  await requirePermission(session!.user.id, "hrms.employee.read");

  const { id } = await params;
  const user = await getUser(id);
  if (!user) return err("Not found", 404);

  const { passwordHash: _, ...safe } = user;
  return ok(safe);
}

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  designation: z.string().optional(),
  branchId: z.string().nullable().optional(),
  departmentId: z.string().nullable().optional(),
  divisionId: z.string().nullable().optional(),
  managerId: z.string().nullable().optional(),
  tlId: z.string().nullable().optional(),
  active: z.boolean().optional(),
  joinDate: z.string().optional(),
  grade: z.string().optional(),
  ctc: z.number().nullable().optional(),
  priorExperienceYears: z.number().nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  await requirePermission(session!.user.id, "hrms.employee.edit");

  const { id } = await params;
  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) return err("Invalid input");

  const { joinDate, grade, ctc, priorExperienceYears, ...userFields } = parsed.data;

  const user = await updateUser(id, userFields);

  if (joinDate !== undefined || grade !== undefined || ctc !== undefined || priorExperienceYears !== undefined) {
    await updateEmploymentRecord(id, {
      ...(joinDate ? { joinDate: new Date(joinDate) } : {}),
      ...(grade !== undefined ? { grade: grade || undefined } : {}),
      ...(ctc !== undefined ? { ctc: ctc ?? undefined } : {}),
      ...(priorExperienceYears !== undefined ? { priorExperienceYears: priorExperienceYears ?? undefined } : {}),
    });
  }

  const { passwordHash: _, ...safe } = user;
  return ok(safe);
}
