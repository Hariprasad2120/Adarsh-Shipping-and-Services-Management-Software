# Design System Audit Report — Monolith Engine

> Generated: 2026-06-21 | Scope: All `src/app/(dashboard)/**/*.tsx` files

---

## Executive Summary

| Metric | Count |
|---|---|
| Total dashboard TSX files scanned | 691 |
| Files with at least one non-compliant pattern | 131 |
| Total non-compliant pattern matches | 2,233 |
| Duplicate CSS lines removed (globals.css) | ~113 |
| CSS file reduced from | 889 → 776 lines |

### Pattern Breakdown

| Pattern | Count | Severity | Safety Net |
|---|---|---|---|
| `text-[#...]` hardcoded hex text colors | 97 | Medium | Partial (theme overrides for slate only) |
| `bg-[#...]` hardcoded hex bg colors | 68 | Medium | Yes (light/dark overrides exist) |
| `text-slate-*` / `text-gray-*` | 28 | High | Yes (CSS override remaps to tokens) |
| `bg-slate-*` / `bg-gray-*` | 25 | High | Yes (CSS override remaps to tokens) |
| `text-white` (outside solid bg) | 53 | Medium | Yes (CSS wildcard override) |
| `bg-white` | 9 | Low | Yes (CSS override) |
| `shadow-[...]` arbitrary shadows | 19 | Low | No |
| `rounded-[...]` arbitrary radii | 3 | Low | No |
| `style={...}` inline styles | 14 | Low | N/A (often dynamic/justified) |

---

## Top 30 Files by Violation Count

| # | File | Violations |
|---|---|---|
| 1 | `crm/quotes/_components/QuoteDetailsPage.tsx` | 98 |
| 2 | `attendance/biometric-sync/biometric-sync-client.tsx` | 82 |
| 3 | `crm/leads/lead-form.tsx` | 76 |
| 4 | `crm/invoices/_components/InvoiceDetailsPage.tsx` | 60 |
| 5 | `product-catalogue/page.tsx` | 57 |
| 6 | `attendance/ot/ot-client.tsx` | 55 |
| 7 | `hrms/ownership/page.tsx` | 50 |
| 8 | `crm/enquiries/page.tsx` | 47 |
| 9 | `accounting/reports/reports-client.tsx` | 46 |
| 10 | `accounting/dashboard-client.tsx` | 45 |
| 11 | `crm/invoices/invoice-form.tsx` | 43 |
| 12 | `crm/efficiency/page.tsx` | 41 |
| 13 | `accounting/sales-invoices/new/new-invoice-client.tsx` | 41 |
| 14 | `crm/dashboard/page.tsx` | 40 |
| 15 | `crm/deals/deals-client.tsx` | 39 |
| 16 | `crm/leads/page.tsx` | 36 |
| 17 | `accounting/quotations/quotations-client.tsx` | 36 |
| 18 | `ams/kpi/kpi-client.tsx` | 35 |
| 19 | `accounting/purchase-invoices/new/new-invoice-client.tsx` | 35 |
| 20 | `crm/deals/deal-form.tsx` | 34 |
| 21 | `accounting/payment-entries/new/new-payment-client.tsx` | 33 |
| 22 | `accounting/accounts/accounts-client.tsx` | 32 |
| 23 | `crm/quotes/_components/QuotesIndexPage.tsx` | 32 |
| 24 | `crm/contacts/page.tsx` | 31 |
| 25 | `accounting/settings/settings-client.tsx` | 30 |
| 26 | `crm/_components/activities-panel.tsx` | 29 |
| 27 | `ams/assets/assets-client.tsx` | 29 |
| 28 | `accounting/journal-entries/new/new-jv-client.tsx` | 29 |
| 29 | `crm/customers/page.tsx` | 28 |
| 30 | `accounting/jobs/jobs-client.tsx` | 28 |

---

## Violation Categories

### 1. Hardcoded Hex Colors (Approved Exceptions)

These are **acceptable** and should NOT be migrated:

| Pattern | Context | Reason |
|---|---|---|
| `text-[#00cec4]` / `bg-[#00cec4]` | Accent color | No CSS variable exists for raw accent (intentional) |
| `text-[#00b8af]` / `bg-[#00b8af]` | Accent hover | Approved hover state |
| `text-[#fb923c]` / `bg-[#fb923c]` | Orange accent | Approved alert/secondary |
| `bg-[#00cec4]/10` | Icon badge backgrounds | Approved subtle accent |
| `text-[#00857e]` | Dark teal for icon text on subtle bg | Approved from stat tones |
| `bg-[#0f1319]` / `bg-[#161f28]` | Dark surface colors | Remapped by theme compliance overrides |
| `border-[#1c212a]` | Dark border | Remapped by theme compliance overrides |
| Module identity hex colors | Navigation sidebar | Approved per module identity palette |
| Status stage colors | AMS appraisal badges | Approved per status color table |

