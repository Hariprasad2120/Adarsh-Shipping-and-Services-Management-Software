import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { getAppraisalSettings, upsertAppraisalSettings } from "@/modules/ams/settings";
import { z } from "zod";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await requirePermission(session.user.id, "admin.org.manage");

  const settings = await getAppraisalSettings(session.user.orgId!);
  return NextResponse.json(settings);
}

const patchSchema = z.object({
  availabilityDeadlineDays: z.number().int().min(0).max(30).optional(),
  reviewerRoleWeights: z.object({
    HR: z.number().min(0),
    TL: z.number().min(0),
    MANAGER: z.number().min(0),
  }).optional(),
});

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await requirePermission(session.user.id, "admin.org.manage");

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const updated = await upsertAppraisalSettings(session.user.orgId!, parsed.data);
  return NextResponse.json(updated);
}
