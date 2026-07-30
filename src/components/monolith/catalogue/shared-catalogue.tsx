"use client";

import {
  ArrowRight,
  Check,
  Info,
  MoreHorizontal,
  PackageSearch,
  Search,
  Ship,
} from "lucide-react";
import {
  Button,
  DropdownSelect,
  Input,
  MonolithAction,
  MonolithBadge,
  MonolithIconAction,
  MonolithSurface,
  MonolithThemePicker,
  NativeSelect,
  NeonCheckbox,
  OperationalDataTable,
  OperationalDataTableFooter,
  OperationalDataTableHeader,
  OperationalDataTableWrap,
  OperationalMode,
  OperationalPrimaryCell,
  OperationalRowAction,
  OperationalStatus,
  OperationalTable,
  OperationalTableCell,
  OperationalTableHead,
  Textarea,
  WorkspaceAction,
  WorkspaceAlert,
  WorkspaceBadge,
  WorkspaceEmptyState,
  WorkspaceField,
  WorkspaceMetric,
  WorkspacePageHeader,
  WorkspacePanel,
  WorkspacePanelHeader,
  WorkspaceProgress,
  WorkspaceSectionHeading,
  WorkspaceState,
} from "@/components/monolith";
import {
  allCatalogueThemes,
  type CatalogueEntry,
} from "@/components/monolith/catalogue/types";

const themes = allCatalogueThemes;

