# Monolith UI Design System — Mandatory Agent Guide

> **Status:** Mandatory for every UI creation, redesign, migration, or visual bug fix.
>
> **Scope:** All user-facing routes, layouts, loading states, empty states, error states, permission states, dialogs, forms, tables, dashboards, portals, and module-specific workspaces in Monolith.
>
> **Primary rule:** Do not redesign an existing element in isolation. First find and use the existing canonical Monolith component. When no equivalent exists, create one canonical production component, register it in the Admin Design System catalogue, and then use it.

---

## 1. Purpose

This document defines how coding agents must create or change UI in the Monolith repository.

The goal is one production design system across the entire application without:

- changing business logic;
- changing RBAC or visibility rules;
- changing database behavior;
- changing server actions, APIs, integrations, or validation;
- creating route-local copies of shared UI;
- applying a superficial CSS skin over legacy markup;
- introducing another component library or design language.

The migration is a controlled replacement of presentation ownership, not a rewrite of domain behavior.

---

## 2. Current sources of truth

Use the following authority order when deciding how Monolith should look and behave.

### 2.1 Canonical production implementations

The component source is the highest authority.

Implementation ownership currently lives in:

- `src/components/ui`
- `src/components/layout`
- `src/components/forms`
- `src/components/data-display`
- `src/components/feedback`
- `src/components/navigation`
- `src/components/providers`
- `src/modules/<module>/components`

`src/components/monolith/index.ts` is the supported aggregation/public API and compatibility barrel. It may export production components, but new component implementations must not be added directly under `src/components/monolith` except:

- `src/components/monolith/index.ts`
- `src/components/monolith/catalogue/**`

Never create a second implementation in `src/components/monolith`.

### 2.2 Admin Design System page

Route:

- `/admin/design-system`

Source:

- `src/app/(dashboard)/admin/design-system`
- `src/components/monolith/catalogue`

The page is a live catalogue of actual production components. It must render the same component used by application routes.

The catalogue must never contain a disconnected demo-only reimplementation.

Catalogue layout-only selectors now live in the dedicated
`src/app/globals.css` section marked for
`src/app/(dashboard)/admin/design-system/design-system-catalogue.css`. That
section may arrange catalogue specimens, labels, navigation, and preview
containers. It must not restyle production components.

### 2.3 Dashboard page

Route:

- `/dashboard`

The dashboard is a visual and composition reference for:

- the overall Monolith personality;
- editorial page rhythm;
- module command cards;
- feature graphics;
- connected operational storytelling;
- strong typography hierarchy;
- inset content;
- responsive card compositions;
- focused information density.

Do not visually redesign the working dashboard unless a change is required to reconcile it with canonical components. Route-local dashboard patterns may be extracted into reusable or dashboard-owned production components while preserving the current visual output.

### 2.4 CHA module

Routes:

- `/cha`
- `/cha/**`
- `/expense`
- `/expense/**`

CHA is the primary operational reference for:

- workspace framing;
- route page headers;
- connected metrics;
- numbered section headings;
- operational tables;
- filters and search controls;
- row actions;
- warnings and expiry indicators;
- pending-action panels;
- workflow states;
- dense business forms;
- dialogs;
- module-specific composition.

Use CHA patterns for operational modules when the same interaction model applies. Do not copy CHA-specific terminology into unrelated modules.

### 2.5 Tokens and style ownership

Single stylesheet owner:

- `src/app/globals.css`

Sectioned ownership inside `globals.css`:

- token/theme foundations in the marked `src/styles/monolith-tokens.css` section;
- shared production styling in the marked `src/styles/monolith-system.css` section;
- module composition styling in the marked `src/styles/modules/*.css` sections;
- temporary compatibility in the marked `src/styles/legacy-compatibility.css` section;
- catalogue layout-only styling in the marked
  `src/app/(dashboard)/admin/design-system/design-system-catalogue.css`
  section;
- component-specific global styling such as the login experience and dev
  console in their own marked sections when they are intentionally centralized.

`legacy-compatibility.css` is migration debt. New selectors, tokens, or components must not be added there.

---

## 3. Visual foundations

### 3.1 Typography

- Primary font: Geist Sans through `--mn-font-sans`.
- Monospace/numeric use must come from semantic tokens.
- Do not set route-local font families.
- Do not recreate page or section heading typography with utility classes.
- Major page sections use `WorkspaceSectionHeading`.
- Primary route identity uses `WorkspacePageHeader`.

Current token hierarchy includes:

- display typography;
- page/section headings;
- panel titles;
- body text;
- control text;
- helper text;
- labels;
- numeric/stat values.

Use the tokenized hierarchy instead of arbitrary font sizes or tracking.

### 3.2 Layout

The default authenticated page frame is:

