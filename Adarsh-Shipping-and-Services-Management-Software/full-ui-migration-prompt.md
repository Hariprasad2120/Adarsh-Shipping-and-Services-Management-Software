Use this prompt in Codex from the root of the Monolith Engine repository:

````text
# Complete Monolith UI Replacement and Design-System Migration

Completely rework the UI of the entire Monolith Engine application using the design system source already copied into this repository.

This is a full UI replacement—not a theme overlay, CSS skin, partial migration, or dashboard-only redesign.

## Authoritative references

There are two authoritative visual references:

1. The folder containing:
   "D:\AMS\_design-reference\Monolith-Design-System-v11-Full-Source-and-Dependencies"
2. The existing redesigned `/dashboard`, which is already working and visually correct.

Use the design-system source for:

- Typography
- Font files and font loading
- Theme tokens
- Colors and gradients
- Spacing
- Layout proportions
- Borders
- Radii
- Shadows
- Theme-colored hover shadows
- Buttons
- Form controls
- Cards
- Tables
- Navigation
- Page panels
- Motion
- Loading states
- Responsive behavior

Use the existing `/dashboard` as the application-level visual benchmark. Do not redesign the dashboard unless shared-component extraction requires small, visually identical changes.

The existing Monolith application remains authoritative for:

- Business logic
- Database operations
- Server actions
- API calls
- Authentication
- RBAC
- Permissions
- Validation
- Workflows
- Notifications
- External integrations
- Module enablement
- User-generated data

Do not remove, replace, mock, simplify or break application functionality.

---

# 1. Inspect the repository before changing anything

Locate the design-system folder automatically. Do not assume a fixed absolute path.

Inspect:

- The design-system source
- Its `app/page.tsx`
- Its `app/globals.css`
- Its layout and theme implementation
- Fonts and font declarations
- Components and component states
- Configuration files
- The current redesigned dashboard
- Current global CSS
- Existing shared UI components
- Every application route and nested route
- All CSS modules and page-specific styles
- All route groups and dynamic routes

Build a complete route inventory from the actual repository. Include every `page.tsx`, `layout.tsx`, template, modal route and nested module page.

Create:

`docs/ui-migration-status.md`

The document must contain a table with:

- Route
- Module
- Current layout
- Current legacy components
- New layout
- Migration status
- Theme verification
- Responsive verification
- Functionality verification
- Notes

The migration status must use:

- Not started
- In progress
- Migrated
- Verified

Do not stop after creating the audit. Continue with the implementation.

---

# 2. Back up the old UI before removing it

Before changing or deleting any old UI code, create:

`OLD UI code/`

This folder must contain:

- `README.md`
- `old-ui-source.zip`
- `old-ui-manifest.json`
- `old-ui-source.sha256`

The ZIP must preserve the original relative paths of all old UI-related files, including:

- Old layouts
- Old visual components
- Old stylesheets
- CSS modules
- Theme files
- Old navigation components
- Old form and table components
- Old page markup that will be replaced

Do not include:

- `node_modules`
- `.next`
- Git history
- Build output
- Uploaded user files
- Environment secrets
- Database data

The manifest must map every backed-up file to its original path and SHA-256 checksum.

The backup must not be compiled, scanned by Tailwind, imported by TypeScript or included in the production bundle.

Also create a Git branch or tag before migration:

`backup/old-ui-before-monolith-rework`

Do not delete old UI files until their backup is verified.

---

# 3. Establish one primary design system

The new Monolith design system must become the only active visual system.

Do not:

- Add it as an optional skin
- Keep two active component systems
- Wrap old pages in a new background
- Add global overrides while retaining old component markup
- Retain old typography beneath new containers
- Keep legacy page layouts active
- Create a second parallel design system
- Copy the reference project’s `node_modules` into runtime imports

Extract and adapt the design-system source into the existing application architecture.

Prefer a structure similar to:

