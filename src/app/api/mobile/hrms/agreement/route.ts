/**
 * User Agreement API — Mobile
 *
 * GET: Current agreement + acceptance status
 * POST: Record acceptance
 */
import { getMobileUser } from "@/lib/mobile-auth";
import { mobileJson, mobileOptions } from "@/lib/mobile-cors";
import { checkUserAcceptance, recordAcceptance, getLatestAgreement, seedDefaultAgreement } from "@/modules/hrms/user-agreement";

export async function OPTIONS() {
  return mobileOptions();
}

export async function GET(request: Request) {
  try {
    const user = await getMobileUser(request);
    if (!user) return mobileJson({ error: "Unauthorized" }, 401);
    if (!user.orgId) return mobileJson({ error: "No organization" }, 400);

    // Auto-seed default agreement if none exists
    await seedDefaultAgreement(user.orgId, user.id);

    const status = await checkUserAcceptance(user.id, user.orgId);

    return mobileJson({
      ok: true,
      data: {
        required: status.required,
        accepted: status.accepted,
        agreement: status.agreement
          ? {
              id: status.agreement.id,
              version: status.agreement.version,
              title: status.agreement.title,
              content: status.agreement.content,
              effectiveFrom: status.agreement.effectiveFrom,
            }
          : null,
      },
    });
  } catch (error: any) {
    return mobileJson({ error: error.message ?? "Failed to check agreement" }, 500);
  }
}

export async function POST(request: Request) {
  try {
    const user = await getMobileUser(request);
    if (!user) return mobileJson({ error: "Unauthorized" }, 401);
    if (!user.orgId) return mobileJson({ error: "No organization" }, 400);

    const body = await request.json();
    const { agreementVersionId, deviceId } = body;

    if (!agreementVersionId) {
      return mobileJson({ error: "Agreement version ID is required" }, 400);
    }

    const acceptance = await recordAcceptance(
      user.id,
      user.orgId,
      agreementVersionId,
      request.headers.get("x-forwarded-for") ?? undefined,
      deviceId,
      request.headers.get("user-agent") ?? undefined
    );

    return mobileJson({ ok: true, data: acceptance });
  } catch (error: any) {
    console.error("agreement API error:", error);
    return mobileJson({ error: error.message ?? "Failed to record acceptance" }, 500);
  }
}