- maximum page width: `75rem` / 1200px;
- maximum workspace width: `75rem` / 1200px;
- desktop gutter: `clamp(2rem, 3.3vw, 3.125rem)`;
- tablet gutter: `1.75rem`;
- mobile gutter: `1rem`.

Pages must inherit this through canonical page/shell components.

Do not add route-local `max-w-*`, custom centered wrappers, or competing page padding unless the route is a documented specialised canvas such as a workflow builder.

### 3.3 Spacing

- Base spacing rhythm: 4px.
- Use `--mn-space-*` and canonical component gaps.
- Use `--mn-layout-workspace-stack-gap` for major workspace rhythm.
- Use `--mn-heading-to-panel-gap` between a major heading and its content.
- Avoid arbitrary `space-y-*`, `gap-[...]`, or fixed pixel spacing when an equivalent token exists.

### 3.4 Shape

Use semantic radii:

- control radius: `--mn-radius-control`;
- panel radius: `--mn-radius-panel`;
- feature radius: `--mn-radius-feature`.

Do not invent route-local corner radii.

### 3.5 Themes

Every production UI must support:

- Light;
- Night;
- Violet.

Use semantic `--mn-*` variables. Never hardcode a color that changes by theme.

Approved semantic families include:

- canvas;
- surface;
- soft/muted surface;
- text;
- strong text;
- muted text;
- border;
- primary;
- accent;
- success;
- warning;
- danger;
- information;
- gradients;
- shadows;
- glass surfaces.

### 3.5.1 Iconography

- Use the shared `MonolithIcon` contract for reusable iconography.
- Monolith icons must inherit theme color from semantic tokens, not hardcoded fills or route-local hex values.
- Prefer the shared rounded outlined icon language with `currentColor` strokes and token-backed containers.
- Page headers, metrics, route states, and future shared navigation specimens should use the approved workspace icon wrappers or `MonolithIcon` directly.
- Do not introduce a second production icon system or mix unrelated icon families in the same surface when an approved Monolith icon exists.

### 3.6 Motion

- Fast interaction response: `--mn-motion-fast`.
- Expressive panel response: `--mn-motion-panel`.
- Respect `prefers-reduced-motion`.
- Static panels, status badges, alerts, form containers, and informational metrics must not move on hover.
- Hover movement is allowed only for real links, buttons, explicitly interactive surfaces, and draggable objects.
- An interactive surface must have a keyboard and accessibility contract.

---

## 4. Mandatory page composition

Use the smallest correct canonical composition.

### 4.1 Page frame

Use:

- `MonolithPage`; or
- `WorkspacePage`; or
- a module workspace frame built on `WorkspacePage`, such as `ChaWorkspaceFrame`.

Do not create a separate route-level page system.

### 4.2 Page header

Use:

- `WorkspacePageHeader`; or
- the module wrapper that delegates to it, such as `ChaRoutePageHeader`.

The page header owns:

- eyebrow;
- page title;
- description;
- optional actions;
- optional graphic;
- semantic `h1`.

Do not recreate this using raw `h1`, arbitrary typography, and route-local spacing.

### 4.3 Major sections

Use:

- `WorkspaceSectionHeading`.

It owns:

- section index;
- title;
- description;
- optional badge;
- optional actions;
- semantic heading level;
- responsive layout.

Panel-internal titles may use `WorkspacePanelHeader`.

### 4.4 Metrics

Use:

- `.mnx-workspace-metrics` with `WorkspaceMetric`;
- or a module wrapper built from it, such as `ChaMetrics` and `ChaMetric`.

Metrics should visually form one connected summary group where the design calls for a summary strip.

A metric is interactive only when it has a real destination/action. Informational metrics are static.

### 4.5 Panels and surfaces

Use:

- `WorkspacePanel`;
- `MonolithSurface`;
- module panels such as `ChaPanel`, `AccountingPanel`, `CrmPanel`, `AdminPanel`, or `CommunicationPanel`.

Panels are static by default. Set `interactive` only for a real actionable surface.

### 4.6 Actions

Use:

- `Button`;
- `WorkspaceAction`;
- `MonolithAction`;
- `MonolithIconAction`;
- an approved link-action component;
- module wrappers when required.

Do not find an existing `<button>` and merely restyle it. Replace the route-local visual implementation with the canonical action component while preserving:

- `type`;
- `name`;
- `value`;
- `form`;
- `disabled`;
- `aria-*`;
- `onClick`;
- loading behavior;
- server action submission;
- refs.

If a link must visually match a button and no canonical link-action contract exists, create one shared canonical action-link component instead of repeating button class strings on `<Link>`.

### 4.7 Forms

Use canonical controls and compositions:

- `WorkspaceField`;
- `Input`;
- `Textarea`;
- `NativeSelect`;
- `DropdownSelect`;
- `NeonCheckbox`;
- `DateInput`;
- file upload components;
- approved filter/menu components.

