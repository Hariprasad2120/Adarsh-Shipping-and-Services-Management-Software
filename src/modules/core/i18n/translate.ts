/**
 * Stage 2 — enterprise platform: message translation (PURE, dependency-free).
 *
 * A minimal ICU-free catalogue lookup with named `{param}` interpolation and a
 * small plural helper. Enough to stop new UI strings being concatenated in ways
 * that make localisation impossible (spec §26); a full i18n library can be
 * layered on later without changing call sites that use `t()`.
 */

export type LocaleCode = string; // BCP-47
export type MessageCatalogue = Record<string, string>;

const catalogues = new Map<LocaleCode, MessageCatalogue>();

/** Base locale every lookup falls back to. */
export const BASE_LOCALE: LocaleCode = "en";

export function registerCatalogue(locale: LocaleCode, messages: MessageCatalogue): void {
  const existing = catalogues.get(locale) ?? {};
  catalogues.set(locale, { ...existing, ...messages });
}

export function getCatalogue(locale: LocaleCode): MessageCatalogue {
  return catalogues.get(locale) ?? {};
}

export function hasMessage(key: string, locale: LocaleCode = BASE_LOCALE): boolean {
  return key in getCatalogue(locale) || key in getCatalogue(BASE_LOCALE);
}

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in params ? String(params[name]) : whole,
  );
}

/**
 * Resolve a message key for `locale`, falling back to the base locale and then
 * to the key itself (so a missing translation is visible, not blank).
 */
export function translate(
  key: string,
  params?: Record<string, string | number>,
  locale: LocaleCode = BASE_LOCALE,
): string {
  const primary = getCatalogue(locale)[key];
  if (primary !== undefined) return interpolate(primary, params);

  // "en-GB" → try "en"
  const short = locale.split("-")[0];
  if (short !== locale) {
    const regional = getCatalogue(short)[key];
    if (regional !== undefined) return interpolate(regional, params);
  }

  const base = getCatalogue(BASE_LOCALE)[key];
  if (base !== undefined) return interpolate(base, params);

  return key;
}

/** Bind a locale once and reuse. */
export function translator(locale: LocaleCode) {
  return (key: string, params?: Record<string, string | number>) =>
    translate(key, params, locale);
}

/**
 * Pick the plural branch for `count`. `forms` uses the CLDR-ish keys the caller
 * supplies (`one`, `other`, optionally `zero` / `two` / `few` / `many`). English
 * rules by default; a real i18n library can replace this without call changes.
 */
export function plural(
  count: number,
  forms: { zero?: string; one?: string; other: string },
): string {
  if (count === 0 && forms.zero !== undefined) return forms.zero;
  if (Math.abs(count) === 1 && forms.one !== undefined) return forms.one;
  return forms.other;
}
