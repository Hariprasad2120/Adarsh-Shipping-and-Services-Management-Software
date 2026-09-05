"use client";

import type { CarbonIconType } from "@carbon/icons-react";
import {
  ArrowRight,
  Bell,
  Calendar,
  CheckCircle2,
  Check,
  CircleDot,
  CreditCard,
  Heart,
  Info,
  IndianRupee,
  ListFilter,
  MapPinned,
  MoreHorizontal,
  MessageSquareText,
  PackageSearch,
  Plus,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  Ship,
} from "lucide-react";
import {
  Button,
  ButtonLink,
  DashboardInsightCard,
  DashboardInsightGrid,
  DashboardMiniBarChart,
  DashboardSegmentList,
  DocumentDropzoneField,
  DropdownSelect,
  Input,
  MonolithAction,
  MonolithBadge,
  MonolithIcon,
  MonolithIconAction,
  MonolithSearchCommand,
  MonolithSurface,
  MonolithThemePicker,
  NativeSelect,
  NeonCheckbox,
  OperationalDataTable,
  OperationalDataTableFooter,
  OperationalDataTableHeader,
  OperationalDataTableWrap,
  OperationalFilterButton,
  OperationalMode,
  OperationalPrimaryCell,
  OperationalRowAction,
  OperationalStatus,
  OperationalTable,
  OperationalTableCell,
  OperationalTableHead,
  OperationalVisibleRecords,
  Textarea,
  TrialCheckoutFieldRow,
  TrialCheckoutHeader,
  TrialCheckoutLayout,
  TrialCheckoutMain,
  TrialCheckoutPaymentOption,
  TrialCheckoutPriceList,
  TrialCheckoutSection,
  TrialCheckoutSidebar,
  TrialCheckoutSummaryCard,
  TrialCheckoutTimeline,
  DevelopmentBuildWatermark,
  WorkspaceAction,
  WorkspaceAlert,
  WorkspaceBadge,
  WorkspaceEmptyState,
  WorkspaceField,
  WorkspaceMetricIcon,
  WorkspaceMetric,
  WorkspacePageHeaderIcon,
  WorkspacePageHeader,
  WorkspacePanel,
  WorkspacePanelHeader,
  WorkspaceProgress,
  WorkspaceSectionHeading,
  WorkspaceStateIcon,
  WorkspaceState,
  ActionNeeded,
} from "@/components/monolith";
import {
  allCatalogueThemes,
  type CatalogueEntry,
} from "@/components/monolith/catalogue/types";

const themes = allCatalogueThemes;
const SearchCommandSettingsIcon = Settings as unknown as CarbonIconType;
const SearchCommandCalendarIcon = Calendar as unknown as CarbonIconType;
const SearchCommandShipIcon = Ship as unknown as CarbonIconType;