Preserve:

- field names;
- IDs;
- labels;
- validation;
- errors;
- controlled/uncontrolled behavior;
- default values;
- refs;
- React Hook Form registration;
- native form submission;
- autocomplete;
- server-action contracts.

### 4.8 Tables

For operational modules, prefer:

- `OperationalDataTable`;
- `OperationalDataTableHeader`;
- `OperationalDataTableWrap`;
- `OperationalTable`;
- `OperationalTableHead`;
- `OperationalTableCell`;
- `OperationalPrimaryCell`;
- `OperationalStatus`;
- `OperationalMode`;
- `OperationalRowAction`;
- `OperationalTableEmpty`;
- `OperationalDataTableFooter`.

Use the general `DataTable`/People table family when that interaction model is a better match.

Do not create a route-local table card, toolbar, pagination layout, status pill, or row action when an equivalent exists.

### 4.9 Feedback and route states

Use canonical:

- badges/status;
- alerts;
- progress;
- empty states;
- loading states;
- error states;
- permission states;
- not-found states.

Routes and layouts must not maintain independent loading/error/permission visual systems.

### 4.10 Dialogs and overlays

Use:

- `Modal`;
- `WorkspaceDialogLayer`;
- module wrappers such as `ChaModal` and `ChaDialogLayer`;
- canonical dropdown/popover components.

Preserve focus trapping, close behavior, escape behavior, scroll locking, labels, and portal ownership.

---

## 5. Component selection rule

Before creating any visual element:

1. Search `/admin/design-system`.
2. Search `src/components/monolith/catalogue`.
3. Search canonical shared owner folders.
4. Search the current module’s component folder.
5. Search dashboard and CHA for an equivalent composition.
6. Check the ownership audit and catalogue exclusions.
7. Extend an existing component when its semantic contract safely supports the requirement.
8. Create a new component only when no equivalent exists.

Visual similarity alone is not sufficient. Reuse must also match behavior, accessibility, and semantics.

---

## 6. Creating a missing design-system element

When the equivalent element does not exist:

### 6.1 Decide ownership

Place it in:

- `src/components/ui` for a business-neutral primitive;
- `src/components/layout` for shared page/layout composition;
- `src/components/forms` for reusable form behavior;
- `src/components/data-display` for shared table/list/data presentation;
- `src/components/feedback` for alerts, status, route states, and notifications;
- `src/components/navigation` for links, tabs, breadcrumbs, menus, and navigation behavior;
- `src/modules/<module>/components` for genuinely module-specific composition.

Do not place the implementation under `src/app/**` when it is reusable.
Do not add implementation files directly under `src/components/monolith`.

### 6.2 Styling ownership

- Shared component selectors: `src/styles/monolith-system.css`.
- Genuine module composition selectors: the matching `src/styles/modules/*.css`.
- CSS module only for a strongly isolated specialised experience, such as the animated login, when global semantic ownership is unsuitable.
- Never add new UI to `legacy-compatibility.css`.
- Never put production component styles in `design-system-catalogue.css`.

### 6.3 Token use

The component must use semantic `--mn-*` tokens for:

- colors;
- typography;
- spacing;
- radii;
- shadows;
- gradients;
- motion.

Avoid hardcoded hex, RGB, HSL, pixel, rem, duration, and shadow values when a semantic token exists.

### 6.4 Export and catalogue

After creating the component:

1. export it from its owner barrel;
2. expose it through `src/components/monolith/index.ts` when it belongs to the supported Monolith UI API;
3. add a typed catalogue entry in `src/components/monolith/catalogue`;
4. render the actual production component with safe mock data;
5. document states, themes, interaction, source, accessibility, and status;
6. add an exclusion only when it is an internal subcomponent that should not have an independent specimen;
7. run `npm run design-system:verify`.

A catalogue-only copy is forbidden.

---

## 7. Existing UI migration rule

Do not treat the presence of a page inside the Monolith shell as proof that the page is migrated.

A route is non-compliant or partially compliant when it contains visual ownership such as:

- route-local recreations of buttons, inputs, selects, textareas, tables, dialogs, badges, tabs, cards, or status indicators;
- raw visual `h1`/major section headings instead of canonical heading components;
- arbitrary Tailwind colors, borders, shadows, radii, widths, spacing, or hover movement;
- hardcoded hex/RGB/HSL values;
- route-local CSS that duplicates a shared primitive;
- legacy class families or dependency on `legacy-compatibility.css`;
- custom loading, error, empty, permission, or not-found markup;
- duplicate primitive files outside approved owners;
- unregistered reusable visual exports;
- page-specific button class strings applied to links;
- a static informational surface that moves on hover;
- a new component displayed in production but absent from the catalogue or explicit exclusions.

Raw semantic HTML is not automatically wrong. Keep semantic elements when they are internal content and do not recreate a design-system primitive.

