import { NextRequest } from "next/server";
import { getSessionOrUnauth, ok, err } from "@/lib/api-helpers";
import { acknowledgeOutcome } from "@/modules/ams/service";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;

  const { id } = await params;
  try {
    await acknowledgeOutcome(id, session!.user.id);
  } catch (e) {
    return err(e instanceof Error ? e.message : "Failed to acknowledge outcome");
  }
  return ok({ acknowledged: true });
}