```text
src/
  design-system/
    components/
    layouts/
    tokens/
    themes/
    motion/
    utilities/
    index.ts
````

If an equivalent working design-system structure already exists, extend it instead of creating another one.

The existing dashboard must be migrated to these shared components internally while remaining visually unchanged.

---

# 4. Global typography

Use the exact font family, weights, letter spacing and line-height system from the supplied design-system source.

Requirements:

* Load the included Geist and Geist Mono files locally.
* Do not depend on remote Google font downloads.
* Use Geist for interface typography.
* Use Geist Mono only where the design system uses it, such as timers, technical values or operational codes.
* Do not automatically use a different font for all numbers.
* Ordinary monetary values, counts and statistics must follow the design system’s documented numeric typography.
* Remove old font imports and font-family declarations.
* Remove page-specific font overrides.
* Prevent browser-synthesized weights where possible.
* Standardize headings, body text, labels, helper text, error text, captions and numeric values.

Do not place decorative icons before ordinary page headings unless the design-system component explicitly requires one.

---

# 5. Theme system

Preserve and correctly implement all three themes:

## Light

* Primary: `#f9d972`
* Warm paper surfaces
* Soft yellow highlights
* Theme-colored gradients and hover shadows

## Night

* Use true dark black as the principal background.
* Do not use blue-black, purple-black or other tinted black as the main background.
* Use yellow primary and highlight colors.
* Maintain accessible text contrast.

## Violet

* Use violet as both primary and highlight.
* Do not let yellow tokens leak into Violet primary actions.
* Use violet gradients, focus rings and hover shadows.

Status colors:

* Success background: `#e6f3ea`
* Danger background: `#fceceb`
* Warning and danger text must use bright, clearly visible colors from their respective families.
* Success, information, warning and danger text must use strong corresponding colors.

Implement themes through centralized semantic CSS variables.

Do not use page-specific theme branching when a semantic token can handle it.

---

# 6. Shared page layouts

Create or normalize shared layouts such as:

* `AppShell`
* `ModuleShell`
* `PageContainer`
* `PageHeader`
* `PageToolbar`
* `PageSection`
* `SplitPanel`
* `Sidebar`
* `TopNavigation`
* `Breadcrumbs`
* `ContentGrid`
* `DetailLayout`
* `ListLayout`
* `SettingsLayout`
* `FormLayout`
* `FullScreenWorkspace`

Use approximately:

* 32px desktop page gutter
* 24px tablet gutter
* 16px mobile gutter

Pages must use the available area after the sidebar. Do not place complete application pages inside narrow centered `max-width` containers.

Remove:

* Duplicate nested page padding
* Excessive empty space at page edges
* Double scrollbars
* Arbitrary page widths
* Unnecessary top whitespace
* Misaligned breadcrumbs
* Inconsistent toolbar placement
* Global horizontal overflow

Use constrained widths only for appropriate content such as login forms, dialogs and focused forms.

---

# 7. Shared component migration

Create or normalize reusable components for:

* Primary buttons
* Secondary buttons
* Outline buttons
* Destructive buttons
* Ghost buttons
* Icon buttons
* Loading buttons
* Text links
* Labels
* Helper text
* Error text
* Inputs
* Password inputs
* Textareas
* Number inputs
* Search inputs
* Select controls
* Comboboxes
* Date pickers
* Checkboxes
* Radio controls
* Toggle switches
* Dropzones
* File previews
* Filters
* Filter chips
* Tabs
* Accordions
* Cards
* Stat cards
* Section panels
* Badges
* Warning indicators
* Status indicators
* Tables
* Data tables
* Pagination
* Empty states
* Skeletons
* Loading animations
* Spinners
* Progress bars
* Dialogs
* Drawers
* Popovers
* Tooltips
* Toasts
* Menus
* Navigation items
* Sidebars
* Page headers
* Breadcrumbs

Every standard component must come from the shared design system.

Pages must not independently recreate common buttons, cards, fields, tables, badges or dialogs.

---

# 8. AI-enhanced missing components

When a specialised Monolith element does not exist in the supplied design-system source, create it using the existing design language.

Examples include:

* Filing workflow graph nodes
* Shipment stage timelines
* Clearance status panels
* Appraisal scorecards
* Attendance punch panels
* Payroll summaries
* CRM pipeline cards
* Accounting ledgers
* Document validity indicators
* Expense approval cards
* Communication panels
* Customer portal shipment tracking
* Notification timelines

New components must:

