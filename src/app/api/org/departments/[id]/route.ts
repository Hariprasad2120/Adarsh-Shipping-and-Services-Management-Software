import { NextRequest } from "next/server";
import { getSessionOrUnauth, ok, err } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/rbac";
import { updateDepartment, deleteDepartment } from "@/modules/core/organisation/service";
import { z } from "zod";

const schema = z.object({ name: z.string().min(1), code: z.string().min(1) });

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  await requirePermission(session!.user.id, "hrms.org_structure.manage");

  const { id } = await params;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return err("Invalid input");

  return ok(await updateDepartment(id, parsed.data.name, parsed.data.code));
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  await requirePermission(session!.user.id, "hrms.org_structure.manage");

  const { id } = await params;
  await deleteDepartment(id);
  return ok({ deleted: true });
}
