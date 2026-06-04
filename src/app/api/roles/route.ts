import { NextRequest } from "next/server";
import { getSessionOrUnauth, ok, err } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/rbac";
import { getRoles, createRole, getAllPermissions } from "@/modules/core/organisation/service";
import { z } from "zod";

export async function GET() {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  const [roles, permissions] = await Promise.all([
    getRoles(session!.user.orgId!),
    getAllPermissions(),
  ]);
  return ok({ roles, permissions });
}

export async function POST(req: NextRequest) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  await requirePermission(session!.user.id, "admin.roles.manage");

  const parsed = z.object({ name: z.string().min(1) }).safeParse(await req.json());
  if (!parsed.success) return err("Invalid input");

  return ok(await createRole(session!.user.orgId!, parsed.data.name), 201);
}
