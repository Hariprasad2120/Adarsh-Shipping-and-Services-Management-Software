import { NextRequest } from "next/server";
import { getSessionOrUnauth, ok, err } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/rbac";
import { activateCycle, closeCycle } from "@/modules/ams/service";
import { z } from "zod";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  await requirePermission(session!.user.id, "ams.cycle.manage");

  const { id } = await params;
  const parsed = z.object({ action: z.enum(["activate", "close"]) }).safeParse(await req.json());
  if (!parsed.success) return err("Invalid input");

  const result = parsed.data.action === "activate"
    ? await activateCycle(id)
    : await closeCycle(id);

  return ok(result);
}
