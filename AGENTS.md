# Monolith Engine — Repository Instructions

These instructions apply to the entire repository. More specific `AGENTS.md` files may add
constraints for a directory, but they must not weaken this design-system contract.

## 1. Current framework

- This application uses Next.js App Router and React.
- Before changing routing, layouts, fonts, CSS loading, caching, or Server/Client Component
  boundaries, read the matching guide in `node_modules/next/dist/docs/`.
- Preserve Server Components by default. Add `"use client"` only when browser state, effects, or
  event handlers are required.
- Keep authentication, RBAC, server actions, module enablement, forms, and data loading intact
  while replacing presentation.

## 2. Redesign objective

The authenticated application is being rebuilt one route at a time with the Monolith design
system. This is a replacement of the old interface, not a reskin.

Every route inside `src/app/(dashboard)/` must use:

1. the shared `MonolithDashboardShell`;
2. tokens from the Monolith foundation;
3. primitives from `src/components/monolith/`;
4. the page composition primitives in `src/components/monolith/page.tsx`;
5. the three supported themes: `light`, `night`, and `violet`.

Never create a second shell or keep the legacy Adarsh shell for an unconverted page. An
unconverted page may temporarily keep its inner content, but it must render inside the shared
Monolith shell until its content is rebuilt.

## 3. Sources of truth

Use these files in this order:

| Concern | Source of truth |
| --- | --- |
| Repository rules | `AGENTS.md` |
| Foundations and typography | `src/styles/monolith-foundation.css` |
| Theme and shell implementation | `src/styles/monolith-system.css` |
| Shared UI primitives | `src/components/monolith/` |
| Route shell | `src/components/monolith/monolith-dashboard-shell.tsx` |
| Migration status and route order | `docs/monolith-page-migration.md` |

Do not copy styles from screenshots into a route. Add or correct the shared token/primitive first,
then consume it from the route.

## 4. Typography contract

Geist Sans is the only application UI family. It is loaded once from `src/app/layout.tsx` with
`next/font`.

- UI, headings, navigation, buttons, forms, tables, badges, dates, amounts, percentages, timers,
  and business metrics use `var(--mnx-font-sans)`.
- Business numerics use the same sans family with `font-variant-numeric: tabular-nums`.
- Geist Mono is reserved for code, keyboard shortcuts, immutable technical identifiers, hashes,
  and terminal-like output. It must not be used for dashboard stats, counts, currency values,
  dates, timers, percentages, labels, or badges.
- Use only weights `400`, `500`, `600`, and `700`. Do not invent intermediate values such as
  `390`, `440`, `590`, `690`, `750`, or `760`.
- Do not use `font-mono`, `ds-numeric`, or `monolith-numeric` for business metrics.
- Do not add inline `fontFamily`, route-specific font imports, remote font links, or CSS `@import`
  font URLs.

Approved recipes:

| Role | Size | Weight | Tracking / line-height |
| --- | ---: | ---: | --- |
| Display | `clamp(2.5rem, 5vw, 4.5rem)` | 400 | `-0.055em` / `0.96` |
| Page title | `clamp(2rem, 3vw, 3rem)` | 400 | `-0.045em` / `1` |
| Section title | `1.75rem` | 500 | `-0.035em` / `1.1` |
| Card title | `1.125rem` | 500 | `-0.02em` / `1.25` |
| Body | `0.9375rem` | 400 | normal / `1.6` |
| Helper text | `0.8125rem` | 400 | normal / `1.5` |
| Label / eyebrow | `0.6875rem` | 600 | `0.14em` / `1.3`, uppercase |
| Button | `0.875rem` | 600 | `-0.01em` / `1` |
| Business stat | responsive | 500 | `-0.04em`, tabular numerics |

## 5. Heading composition

Typography creates hierarchy. Decorative icons do not.

- Page, section, panel, card, dialog, and table headings are text-only.
- Do not place an icon immediately before or inside `h1`–`h6`.
- Icons are allowed in navigation, buttons, status indicators, inputs, compact metadata, empty
  states, and standalone illustrations.
- A section may have an eyebrow above its heading. The eyebrow may use a small status dot, but not
  a decorative icon.
- Use `PageHeader` and `SectionHeader`; neither accepts an icon prop by design.

## 6. Layout contract

- `MonolithDashboardShell` wraps every authenticated route.
- A route root uses `Page`.
- The first block is normally `PageHeader`.
- Group related content in `PageSection`, `Panel`, or `Card`.
- Default page width is fluid, with a `100rem` maximum and responsive inline padding supplied by
  the shell. Do not add a second viewport-height wrapper or fixed sidebar.
