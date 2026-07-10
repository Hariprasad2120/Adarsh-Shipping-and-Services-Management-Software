import { getSessionOrUnauth, ok } from "@/lib/api-helpers";
import { listChaDueDateWarnings } from "@/modules/cha/service";

export async function GET() {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;

  const orgId = session!.user.orgId;
  if (!orgId) {
    return ok([]);
  }

  const warnings = await listChaDueDateWarnings(session!.user.id, orgId, { limit: 3 });
  return ok(
    warnings.map((warning) => ({
      ...warning,
      validityDate: warning.validityDate.toISOString(),
    })),
  );
}
