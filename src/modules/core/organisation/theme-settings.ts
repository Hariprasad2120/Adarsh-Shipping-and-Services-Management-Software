import { db } from "@/lib/db";
import { sanitizePaletteOverride, type PaletteOverride } from "./theme-palette-schema";

export type OrganisationThemePalettes = {
  lightPalette: PaletteOverride;
  darkPalette: PaletteOverride;
};

export async function getOrganisationThemeSettings(
  orgId: string,
): Promise<OrganisationThemePalettes> {
  const row = await db.organisationThemeSettings.findUnique({
    where: { orgId },
    select: { lightPalette: true, darkPalette: true },
  });

  return {
    lightPalette: sanitizePaletteOverride(row?.lightPalette),
    darkPalette: sanitizePaletteOverride(row?.darkPalette),
  };
}

export async function updateOrganisationThemeSettings(
  orgId: string,
  input: { lightPalette: PaletteOverride; darkPalette: PaletteOverride },
  updatedByUserId: string,
): Promise<void> {
  const lightPalette = sanitizePaletteOverride(input.lightPalette);
  const darkPalette = sanitizePaletteOverride(input.darkPalette);

  await db.organisationThemeSettings.upsert({
    where: { orgId },
    create: { orgId, lightPalette, darkPalette, updatedByUserId },
    update: { lightPalette, darkPalette, updatedByUserId },
  });
}
