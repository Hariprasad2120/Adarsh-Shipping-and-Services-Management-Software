"use client";

import {
  AlertCircle,
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Boxes,
  Check,
  CheckCircle2,
  Database,
  FileText,
  Gauge,
  LayoutGrid,
  MessageSquareText,
  MoreHorizontal,
  PackageCheck,
  Plus,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import * as AccountingComponents from "@/components/monolith/accounting-workspace";
import * as AdminComponents from "@/components/monolith/admin-workspace";
import * as AlertComponents from "@/components/monolith/alert";
import * as AppShellComponents from "@/components/monolith/app-shell";
import * as BadgeComponents from "@/components/monolith/badge";
import * as ButtonComponents from "@/components/monolith/button";
import * as CardComponents from "@/components/monolith/card";
import * as ChaComponents from "@/components/monolith/cha-workspace";
import * as CommunicationComponents from "@/components/monolith/communication-workspace";
import * as CrmComponents from "@/components/monolith/crm-workspace";
import * as DateInputComponents from "@/components/monolith/date-input";
import * as DropdownMenuComponents from "@/components/monolith/dropdown-menu";
import * as DropdownSelectComponents from "@/components/monolith/dropdown-select";
import * as FileUploadComponents from "@/components/monolith/file-upload-field";
import * as FilterMenuComponents from "@/components/monolith/filter-menu";
import * as FoundationComponents from "@/components/monolith/foundation";
import * as InputComponents from "@/components/monolith/input";
import * as LabelComponents from "@/components/monolith/label";
import * as ModalComponents from "@/components/monolith/modal";
import * as NativeSelectComponents from "@/components/monolith/native-select";
import * as NeonCheckboxComponents from "@/components/monolith/neon-checkbox";
import * as PeopleDataComponents from "@/components/monolith/people-data-table";
import * as PeopleComponents from "@/components/monolith/people-workspace";
import * as PerformanceComponents from "@/components/monolith/performance-workspace";
import * as PublicComponents from "@/components/monolith/public-workspace";
import * as StateComponents from "@/components/monolith/workspace-states";
import * as TextareaComponents from "@/components/monolith/textarea";
import * as WarningPopoverComponents from "@/components/monolith/warning-indicator-popover";
import * as WorkspaceComponents from "@/components/monolith/workspace";
import * as WorkspaceDialogComponents from "@/components/monolith/workspace-dialog";
import {
  AccountingDetail,
  AccountingDetailList,
  AccountingMetric,
  AccountingMetrics,
  AccountingStatus,
  AdminBadge,
  AdminButton,
  AdminMetric,
  AdminPanel,
  Alert,
  AlertContent,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ChaDropdownSelect,
  ChaMetric,
  ChaMetrics,
  ChaStatus,
  ChaWarningIndicatorPopover,
  CommunicationBadge,
  CommunicationButton,
  CommunicationMetric,
  CommunicationPanel,
  CrmButton,
  CrmMetric,
  CrmMetrics,
  CrmPanel,
  CrmStatus,
  DateInput,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
  DropdownSelect,
  FileUploadField,
  FilterMenu,
  Input,
  Label,
  MonolithBadge,
  MonolithEmptyState,
  MonolithIconAction,
  MonolithSpecLabel,
  MonolithThemePicker,
  NativeSelect,
  NeonCheckbox,
  PeopleAction,
  PeoplePerson,
  PeopleStatus,
  PeopleSummary,
  PeopleSummaryGrid,
  PerformanceCard,
  PerformanceControlButton,
  PerformanceStatus,
  PerformanceSummary,
  PerformanceSummaryGrid,
  PublicDetail,
  PublicDetailGrid,
  PublicHeader,
  PublicInset,
  PublicPanel,
  PublicStatus,
  PublicStatusBadge,
  Textarea,
  WorkspaceAction,
  WorkspaceAlert,
  WorkspaceBadge,
  WorkspaceCheckbox,
  WorkspaceDialog,
  WorkspaceEmptyState,
  WorkspaceErrorState,
  WorkspaceField,
  WorkspaceInput,
  WorkspaceLoadingState,
  WorkspaceMetric,
  WorkspacePage,
  WorkspacePageHeader,
  WorkspacePanel,
  WorkspacePanelHeader,
  WorkspacePermissionState,
  WorkspaceProgress,
  WorkspaceSectionHeading,
  WorkspaceTable,
  WorkspaceTextarea,
} from "@/components/monolith";
import {
  AccountingDeleteAction,
  AccountingItemDetail,
  AccountingItemsList,
  AccountingNewItemForm,
} from "@/components/monolith";
import { AccountingCommercialDocumentForm } from "@/modules/accounting/components/accounting-commercial-document-form";
import { AccountingInvoiceDetail } from "@/modules/accounting/components/accounting-invoice-detail";
import { AccountingInvoiceForm } from "@/modules/accounting/components/accounting-invoice-form";

type RuntimeModule = Record<string, unknown>;

type CatalogueGroup = {
  description: string;
  exports: RuntimeModule;
  name: string;
};

const SharedControlComponents = {
  ...AlertComponents,
  ...BadgeComponents,
  ...ButtonComponents,
  ...CardComponents,
  ...DateInputComponents,
  ...DropdownMenuComponents,
  ...DropdownSelectComponents,
  ...FileUploadComponents,
  ...FilterMenuComponents,
  ...InputComponents,
  ...LabelComponents,
  ...ModalComponents,
  ...NativeSelectComponents,
  ...NeonCheckboxComponents,
  ...TextareaComponents,
  ...WarningPopoverComponents,
  ...WorkspaceDialogComponents,
};

const catalogueGroups: CatalogueGroup[] = [
  {
    name: "Application shell and themes",
    description: "Authenticated shell, navigation, profile, search, and persisted theme control.",
    exports: AppShellComponents,
  },
  {
    name: "Foundation",
    description: "Page, surface, action, badge, icon action, labels, and empty presentation.",
    exports: FoundationComponents,
  },
  {
    name: "Workspace",
    description: "Production page frame, headers, metrics, panels, fields, tables, feedback, and states.",
    exports: WorkspaceComponents,
  },
  {
    name: "Controls and overlays",
    description: "Buttons, cards, inputs, selects, uploads, alerts, menus, filters, warnings, modals, and dialogs.",
    exports: SharedControlComponents,
  },
  {
    name: "Shared asynchronous states",
    description: "Permission, empty, loading, and error boundaries used across route families.",
    exports: StateComponents,
  },
  {
    name: "People operations",
    description: "HRMS and Attendance layout, summaries, links, controls, tables, and states.",
    exports: { ...PeopleComponents, ...PeopleDataComponents },
  },
  {
    name: "Performance and learning",
    description: "AMS and LMS layout, summaries, cards, tabs, controls, tables, and states.",
    exports: PerformanceComponents,
  },
  {
    name: "Customs operations",
    description: "CHA layout, route headers, data surfaces, dialogs, selectors, filters, and warnings.",
    exports: ChaComponents,
  },
  {
    name: "Accounting",
    description: "Accounting layout, operational surfaces, details, status, states, and specialized editors.",
    exports: {
      ...AccountingComponents,
      AccountingCommercialDocumentForm,
      AccountingDeleteAction,
      AccountingInvoiceDetail,
      AccountingInvoiceForm,
      AccountingItemDetail,
      AccountingItemsList,
      AccountingNewItemForm,
    },
  },
  {
    name: "Customer operations",
    description: "CRM layout, metrics, tabs, records, dialogs, controls, tables, and route states.",
    exports: CrmComponents,
  },
  {
    name: "Communication",
    description: "Communication layout, panels, controls, tables, metrics, and route states.",
    exports: CommunicationComponents,
  },
  {
    name: "Administration",
    description: "Admin layout, panels, controls, tables, metrics, and route states.",
    exports: AdminComponents,
  },
  {
    name: "Public and authentication",
    description: "Public shell, brand, stage, panel, status, details, actions, and footer.",
    exports: PublicComponents,
  },
];

const stateDemos: {
  family: string;
  name: string;
  render: () => ReactNode;
}[] = [
  {
    family: "Shared",
    name: "Permission",
    render: () => (
      <WorkspacePermissionState
        title="Access restricted"
        description="This is the shared permission boundary used by protected routes."
      />
    ),
  },
  {
    family: "Shared",
    name: "Empty",
    render: () => (
      <WorkspaceEmptyState
        title="No records yet"
        description="The workspace is ready for its first production record."
      />
    ),
  },
  {
    family: "Shared",
    name: "Loading",
    render: () => (
      <WorkspaceLoadingState
        title="Loading workspace"
        description="Production data is being prepared."
      />
    ),
  },
  {
    family: "Shared",
    name: "Error",
    render: () => (
      <WorkspaceErrorState
        title="Workspace unavailable"
        description="The shared error boundary keeps recovery explicit."
      />
    ),
  },
  {
    family: "People",
    name: "Loading",
    render: () => <PeopleComponents.PeopleLoadingState />,
  },
  {
    family: "People",
    name: "Error",
    render: () => (
      <PeopleComponents.PeopleErrorState description="People data could not be loaded." />
    ),
  },
  {
    family: "Performance",
    name: "Loading",
    render: () => <PerformanceComponents.PerformanceLoadingState />,
  },
  {
    family: "Performance",
    name: "Error",
    render: () => (
      <PerformanceComponents.PerformanceErrorState description="Performance data could not be loaded." />
    ),
  },
  {
    family: "CHA",
    name: "Loading",
    render: () => <ChaComponents.ChaLoadingState />,
  },
  {
    family: "CHA",
    name: "Error",
    render: () => (
      <ChaComponents.ChaErrorState description="Customs data could not be loaded." />
    ),
  },
  {
    family: "Accounting",
    name: "Loading",
    render: () => <AccountingComponents.AccountingLoadingState />,
  },
  {
    family: "Accounting",
    name: "Error",
    render: () => (
      <AccountingComponents.AccountingErrorState
        description="Accounting data could not be loaded."
        onRetry={() => undefined}
      />
    ),
  },
  {
    family: "CRM",
    name: "Permission",
    render: () => <CrmComponents.CrmPermissionState />,
  },
  {
    family: "CRM",
    name: "Configuration",
    render: () => <CrmComponents.CrmConfigurationState />,
  },
  {
    family: "CRM",
    name: "Loading",
    render: () => <CrmComponents.CrmLoadingState />,
  },
  {
    family: "CRM",
    name: "Empty",
    render: () => <CrmComponents.CrmEmptyState description="No CRM records match the active view." />,
  },
  {
    family: "CRM",
    name: "Error",
    render: () => <CrmComponents.CrmErrorState description="CRM data could not be loaded." />,
  },
  {
    family: "Communication",
    name: "Loading",
    render: () => <CommunicationComponents.CommunicationLoadingState />,
  },
  {
    family: "Communication",
    name: "Permission",
    render: () => (
      <CommunicationComponents.CommunicationPermissionState description="Communication access is required." />
    ),
  },
  {
    family: "Communication",
    name: "Error",
    render: () => (
      <CommunicationComponents.CommunicationErrorState description="Communication data could not be loaded." />
    ),
  },
  {
    family: "Admin",
    name: "Loading",
    render: () => <AdminComponents.AdminLoadingState />,
  },
  {
    family: "Admin",
    name: "Permission",
    render: () => (
      <AdminComponents.AdminPermissionState description="Administrator access is required." />
    ),
  },
  {
    family: "Admin",
    name: "Error",
    render: () => (
      <AdminComponents.AdminErrorState description="Administration data could not be loaded." />
    ),
  },
];

const sampleRows = [
  ["MAA-IMP-260724", "Orion Retail", "Assessment", "On track"],
  ["DEL-AIR-260718", "Vertex Technologies", "Documentation", "Attention"],
  ["MUM-IMP-260701", "Atlas Foods", "Delivery", "Verified"],
];

function exportedComponents(module: RuntimeModule) {
  return Object.entries(module)
    .filter(([name, value]) => /^[A-Z]/.test(name) && typeof value === "function")
    .map(([name]) => name)
    .sort((left, right) => left.localeCompare(right));
}

function ComponentIndex({ group }: { group: CatalogueGroup }) {
  const componentNames = useMemo(() => exportedComponents(group.exports), [group]);

  return (
    <article className="mnx-catalogue-index-group">
      <div>
        <h3>{group.name}</h3>
        <p>{group.description}</p>
      </div>
      <div className="mnx-catalogue-component-list">
        {componentNames.map((name) => (
          <WorkspaceBadge key={name} variant="neutral">
            {name}
          </WorkspaceBadge>
        ))}
      </div>
    </article>
  );
}

function CatalogueSection({
  children,
  description,
  id,
  index,
  title,
}: {
  children: ReactNode;
  description: string;
  id: string;
  index: string;
  title: string;
}) {
  return (
    <section className="mnx-catalogue-section" id={id}>
      <WorkspaceSectionHeading index={index} title={title} description={description} />
      {children}
    </section>
  );
}

function StateCatalogue() {
  const [activeState, setActiveState] = useState(0);
  const selected = stateDemos[activeState];

  return (
    <WorkspacePanel>
      <WorkspacePanelHeader
        eyebrow="Production route boundaries"
        title={`${selected.family} / ${selected.name}`}
        description="Choose a state to render its actual shared or module-specific implementation."
      />
      <div className="mnx-catalogue-state-picker" role="tablist" aria-label="Production states">
        {stateDemos.map((state, index) => (
          <WorkspaceAction
            key={`${state.family}-${state.name}`}
            size="compact"
            variant={activeState === index ? "primary" : "secondary"}
            onClick={() => setActiveState(index)}
            role="tab"
            aria-selected={activeState === index}
          >
            {state.family} · {state.name}
          </WorkspaceAction>
        ))}
      </div>
      <div className="mnx-catalogue-state-preview">{selected.render()}</div>
    </WorkspacePanel>
  );
}

function FloatingSurfaceCatalogue() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  return (
    <>
      <div className="mnx-catalogue-action-row">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <WorkspaceAction variant="secondary">
              <MoreHorizontal size={15} />
              Open production menu
            </WorkspaceAction>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Record actions</DropdownMenuLabel>
            <DropdownMenuItem>Open record</DropdownMenuItem>
            <DropdownMenuItem>Duplicate</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              Export
              <DropdownMenuShortcut>CSV</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <FilterMenu
          activeCount={2}
          label="Filters"
          open={filterOpen}
          onOpenChange={setFilterOpen}
        >
          <div className="mnx-catalogue-menu-content">
            <WorkspacePanelHeader
              eyebrow="Current view"
              title="Operational filters"
              description="This is the production FilterMenu surface."
            />
          </div>
        </FilterMenu>
        <ChaWarningIndicatorPopover
          ariaLabel="Review deadline warning"
          eyebrow="Deadline warning"
          description="The filing deadline is approaching."
          meta="Used by production CHA warning indicators."
        >
          <ChaStatus variant="warning">2 days remaining</ChaStatus>
          <ChaStatus variant="neutral">Review owner</ChaStatus>
        </ChaWarningIndicatorPopover>
        <WorkspaceAction onClick={() => setDialogOpen(true)}>
          Open production dialog
        </WorkspaceAction>
      </div>
      <WorkspaceDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        eyebrow="Shared workflow"
        title="Production dialog"
        description="Focus trap, Escape handling, scroll lock, responsive sizing, and theme tokens are all live."
        footer={
          <WorkspaceAction onClick={() => setDialogOpen(false)}>
            Confirm
          </WorkspaceAction>
        }
      >
        <WorkspaceField label="Review note">
          <WorkspaceTextarea defaultValue="This dialog is imported from the production workspace layer." />
        </WorkspaceField>
      </WorkspaceDialog>
    </>
  );
}

