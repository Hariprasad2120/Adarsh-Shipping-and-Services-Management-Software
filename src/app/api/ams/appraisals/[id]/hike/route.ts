import { NextRequest } from "next/server";
import { getSessionOrUnauth, ok, err } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/rbac";
import { finaliseHike } from "@/modules/ams/service";
import { z } from "zod";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  await requirePermission(session!.user.id, "ams.hike.finalise");

  const { id } = await params;
  const parsed = z.object({
    percent: z.number().min(0),
    effectiveFrom: z.string(),
    notes: z.string().optional(),
  }).safeParse(await req.json());
  if (!parsed.success) return err("Invalid input");

  await finaliseHike(
    id,
    session!.user.id,
    parsed.data.percent,
    new Date(parsed.data.effectiveFrom),
    parsed.data.notes
  );

  return ok({ finalised: true });
}
