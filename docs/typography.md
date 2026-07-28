# Monolith Typography

Last updated: 2026-07-28

This file is the production typography reference for future UI migration work.
It is derived from the read-only Monolith design reference in
`_design-reference/Monolith-Design-System-v11-Full-Source-and-Dependencies`
and mapped to the shared tokens in `src/styles/monolith-tokens.css`.

## Font Families

| Use | Token | Family |
| --- | --- | --- |
| Interface text | `--mn-font-sans` | `Inter, "Segoe UI", Arial, sans-serif` |
| Numeric text | `--mn-font-mono` | `Inter, "Segoe UI", Arial, sans-serif` |

The reference CSS uses `font-family: Inter, "Segoe UI", Arial, sans-serif;`.
Production maps both interface and numeric tokens to that same stack so metrics,
IDs, counters, and percentages do not fall back to the old mono-style visual.

## Type Scale

| Role | Token | Size | Line height | Weight | Tracking | Use |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| Display | `--mn-type-display-*` | `clamp(44px, 5vw, 64px)` | `1.05` | `360` | `-0.04em` | Large page statements and high-impact hero text |
| Heading | `--mn-type-heading-*` | `32px` | `1.08` | `430` | `-0.03em` | Page titles, section titles, primary panel headings |
| Title | `--mn-type-title-*` | `20px` | `1.25` | component-defined | `-0.02em` | Card, dialog, and table toolbar titles |
| Body | `--mn-type-body-*` | `15px` | `1.5` | normal | `0` | Paragraphs, descriptions, readable operational copy |
| Label | `--mn-type-label-*` | `11px` | `1.2` | `760` | `0.12em` | Eyebrows, form labels, table headings, compact metadata |
| Control | `--mn-type-control-size` | `12px` | inherited | component-defined | `0` | Buttons, inputs, selects, segmented controls |
| Helper | `--mn-type-helper-size` | `10px` | inherited | component-defined | `0` | Help text, secondary hints, fine metadata |
| Numeric | `--mn-type-numeric-*` | `32px` | `1` | `440` | `-0.05em` | Metrics, SLA values, counters, percentages |

## Section Headings

Use `WorkspaceSectionHeading` for future major content sections. The approved
layout mirrors the reference: a small accent number and large light heading on
the left, with the explanatory paragraph aligned to the right on desktop.

Current production values:

| Element | Size | Line height | Weight | Tracking |
| --- | ---: | ---: | ---: | ---: |
| Section number | `10px` | `1` | `760` | `0.04em` |
| Section heading | `clamp(32px, 3.15vw, 44px)` | `0.98` | `360` | `-0.055em` |
| Right paragraph | `13px` | `1.65` | normal | `0` |

## Page Spacing

Use the shared layout tokens instead of page-local padding:

| Token | Value | Use |
| --- | ---: | --- |
| `--mn-layout-page-max` | `1200px` | Main shell content width, slightly narrower than the first pass |
| `--mn-layout-workspace-max` | `1200px` | Migrated workspace page content width |
| `--mn-layout-page-gutter` | `clamp(32px, 3.3vw, 50px)` | Desktop page padding |
| `--mn-layout-page-gutter-tablet` | `28px` | Tablet page padding |
| `--mn-layout-page-gutter-mobile` | `16px` | Mobile page padding |
| `--mn-layout-page-bottom` | `80px` | Desktop bottom breathing room |
| `--mn-layout-page-bottom-mobile` | `56px` | Mobile bottom breathing room |

`src/styles/monolith-system.css` applies these values to `.mnx-dashboard-main`
and `.mnx-workspace-page`, so future migrated routes should use
`MonolithPage` or `WorkspacePage` rather than declaring their own page gutters.

This 1200px centered frame with `clamp(32px, 3.3vw, 50px)` desktop gutters is
the default for all future Monolith page migrations unless a later design
decision changes the shared tokens.

## Implementation Rules

- Use semantic tokens from `src/styles/monolith-tokens.css`; do not hard-code
  font sizes in route files.
- Use `MonolithSpecLabel` for compact uppercase labels and operational
  metadata.
- Use the numeric token for metrics, identifiers, short codes, and
  machine-readable values, but keep it mapped to the Inter stack.
- Keep body copy at 15px and 150% line height for dense operations screens.
- Keep headings light and confident; avoid heavy page titles unless the
  component already establishes that pattern.
- Center migrated page content through the shared shell/page primitives instead
  of adding one-off wrappers.
- Treat the 1200px centered frame and shared gutter tokens as the default page
  layout for every future migrated route.
