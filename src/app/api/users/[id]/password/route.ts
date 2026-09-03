import { NextRequest } from "next/server";
import { getSessionOrUnauth, ok, err } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/rbac";
import { resetPassword } from "@/modules/core/user/service";
import { z } from "zod";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  await requirePermission(session!.user.id, "admin.users.manage");
  const orgId = session!.user.orgId;
  if (!orgId) return err("No active organisation", 403);

  const { id } = await params;
  const parsed = z.object({ password: z.string().min(12) }).safeParse(await req.json());
  if (!parsed.success) return err("Password must be at least 12 characters");

  await resetPassword(id, orgId, parsed.data.password);
  return ok({ reset: true });
}
