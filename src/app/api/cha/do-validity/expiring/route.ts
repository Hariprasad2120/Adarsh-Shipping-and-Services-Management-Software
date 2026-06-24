import { getSessionOrUnauth, ok } from "@/lib/api-helpers";
import { listDeliveryOrderValidityWarnings } from "@/modules/cha/service";

export async function GET() {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;

  const warnings = await listDeliveryOrderValidityWarnings(session!.user.id, session!.user.orgId!);
  return ok(warnings);
}
