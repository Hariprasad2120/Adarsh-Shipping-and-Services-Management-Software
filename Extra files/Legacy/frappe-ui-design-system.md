# Frappe UI Design System

This design system is intended to make another software product visually read like modern Frappe.

Files:
- `frappe_docker/design/frappe-ui-design-system.css`

## Core Direction

- Quiet enterprise UI
- Neutral gray base with restrained accent color
- Compact controls and dense information layouts
- Soft elevation, clear borders, minimal decoration
- Consistent patterns for forms, tables, dashboards, and document workflows

## Theme Activation

Apply the base class at the app root:

```html
<body class="frappe-ui" data-theme="light" data-accent="blue">
```

Supported theme attributes:
- `data-theme="light"`
- `data-theme="dark"`
- `data-accent="blue|green|amber|violet"`

## Design Tokens

The CSS file includes:
- typography tokens
- spacing tokens
- border radius tokens
- semantic surface, border, and text tokens
- status tokens
- light and dark elevation tokens

Use CSS variables instead of hardcoded values.

## Layout Patterns

### App shell

- `.frappe-shell`: full app wrapper
- `.frappe-topbar`: top navigation strip
- `.frappe-layout`: sidebar + content grid
- `.frappe-sidebar`: left navigation
- `.frappe-main`: content area
- `.frappe-page`: centered max-width page container

### Dashboard

- `.frappe-dashboard-grid`: 12-column grid
- `.frappe-dashboard-span-3|4|6|8|12`: card widths
- `.frappe-stat-card`: KPI blocks

Use dashboards for:
- KPI summaries
- recent activity
- approvals
- charts
- pending tasks
- operational tables

## Component Patterns

### Cards

- `.frappe-card`
- `.frappe-card--raised`
- `.frappe-card-header`
- `.frappe-card-body`
- `.frappe-card-footer`

Rules:
- keep cards simple
- no decorative nested cards
- use raised cards only where hierarchy matters

### Buttons

- `.frappe-btn`
- `.frappe-btn--primary`
- `.frappe-btn--subtle`
- `.frappe-btn--ghost`

Rules:
- compact height
- medium weight text
- primary only for strongest action

### Forms

- `.frappe-field`
- `.frappe-label`
- `.frappe-input`
- `.frappe-select`
- `.frappe-textarea`

Rules:
- quiet border
- visible focus ring
- avoid oversized fields unless the workflow truly needs them

### Dropdowns

- `.frappe-dropdown`
- `.frappe-dropdown-trigger`
- `.frappe-dropdown-menu`
- `.frappe-dropdown-item`

Rules:
- small menu padding
- clear hover state
- same border radius and shadows as cards

### Sidebar

- `.frappe-sidebar-group`
- `.frappe-sidebar-label`
- `.frappe-sidebar-item`
- `.frappe-sidebar-item.is-active`

Rules:
- neutral background
- active state uses accent soft fill, not loud blocks
- labels should be small and uppercase

### Tables

- `.frappe-table-wrap`
- `.frappe-table`

Rules:
- compact rows
- subtle header background
- crisp borders
- strong scanability

### Status and Alerts

- `.frappe-badge`
- `.frappe-badge--info|success|warning|danger`
- `.frappe-alert`
- `.frappe-alert--info|success|warning|danger`

### Document Upload

- `.frappe-upload-dropzone`
- `.frappe-upload-dropzone.is-dragover`
- `.frappe-upload-list`
- `.frappe-upload-item`

Rules:
- dropzone should feel operational, not playful
- file rows should look like small record cards

### Document Cards

- `.frappe-document-card`
- `.frappe-document-meta`

Use for:
- invoices
- shipments
- purchase requests
- approvals
- file summaries

### Empty States

- `.frappe-empty-state`

Rules:
- restrained
- text-first
- no oversized illustrations required

## Print Page Style

Use:
- `.frappe-print-page`
- `.frappe-print-header`
- `.frappe-print-section`
- `.frappe-print-footer`
- `.frappe-print-title`
- `.frappe-print-kv`
- `.frappe-print-table`

Guidance:
- keep print layouts monochrome-friendly
- use strong alignment and spacing
- uppercased table headers work well for invoices, statements, manifests, and reports

## Font and Text Usage

Primary font:
- `Inter Variable`

Recommended use:
- headings: semibold
- labels: medium
- body: regular
- helper text: muted or soft

Avoid:
- decorative typography
- wide tracking on body text
- oversized headings inside dashboard cards

## Implementation Rules

- replace hardcoded colors with variables from the CSS file
- use semantic variables first, primitive colors second
- keep layouts compact and information-dense
- preserve accessibility and keyboard focus states
- support both light and dark themes

## Suggested Rollout Order

1. app shell, sidebar, topbar
2. buttons, inputs, selects, dropdowns
3. cards and dashboard widgets
4. tables and badges
5. document upload and document cards
6. print pages and export layouts