export const sharedCatalogue: CatalogueEntry[] = [
  {
    id: "monolith-theme-picker",
    component: "MonolithThemePicker",
    displayName: "Theme foundation",
    category: "Themes",
    scope: "foundation",
    description: "The persisted production theme control for Light, Night, and Violet.",
    status: "stable",
    source: "src/modules/core/components/monolith-app-shell.tsx",
    render: () => <MonolithThemePicker />,
    themes,
    states: ["light", "night", "violet"],
    interactive: true,
    accessibility: "Pressed state and visible theme names identify the active selection.",
  },
  {
    id: "workspace-section-heading",
    component: "WorkspaceSectionHeading",
    displayName: "Workspace section heading",
    category: "Typography",
    scope: "shared",
    description: "The only major page and section heading composition.",
    status: "stable",
    source: "src/components/layout/workspace.tsx",
    render: () => (
      <WorkspaceSectionHeading
        index="04"
        title="Forms & inputs"
        description="Capture operational data with one production heading, spacing, and responsive contract."
        badge={<WorkspaceBadge variant="accent">Canonical</WorkspaceBadge>}
      />
    ),
    themes,
    states: ["with description", "with badge", "with actions", "responsive"],
    interactive: false,
    accessibility: "Uses a semantic heading level; the index is supporting text.",
  },
  {
    id: "workspace-page-header",
    component: "WorkspacePageHeader",
    displayName: "Workspace page header",
    category: "Typography",
    scope: "shared",
    description: "Primary route identity with optional actions and graphic.",
    status: "stable",
    source: "src/components/layout/workspace.tsx",
    render: () => (
      <WorkspacePageHeader
        eyebrow="Production component"
        title="Shipment operations"
        description="One route header shared by application modules and this catalogue."
        icon={<Ship aria-hidden="true" />}
        actions={<WorkspaceAction size="compact">Create job</WorkspaceAction>}
      />
    ),
    themes,
    states: ["default", "with icon", "with actions"],
    interactive: false,
    accessibility: "Owns the route h1 and preserves action keyboard behavior.",
  },
  {
    id: "actions",
    component: "Button",
    displayName: "Actions",
    category: "Actions & links",
    scope: "shared",
    description: "Canonical button, action, and icon-action hierarchy.",
    status: "stable",
    source: "src/components/ui/button.tsx",
    render: () => (
      <div className="mnx-catalogue-inline">
        <Button>Primary</Button>
        <Button variant="accent">Accent</Button>
        <Button variant="inverse">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="destructive">Destructive</Button>
        <Button disabled>Disabled</Button>
        <MonolithAction variant="outline">Monolith action</MonolithAction>
        <MonolithIconAction aria-label="More actions">
          <MoreHorizontal aria-hidden="true" />
        </MonolithIconAction>
      </div>
    ),
    themes,
    states: ["primary", "accent", "secondary", "outline", "destructive", "disabled"],
    interactive: true,
    accessibility: "Native buttons retain focus, disabled, and accessible-name behavior.",
  },
  {
    id: "workspace-fields",
    component: "WorkspaceField",
    displayName: "Fields and controls",
    category: "Forms & inputs",
    scope: "shared",
    description: "Label, hint, and canonical input control composition.",
    status: "stable",
    source: "src/components/layout/workspace.tsx",
    render: () => (
      <div className="mnx-catalogue-form-grid">
        <WorkspaceField label="Shipment reference" htmlFor="catalogue-reference" required>
          <Input id="catalogue-reference" defaultValue="MAA-IMP-260724" />
        </WorkspaceField>
        <WorkspaceField label="Transport mode" htmlFor="catalogue-mode">
          <DropdownSelect
            id="catalogue-mode"
            defaultValue="sea"
            options={[
              { value: "sea", label: "Sea import" },
              { value: "air", label: "Air export" },
            ]}
          />
        </WorkspaceField>
        <WorkspaceField label="Native status" htmlFor="catalogue-status">
          <NativeSelect id="catalogue-status" defaultValue="active">
            <option value="active">Active</option>
            <option value="complete">Complete</option>
          </NativeSelect>
        </WorkspaceField>
        <WorkspaceField label="Operational note" htmlFor="catalogue-note">
          <Textarea id="catalogue-note" defaultValue="Documents verified." />
        </WorkspaceField>
        <label className="mnx-catalogue-checkbox">
          <NeonCheckbox defaultChecked /> Include completed jobs
        </label>
      </div>
    ),
    themes,
    states: ["required", "selected", "checked", "textarea"],
    interactive: true,
    accessibility: "Every control has a programmatic label and native keyboard support.",
  },
  {
    id: "workspace-panel",
    component: "WorkspacePanel",
    displayName: "Static and interactive panels",
    category: "Cards & panels",
    scope: "shared",
    description: "Surfaces are static by default and move only when explicitly interactive.",
    status: "stable",
    source: "src/components/layout/workspace.tsx",
    render: () => (
      <div className="mnx-catalogue-grid">
        <WorkspacePanel>
          <WorkspacePanelHeader
            eyebrow="Static"
            title="Document review"
            description="Hovering does not move this panel."
          />
          <div className="mnx-catalogue-panel-content">Informational production surface.</div>
        </WorkspacePanel>
        <WorkspacePanel interactive tabIndex={0}>
          <WorkspacePanelHeader
            eyebrow="Interactive"
            title="Open shipment"
            description="Explicit interactivity enables hover and focus affordance."
            actions={<ArrowRight aria-hidden="true" />}
          />
          <div className="mnx-catalogue-panel-content">Keyboard-focusable actionable surface.</div>
        </WorkspacePanel>
      </div>
    ),
    themes,
    states: ["static", "interactive", "keyboard focus"],
    interactive: true,
    accessibility: "Interactive surfaces require a focus target and an action contract.",
  },
  {
    id: "monolith-surface",
    component: "MonolithSurface",
    displayName: "Foundation surface",
    category: "Cards & panels",
    scope: "shared",
    description: "Low-level surface owner used by WorkspacePanel.",
    status: "stable",
    source: "src/components/ui/foundation.tsx",
    render: () => (
      <MonolithSurface as="article" className="mnx-catalogue-panel-content">
        Foundation surface using canonical panel styling.
      </MonolithSurface>
    ),
    themes,
    states: ["static", "interactive opt-in"],
    interactive: false,
    accessibility: "Semantic element is selected by the caller.",
  },
  {
    id: "workspace-metric",
    component: "WorkspaceMetric",
    displayName: "Connected metric",
    category: "Cards & panels",
    scope: "shared",
    description: "Metrics infer interactivity only from a real href.",
    status: "stable",
    source: "src/components/layout/workspace.tsx",
    render: () => (
      <div className="mnx-workspace-metrics mnx-catalogue-metrics">
        <WorkspaceMetric label="Open jobs" value="24" detail="Informational" />
        <WorkspaceMetric
          label="Due today"
          value="06"
          detail="Open queue"
          href="#catalogue-operational-table"
          actionIcon={<ArrowRight />}
          actionLabel="Open due jobs"
        />
      </div>
    ),
    themes,
    states: ["static", "actionable"],
    interactive: true,
    accessibility: "Actionable metrics are links with an accessible name.",
  },
  {
    id: "workspace-badges",
    component: "WorkspaceBadge",
    displayName: "Badges and status",
    category: "Status & feedback",
    scope: "shared",
    description: "Non-clickable status indicators have no hover behavior.",
    status: "stable",
    source: "src/components/layout/workspace.tsx",
    render: () => (
      <div className="mnx-catalogue-inline">
        <WorkspaceBadge variant="accent">In review</WorkspaceBadge>
        <WorkspaceBadge variant="success">Approved</WorkspaceBadge>
        <WorkspaceBadge variant="warning">Attention</WorkspaceBadge>
        <WorkspaceBadge variant="danger">Blocked</WorkspaceBadge>
        <MonolithBadge tone="neutral">Neutral</MonolithBadge>
      </div>
    ),
    themes,
    states: ["accent", "success", "warning", "danger", "neutral"],
    interactive: false,
    accessibility: "Status meaning is present in text and not color alone.",
  },
  {
    id: "workspace-feedback",
    component: "WorkspaceAlert",
    displayName: "Status and feedback",
    category: "Status & feedback",
    scope: "shared",
    description: "Canonical alerts, progress, empty state, and route state.",
    status: "stable",
    source: "src/components/layout/workspace.tsx",
    render: () => (
      <div className="mnx-catalogue-stack">
        <WorkspaceAlert variant="info"><Info aria-hidden="true" /> Filing data is synchronized.</WorkspaceAlert>
        <WorkspaceAlert variant="success"><Check aria-hidden="true" /> Checklist approved.</WorkspaceAlert>
        <WorkspaceProgress label="Component coverage" value={94} />
        <WorkspaceEmptyState
          title="No matching records"
          description="Adjust the filters and try again."
        />
        <WorkspaceState
          variant="empty"
          eyebrow="Route state"
          title="Nothing requires attention"
          description="The same state component is used in production routes."
          icon={<PackageSearch aria-hidden="true" />}
        />
      </div>
    ),
    themes,
    states: ["info", "success", "progress", "empty"],
    interactive: false,
    accessibility: "Alerts and route states preserve semantic text and icons.",
  },
  {
    id: "operational-data-table",
    component: "OperationalDataTable",
    displayName: "Operational data table",
    category: "Tables & filters",
    scope: "shared",
    description: "The exact table-card family used by CHA production routes.",
    status: "stable",
    source: "src/components/data-display/operational-data-table.tsx",
    render: () => (
      <OperationalDataTable id="catalogue-operational-table">
        <OperationalDataTableHeader
          eyebrow="Shipment register"
          title="Active clearance jobs"
          actions={<Button size="sm"><Search aria-hidden="true" /> Search</Button>}
        />
        <OperationalDataTableWrap>
          <OperationalTable>
            <thead>
              <tr>
                <OperationalTableHead>Job number</OperationalTableHead>
                <OperationalTableHead>Customer</OperationalTableHead>
                <OperationalTableHead>Mode</OperationalTableHead>
                <OperationalTableHead>Stage</OperationalTableHead>
                <OperationalTableHead>Status</OperationalTableHead>
                <OperationalTableHead />
              </tr>
            </thead>
            <tbody>
              <tr>
                <OperationalPrimaryCell primary="MAA-IMP-260724" secondary="24 Jul 2026" />
                <OperationalTableCell>Orion Retail Pvt Ltd</OperationalTableCell>
                <OperationalTableCell><OperationalMode icon={<Ship />}>Sea import</OperationalMode></OperationalTableCell>
                <OperationalTableCell>Assessment</OperationalTableCell>
                <OperationalTableCell><OperationalStatus tone="success">On track</OperationalStatus></OperationalTableCell>
                <OperationalTableCell><OperationalRowAction aria-label="Open job"><ArrowRight /></OperationalRowAction></OperationalTableCell>
              </tr>
            </tbody>
          </OperationalTable>
        </OperationalDataTableWrap>
        <OperationalDataTableFooter summary="Showing 1 of 1 job" />
      </OperationalDataTable>
    ),
    themes,
    states: ["loaded", "status", "row action", "footer"],
    interactive: true,
    accessibility: "Uses semantic table elements and named row actions.",
  },
];
