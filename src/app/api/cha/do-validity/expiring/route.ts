import { getSessionOrUnauth, ok } from "@/lib/api-helpers";
import { tracePerformance } from "@/lib/performance";
import { listDeliveryOrderValidityWarnings } from "@/modules/cha/service";

export async function GET() {
  return tracePerformance("route:GET /api/cha/do-validity/expiring", async () => {
    const { session, error } = await getSessionOrUnauth();
    if (error) return error;

    const warnings = await listDeliveryOrderValidityWarnings(session!.user.id, session!.user.orgId!);
    return ok(warnings);
  });
}
