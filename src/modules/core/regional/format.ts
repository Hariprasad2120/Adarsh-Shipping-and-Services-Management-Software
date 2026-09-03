/**
 * Stage 2 — enterprise platform: locale-aware formatting primitives.
 *
 * PURE functions only — no database, no session, no `next` imports. Safe to call
 * from server components, server actions and client components alike. Callers
 * pass the organisation's regional settings (see `./settings`) or an explicit
 * override; nothing here assumes a currency, locale, timezone or date order.
 *
 * Do NOT hardcode `INR` / `₹` / `en-IN` / `Asia/Kolkata` anywhere in this file.
 */

export type RegionalFormatContext = {
  locale: string;
  baseCurrency: string;
  numberFormat: string;
  timezone: string;
  dateFormat: string;
  timeFormat: string;
};

/** Platform-neutral fallback — used only when no organisation context is available. */
export const NEUTRAL_FORMAT_CONTEXT: RegionalFormatContext = {
  locale: "en-US",
  baseCurrency: "USD",
  numberFormat: "en-US",
  timezone: "UTC",
  dateFormat: "yyyy-MM-dd",
  timeFormat: "HH:mm",
};

function toDate(value: Date | string | number): Date {
  return value instanceof Date ? value : new Date(value);
}

/**
 * Format a monetary amount. Currency and locale come from the caller — there is
 * no default currency baked in here.
 */
export function formatMoney(
  amount: number,
  opts: { currency: string; locale?: string; compact?: boolean; fractionDigits?: number },
): string {
  const { currency, locale = NEUTRAL_FORMAT_CONTEXT.locale, compact = false } = opts;
  const fractionDigits = opts.fractionDigits ?? 2;
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      notation: compact ? "compact" : "standard",
      minimumFractionDigits: compact ? 0 : fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(amount);
  } catch {
    // Unknown currency / locale — degrade to a plain number plus the raw code.
    return `${currency} ${formatNumber(amount, { locale, fractionDigits })}`;
  }
}

/** Format a plain number in the organisation's number locale. */
export function formatNumber(
  value: number,
  opts: { locale?: string; fractionDigits?: number; compact?: boolean } = {},
): string {
  const { locale = NEUTRAL_FORMAT_CONTEXT.numberFormat, compact = false } = opts;
  const fractionDigits = opts.fractionDigits ?? 2;
  try {
    return new Intl.NumberFormat(locale, {
      notation: compact ? "compact" : "standard",
      minimumFractionDigits: compact ? 0 : fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(value);
  } catch {
    return value.toFixed(fractionDigits);
  }
}

/**
 * Format a date/time in the organisation's timezone and locale. `style` picks an
 * `Intl.DateTimeFormat` preset; the stored `dateFormat` pattern is advisory and
 * used by dedicated pattern formatters elsewhere, not here.
 */
export function formatDateTime(
  value: Date | string | number,
  opts: {
    locale?: string;
    timezone?: string;
    dateStyle?: "full" | "long" | "medium" | "short";
    timeStyle?: "full" | "long" | "medium" | "short";
  } = {},
): string {
  const {
    locale = NEUTRAL_FORMAT_CONTEXT.locale,
    timezone = NEUTRAL_FORMAT_CONTEXT.timezone,
    dateStyle = "medium",
    timeStyle,
  } = opts;
  try {
    return new Intl.DateTimeFormat(locale, {
      timeZone: timezone,
      dateStyle,
      ...(timeStyle ? { timeStyle } : {}),
    }).format(toDate(value));
  } catch {
    return toDate(value).toISOString();
  }
}

/** Date only, in the organisation's timezone/locale. */
export function formatDate(
  value: Date | string | number,
  opts: { locale?: string; timezone?: string; dateStyle?: "full" | "long" | "medium" | "short" } = {},
): string {
  return formatDateTime(value, opts);
}

/** Current wall-clock time in a given IANA timezone, as a `Date` whose fields
 *  read correctly for that zone (useful for day-boundary maths). */
export function zonedNow(timezone: string = NEUTRAL_FORMAT_CONTEXT.timezone): Date {
  const now = new Date();
  try {
    return new Date(now.toLocaleString("en-US", { timeZone: timezone }));
  } catch {
    return now;
  }
}
