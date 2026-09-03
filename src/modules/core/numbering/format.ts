/**
 * Stage 2 — enterprise platform: numbering format primitives.
 *
 * PURE — no DB, no imports. Given a sequence definition and a value, produce the
 * formatted document number; given a reset policy and a date, produce the period
 * label used to detect a rollover.
 */

export type ResetPolicy = "NEVER" | "ANNUALLY" | "MONTHLY";

export function isResetPolicy(value: string): value is ResetPolicy {
  return value === "NEVER" || value === "ANNUALLY" || value === "MONTHLY";
}

/**
 * Fiscal-year label for `date`, given the org's fiscal-year start month (1–12).
 * `style`:
 *   "range2"  → 2026-27   (default)
 *   "range4"  → 2026-2027
 *   "startYY" → 26
 *   "startYYYY" → 2026
 * A January fiscal start collapses to a single calendar year (2026-26 / 2026).
 */
export function fiscalYearLabel(
  date: Date,
  fiscalYearStartMonth = 1,
  style: "range2" | "range4" | "startYY" | "startYYYY" = "range2",
): string {
  const m = date.getUTCMonth() + 1; // 1..12
  const y = date.getUTCFullYear();
  const startYear = m >= fiscalYearStartMonth ? y : y - 1;
  const endYear = fiscalYearStartMonth === 1 ? startYear : startYear + 1;
  switch (style) {
    case "range4":
      return `${startYear}-${endYear}`;
    case "startYY":
      return String(startYear).slice(-2);
    case "startYYYY":
      return String(startYear);
    case "range2":
    default:
      return `${startYear}-${String(endYear).slice(-2)}`;
  }
}

/** Period key a counter is "on" for a given reset policy + date. */
export function periodLabelFor(
  policy: ResetPolicy,
  date: Date,
  fiscalYearStartMonth = 1,
): string {
  switch (policy) {
    case "ANNUALLY":
      return fiscalYearLabel(date, fiscalYearStartMonth, "range2");
    case "MONTHLY":
      return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    case "NEVER":
    default:
      return "";
  }
}

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/**
 * Substitute date tokens in a prefix/suffix template:
 *   {FY}   fiscal-year label (range2)
 *   {YYYY} {YY} calendar year
 *   {MM} {MMM} month
 *   {DD}   day of month
 */
export function resolveTemplateTokens(
  template: string,
  date: Date,
  fiscalYearStartMonth = 1,
): string {
  const yyyy = String(date.getUTCFullYear());
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return template
    .replaceAll("{FY}", fiscalYearLabel(date, fiscalYearStartMonth, "range2"))
    .replaceAll("{YYYY}", yyyy)
    .replaceAll("{YY}", yyyy.slice(-2))
    .replaceAll("{MMM}", MONTHS_SHORT[date.getUTCMonth()])
    .replaceAll("{MM}", mm)
    .replaceAll("{DD}", dd);
}

/** Build the final document number string. */
export function formatSequenceNumber(
  seq: { prefix: string; suffix: string; padding: number },
  value: bigint | number,
  opts: { date?: Date; fiscalYearStartMonth?: number } = {},
): string {
  const date = opts.date ?? new Date();
  const fyStart = opts.fiscalYearStartMonth ?? 1;
  const prefix = resolveTemplateTokens(seq.prefix ?? "", date, fyStart);
  const suffix = resolveTemplateTokens(seq.suffix ?? "", date, fyStart);
  const body = String(value).padStart(Math.max(seq.padding ?? 1, 1), "0");
  return `${prefix}${body}${suffix}`;
}
