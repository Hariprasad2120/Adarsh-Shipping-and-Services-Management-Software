@AGENTS.md

<!-- BEGIN:design-system-reference -->
# Mandatory: Design System

Before creating, editing, or reviewing any frontend UI:

1. Read `design.md` at the project root — it is the authoritative specification
2. Read the design-system section in `AGENTS.md`
3. Reuse shared components from `src/components/ui/` before creating new ones
4. Use semantic tokens from `src/app/globals.css` and `src/lib/design-tokens.ts`
5. Verify light/dark theme and mobile/desktop layout (including full-width alignment per Section 15 of `design.md`)
6. Report the implementation checklist (see AGENTS.md) in your final response

## Critical Dark-Mode Rules

- **Never use `bg-white`** → use `bg-surface`
- **Never use `text-slate-900` / `text-gray-900`** → use `text-on-surface`
- **Never use `text-slate-500` / `text-gray-500`** → use `text-on-surface-variant`
- **Never use `border-gray-200`** → use `border-outline-variant`
- **Never add `p-8` to page root** → `DashboardShell` provides outer padding
- **Always verify dark mode** before marking UI work complete

## Critical Layout Rules (Section 15 of `design.md`)

- **Never use `mx-auto`, `container`, or `max-w-*` on standard workspace pages** → rely on `DashboardShell` full-width layout (except forms, modals, login pages as defined in layout exceptions).
- **Never duplicate padding** on subpages (avoid nested `p-8`, `px-6 py-8`).

## Critical Table Rules

- **Always wrap tables** in `overflow-hidden rounded-xl border border-outline-variant bg-surface shadow-sm`
- **Always use `ds-table`** on the `<table>` element — never inline border-collapse/border-spacing
- **Never use `divide-y`** on `<tbody>` — `ds-table td` border-bottom handles separation
- **Never use `font-bold` or `font-semibold`** on ordinary `<td>` — only `font-medium` on name columns
- **Read `design.md` Section 7.1** for the canonical table wrapper hierarchy
<!-- END:design-system-reference -->
