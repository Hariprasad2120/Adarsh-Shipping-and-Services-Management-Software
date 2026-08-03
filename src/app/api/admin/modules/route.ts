import { NextRequest, NextResponse } from "next/server";
import { getSessionOrUnauth } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/rbac";
import {
  getEnabledFeatureIds,
  getEnabledModuleIds,
  setEnabledFeatureIds,
  setEnabledModuleIds,
} from "@/modules/core/organisation/module-settings";
import {
  MANAGED_FEATURE_IDS,
  MODULE_CONTROL_ITEMS,
  MODULE_FEATURE_CONTROL_ITEMS,
  TOGGLEABLE_MODULE_SECTION_IDS,
} from "@/modules/core/organisation/module-config";
import { z } from "zod";

const patchSchema = z.object({
  enabledModuleIds: z.array(z.enum(TOGGLEABLE_MODULE_SECTION_IDS)).max(TOGGLEABLE_MODULE_SECTION_IDS.length),
  enabledFeatureIds: z.array(z.enum(MANAGED_FEATURE_IDS)).max(MANAGED_FEATURE_IDS.length),
});

export async function GET() {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;

  await requirePermission(session!.user.id, "admin.modules.manage");

  const [enabledModuleIds, enabledFeatureIds] = await Promise.all([
    getEnabledModuleIds(session!.user.orgId!),
    getEnabledFeatureIds(session!.user.orgId!),
  ]);
  return NextResponse.json({
    items: MODULE_CONTROL_ITEMS,
    featureItems: MODULE_FEATURE_CONTROL_ITEMS,
    enabledFeatureIds,
    enabledModuleIds,
  });
}

export async function PATCH(req: NextRequest) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;

  await requirePermission(session!.user.id, "admin.modules.manage");

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [enabledModuleIds, enabledFeatureIds] = await Promise.all([
    setEnabledModuleIds(
      session!.user.orgId!,
      Array.from(new Set(parsed.data.enabledModuleIds)),
    ),
    setEnabledFeatureIds(
      session!.user.orgId!,
      Array.from(new Set(parsed.data.enabledFeatureIds)),
    ),
  ]);

  return NextResponse.json({
    items: MODULE_CONTROL_ITEMS,
    featureItems: MODULE_FEATURE_CONTROL_ITEMS,
    enabledFeatureIds,
    enabledModuleIds,
  });
}