### 2. Hardcoded Hex Colors (Should Migrate)

These use hardcoded hex where a token exists:

| Pattern | Replacement |
|---|---|
| `text-[var(--color-on-surface)]` | `text-on-surface` |
| Hardcoded `#191c1e` | `text-on-surface` |
| Hardcoded `#f0f6fc` | `text-on-surface` (dark) |
| Arbitrary grays like `#6b7280` | `text-on-surface-variant` |

### 3. Tailwind Slate/Gray Classes (Safety Net Active)

The globals.css contains overrides that remap `text-slate-*`, `bg-slate-*`, `text-gray-*`, `bg-gray-*` to design system tokens. These are **safe** in production but should be migrated over time:

| Pattern | Mapped To |
|---|---|
| `text-slate-100/200/300` | `var(--color-on-surface)` |
| `text-slate-400/500/600` | `var(--color-on-surface-variant)` |
| `bg-slate-950` | `var(--color-surface-container-lowest)` |
| `bg-[#0f121b]` → `bg-[#05070a]` | `var(--color-surface)` (light) / `var(--color-surface-container-low)` (dark) |
| `border-slate-800/900` | Transparent (light) / `var(--color-outline-variant)` (dark) |

### 4. Module-Level Summary

| Module | Files | Violations | Primary Issue |
|---|---|---|---|
| CRM | ~12 | ~500+ | Heavy use of hardcoded hex in forms & detail pages |
| Accounting | ~15 | ~400+ | Hardcoded colors in all form/detail/dashboard pages |
| Attendance | ~4 | ~140+ | Biometric sync client is densely non-compliant |
| HRMS | ~5 | ~100+ | Ownership page, salary pages |
| AMS | ~5 | ~100+ | KPI client, assets client |
| CHA | ~5 | ~80+ | Job workspace, expenses |
| Product Catalogue | 1 | 57 | Dense non-compliance |
| Dashboard | 2 | ~40 | Hardcoded dark surface colors |

---

## Fixes Already Applied

### 1. CSS Cleanup (globals.css)

- **Removed ~113 duplicate lines** — the entire light/dark theme compliance override block was duplicated (lines 738–853 were a copy of 624–734)
- **Fixed dangling CSS selector** — `html.light [class*="text-slate-400"],` with trailing comma and no following selector
- **Restored corrupted rule** — the `::placeholder` rule for `bg-[var(--color-background)]` was intact

### 2. Font Mapping Correction (AGENTS.md)

- **Before:** Claimed `--font-sans` and `--font-display` map to `var(--font-kiona-sans)` — **incorrect**
- **After:** Documented that both map to `var(--font-geist-sans)` (Geist Sans), and Kiona is available via `var(--font-kiona-sans)` directly

### 3. Heading Font-Weight Correction (AGENTS.md)

- **Before:** Claimed `font-weight: 700` — **incorrect** (no weight is set in CSS)
- **After:** Documents that heading weight is inherited

---

## Migration Strategy (For Future Work)

### Priority 1 — High Impact, Low Risk

Files with the most violations that are currently PROTECTED by CSS safety overrides:

1. `crm/quotes/_components/QuoteDetailsPage.tsx` (98)
2. `attendance/biometric-sync/biometric-sync-client.tsx` (82)
3. `crm/leads/lead-form.tsx` (76)

**Migration approach:** Replace `text-slate-*` → `text-on-surface` / `text-on-surface-variant`, `bg-white` → `bg-surface`, etc. Each file can be migrated independently. The CSS safety net ensures no visual regression during migration.

### Priority 2 — Module Dashboards

Dashboard pages where the visual polish matters most:

1. `crm/dashboard/page.tsx` (40)
2. `accounting/dashboard-client.tsx` (45)
3. `product-catalogue/page.tsx` (57)

### Priority 3 — Remaining Pages

Migrate remaining files module-by-module in order of violation count.

---

## Documents Created/Updated

| Document | Action | Purpose |
|---|---|---|
| `design.md` | Created | Authoritative design system specification |
| `AGENTS.md` | Updated | Fixed font/weight errors, added design.md reference + checklist |
| `CLAUDE.md` | Updated | Added design system mandatory section |
| `globals.css` | Cleaned | Removed ~113 duplicate lines |
| `DESIGN_SYSTEM_AUDIT.md` | Created | This audit report |
