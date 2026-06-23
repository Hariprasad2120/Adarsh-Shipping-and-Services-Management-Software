import { NextRequest, NextResponse } from "next/server";
import { getSessionOrUnauth } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/rbac";
import {
  getEnabledModuleIds,
  setEnabledModuleIds,
} from "@/modules/core/organisation/module-settings";
import { MODULE_CONTROL_ITEMS, TOGGLEABLE_MODULE_SECTION_IDS } from "@/modules/core/organisation/module-config";
import { z } from "zod";

const patchSchema = z.object({
  enabledModuleIds: z.array(z.enum(TOGGLEABLE_MODULE_SECTION_IDS)).max(TOGGLEABLE_MODULE_SECTION_IDS.length),
});

export async function GET() {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;

  await requirePermission(session!.user.id, "admin.modules.manage");

  const enabledModuleIds = await getEnabledModuleIds(session!.user.orgId!);
  return NextResponse.json({
    items: MODULE_CONTROL_ITEMS,
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

  const enabledModuleIds = await setEnabledModuleIds(
    session!.user.orgId!,
    Array.from(new Set(parsed.data.enabledModuleIds)),
  );

  return NextResponse.json({
    items: MODULE_CONTROL_ITEMS,
    enabledModuleIds,
  });
}
