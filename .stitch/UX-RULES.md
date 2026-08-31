# UX-RULES.md — Application-wide UX rules

These rules are supplied to Stitch on **every** generation and enforced in implementation
review. They sit above `DESIGN.md` (visual) and `PAGE-PATTERNS.md` (structure).

Priority ladder: **ACTION > INFORMATION > DECORATION**.

---

## Global

1. First viewport is for work, not welcome. No greeting hero, no "Welcome back, {name}",
   no large avatar block, no decorative statistics above actionable content.
2. No large card whose value is `0`, `00`, "No items", "Nothing scheduled". If a queue is
   empty, collapse to a single quiet healthy-state line — do not reserve real estate for it.
3. Each count/metric appears **once**. No duplicate "pending" totals across a hero band and
   a metrics strip and an exceptions panel.
4. Progressive disclosure over showing everything. Secondary/rare data goes behind a tab,
   an expander, or a detail route.
5. Role-aware: never show a section, metric, or action the current role cannot act on.
6. Predictable placement: the primary action is top-right of the page header on every page.
   Filters/search are directly above the table/list, left-aligned. Row actions are the last
   column, one interaction model app-wide.
7. Every list/table/section has an explicit empty state and an error state using the
   canonical feedback components — routes do not invent their own.
8. Keyboard: every interactive element reachable and operable by keyboard; visible focus ring
   (`--mn-focus-*`); modals trap focus and close on Escape.
9. Motion only on real interactive surfaces (links, buttons, draggables). Static panels,
   badges, alerts, metrics do not move on hover. Respect `prefers-reduced-motion`.
10. Rare configuration (theme, layout toggles, profile metadata) never occupies primary
    navigation or an operational viewport. It lives in settings/account.
11. Compact over oversized: default to dense summaries; reserve big type for the one number
    that matters on the page.

## Dashboard (`/dashboard`)

- Answer one question above the fold: **"What requires my attention and what should I do next?"**
- Order: P0 attention queue (approvals, exceptions, tasks needing action) → P1 today
  (attendance status compact, deadlines) → P2 quick actions + recent activity → P3
  announcements + calendar → P4 nothing (profile/theme are not on this page).
- Attendance is a **compact** status + single primary punch button, not a panel with a clock
  face, celebration animation, and a "today's guide".
- Analytics/mini-charts come **after** actionable work, or move to a dedicated analytics
  route. They are never the first thing.
- Module launcher is a compact list/grid, not 13 illustrated feature graphics.

## Tables / lists

- Toolbar in a fixed position: search (left) → filters → sort → view switch → bulk actions
  (right). Same order everywhere.
- One row-action model app-wide (choose: trailing kebab menu). No per-module variants.
- Column set is scannable: primary identifier bold in col 1 with secondary detail beneath;
  status as a single badge; dates in one format (`dd MMM`, `dd MMM yyyy`).
- Pagination in a consistent footer. Bulk actions appear only when rows are selected.
- Empty: one line + primary action. Loading: skeleton rows, not a spinner blocking the page.

## Forms

- Label placement consistent app-wide (top-aligned).
- Fields grouped by task into titled sections; section order matches the mental model of
  the task, not the database.
- Validation inline under the field, consistent message tone; submit disabled only with a
  reason communicated.
- Destructive actions (delete, archive) visually separated from save/primary — different
  region, never adjacent.
- Save state explicit: idle / saving / saved / error. No silent success, no silent failure.

## Settings

- Left: section navigation. Right: the configuration for the selected section only.
- One save scope per section; unsaved-changes state is visible and blocks accidental nav.
- Do not mix "browse the list of things" and "configure one thing" on the same surface.

## Detail pages

- Header: entity name + key identifiers + status + primary action. No raw `<h1>` styling.
- Body: the most-used related data first; rare related data behind tabs.
- Actions that mutate the entity are in the header or a clearly-labelled actions area, not
  scattered inline.

## Workflow / process pages

- The current stage and the single next action are unmistakable and above the fold.
- Completed stages collapse; upcoming stages are visible but de-emphasised.
- Per-stage data entry uses the canonical form components.

## Approvals queues

- One queue view per approver context; each item shows what/who/when/amount and the two
  actions (approve, reject) inline with a consistent model.
- Bulk approve where the domain allows it.

## Empty / healthy states

- "Nothing needs you" is a success message, one line, quiet. Not a full-bleed illustration.
