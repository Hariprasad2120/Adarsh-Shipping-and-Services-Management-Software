/**
 * @deprecated Stage 2 — hardcodes `Rs` + `en-IN`. Use `formatMoney` from
 * `@/modules/core/regional` with the organisation's `baseCurrency` / `locale`
 * from `getOrganisationRegionalSettings`. Retained until the items module is
 * migrated (see TASK.md Cluster 13).
 */
export function formatINR(value: number): string {
  return `Rs ${new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}`;
}

/**
 * @deprecated Stage 2 — hardcodes `Rs` + `en-IN`. Use `formatMoney(value, {
 * currency, locale, compact: true })` from `@/modules/core/regional`.
 */
export function formatINRCompact(value: number): string {
  return `Rs ${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