* Use the same tokens
* Use the same typography
* Use the same radii and borders
* Use theme-specific hover shadows
* Support Light, Night and Violet
* Be keyboard accessible
* Be responsive
* Be created in the shared design-system folder
* Be documented in the Admin Design System page
* Avoid a generic Bootstrap, Material UI or default shadcn appearance

Do not create arbitrary one-off styles inside module pages.

---

# 9. Rework every module

Fully migrate every page belonging to:

* Main dashboard
* Product Catalogue
* To-Do
* Notifications
* HRMS
* Attendance
* AMS
* LMS
* CRM
* Expense
* CHA
* Accounting
* Recruit
* Communication
* Admin
* Settings
* User profile
* Authentication pages
* Error pages
* Loading pages
* Empty states
* Permission-denied pages
* Dynamic detail pages
* Create and edit pages
* Approval pages
* Report pages
* Modal and drawer interfaces
* Any route discovered by the route inventory

For each page:

1. Preserve server actions and data queries.
2. Preserve permissions and RBAC.
3. Preserve validation.
4. Replace the complete visual composition.
5. Replace legacy components with shared components.
6. Remove unused legacy imports.
7. Remove obsolete styles.
8. Test all user actions.
9. Test all themes.
10. Update `docs/ui-migration-status.md`.

No route may remain with the previous design.

A new sidebar surrounding an old page is not considered migrated.

---

# 10. Module-specific requirements

## HRMS

Rework directory, employee details, leave, letters, payroll, reports, settings, role management and onboarding pages.

## Attendance

Rework check-in, live timer, biometric records, shifts, overtime, on-duty requests, GPS tracking and attendance reporting.

## AMS

Rework appraisal cycles, self-assessment, reviewer assessment, management rating, scorecards, increment slabs and reports.

## CRM

Rework leads, customers, opportunities, quotations, approvals, sales orders, activities and pipeline views.

## CHA

Rework:

* Dashboard
* Jobs
* Job creation
* Job details
* Documents
* Additional data
* Checklist approvals
* Filing workflow
* Workflow settings
* Bill filing
* Expenses
* Customers
* Reports
* Settings

The filing workflow canvas may use a full-screen workspace layout but must still use the shared design tokens and controls.

## Accounting

Rework ledgers, journal entries, accounts, invoices, payments, reports, approvals and settings.

## Communication

Rework email, chat, spaces, Drive/document integration, notifications and communication settings.

---

# 11. Remove the active old UI

After each page has been migrated and verified:

* Remove its legacy visual implementation from active source.
* Remove old CSS imports.
* Remove unused CSS variables.
* Remove unused components.
* Remove obsolete theme providers.
* Remove unused packages only after confirming they are not required elsewhere.
* Remove dead layout wrappers.
* Remove duplicate component variants.
* Remove old font loading.
* Remove obsolete icon packages where safe.

Do not keep old UI code active “for safety.” The backup inside `OLD UI code/` and the Git backup branch are the safety copies.

Run a repository-wide scan for:

* Legacy component imports
* Old theme imports
* Old CSS files
* Old font declarations
* Inline hex colors
* Arbitrary shadows
* Arbitrary radii
* Duplicate buttons
* Duplicate fields
* Duplicate cards
* Duplicate tables
* Page-specific theme switches
* Old layout wrappers

Do not delete business logic with visual code.

---

# 12. Update the Admin Design System page

The Admin Design System page must become a live catalogue of the components actually used by the application.

Do not maintain a disconnected static showcase.

It must import and render the real production components.

Include:

* Color tokens
* Gradient tokens
* Typography scale
* Labels and helper text
* Error and validation states
* Numeric and stat styles
* All button variants
* Links
* Inputs
* Selects
* Date controls
* Toggles
* Filters
* Dropzones
* Cards
* Panels
* Badges
* Warning indicators
* Status indicators
* Tables
* Pagination
* Dialogs
* Drawers
* Popovers
* Tooltips
* Toasts
* Navigation
* Sidebars
* Breadcrumbs
* Empty states
* Skeletons
* Loading animations
* Page-layout examples
* Module-specific components created during migration

Provide interactive controls for:

* Light theme
* Night theme
* Violet theme
* Hover states
* Focus states
* Loading states
* Disabled states
* Validation states
* Responsive layout examples

