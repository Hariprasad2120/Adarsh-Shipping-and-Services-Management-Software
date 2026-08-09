import { NextRequest } from "next/server";
import { getSessionOrUnauth, ok, err } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/rbac";
import {
  getOrganisationThemeSettings,
  updateOrganisationThemeSettings,
} from "@/modules/core/organisation/theme-settings";
import { z } from "zod";

const paletteSchema = z.record(z.string(), z.string());

export async function GET() {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  await requirePermission(session!.user.id, "admin.org.manage");

  if (!session!.user.orgId) return err("No organisation on session");

  const settings = await getOrganisationThemeSettings(session!.user.orgId);
  return ok(settings);
}

export async function PUT(req: NextRequest) {
  const { session, error } = await getSessionOrUnauth();
  if (error) return error;
  await requirePermission(session!.user.id, "admin.org.manage");

  if (!session!.user.orgId) return err("No organisation on session");

  const parsed = z
    .object({ lightPalette: paletteSchema, darkPalette: paletteSchema })
    .safeParse(await req.json());
  if (!parsed.success) return err("Invalid input");

  await updateOrganisationThemeSettings(
    session!.user.orgId,
    parsed.data,
    session!.user.id,
  );
  return ok({ updated: true });
}
