import { NextRequest } from "next/server";
import { getSessionOrUnauth, ok, err } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/rbac";
import { listCycles, createCycle } from "@/modules/ams/service";
import { z } from "zod";

export async function GET() {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  return ok(await listCycles(session!.user.orgId!));
}

export async function POST(req: NextRequest) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  await requirePermission(session!.user.id, "ams.cycle.manage");

  const parsed = z.object({ name: z.string().min(1), year: z.number() }).safeParse(await req.json());
  if (!parsed.success) return err("Invalid input");

  return ok(await createCycle(session!.user.orgId!, parsed.data.name, parsed.data.year), 201);
}
