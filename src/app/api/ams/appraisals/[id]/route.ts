import { NextRequest } from "next/server";
import { getSessionOrUnauth, ok, err } from "@/lib/api-helpers";
import { getAppraisal } from "@/modules/ams/service";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;

  const { id } = await params;
  const appraisal = await getAppraisal(id);
  if (!appraisal) return err("Not found", 404);

  return ok(appraisal);
}