---

## 8. Specialised experiences

Some routes need specialised UI:

- workflow builders;
- graph/canvas editors;
- document/PDF viewers;
- drag-and-drop upload managers;
- rich mail/chat interfaces;
- animated authentication;
- maps;
- complex data grids.

Specialised experiences may keep module-owned composition, but must still use:

- Monolith tokens;
- canonical page/header/action/form/feedback components around the specialised core;
- Light, Night, and Violet themes;
- keyboard support;
- reduced motion;
- responsive containment;
- registered production components where reusable.

Do not force a specialised canvas into a generic card if that harms usability.

---

## 9. Repository-wide audit workflow

Before changing pages:

1. record the current branch, commit, and worktree;
2. preserve unrelated changes;
3. set `NODE_OPTIONS=--max-old-space-size=8192`;
4. run the route audit;
5. run the component/style ownership audit;
6. run architecture and design-system verification;
7. create a route-by-route migration matrix.

Required discovery includes:

- every `page.tsx`;
- every `layout.tsx`;
- every `loading.tsx`;
- every `error.tsx`;
- every `not-found.tsx`;
- public/auth routes;
- customer portal;
- dashboard;
- all module families;
- route-private `_components`;
- module components;
- shared components;
- active stylesheets.

The audit result must classify each route as:

- compliant;
- partially compliant;
- legacy/non-compliant;
- specialised and compliant;
- blocked from runtime verification.

Do not trust an old “migrated” label. Inspect current source and runtime.

---

## 10. Migration safety

Never change UI by altering:

- Prisma schema or migrations;
- database queries;
- server actions;
- API response contracts;
- permission keys;
- RBAC checks;
- role visibility;
- routing;
- search parameter names;
- form payload keys;
- integration calls;
- notification behavior;
- session/security behavior;
- business calculations.

Preserve server/client boundaries unless a visual component strictly requires a boundary change and the change is proven safe.

Do not use `git reset --hard`, `git clean`, force pushes, or destructive file replacement.

Git history is the rollback mechanism. Do not recreate a large `OLD UI code` archive inside the repository.

---

## 11. Validation requirements

For every migration batch:

- run scoped ESLint;
- run `npx tsc --noEmit`;
- run `npm run architecture:check`;
- run `npm run design-system:verify`;
- run relevant UI tests;
- run relevant module static verifiers;
- run a production build;
- compare failures against the pre-change baseline.

Runtime visual verification must cover:

- Light;
- Night;
- Violet;
- desktop around 1440px;
- tablet around 1024px;
- mobile around 390px;
- keyboard navigation;
- visible focus;
- hover states;
- disabled states;
- loading/empty/error states;
- long content;
- overflow;
- reduced motion.

Use only local or isolated staging data. Never run destructive UI verification against production.

---

## 12. Definition of done

A repository-wide UI migration is complete only when:

- every discovered user-facing route has a recorded status;
- every non-compliant route has been migrated or explicitly documented as a specialised compliant route;
- no active route recreates an existing canonical primitive;
- no new selector exists in `legacy-compatibility.css`;
- legacy selectors removed have zero active usage;
- every reusable production visual export is registered or explicitly excluded;
- the Admin Design System renders actual production components;
- catalogue CSS styles only catalogue arrangement;
- all three themes work;
- desktop, tablet, and mobile are verified;
- accessibility and reduced-motion checks pass;
- architecture, design-system, type, relevant tests, and build gates pass or have only unchanged documented baseline failures;
- migration status and handoff documents are updated;
- no business functionality, security, or performance has regressed.

---

## 13. Mandatory commands

Run with an 8 GB Node heap.

### PowerShell

```powershell
$env:NODE_OPTIONS='--max-old-space-size=8192'
node scripts/audit-ui-routes.mjs
node scripts/generate-ui-component-style-audit.mjs
npm run architecture:check
npm run design-system:verify
npx tsc --noEmit
npm run test:ui
npm run build
```

### Bash

```bash
export NODE_OPTIONS=--max-old-space-size=8192
node scripts/audit-ui-routes.mjs
node scripts/generate-ui-component-style-audit.mjs
npm run architecture:check
npm run design-system:verify
npx tsc --noEmit
npm run test:ui
npm run build
```

Run full lint/tests only after recording the pre-change baseline and only against the approved safe local/staging environment.

---

## 14. Required agent report

At the end of a UI task, report:

- branch and final commit;
- route families inspected;
- routes changed;
- canonical components reused;
- new canonical components created;
- catalogue entries added;
- legacy usages removed;
- files intentionally left unchanged;
- commands run and results;
- unchanged baseline failures;
- runtime/theme/viewport evidence;
- remaining migration debt.

Do not claim “all pages migrated” without a fresh route discovery and a route-by-route completion record.