The Admin Design System page must always reflect the production component source.

---

# 13. CSS rules

Prefer semantic classes and tokens.

Do not:

* Use inline hex colors in page components
* Introduce arbitrary `rounded-[...]` values
* Introduce arbitrary box shadows
* Duplicate typography declarations
* Use `!important` as a migration shortcut
* Add huge global selectors that accidentally affect third-party widgets
* Use page CSS to redefine standard buttons, inputs, tables or cards
* Retain CSS merely because removing it is inconvenient

Feature-specific CSS is allowed only for behaviour that cannot be represented by the shared system, such as:

* Graph canvas positioning
* Complex animation choreography
* Shipment visualisations
* Special timeline geometry

Feature-specific CSS must still consume global tokens.

---

# 14. Preserve application functionality

Do not change business behaviour unless required to reconnect an existing feature after visual migration.

Verify:

* Forms submit correctly
* Validation messages appear
* Role permissions remain correct
* Buttons invoke the correct server actions
* Dialogs open and close
* Uploads work
* File previews work
* Tables sort and filter
* Pagination works
* Theme selection persists
* Module enablement works
* Notifications continue working
* Mobile navigation works
* Authentication redirects work
* Error and loading states work
* Dynamic routes still load
* External integrations remain connected

Do not use mock data to make redesigned pages appear complete.

---

# 15. Responsive and accessibility requirements

Test at:

* 1920×1080
* 1440×900
* 1280×800
* 1024×768
* 768×1024
* 390×844

Verify:

* No document-level horizontal overflow
* No overlapping sidebar and content
* No double scrollbars
* Tables have controlled internal scrolling
* Dialogs remain within the viewport
* Forms remain usable on mobile
* Touch targets are large enough
* Focus indicators are visible
* Keyboard navigation works
* Labels are connected to controls
* Icon-only controls have accessible labels
* Colors meet reasonable contrast requirements
* Reduced-motion preferences are respected

---

# 16. Migration execution strategy

Perform the migration in coherent batches:

1. Audit and old-UI backup
2. Tokens, fonts and themes
3. Shared application shell
4. Shared components
5. Existing dashboard normalization
6. Core utility pages
7. HRMS and Attendance
8. AMS and LMS
9. CRM
10. CHA
11. Accounting and Expense
12. Communication and Recruit
13. Admin and Settings
14. Authentication, errors and miscellaneous routes
15. Admin Design System catalogue
16. Legacy-code removal
17. Full verification

Commit after each verified batch.

Do not ask me to manually migrate each page. Continue through the inventory systematically.

If the session cannot finish the entire migration, leave:

* All completed work committed
* `docs/ui-migration-status.md` updated
* The next exact batch marked
* No partially migrated or broken page
* A clear continuation instruction in `docs/ui-migration-handoff.md`

However, do not declare the overall task completed until every route is marked `Verified`.

---

# 17. Mandatory verification

Run the repository’s actual commands for:

* Formatting
* Linting
* Type checking
* Unit tests
* Integration tests
* Production build

Fix migration-related failures.

Use browser verification for representative pages from every module in all three themes.

Perform a final route inventory comparison:

```text
Total routes discovered
Total routes migrated
Total routes verified
Routes remaining
```

Completion requires:

```text
Routes remaining: 0
```

Also report:

* Changed files
* Added files
* Removed legacy files
* Backup location
* Backup checksum
* Shared components created
* Specialised components created
* Packages added
* Packages removed
* Tests executed
* Build result
* Theme verification result
* Responsive verification result
* Any unavoidable exceptions

---

# Non-negotiable acceptance criteria

The task is not complete unless:

* Every page uses the new Monolith design.
* No old page design remains active.
* The new design is the primary and only active design system.
* The old UI has been safely backed up.
* The dashboard remains visually correct.
* All three themes work consistently.
* Typography matches the design-system source.
* Standard components are shared rather than duplicated.
* Missing specialised elements are added to the shared system.
* The Admin Design System page shows the real current production components.
* Business functionality remains operational.
* The production build passes.
* `Routes remaining` equals `0`.

Do not provide only recommendations, an audit, sample components, a CSS overlay or a partial conversion. Implement the complete migration directly in the repository.

```
```