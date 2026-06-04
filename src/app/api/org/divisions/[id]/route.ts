import { NextRequest } from "next/server";
import { getSessionOrUnauth, ok, err } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/rbac";
import { updateDivision, deleteDivision } from "@/modules/core/organisation/service";
import { z } from "zod";

const schema = z.object({ name: z.string().min(1) });

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  await requirePermission(session!.user.id, "hrms.org_structure.manage");

  const { id } = await params;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return err("Invalid input");

  return ok(await updateDivision(id, parsed.data.name));
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  await requirePermission(session!.user.id, "hrms.org_structure.manage");

  const { id } = await params;
  await deleteDivision(id);
  return ok({ deleted: true });
}
