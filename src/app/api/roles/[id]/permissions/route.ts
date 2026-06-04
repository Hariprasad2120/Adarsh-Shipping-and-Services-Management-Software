import { NextRequest } from "next/server";
import { getSessionOrUnauth, ok, err } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/rbac";
import { updateRolePermissions } from "@/modules/core/organisation/service";
import { z } from "zod";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  await requirePermission(session!.user.id, "admin.roles.manage");

  const { id } = await params;
  const parsed = z.object({ permissionIds: z.array(z.string()) }).safeParse(await req.json());
  if (!parsed.success) return err("Invalid input");

  await updateRolePermissions(id, parsed.data.permissionIds);
  return ok({ updated: true });
}
