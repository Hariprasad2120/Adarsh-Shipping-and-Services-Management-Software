import { NextRequest } from "next/server";
import { getSessionOrUnauth, ok, err } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/rbac";
import { resetPassword } from "@/modules/core/user/service";
import { z } from "zod";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  await requirePermission(session!.user.id, "admin.users.manage");

  const { id } = await params;
  const parsed = z.object({ password: z.string().min(8) }).safeParse(await req.json());
  if (!parsed.success) return err("Password must be at least 8 characters");

  await resetPassword(id, parsed.data.password);
  return ok({ reset: true });
}