- Avoid page-local top bars, breadcrumbs, theme switches, and sidebars.
- Do not use `h-screen`, fixed left padding, or fixed widths to compensate for the shell.
- Responsive layouts must work at 360px, 768px, 1280px, and 1600px.

## 7. Theme contract

Support exactly these themes everywhere:

| Theme | Canvas | Surface | Primary / highlight |
| --- | --- | --- | --- |
| Light | `#EFF0EB` | `#FFFEF9` | `#F9D972` |
| Night | `#000000` | `#090909` | `#F9D972` |
| Violet | `#0A0B13` | `#181827` | `#B5AAF5` / `#CBBDE1` |

Semantic fills:

- Success fill `#E6F3EA`, with a bright green text/icon token.
- Danger fill `#FCECEB`, with a bright red text/icon token.
- Warning fill uses the theme warning token and bright warning text.

Rules:

- Read colors through `--mnx-*` tokens. Do not hard-code old cyan, teal, orange, slate, or Adarsh
  brand colors in redesigned UI.
- Night uses true black, not blue-black or tinted black.
- Hover shadows use the active theme primary color.
- Theme selection is persisted in `localStorage` under `theme`.
- The root receives `theme-light`, `theme-night`, or `theme-violet`.

## 8. Components and CSS

- Reusable UI belongs in `src/components/monolith/`.
- Shared CSS belongs in `src/styles/monolith-foundation.css` or
  `src/styles/monolith-system.css`.
- Route CSS must be a CSS Module and may only handle route-specific arrangement. It must not
  redefine fonts, colors, radii, shadows, buttons, inputs, cards, badges, or themes.
- Prefer semantic component props over long route-level utility strings.
- Do not use legacy `Sidebar`, `MainShell`, `DashboardShell`, `WelcomeBar`, `AutoBreadcrumb`,
  `ds-*`, or old Adarsh page-header patterns in redesigned routes.
- Do not add a duplicate button, input, badge, card, modal, dropdown, upload, or table primitive.
  Extend the existing Monolith primitive.
- Avoid `!important`. Foundation compatibility selectors are the only temporary exception and must
  be removed when the last legacy consumer is migrated.

## 9. Page-by-page migration workflow

Migrate one complete route (or one tightly coupled route family) at a time.

1. Read the route, its client components, actions, services, permissions, tests, and navigation
   entry.
2. Record the route in `docs/monolith-page-migration.md` as `in progress`.
3. Keep all business behavior and data contracts.
4. Delete the route's old presentation markup. Do not wrap it in a new card.
5. Recompose with `Page`, `PageHeader`, `PageSection`, `Panel`, `Card`, form, feedback, and data
   primitives.
6. Remove page-local hard-coded colors, typography utilities, decorative heading icons, duplicate
   navigation, and viewport shell code.
7. Verify light, night, and violet themes at desktop, tablet, and mobile widths.
8. Verify loading, empty, error, permission-denied, validation, and populated states.
9. Update the migration document to `complete`.
10. Run the required checks below.

A page is not migrated when only its colors, sidebar, or top bar changed.

## 10. Accessibility and interaction

- Maintain semantic heading order.
- Every input has a visible label or an accessible name.
- Icon-only controls have an `aria-label`.
- Interactive elements are reachable and visible with the keyboard.
- Use `:focus-visible`; do not remove focus indicators.
- Respect `prefers-reduced-motion`.
- Touch targets are at least 40px where space allows.
- Tables retain semantic headers and expose a responsive alternative when horizontal scrolling is
  not sufficient.

## 11. Required verification

For every migrated route:

```bash
npx eslint <changed-ts-or-tsx-files>
npx tsc --noEmit
npm test -- <focused-test-files>
npm run build
npm run catalogue:update
npm run catalogue:check
```

Also search the changed route for prohibited patterns:

```bash
rg -n "font-mono|monolith-numeric|ds-|text-cyan|bg-cyan|#00cec4|#00c4b6|h-screen" <route>
rg -n "<h[1-6][^>]*>\\s*<" <route>
```

Database-backed integration tests may require the configured test database. Report unavailable
infrastructure separately; do not claim those tests passed.

## 12. Product catalogue

Any task that adds, changes, or removes a feature, route, API endpoint, action, service, or database
model must finish with:

```bash
npm run catalogue:update
npm run catalogue:check
```

Update `docs/product-feature-registry.json` when feature scope or status changes.

## 13. Architecture graph

If `graphify-out/graph.json` exists, use it for cross-module dependency questions and update it
after significant architecture changes. If it is absent, do not claim it is available; inspect the
code directly.
