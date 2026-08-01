# Style inventory

## Canonical foundation

- `src/styles/monolith-tokens.css`: semantic tokens and theme values.
- `src/styles/monolith-system.css`: production component/system rules.
- `src/app/globals.css`: Tailwind import, foundation imports, reset, global
  accessibility/document behavior, and compatibility rules still used by
  active routes.

Light, Night, Violet, and the documented additive Purple theme assignments
remain unchanged. No token, class, palette, or visual behavior was changed in
this structural batch.

## Findings

- The nested repository fragment included a duplicate reference
  `globals.css`; it was not compiled and was removed with the fragment.
- `scrap` contained obsolete component-local styling utilities in copied
  prototype code; the whole compiler-excluded prototype was removed.
- `_design-reference` is authoritative and remains read-only.
- Legacy-looking rules in active global/system CSS remain uncertain until
  route/theme/viewport verification proves zero use; they were retained.

