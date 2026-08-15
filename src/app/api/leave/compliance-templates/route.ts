import { NextRequest } from "next/server";
import { getSessionOrUnauth, ok } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/rbac";
import { db } from "@/lib/db";

/**
 * Compliance template admin visibility (spec §34) — HR must be able to see
 * jurisdiction, statutory category, source, effective/verified dates,
 * version, and status for every seeded template, with the standing
 * disclaimer that software never claims formal legal compliance (spec §27).
 * Read-only: promotion between DRAFT/VERIFIED/PUBLISHED/RETIRED status is
 * a legal-review decision, not something this endpoint performs.
 */
export async function GET(req: NextRequest) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  await requirePermission(session!.user.id, "attendance.leave.manage");

  const { searchParams } = new URL(req.url);
  const country = searchParams.get("country") ?? undefined;
  const state = searchParams.get("state") ?? undefined;
  const status = searchParams.get("status") ?? undefined;

  const templates = await db.leaveComplianceTemplate.findMany({
    where: {
      ...(country ? { jurisdictionCountry: country } : {}),
      ...(state ? { jurisdictionState: state } : {}),
      ...(status ? { status } : {}),
    },
    orderBy: [{ jurisdictionCountry: "asc" }, { jurisdictionState: "asc" }, { leaveCategory: "asc" }],
  });

  return ok(
    templates.map((t) => ({
      ...t,
      legalReviewDisclaimer:
        "Regulatory template based on the referenced rule set. HR/legal review is recommended before publication.",
    })),
  );
}