export const sharedCatalogue: CatalogueEntry[] = [
  {
    id: "trial-checkout-pattern",
    component: "TrialCheckoutLayout",
    displayName: "Trial checkout pattern",
    category: "Forms & commerce",
    scope: "shared",
    description: "Reusable checkout composition for subscription trials, payment setup, and right-rail price confirmation.",
    status: "stable",
    source: "src/components/layout/trial-checkout.tsx",
    render: () => (
      <TrialCheckoutLayout>
        <TrialCheckoutMain>
          <TrialCheckoutHeader
            eyebrow="Commerce pattern"
            title="Try Premium plan free for 30 days"
            description="Use one canonical trial checkout composition with shared fields, payment options, and a right-rail confirmation summary."
          />

          <TrialCheckoutSection index="1." title="Billing address">
            <WorkspaceField htmlFor="catalogue-checkout-name" label="Full name">
              <Input id="catalogue-checkout-name" defaultValue="Purushothaman V" />
            </WorkspaceField>

            <WorkspaceField htmlFor="catalogue-checkout-country" label="Country">
              <NativeSelect id="catalogue-checkout-country" defaultValue="india">
                <option value="india">India</option>
                <option value="uae">United Arab Emirates</option>
                <option value="singapore">Singapore</option>
              </NativeSelect>
            </WorkspaceField>

            <WorkspaceField htmlFor="catalogue-checkout-address1" label="Address line 1">
              <Input id="catalogue-checkout-address1" defaultValue="No 12/9" />
            </WorkspaceField>

            <WorkspaceField htmlFor="catalogue-checkout-address2" label="Address line 2">
              <Input id="catalogue-checkout-address2" defaultValue="" />
            </WorkspaceField>

            <TrialCheckoutFieldRow>
              <WorkspaceField htmlFor="catalogue-checkout-city" label="City">
                <Input id="catalogue-checkout-city" defaultValue="Chennai" />
              </WorkspaceField>
              <WorkspaceField htmlFor="catalogue-checkout-state" label="State / region">
                <NativeSelect id="catalogue-checkout-state" defaultValue="tamil-nadu">
                  <option value="tamil-nadu">Tamil Nadu</option>
                  <option value="maharashtra">Maharashtra</option>
                  <option value="karnataka">Karnataka</option>
                </NativeSelect>
              </WorkspaceField>
              <WorkspaceField htmlFor="catalogue-checkout-postal" label="ZIP / postal code">
                <Input id="catalogue-checkout-postal" defaultValue="600129" />
              </WorkspaceField>
            </TrialCheckoutFieldRow>
          </TrialCheckoutSection>

          <TrialCheckoutSection index="2." title="Payment method">
            <TrialCheckoutPaymentOption
              checked
              title="UPI"
              control={<Input aria-label="UPI selected" checked readOnly type="radio" />}
              logos={(
                <div className="mnx-trial-checkout-logo-strip">
                  <span>GPay</span>
                </div>
              )}
            >
              <TrialCheckoutFieldRow>
                <WorkspaceField htmlFor="catalogue-checkout-dob" label="Date of birth">
                  <Input id="catalogue-checkout-dob" defaultValue="2008-08-21" type="date" />
                </WorkspaceField>
                <WorkspaceField htmlFor="catalogue-checkout-pan" label="PAN">
                  <Input id="catalogue-checkout-pan" defaultValue="" placeholder="ABCDE1234F" />
                </WorkspaceField>
                <WorkspaceField htmlFor="catalogue-checkout-phone" label="Phone number">
                  <Input id="catalogue-checkout-phone" defaultValue="" placeholder="Add" />
                </WorkspaceField>
              </TrialCheckoutFieldRow>
            </TrialCheckoutPaymentOption>

            <TrialCheckoutPaymentOption
              title="Credit or debit card [India]"
              control={<Input aria-label="Card option" type="radio" />}
              logos={(
                <div className="mnx-trial-checkout-logo-strip">
                  <span>MC</span>
                  <span>VISA</span>
                  <span>UPI</span>
                </div>
              )}
            />

            <TrialCheckoutPaymentOption
              title="PayPal"
              control={<Input aria-label="PayPal option" type="radio" />}
              logos={(
                <div className="mnx-trial-checkout-logo-strip">
                  <span>PayPal</span>
                </div>
              )}
            />
          </TrialCheckoutSection>
        </TrialCheckoutMain>

        <TrialCheckoutSidebar>
          <TrialCheckoutSummaryCard>
            <TrialCheckoutTimeline
              items={[
                {
                  id: "today",
                  title: "Today",
                  description: "Free trial starts - explore all features of the Premium plan.",
                  icon: <CheckCircle2 size={16} />,
                  markerTone: "strong",
                },
                {
                  id: "day-15",
                  title: "Day 15",
                  description: "We'll send you an email reminder.",
                  icon: <Bell size={16} />,
                  markerTone: "muted",
                },
                {
                  id: "day-30",
                  title: "Day 30",
                  description: "Your subscription will begin on September 21, 2026 if not canceled.",
                  icon: <CreditCard size={16} />,
                  markerTone: "muted",
                },
                {
                  id: "refund",
                  title: "Refund policy",
                  description: "You can request a full refund within 14 days after you've been charged.",
                  icon: <RotateCcw size={16} />,
                  markerTone: "muted",
                },
              ]}
            />

            <TrialCheckoutPriceList
              rows={[
                {
                  label: "Due today",
                  value: (
                    <span className="mnx-trial-checkout-currency">
                      <IndianRupee size={15} />
                      0.00
                    </span>
                  ),
                  tone: "accent",
                },
                {
                  label: "Due Sep 21, 2026",
                  value: (
                    <span className="mnx-trial-checkout-price-stack">
                      <span>₹59,401.20 / year</span>
                      <small>Including tax ₹9,061.20</small>
                    </span>
                  ),
                },
              ]}
            />

            <label className="mnx-trial-checkout-agreement">
              <Input defaultChecked type="checkbox" />
              <span>
                I&apos;m signing up for 30-day free trial. I agree that if I do not cancel during the trial period, I&apos;ll be charged ₹59,401.20 / year (tax included) and each year after. I can cancel anytime before renewal in my account settings.
              </span>
            </label>

            <Button className="mnx-trial-checkout-submit">
              Start 30-day free trial
            </Button>

            <p className="mnx-trial-checkout-legal">
              By completing your purchase, you agree to our Terms of Use and Privacy Policy.
            </p>
          </TrialCheckoutSummaryCard>
        </TrialCheckoutSidebar>
      </TrialCheckoutLayout>
    ),
    themes,
    states: ["billing form", "payment options", "trial timeline", "price confirmation"],
    interactive: true,
    accessibility: "The layout preserves native field controls, grouped payment options, and visible price/timeline text that does not rely on icon-only meaning.",
  },
  {
    id: "action-needed",
    component: "ActionNeeded",
    displayName: "Action needed",
    category: "Dashboard",
    scope: "shared",
    description: "Unified dashboard queue for the highest-value approvals, overdue work, blocked workflows, and unresolved alerts across modules.",
    status: "stable",
    source: "src/components/data-display/action-needed.tsx",
    render: () => (
      <ActionNeeded
        items={[
          {
            id: "catalogue-cha-checklist",
            title: "Checklist Approval Required",
            description: "A CHA checklist is waiting for approval before the job can proceed.",
            module: "CHA",
            priority: "critical",
            actionLabel: "Review Checklist",
            actionUrl: "#catalogue-operational-table",
            dueDate: "2026-09-01",
            status: "Pending approval",
          },
          {
            id: "catalogue-crm-follow-up",
            title: "CRM Follow-up Due",
            description: "A lead assigned to you has reached its follow-up date and requires action.",
            module: "CRM",
            priority: "high",
            actionLabel: "Follow Up",
            actionUrl: "#catalogue-operational-table",
            dueDate: "2026-09-02",
            status: "Due soon",
          },
          {
            id: "catalogue-payroll-issue",
            title: "Payroll Setup Missing",
            description: "An employee record is missing payroll data required before the next pay run.",
            module: "Payroll",
            priority: "normal",
            actionLabel: "Fix Payroll Issue",
            actionUrl: "#catalogue-operational-table",
            status: "Needs review",
          },
        ]}
        totalCount={9}
        viewAllUrl="#catalogue-operational-table"
      />
    ),
    themes,
    states: ["critical", "high", "normal", "view all", "empty state"],
    interactive: true,
    accessibility: "Items use readable text for module, priority, status, and due dates; each action is a named link with keyboard focus support.",
  },
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
    id: "monolith-search-command",
    component: "MonolithSearchCommand",
    displayName: "Global search command",
    category: "Navigation",
    scope: "shared",
    description: "Role-aware workspace and page search used by the shared Monolith navbar.",
    status: "stable",
    source: "src/components/navigation/monolith-search-command.tsx",
    render: () => (
      <MonolithSearchCommand
        embedded
        open
        query="pay"
        entries={[
          {
            id: "page:hrms:/hrms/payroll",
            href: "/hrms/payroll",
            label: "Payroll Batches",
            description: "HRMS workspace • salary operations",
            icon: SearchCommandSettingsIcon,
            kind: "page",
            sectionId: "hrms",
            sectionLabel: "HRMS",
            searchText: "payroll hrms salary batches",
          },
          {
            id: "page:attendance:/attendance/leaves",
            href: "/attendance/leaves",
            label: "Leaves",
            description: "Attendance workspace • leave requests",
            icon: SearchCommandCalendarIcon,
            kind: "page",
            sectionId: "attendance",
            sectionLabel: "Attendance",
            searchText: "attendance leaves leave requests",
          },
          {
            id: "workspace:accounting",
            href: "/accounting",
            label: "Accounting",
            description: "Run accounting operations, ledgers, journals, banking, approvals, and reports.",
            icon: SearchCommandShipIcon,
            kind: "workspace",
            sectionId: "accounting",
            sectionLabel: "Accounting",
            searchText: "accounting finance ledgers journals banking approvals reports",
          },
        ]}
        onClose={() => undefined}
        onOpenChange={() => undefined}
        onQueryChange={() => undefined}
      />
    ),
    themes,
    states: ["query", "grouped results", "role-aware"],
    interactive: true,
    accessibility: "Keyboard users can type, arrow through results, press Enter, and dismiss the surface with Escape.",
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
        icon={<WorkspacePageHeaderIcon icon={Ship} tone="primary" />}
        actions={<WorkspaceAction size="compact">Create job</WorkspaceAction>}
      />
    ),
    themes,
    states: ["default", "with icon", "with actions"],
    interactive: false,
    accessibility: "Owns the route h1 and preserves action keyboard behavior.",
  },
  {
    id: "monolith-iconography",
    component: "MonolithIcon",
    displayName: "Iconography",
    category: "Themes",
    scope: "foundation",
    description: "Approved Monolith icon language with token-driven color, rounded outlined glyphs, and theme-reactive containers inspired by the provided reference.",
    status: "stable",
    source: "src/components/ui/monolith-icon.tsx",
    render: () => (
      <div className="mnx-catalogue-stack">
        <div className="mnx-catalogue-inline">
          <MonolithIcon icon={Search} tone="default" />
          <MonolithIcon icon={Heart} tone="violet" />
          <MonolithIcon icon={MapPinned} tone="info" />
          <MonolithIcon icon={MessageSquareText} tone="teal" />
          <MonolithIcon icon={ShieldCheck} tone="success" />
        </div>
        <div className="mnx-catalogue-inline">
          <MonolithIcon icon={Search} tone="default" surface="bare" size="sm" />
          <MonolithIcon icon={Heart} tone="warning" surface="soft" size="md" />
          <MonolithIcon icon={Ship} tone="primary" surface="solid" size="lg" />
        </div>
        <WorkspaceState
          variant="permission"
          eyebrow="Canonical guidance"
          title="Use one icon system everywhere"
          description="Past, present, and future Monolith UI should use token-driven icons instead of route-local sizing, color, or mixed libraries."
          icon={<WorkspaceStateIcon icon={ShieldCheck} tone="warning" decorative={false} label="Warning icon" />}
        />
      </div>
    ),
    themes,
    states: ["bare glyph", "soft container", "solid emphasis", "theme-reactive tone"],
    interactive: false,
    accessibility: "Icons inherit currentColor, can be decorative by default, and expose an explicit accessible label when the icon carries standalone meaning.",
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
    id: "button-link",
    component: "ButtonLink",
    displayName: "Button link",
    category: "Actions & links",
    scope: "shared",
    description: "Canonical link action that matches the shared button system without route-local link styling.",
    status: "stable",
    source: "src/components/ui/button.tsx",
    render: () => (
      <div className="mnx-catalogue-inline">
        <ButtonLink href="#catalogue-operational-table">Primary link</ButtonLink>
        <ButtonLink href="#catalogue-operational-table" variant="accent">Accent link</ButtonLink>
        <ButtonLink href="#catalogue-operational-table" variant="inverse">Secondary link</ButtonLink>
        <ButtonLink href="#catalogue-operational-table" variant="outline">Outline link</ButtonLink>
      </div>
    ),
    themes,
    states: ["primary", "accent", "secondary", "outline"],
    interactive: true,
    accessibility: "Rendered as links with keyboard navigation and shared button semantics.",
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
              { value: "road", label: "Road cross-border" },
              { value: "sea", label: "Sea import" },
              { value: "sea-export", label: "Sea export" },
              { value: "air", label: "Air export" },
              { value: "rail", label: "Rail bonded transfer" },
            ]}
            searchPlaceholder="Type to narrow transport modes..."
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
    states: ["required", "searchable", "selected", "checked", "textarea"],
    interactive: true,
    accessibility: "Every control has a programmatic label; dropdowns support typing to filter, arrow-key navigation, and scroll selection.",
  },
  {
    id: "document-dropzone-field",
    component: "DocumentDropzoneField",
    displayName: "Document dropzone",
    category: "Forms & inputs",
    scope: "shared",
    description: "Large-format operational document upload surface with drag-and-drop and browse support.",
    status: "stable",
    source: "src/components/forms/file-upload/document-dropzone-field.tsx",
    render: () => (
      <DocumentDropzoneField
        id="catalogue-document-dropzone"
        selectedFile={{
          name: "shipment-instructions.pdf",
          sizeBytes: 1_840_000,
          statusLabel: "Selected",
        }}
        onInputChange={() => undefined}
        onClear={() => undefined}
      />
    ),
    themes,
    states: ["default", "drag target", "selected file"],
    interactive: true,
    accessibility: "The full drop surface is label-backed so keyboard and pointer users can open the native file picker.",
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
        <WorkspaceMetric
          icon={<WorkspaceMetricIcon icon={MapPinned} tone="info" />}
          label="Open jobs"
          value="24"
          detail="Informational"
        />
        <WorkspaceMetric
          icon={<WorkspaceMetricIcon icon={ArrowRight} tone="primary" />}
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
    id: "dashboard-insights",
    component: "DashboardInsightCard",
    displayName: "Dashboard insights",
    category: "Cards & panels",
    scope: "shared",
    description: "Compact visual insight cards used to turn module home routes into real dashboards.",
    status: "stable",
    source: "src/components/data-display/dashboard-insights.tsx",
    render: () => (
      <DashboardInsightGrid>
        <DashboardInsightCard
          eyebrow="Operational split"
          title="Attention queues"
          detail="Charts stay lightweight and theme-safe while keeping dashboard pages purposeful."
          chart={(
            <DashboardMiniBarChart
              items={[
                { label: "Pending", value: 12, tone: "warning" },
                { label: "In review", value: 7, tone: "accent" },
                { label: "Completed", value: 19, tone: "success" },
              ]}
            />
          )}
        />
        <DashboardInsightCard
          eyebrow="Mix"
          title="Workload distribution"
          chart={(
            <DashboardSegmentList
              items={[
                { label: "Cases", value: 5, tone: "info" },
                { label: "Tasks", value: 9, tone: "accent" },
                { label: "Approvals", value: 4, tone: "warning" },
              ]}
            />
          )}
          footer={<span className="inline-flex items-center gap-2"><CircleDot size={14} />Shared dashboard visual layer</span>}
        />
      </DashboardInsightGrid>
    ),
    themes,
    states: ["bar chart", "segment summary", "footer note"],
    interactive: false,
    accessibility: "All chart values are duplicated as visible text, so no insight depends on color alone.",
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
    id: "development-build-watermark",
    component: "DevelopmentBuildWatermark",
    displayName: "Development build watermark",
    category: "Status & feedback",
    scope: "shared",
    description: "Floating development-build label for the shared Mona launcher, with multiple approved visual directions rendered from one production component.",
    status: "beta",
    source: "src/components/feedback/development-build-watermark.tsx",
    render: () => (
      <div className="mnx-build-watermark-showcase">
        <div className="mnx-build-watermark-showcase-card">
          <strong>Option A · Glass chip</strong>
          <DevelopmentBuildWatermark variant="glass-chip" />
        </div>
        <div className="mnx-build-watermark-showcase-card">
          <strong>Option B · Signal bar</strong>
          <DevelopmentBuildWatermark variant="signal-bar" />
        </div>
        <div className="mnx-build-watermark-showcase-card">
          <strong>Option C · Stacked card</strong>
          <DevelopmentBuildWatermark variant="stacked-card" />
        </div>
      </div>
    ),
    themes,
    states: ["glass chip", "signal bar", "stacked card"],
    interactive: false,
    accessibility: "The warning title, version label, and build label are plain text, so the build state is readable in every supported theme without relying on color alone.",
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
          icon={<WorkspaceStateIcon icon={PackageSearch} tone="info" decorative={false} label="Package search icon" />}
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
          actions={
            <>
              <label className="mnx-search-field">
                <Search aria-hidden="true" />
                <Input aria-label="Search jobs" placeholder="Search customers, job numbers..." />
              </label>
              <OperationalFilterButton activeCount={0}>
                <ListFilter aria-hidden="true" />
                Filter
              </OperationalFilterButton>
              <Button size="sm">
                <Plus aria-hidden="true" />
                New Job
              </Button>
              <OperationalVisibleRecords visible={3} total={3} />
            </>
          }
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
