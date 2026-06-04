import { NextRequest } from "next/server";
import { getSessionOrUnauth, ok, err } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/rbac";
import { updateUserRoles } from "@/modules/core/user/service";
import { z } from "zod";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  await requirePermission(session!.user.id, "admin.users.manage");

  const { id } = await params;
  const parsed = z.object({ roleIds: z.array(z.string()) }).safeParse(await req.json());
  if (!parsed.success) return err("Invalid input");

  await updateUserRoles(id, parsed.data.roleIds);
  return ok({ updated: true });
}