function FamilySample({
  children,
  exports,
  icon,
  name,
}: {
  children: ReactNode;
  exports: RuntimeModule;
  icon: ReactNode;
  name: string;
}) {
  return (
    <WorkspacePanel className="mnx-catalogue-family">
      <WorkspacePanelHeader
        eyebrow="Production composition"
        title={name}
        actions={icon}
      />
      {children}
      <div className="mnx-catalogue-component-list">
        {exportedComponents(exports).map((component) => (
          <WorkspaceBadge key={component} variant="neutral">
            {component}
          </WorkspaceBadge>
        ))}
      </div>
    </WorkspacePanel>
  );
}

export default function DesignSystemClient() {
  const componentCount = useMemo(
    () =>
      new Set(
        catalogueGroups.flatMap((group) => exportedComponents(group.exports)),
      ).size,
    [],
  );

  return (
    <WorkspacePage className="mnx-catalogue-page" data-production-catalogue="true">
      <WorkspacePageHeader
        eyebrow="ADMIN / PRODUCTION UI"
        title="Monolith component catalogue"
        description="A live inventory of the shared layouts, controls, states, and module compositions currently imported by migrated production routes."
        icon={<LayoutGrid size={24} />}
        actions={
          <>
            <WorkspaceBadge variant="success">Live production imports</WorkspaceBadge>
            <WorkspaceAction size="compact" onClick={() => document.querySelector("#component-index")?.scrollIntoView()}>
              Browse index
              <ArrowUpRight size={14} />
            </WorkspaceAction>
          </>
        }
      />

      <section className="mnx-workspace-metrics">
        <WorkspaceMetric
          icon={<PackageCheck size={16} />}
          label="Runtime exports"
          value={componentCount}
          detail="Unique production component names"
        />
        <WorkspaceMetric
          icon={<Boxes size={16} />}
          label="Composition families"
          value={catalogueGroups.length}
          detail="Global, public, and module-specific"
        />
        <WorkspaceMetric
          icon={<ShieldCheck size={16} />}
          label="Required themes"
          value="03"
          detail="Light, Night, and Violet"
        />
        <WorkspaceMetric
          icon={<Gauge size={16} />}
          label="Catalogue state"
          value="LIVE"
          detail="Backed by production imports"
        />
      </section>

      <CatalogueSection
        id="themes"
        index="01"
        title="Theme test bench"
        description="Switching themes here uses the same component, root classes, persistence, and semantic tokens as the authenticated application shell."
      >
        <WorkspacePanel>
          <WorkspacePanelHeader
            eyebrow="Interactive theme verification"
            title="Light, Night, and Violet"
            description="Select a theme, then inspect every live specimen below without leaving the page."
            actions={
              <MonolithThemePicker
                allowedThemes={["light", "night", "violet"]}
                ariaLabel="Catalogue test theme"
              />
            }
          />
          <div className="mnx-catalogue-token-grid">
            {[
              ["Canvas", "--mn-color-canvas"],
              ["Surface", "--mn-color-surface"],
              ["Text", "--mn-color-text"],
              ["Accent", "--mn-color-accent"],
              ["Success", "--mn-color-success"],
              ["Danger", "--mn-color-danger"],
            ].map(([label, token]) => (
              <div key={token}>
                <span style={{ background: `var(${token})` }} />
                <strong>{label}</strong>
                <code>{token}</code>
              </div>
            ))}
          </div>
        </WorkspacePanel>
      </CatalogueSection>

      <CatalogueSection
        id="global-primitives"
        index="02"
        title="Global production primitives"
        description="Each specimen is the real shared component. The catalogue adds only layout around it."
      >
        <div className="mnx-catalogue-grid">
          <Card>
            <CardHeader>
              <CardTitle>Actions and status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mnx-catalogue-action-board">
                <div>
                  <MonolithSpecLabel as="p">Button hierarchy</MonolithSpecLabel>
                  <div className="mnx-catalogue-button-showcase">
                    <Button>
                      Create shipment
                      <Plus aria-hidden="true" />
                    </Button>
                    <Button variant="accent">
                      Approve checklist
                      <Check aria-hidden="true" />
                    </Button>
                    <Button variant="inverse">Save draft</Button>
                    <Button variant="outline">
                      Export report
                      <ArrowDown aria-hidden="true" />
                    </Button>
                    <Button variant="destructive">Delete job</Button>
                    <Button disabled>Unavailable</Button>
                  </div>
                </div>
                <div>
                  <MonolithSpecLabel as="p">Text & icon actions</MonolithSpecLabel>
                  <div className="mnx-catalogue-link-showcase">
                    <a href="#forms">
                      View shipment
                      <ArrowUpRight aria-hidden="true" />
                    </a>
                    <a href="#forms" className="is-subtle">
                      Edit details
                    </a>
                    <MonolithIconAction aria-label="Create record">
                      <Plus aria-hidden="true" />
                    </MonolithIconAction>
                    <MonolithIconAction className="mnx-icon-button-dark" aria-label="Continue">
                      <ArrowRight aria-hidden="true" />
                    </MonolithIconAction>
                    <MonolithIconAction className="mnx-icon-button-danger" aria-label="Cancel">
                      <X aria-hidden="true" />
                    </MonolithIconAction>
                  </div>
                </div>
              </div>
              <div className="mnx-catalogue-action-row">
                <Badge variant="success">Success</Badge>
                <MonolithBadge tone="accent">Accent</MonolithBadge>
                <WorkspaceBadge variant="warning">Warning</WorkspaceBadge>
                <WorkspaceBadge variant="danger">Danger</WorkspaceBadge>
                <WorkspaceBadge variant="neutral">Neutral</WorkspaceBadge>
              </div>
              <WorkspaceProgress label="Production progress" value={68} />
            </CardContent>
          </Card>

          <WorkspacePanel>
            <WorkspacePanelHeader
              eyebrow="Shared controls"
              title="Fields and inputs"
              description="Workspace, native, and accessible custom controls."
            />
            <div className="mnx-catalogue-form-grid">
              <WorkspaceField label="Record name" required>
                <WorkspaceInput defaultValue="Production record" />
              </WorkspaceField>
              <WorkspaceField label="Owner">
                <DropdownSelect
                  defaultValue="ops"
                  options={[
                    { value: "ops", label: "Operations" },
                    { value: "finance", label: "Finance" },
                    { value: "people", label: "People" },
                  ]}
                />
              </WorkspaceField>
              <WorkspaceField label="Effective date">
                <DateInput defaultValue="2026-07-29" />
              </WorkspaceField>
              <WorkspaceField label="Native select">
                <NativeSelect defaultValue="active">
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                </NativeSelect>
              </WorkspaceField>
              <WorkspaceField label="Notes">
                <WorkspaceTextarea defaultValue="Shared workspace textarea" />
              </WorkspaceField>
              <div className="mnx-catalogue-choice-stack">
                <WorkspaceCheckbox label="WorkspaceCheckbox" defaultChecked />
                <NeonCheckbox label="NeonCheckbox" defaultChecked />
              </div>
              <div>
                <Label htmlFor="catalogue-input">Base Label and Input</Label>
                <Input id="catalogue-input" defaultValue="Base input" />
              </div>
              <Textarea aria-label="Base textarea" defaultValue="Base textarea" />
            </div>
          </WorkspacePanel>
        </div>

        <div className="mnx-catalogue-grid">
          <WorkspacePanel>
            <WorkspacePanelHeader eyebrow="Feedback" title="Alerts" />
            <div className="mnx-catalogue-stack">
              <WorkspaceAlert variant="info">Workspace informational alert</WorkspaceAlert>
              <WorkspaceAlert variant="success">Workspace success alert</WorkspaceAlert>
              <Alert variant="warning">
                <AlertIcon><AlertCircle size={18} /></AlertIcon>
                <AlertContent>
                  <AlertTitle>Production alert composition</AlertTitle>
                  <AlertDescription>Icon, content, title, and description are real alert slots.</AlertDescription>
                </AlertContent>
              </Alert>
            </div>
          </WorkspacePanel>
          <WorkspacePanel>
            <WorkspacePanelHeader eyebrow="Floating surfaces" title="Menus, warnings, and dialogs" />
            <FloatingSurfaceCatalogue />
          </WorkspacePanel>
        </div>

        <WorkspacePanel>
          <WorkspacePanelHeader
            eyebrow="Data display"
            title="Operational table"
            description="Shared responsive wrapper, typography, badges, and row actions."
          />
          <WorkspaceTable>
            <thead>
              <tr>
                <th>Record</th>
                <th>Customer</th>
                <th>Stage</th>
                <th>Status</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {sampleRows.map(([record, customer, stage, status]) => (
                <tr key={record}>
                  <td>{record}</td>
                  <td>{customer}</td>
                  <td>{stage}</td>
                  <td>
                    <WorkspaceBadge variant={status === "Attention" ? "warning" : status === "Verified" ? "success" : "neutral"}>
                      {status}
                    </WorkspaceBadge>
                  </td>
                  <td><WorkspaceAction size="compact" variant="secondary">Open</WorkspaceAction></td>
                </tr>
              ))}
            </tbody>
          </WorkspaceTable>
        </WorkspacePanel>

        <WorkspacePanel>
          <WorkspacePanelHeader eyebrow="File workflows" title="Upload field" />
          <FileUploadField
            id="catalogue-file"
            label="Production document upload"
            helperText="Drag-and-drop and file selection use the shared production control."
            onInputChange={() => undefined}
          />
        </WorkspacePanel>
      </CatalogueSection>

      <CatalogueSection
        id="layouts-states"
        index="03"
        title="Layouts and route states"
        description="This page is itself mounted inside MonolithAppShell and the Admin layout; the selector renders every production state family in place."
      >
        <WorkspacePanel>
          <WorkspacePanelHeader
            eyebrow="Live layout chain"
            title="Current catalogue route"
            description="The layout hierarchy is active, not mocked."
          />
          <div className="mnx-catalogue-layout-chain">
            {[
              ["MonolithAppShell", "Authentication, RBAC-aware navigation, search, profile, and themes"],
              ["AdminWorkspaceFrame", "Administration layout with deliberate catalogue passthrough"],
              ["WorkspacePage", "1200px production page frame and shared gutters"],
              ["WorkspacePageHeader", "Current route hero and actions"],
            ].map(([name, detail], index) => (
              <div key={name}>
                <MonolithSpecLabel>{String(index + 1).padStart(2, "0")}</MonolithSpecLabel>
                <strong>{name}</strong>
                <p>{detail}</p>
              </div>
            ))}
          </div>
        </WorkspacePanel>
        <StateCatalogue />
      </CatalogueSection>

      <CatalogueSection
        id="module-components"
        index="04"
        title="Module production compositions"
        description="Representative live compositions sit above a runtime-derived index of every exported component in that module family."
      >
        <div className="mnx-catalogue-family-grid">
          <FamilySample name="People operations" icon={<Users size={18} />} exports={{ ...PeopleComponents, ...PeopleDataComponents }}>
            <PeopleSummaryGrid>
              <PeopleSummary icon={<Users size={15} />} label="Employees" value="248" detail="Active people" />
              <PeopleSummary icon={<CheckCircle2 size={15} />} label="Attendance" value="94%" detail="Today" />
            </PeopleSummaryGrid>
            <PeoplePerson name="Asha Menon" secondary="Operations manager" />
            <div className="mnx-catalogue-action-row">
              <PeopleAction size="compact">Open people</PeopleAction>
              <PeopleStatus variant="success">Active</PeopleStatus>
            </div>
          </FamilySample>

          <FamilySample name="Performance and learning" icon={<Sparkles size={18} />} exports={PerformanceComponents}>
            <PerformanceSummaryGrid>
              <PerformanceSummary label="Cycles" value="04" detail="Active reviews" />
              <PerformanceSummary label="Courses" value="18" detail="Published" />
            </PerformanceSummaryGrid>
            <PerformanceCard>
              <strong>Quarterly review</strong>
              <p>Production card used by AMS and LMS workspaces.</p>
            </PerformanceCard>
            <div className="mnx-catalogue-action-row">
              <PerformanceControlButton size="compact">Review cycle</PerformanceControlButton>
              <PerformanceStatus variant="warning">In progress</PerformanceStatus>
            </div>
          </FamilySample>

          <FamilySample name="Customs operations" icon={<FileText size={18} />} exports={ChaComponents}>
            <ChaMetrics>
              <ChaMetric label="Open jobs" value="32" detail="Current branch" />
              <ChaMetric label="Warnings" value="05" detail="Need review" />
            </ChaMetrics>
            <ChaDropdownSelect
              defaultValue="assessment"
              options={[
                { value: "assessment", label: "Assessment" },
                { value: "delivery", label: "Delivery" },
              ]}
            />
          </FamilySample>

          <FamilySample
            name="Accounting"
            icon={<Database size={18} />}
            exports={{
              ...AccountingComponents,
              AccountingCommercialDocumentForm,
              AccountingDeleteAction,
              AccountingInvoiceDetail,
              AccountingInvoiceForm,
              AccountingItemDetail,
              AccountingItemsList,
              AccountingNewItemForm,
            }}
          >
            <AccountingMetrics>
              <AccountingMetric label="Receivables" value="₹4.8L" detail="Outstanding" />
              <AccountingMetric label="Payables" value="₹2.1L" detail="Current" />
            </AccountingMetrics>
            <AccountingDetailList>
              <AccountingDetail label="Document" value="SI-2026-0184" />
              <AccountingDetail label="Status" value={<AccountingStatus status="POSTED" />} />
            </AccountingDetailList>
          </FamilySample>

          <FamilySample name="Customer operations" icon={<Boxes size={18} />} exports={CrmComponents}>
            <CrmMetrics>
              <CrmMetric label="Open deals" value="24" detail="₹18.2L pipeline" />
              <CrmMetric label="Follow-ups" value="09" detail="Due today" />
            </CrmMetrics>
            <CrmPanel>
              <strong>Orion Retail</strong>
              <p>Production CRM panel and record status.</p>
            </CrmPanel>
            <div className="mnx-catalogue-action-row">
              <CrmButton size="compact">Open account</CrmButton>
              <CrmStatus variant="success">Qualified</CrmStatus>
            </div>
          </FamilySample>

          <FamilySample name="Communication" icon={<MessageSquareText size={18} />} exports={CommunicationComponents}>
            <section className="mnx-workspace-metrics">
              <CommunicationMetric label="Unread" value="12" detail="Workspace inbox" />
              <CommunicationMetric label="Spaces" value="08" detail="Connected" />
            </section>
            <CommunicationPanel>
              <strong>Operations space</strong>
              <p>Shared Mail, Chat, Drive, Calendar, and Meetings surface.</p>
            </CommunicationPanel>
            <div className="mnx-catalogue-action-row">
              <CommunicationButton size="compact">Compose</CommunicationButton>
              <CommunicationBadge variant="success">Connected</CommunicationBadge>
            </div>
          </FamilySample>

          <FamilySample name="Administration" icon={<ShieldCheck size={18} />} exports={AdminComponents}>
            <section className="mnx-workspace-metrics">
              <AdminMetric label="Active sessions" value="18" detail="Organisation-wide" />
              <AdminMetric label="Roles" value="07" detail="Configured" />
            </section>
            <AdminPanel>
              <strong>Organisation control</strong>
              <p>Production Admin panel for permission-gated workflows.</p>
            </AdminPanel>
            <div className="mnx-catalogue-action-row">
              <AdminButton size="compact">Review access</AdminButton>
              <AdminBadge variant="warning">Admin only</AdminBadge>
            </div>
          </FamilySample>

          <FamilySample name="Public and authentication" icon={<ShieldCheck size={18} />} exports={PublicComponents}>
            <PublicPanel>
              <PublicHeader
                eyebrow="Secure workspace"
                title="Public route composition"
                description="Used by login, setup, verification, and account linking."
                badge={<PublicStatusBadge tone="success">Verified</PublicStatusBadge>}
              />
              <PublicInset>
                <PublicStatus
                  eyebrow="Session"
                  title="Identity verified"
                  description="The public status component is live."
                  icon={<CheckCircle2 size={18} />}
                  tone="success"
                />
              </PublicInset>
              <PublicDetailGrid>
                <PublicDetail label="Workspace" value="Monolith" />
                <PublicDetail label="Access" value="Secure" />
              </PublicDetailGrid>
            </PublicPanel>
          </FamilySample>
        </div>
      </CatalogueSection>

      <CatalogueSection
        id="component-index"
        index="05"
        title="Complete production component index"
        description="This index is derived from imported runtime modules. New exported production components appear through the same module objects used by the application."
      >
        <WorkspacePanel>
          <div className="mnx-catalogue-index">
            {catalogueGroups.map((group) => (
              <ComponentIndex key={group.name} group={group} />
            ))}
          </div>
          <MonolithEmptyState className="mnx-catalogue-index-note">
            <PackageCheck size={20} />
            <div>
              <strong>No disconnected examples</strong>
              <p>Every visual specimen above is imported from production; this page owns layout and catalogue data only.</p>
            </div>
          </MonolithEmptyState>
        </WorkspacePanel>
      </CatalogueSection>
    </WorkspacePage>
  );
}
