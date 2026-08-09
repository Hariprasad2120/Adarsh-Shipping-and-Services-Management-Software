export const PALETTE_HUES = ["gray", "blue", "green", "red", "amber", "violet"] as const;
export type PaletteHue = (typeof PALETTE_HUES)[number];

const STANDARD_STOPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const;
const GRAY_STOPS = [50, 100, 200, 300, 400, 450, 500, 600, 700, 800, 900, 950] as const;

export const PALETTE_STOPS_BY_HUE: Record<PaletteHue, readonly number[]> = {
  gray: GRAY_STOPS,
  blue: STANDARD_STOPS,
  green: STANDARD_STOPS,
  red: STANDARD_STOPS,
  amber: STANDARD_STOPS,
  violet: STANDARD_STOPS,
};

export const PALETTE_KEYS: string[] = PALETTE_HUES.flatMap((hue) =>
  PALETTE_STOPS_BY_HUE[hue].map((stop) => `${hue}-${stop}`),
);

const PALETTE_KEY_SET = new Set(PALETTE_KEYS);

const CSS_COLOR_PATTERN = /^#[0-9a-fA-F]{3,8}$|^rgba?\([\d.,\s%]+\)$|^hsla?\([\d.,%\s]+\)$/;

export type PaletteOverride = Record<string, string>;

/** Validates and filters a raw override object down to only recognized keys with plausible CSS color values. */
export function sanitizePaletteOverride(input: unknown): PaletteOverride {
  if (!input || typeof input !== "object") return {};

  const result: PaletteOverride = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (!PALETTE_KEY_SET.has(key)) continue;
    if (typeof value !== "string") continue;
    if (!CSS_COLOR_PATTERN.test(value.trim())) continue;
    result[key] = value.trim();
  }
  return result;
}

/** Builds a <style> body overriding --frappe-{key} custom properties for light/dark themes. Assumes inputs are already sanitized. */
export function buildPaletteOverrideCss(
  lightPalette: PaletteOverride,
  darkPalette: PaletteOverride,
): string {
  const lightEntries = Object.entries(lightPalette);
  const darkEntries = Object.entries(darkPalette);
  if (lightEntries.length === 0 && darkEntries.length === 0) return "";

  const lightRules = lightEntries.map(([key, value]) => `--frappe-${key}: ${value};`).join(" ");
  const darkRules = darkEntries.map(([key, value]) => `--frappe-${key}: ${value};`).join(" ");

  const blocks: string[] = [];
  if (lightRules) blocks.push(`:root { ${lightRules} }`);
  if (darkRules) blocks.push(`[data-theme="dark"] { ${darkRules} }`);
  return blocks.join("\n");
}
