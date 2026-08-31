"use client";

import * as React from "react";
import { AlertTriangle, FileSearch, Info, Layers3, Search, Settings2, Ship, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { DocumentDropzoneField } from "@/components/forms/file-upload/document-dropzone-field";
import { FilterActiveLinks } from "@/components/forms/filter-menu";
import {
  MonolithSurface,
  OperationalDataTable,
  OperationalDataTableWrap,
  OperationalPrimaryCell,
  OperationalTable,
  OperationalTableCell,
  OperationalTableHead,
  OperationalVisibleRecords,
  WorkspaceAction,
  WorkspaceAlert,
  WorkspaceBadge,
  WorkspaceEmptyState,
  WorkspaceField,
  WorkspaceMetric,
  WorkspacePageHeader,
  WorkspacePanel,
  WorkspacePanelHeader,
  WorkspaceSectionHeading,
  WorkspaceTable,
} from "@/components/monolith";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { sharedCatalogue } from "@/components/monolith/catalogue";
import {
  ChaActionLink,
  ChaFilterMenu,
  ChaMetrics,
  ChaMetric,
  ChaModal,
  ChaNativeSelect,
  ChaRoutePageHeader,
  ChaSection,
  ChaTabs,
  ChaToolbar,
  ChaWarningIndicatorPopover,
} from "@/modules/cha/components/workspace/cha-workspace";
import {
  WorkflowDocumentsSectionHeader,
  WorkflowProgressPanel,
  RequirementDocumentCard,
  UploadedWorkflowDocumentCard,
  DocumentDropzone,
  DocumentPreviewFrame,
  type WorkflowDocumentRequirement,
  type WorkflowDocumentVersion,
  type WorkflowProgressStep,
} from "@/modules/cha/components/jobs/workflow-documents-section";
import {
  CustomsBulkImportPreview,
  CustomsConcurrencyConflictDialog,
  CustomsDirtyStateWarning,
  CustomsDownloadAction,
  CustomsFilingSection,
  CustomsFilingTabs,
  CustomsFormGrid,
  CustomsLineItemTable,
  CustomsMasterEditDialog,
  CustomsMasterHeader,
  CustomsMasterTable,
  CustomsMasterToolbar,
  CustomsPagination,
  CustomsPermissionDeniedState,
  CustomsRowActionMenu,
  CustomsSaveIndicator,
  CustomsValidationSummary,
  type CustomsMasterColumn,
  type CustomsTabStatus,
} from "@/modules/cha/customs/ui/customs-workspace";
import { createSampleImportJobDraft } from "@/modules/cha/labs/import-job-creation/domain/import-job.defaults";
import type { ImportJobTabId, TabCompletionState } from "@/modules/cha/labs/import-job-creation/domain/import-job.types";
import { ImportJobHeader } from "@/modules/cha/labs/import-job-creation/components/import-job-header";
import { ImportJobSummaryCards } from "@/modules/cha/labs/import-job-creation/components/import-job-summary-cards";
import { ImportJobValidationSummary } from "@/modules/cha/labs/import-job-creation/components/import-job-validation-summary";
import { ImportJobTabNavigation } from "@/modules/cha/labs/import-job-creation/components/import-job-tab-navigation";
import { ImportRecordTable } from "@/modules/cha/labs/import-job-creation/components/import-record-table";

type RouteAuditRow = {
  route: string;
  status: "COMPLIANT" | "PARTIAL" | "NON_COMPLIANT";
  note: string;
};

type InventoryCard = {
  name: string;
  source: string;
  reason: string;
};

const routeAuditRows: RouteAuditRow[] = [
  { route: "/cha", status: "NON_COMPLIANT", note: "Direct button-styled links remain on the dashboard." },
  { route: "/cha/approvals", status: "PARTIAL", note: "Main composition is improved, but utility-heavy styling is still flagged." },
  { route: "/cha/customers", status: "NON_COMPLIANT", note: "Direct button-styled links are still present." },
  { route: "/cha/customers/new", status: "COMPLIANT", note: "Uses the current CHA workspace composition." },
  { route: "/cha/customers/[id]/edit", status: "COMPLIANT", note: "Uses the current CHA workspace composition." },
  { route: "/cha/expenses", status: "COMPLIANT", note: "Shared operational patterns are in place." },
  { route: "/cha/jobs", status: "COMPLIANT", note: "Primary operational register reference for the module." },
  { route: "/cha/jobs/new", status: "COMPLIANT", note: "Uses the current CHA workspace composition." },
  { route: "/cha/jobs/[jobId]", status: "COMPLIANT", note: "Large operational workspace with CHA-specific document and warning patterns." },
  { route: "/cha/labs/import-job-creation", status: "COMPLIANT", note: "Experimental lab route with module-owned compositions." },
  { route: "/cha/masters", status: "NON_COMPLIANT", note: "Still includes direct button-styled links." },
  { route: "/cha/masters/[masterKey]", status: "COMPLIANT", note: "Uses the customs master workspace composition." },
  { route: "/cha/process", status: "NON_COMPLIANT", note: "Contains utility-token drift and direct button-styled links." },
  { route: "/cha/process/[quoteId]", status: "COMPLIANT", note: "Uses the current CHA workspace composition." },
  { route: "/cha/reports", status: "NON_COMPLIANT", note: "Heavy route-local utility styling and raw headings are still present." },
  { route: "/cha/settings", status: "COMPLIANT", note: "Uses the current CHA workspace composition." },
  { route: "/cha/settings/filing-workflows", status: "COMPLIANT", note: "Workflow-builder framing is already in place." },
];

const sharedSpecimenIds = [
  "workspace-page-header",
  "workspace-section-heading",
  "actions",
  "button-link",
  "workspace-fields",
  "document-dropzone-field",
  "workspace-panel",
  "workspace-metric",
  "workspace-badges",
  "workspace-feedback",
  "operational-data-table",
] as const;

const sharedSpecimens = sharedSpecimenIds
  .map((id) => sharedCatalogue.find((entry) => entry.id === id))
  .filter((entry): entry is NonNullable<(typeof sharedCatalogue)[number]> => Boolean(entry));

const componentInventory: InventoryCard[] = [
  {
    name: "CreateJobPermissionGuard",
    source: "src/modules/cha/components/create-job-permission-guard.tsx",
    reason: "Auto-dismisses and redirects by design, so it is listed here instead of auto-opening.",
  },
  {
    name: "CreateJobDialog",
    source: "src/modules/cha/components/create-job-dialog.tsx",
    reason: "Requires server-backed job-number preview and route flow.",
  },
  {
    name: "JobDeleteInlineButton",
    source: "src/modules/cha/components/jobs/job-delete-inline-button.tsx",
    reason: "Destructive workflow stays inventory-only on the audit page.",
  },
  {
    name: "WorkflowDocumentAccordion",
    source: "src/modules/cha/components/jobs/workflow-documents-section.tsx",
    reason: "Depends on the full job document dataset and preview state orchestration.",
  },
  {
    name: "FilingDocumentPreviewDrawer",
    source: "src/modules/cha/components/jobs/workflow-documents-section.tsx",
    reason: "Uses live preview/download URLs and document state orchestration.",
  },
  {
    name: "ChaDueDateWarningIndicator / Note / WarningsIndicator",
    source: "src/modules/cha/components/warnings/*.tsx",
    reason: "Production components are side-effectful acknowledgement controls and are documented through their shell, tones, and class families below.",
  },
  {
    name: "ImportFormSection and tab forms",
    source: "src/modules/cha/labs/import-job-creation/components/**/*.tsx",
    reason: "The lab forms are broad; this page renders the header, summary cards, tabs, validation, and record-table patterns they rely on.",
  },
];

const classFamilies = [
  {
    title: "CHA workspace classes",
    description: "Module-owned wrapper classes that define the CHA page shell, sections, menus, and dialog surfaces.",
    classes: [
      "mnx-cha-page",
      "mnx-cha-content",
      "mnx-cha-page-header",
      "mnx-cha-metrics",
      "mnx-cha-metric-label",
      "mnx-cha-section-block",
      "mnx-cha-outside-heading",
      "mnx-cha-section",
      "mnx-cha-section-content",
      "mnx-cha-panel",
      "mnx-cha-toolbar",
      "mnx-cha-tabs",
      "mnx-cha-table",
      "mnx-cha-dialog",
      "mnx-cha-native-select",
      "mnx-cha-menu",
      "mnx-cha-popover",
    ],
  },
  {
    title: "Customs classes",
    description: "The customs master and filing workspace composes CHA wrappers with its own table, pagination, dialog, and filing-grid family.",
    classes: [
      "mnx-customs-master-header",
      "mnx-customs-master-meta",
      "mnx-customs-master-toolbar",
      "mnx-customs-search",
      "mnx-customs-toolbar-actions",
      "mnx-customs-filter-panel",
      "mnx-customs-table-region",
      "mnx-customs-master-table",
      "mnx-customs-table-heading",
      "mnx-customs-pagination",
      "mnx-customs-import-preview",
      "mnx-customs-dialog-content",
      "mnx-customs-filing-tabs",
      "mnx-customs-filing-section",
      "mnx-customs-form-grid",
      "mnx-customs-line-table",
      "mnx-customs-line-table-header",
      "mnx-customs-totals-footer",
      "mnx-customs-validation-summary",
      "mnx-customs-dirty-warning",
      "mnx-customs-dialog-actions",
    ],
  },
  {
    title: "Shared semantic tokens used in CHA",
    description: "These are the semantic color, surface, text, shadow, and interaction tokens that CHA leans on instead of route-local hex values.",
    classes: [
      "mnx-border",
      "mnx-border-accent",
      "mnx-border-warning",
      "mnx-border-danger",
      "mnx-bg-surface",
      "mnx-bg-soft",
      "mnx-bg-accent-soft",
      "mnx-bg-warning",
      "mnx-bg-danger",
      "mnx-text-primary",
      "mnx-text-muted",
      "mnx-text-accent",
      "mnx-text-warning",
      "mnx-text-danger",
      "mnx-label",
      "mnx-heading-3",
      "mnx-shadow-panel",
      "mnx-hover-accent",
      "mnx-hover-warning",
      "mnx-hover-danger",
      "mnx-focus-accent",
      "mnx-numeric",
    ],
  },
  {
    title: "Route-local utility drift still present in CHA",
    description: "The audit also found Tailwind-heavy local styling on some CHA routes. These remain useful evidence for follow-up cleanup.",
    classes: [
      "space-y-4",
      "space-y-5",
      "grid gap-4",
      "rounded-xl",
      "rounded-2xl",
      "uppercase tracking-[0.12em]",
      "sticky top-0 z-10",
      "border-y py-2 backdrop-blur",
      "max-w-md",
      "max-w-xl",
      "max-w-2xl",
      "hover:-translate-y-px",
      "focus-visible:ring-2",
    ],
  },
];

const statusVariants: Record<RouteAuditRow["status"], React.ComponentProps<typeof WorkspaceBadge>["variant"]> = {
  COMPLIANT: "success",
  PARTIAL: "warning",
  NON_COMPLIANT: "danger",
};

const workflowRequirement: WorkflowDocumentRequirement = {
  id: "invoice-pdf",
  name: "Commercial Invoice",
  status: "UPLOADED",
  isMandatory: true,
  requirementItem: {
    description: "Current invoice copy with supplier details and valuation support.",
    requiresValidityDate: false,
    category: { name: "Invoice" },
  },
  versions: [],
};

const pendingWorkflowRequirement: WorkflowDocumentRequirement = {
  id: "delivery-order",
  name: "Delivery Order",
  status: "PENDING",
  isMandatory: true,
  requirementItem: {
    description: "Delivery-order validity drives one of the CHA warning flows.",
    requiresValidityDate: true,
    category: { name: "Arrival" },
  },
  versions: [],
};

const uploadedVersion: WorkflowDocumentVersion = {
  id: "version-1",
  fileName: "commercial-invoice.pdf",
  mimeType: "application/pdf",
  sizeBytes: 324_512,
  uploadedAt: "2026-08-28T11:10:00.000Z",
  uploadedById: "user-1",
  uploadedBy: { name: "Raghu Ops" },
  isCurrent: true,
  source: "FILING_WORKFLOW",
  validityDate: "2026-09-15",
};

const workflowSteps: WorkflowProgressStep[] = [
  { key: "collect", title: "Collect document", detail: "Awaiting customer upload and file validation.", status: "completed" },
  { key: "verify", title: "Verify metadata", detail: "Validity and mandatory status checked by the operator.", status: "active" },
  { key: "submit", title: "Attach to filing", detail: "Push the accepted document into the current workflow stage.", status: "pending" },
];

const customsRows = [
  { id: "1", code: "CUS-001", label: "Ports master", status: "Active", owner: "Central ops" },
  { id: "2", code: "CUS-002", label: "Package codes", status: "Review", owner: "Branch ops" },
];

const customsColumns: CustomsMasterColumn<(typeof customsRows)[number]>[] = [
  {
    key: "code",
    header: "Code",
    sticky: "start",
    width: "10rem",
    cell: (row) => <strong className="mnx-text-primary">{row.code}</strong>,
  },
  {
    key: "label",
    header: "Master",
    filterable: true,
    cell: (row) => row.label,
  },
  {
    key: "status",
    header: "Status",
    cell: (row) => <WorkspaceBadge variant={row.status === "Active" ? "success" : "warning"}>{row.status}</WorkspaceBadge>,
  },
  {
    key: "owner",
    header: "Owner",
    cell: (row) => row.owner,
  },
  {
    key: "actions",
    header: "",
    sticky: "end",
    width: "5rem",
    cell: () => <CustomsRowActionMenu onDeactivate={() => undefined} onEdit={() => undefined} />,
  },
];

const importDraft = createSampleImportJobDraft(new Date("2026-08-31T09:00:00.000Z"));

const importTabStates: Record<ImportJobTabId, TabCompletionState> = {
  "be-main-details": "complete",
  igm: "complete",
  invoice: "complete",
  "item-details": "in-progress",
  declaration: "complete",
  "supporting-documents": "invalid",
  checklist: "complete",
  "flat-file": "in-progress",
};

function SharedSpecimenGrid() {
  return (
    <div className="mnx-catalogue-live-grid">
      {sharedSpecimens.map((entry) => (
        <article className="mnx-catalogue-live-card" key={entry.id}>
          <header>
            <div>
              <span>{entry.scope}</span>
              <h3>{entry.displayName}</h3>
              <p>{entry.description}</p>
            </div>
            <Badge variant="secondary">{entry.status}</Badge>
          </header>
          <div className="mnx-catalogue-live-preview">{entry.render()}</div>
          <footer>
            <p>{entry.source}</p>
          </footer>
        </article>
      ))}
    </div>
  );
}

function ClassFamilySection() {
  return (
    <div className="mnx-catalogue-live-grid">
      {classFamilies.map((family) => (
        <article className="mnx-catalogue-live-card" key={family.title}>
          <header>
            <div>
              <span>class inventory</span>
              <h3>{family.title}</h3>
              <p>{family.description}</p>
            </div>
          </header>
          <div className="mnx-catalogue-live-preview">
            <div className="mnx-catalogue-source-pills">
              {family.classes.map((value) => (
                <span key={value}>
                  <code>{value}</code>
                </span>
              ))}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

export function ChaAuditClient() {
  const [chaMenuOpen, setChaMenuOpen] = React.useState(false);
  const [chaModalOpen, setChaModalOpen] = React.useState(false);
  const [customsEditOpen, setCustomsEditOpen] = React.useState(false);
  const [customsConflictOpen, setCustomsConflictOpen] = React.useState(false);

  return (
    <main className="mnx-catalogue-page" data-production-catalogue="true">
      <WorkspacePageHeader
        className="mnx-catalogue-page-header"
        eyebrow="CHA module audit"
        title="CHA Design System Audit"
        description="A dedicated admin catalogue page for the Customs House Agent module only. It captures the shared primitives CHA already uses, the CHA-owned compositions that make the module distinct, and the class/token evidence behind them."
        icon={<Ship aria-hidden="true" />}
        actions={
          <>
            <ButtonLink href="/admin/design-system" variant="outline">
              <Layers3 size={16} aria-hidden="true" />
              Back to main design system
            </ButtonLink>
            <ButtonLink href="/admin/design-system/unverified-designs">
              <Sparkles size={16} aria-hidden="true" />
              Open governance queue
            </ButtonLink>
          </>
        }
      />

      <section className="mnx-catalogue-overview">
        <WorkspacePanel className="mnx-catalogue-overview-panel">
          <WorkspacePanelHeader
            eyebrow="Scope"
            title="What this page audits"
            description="Only the CHA route family and CHA-owned module components are included here. Existing global design-system specimens are reused where CHA consumes them."
          />
          <div className="mnx-catalogue-summary-grid">
            <WorkspaceMetric label="CHA routes audited" value="17" detail="Page routes only" />
            <WorkspaceMetric label="Shared CHA specimens" value={String(sharedSpecimens.length)} detail="Live shared components reused by CHA" />
            <WorkspaceMetric label="CHA-only live groups" value="6" detail="Workspace, workflow, customs, import-lab, feedback, class audit" />
            <WorkspaceMetric label="Inventory-only items" value={String(componentInventory.length)} detail="Documented but not auto-opened here" />
          </div>
        </WorkspacePanel>

        <WorkspacePanel className="mnx-catalogue-overview-panel">
          <WorkspacePanelHeader
            eyebrow="Audit notes"
            title="Current source status"
            description="CHA is the operational reference, but the source audit still flags drift on the dashboard, customers, masters, process, reports, and a few route states."
          />
          <div className="mnx-catalogue-intro-list">
            <MonolithSurface className="mnx-catalogue-meta-card">
              <strong>Shared reference</strong>
              <p>Operational tables, page headers, section headings, panels, actions, and feedback already come from the current Monolith system.</p>
            </MonolithSurface>
            <MonolithSurface className="mnx-catalogue-meta-card">
              <strong>CHA-owned reference</strong>
              <p>Document workflow, warning affordances, customs masters, and the import lab add the main CHA-specific UI vocabulary.</p>
            </MonolithSurface>
            <MonolithSurface className="mnx-catalogue-meta-card">
              <strong>Migration debt</strong>
              <p>Several CHA routes still use direct utility-heavy styling or button-styled links, so this page doubles as an implementation target for future cleanup.</p>
            </MonolithSurface>
          </div>
        </WorkspacePanel>
      </section>

      <WorkspaceSectionHeading
        index="01"
        title="Route Coverage"
        description="Static route-status evidence from the current CHA audit."
        badge={<WorkspaceBadge variant="accent">Source audit</WorkspaceBadge>}
      />
      <WorkspacePanel>
        <WorkspacePanelHeader
          eyebrow="Pages"
          title="CHA route matrix"
          description="This mirrors the current audit classification for the CHA family as of Monday, August 31, 2026."
        />
        <WorkspaceTable>
          <thead>
            <tr>
              <th>Route</th>
              <th>Status</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {routeAuditRows.map((row) => (
              <tr key={row.route}>
                <td><code>{row.route}</code></td>
                <td><WorkspaceBadge variant={statusVariants[row.status]}>{row.status.replace("_", " ")}</WorkspaceBadge></td>
                <td>{row.note}</td>
              </tr>
            ))}
          </tbody>
        </WorkspaceTable>
      </WorkspacePanel>

      <WorkspaceSectionHeading
        index="02"
        title="Shared Primitives Used By CHA"
        description="These are live production components already in the main design system that the CHA module relies on today."
        badge={<WorkspaceBadge variant="success">Shared</WorkspaceBadge>}
      />
      <SharedSpecimenGrid />

      <WorkspaceSectionHeading
        index="03"
        title="CHA Workspace Shell"
        description="The module-level wrappers, shell components, and interactions that turn the shared Monolith primitives into the CHA operational workspace."
        badge={<WorkspaceBadge variant="accent">Module-owned</WorkspaceBadge>}
      />
      <div className="mnx-catalogue-live-grid">
        <article className="mnx-catalogue-live-card">
          <header>
            <div>
              <span>cha</span>
              <h3>Route header, metrics, section, toolbar, and tabs</h3>
              <p>Core CHA shell components from the workspace owner.</p>
            </div>
          </header>
          <div className="mnx-catalogue-live-preview">
            <div className="space-y-6">
              <ChaRoutePageHeader
                eyebrow="Customs operations"
                title="CHA jobs"
                description="Route identity for the main customs job register."
                actions={<WorkspaceAction size="compact">Create job</WorkspaceAction>}
              />
              <ChaMetrics>
                <ChaMetric label="Open jobs" value="42" detail="Awaiting filing or document review" />
                <ChaMetric label="Due today" value="07" detail="Time-sensitive customs steps" href="#cha-workflow-audit" />
              </ChaMetrics>
              <ChaSection
                index="02"
                title="Job queue"
                description="The standard CHA outside-heading plus panel contract."
                badge="Live"
                actions={<OperationalVisibleRecords visible={7} total={42} />}
              >
                <p className="mnx-text-muted">CHA section content is panelized after the shared section heading.</p>
              </ChaSection>
              <ChaToolbar>
                <label className="mnx-search-field">
                  <Search aria-hidden="true" />
                  <Input aria-label="Search CHA queue" placeholder="Search jobs, customers, BE numbers..." />
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <ChaFilterMenu activeCount={2} label="Filters" open={chaMenuOpen} onOpenChange={setChaMenuOpen}>
                    <div className="p-1">
                      <WorkspacePanelHeader eyebrow="Filters" title="CHA queue filters" />
                      <div className="mt-4 grid gap-4">
                        <WorkspaceField label="Status" htmlFor="cha-audit-status">
                          <NativeSelect id="cha-audit-status" defaultValue="active">
                            <option value="active">Active</option>
                            <option value="waiting">Waiting</option>
                            <option value="closed">Closed</option>
                          </NativeSelect>
                        </WorkspaceField>
                        <WorkspaceField label="Branch" htmlFor="cha-audit-branch">
                          <DropdownSelect
                            id="cha-audit-branch"
                            searchable={false}
                            defaultValue="maa"
                            options={[
                              { value: "maa", label: "Chennai" },
                              { value: "bom", label: "Mumbai" },
                            ]}
                          />
                        </WorkspaceField>
                      </div>
                    </div>
                  </ChaFilterMenu>
                  <Button size="sm" variant="outline" onClick={() => setChaModalOpen(true)}>
                    <Settings2 size={14} aria-hidden="true" />
                    Modal specimen
                  </Button>
                  <ChaActionLink href="#cha-class-audit">Open class audit</ChaActionLink>
                </div>
              </ChaToolbar>
              <FilterActiveLinks
                links={[
                  { key: "status", href: "#route-coverage", label: "Status: Active" },
                  { key: "branch", href: "#route-coverage", label: "Branch: Chennai" },
                ]}
                clearHref="#route-coverage"
              />
              <ChaTabs aria-label="CHA workspace tabs">
                <Button type="button" role="tab" aria-selected="true" size="sm">
                  Jobs
                </Button>
                <Button type="button" role="tab" aria-selected="false" size="sm" variant="outline">
                  Process
                </Button>
                <Button type="button" role="tab" aria-selected="false" size="sm" variant="outline">
                  Reports
                </Button>
              </ChaTabs>
            </div>
          </div>
          <footer>
            <p>src/modules/cha/components/workspace/cha-workspace.tsx</p>
          </footer>
        </article>

        <article className="mnx-catalogue-live-card">
          <header>
            <div>
              <span>cha feedback</span>
              <h3>Warning shell, tone, and hover language</h3>
              <p>CHA warning affordances combine shared buttons with CHA popover styling and semantic warning tones.</p>
            </div>
          </header>
          <div className="mnx-catalogue-live-preview">
            <div className="space-y-5">
              <ChaWarningIndicatorPopover
                ariaLabel="Section 49 due date warning"
                tone="warning"
                eyebrow="SECTION 49 EXPIRING"
                description="Section 49 approval expires in 2 days for job MAA-CHA-2408."
                meta="This specimen focuses on the popover shell and token usage."
              >
                <Button size="sm" variant="outline" className="justify-center gap-1.5 mnx-border mnx-bg-surface px-3 mnx-text-muted mnx-hover-accent">
                  Acknowledge
                </Button>
                <Button size="sm" className="justify-center gap-1.5 border mnx-border-warning mnx-bg-warning px-3 mnx-text-warning mnx-hover-warning">
                  Open Job
                </Button>
              </ChaWarningIndicatorPopover>
              <WorkspaceAlert variant="warning">
                <AlertTriangle size={16} aria-hidden="true" />
                Warning notes in CHA commonly pair <code>mnx-bg-warning</code>, <code>mnx-border-warning</code>, and <code>mnx-text-warning</code> with shared action buttons.
              </WorkspaceAlert>
            </div>
          </div>
          <footer>
            <p>src/modules/cha/components/warnings/*.tsx</p>
          </footer>
        </article>
      </div>

      <WorkspaceSectionHeading
        index="04"
        title="Document Workflow"
        description="Document queues, cards, upload shells, preview frames, and progress panels that are specific to CHA job handling."
        badge={<WorkspaceBadge variant="accent">Workflow-specific</WorkspaceBadge>}
      />
      <div className="mnx-catalogue-live-grid" id="cha-workflow-audit">
        <article className="mnx-catalogue-live-card">
          <header>
            <div>
              <span>documents</span>
              <h3>Document section header and progress panel</h3>
              <p>Shared search plus CHA menu treatments, with the upload progress side rail.</p>
            </div>
          </header>
          <div className="mnx-catalogue-live-preview">
            <div className="space-y-6">
              <WorkflowDocumentsSectionHeader
                uploadedCount={6}
                searchValue=""
                onSearchChange={() => undefined}
                filterMode="UPLOADED"
                onFilterChange={() => undefined}
              />
              <WorkflowProgressPanel
                steps={workflowSteps}
                overallProgress={67}
                currentStepLabel="Metadata review"
              />
            </div>
          </div>
          <footer>
            <p>src/modules/cha/components/jobs/workflow-documents-section.tsx</p>
          </footer>
        </article>

        <article className="mnx-catalogue-live-card">
          <header>
            <div>
              <span>documents</span>
              <h3>Requirement and uploaded file cards</h3>
              <p>Two main card modes used in the job workspace for pending and uploaded requirements.</p>
            </div>
          </header>
          <div className="mnx-catalogue-live-preview">
            <div className="grid gap-5 xl:grid-cols-2">
              <RequirementDocumentCard
                requirement={pendingWorkflowRequirement}
                loadingKey={null}
                onUndo={() => undefined}
                onUpload={() => undefined}
                onDeclareExemption={() => undefined}
                onMarkNa={() => undefined}
              />
              <UploadedWorkflowDocumentCard
                requirement={workflowRequirement}
                version={uploadedVersion}
                loadingKey={null}
                currentUserId="user-1"
                canDelete
                onPreview={() => undefined}
                onDelete={() => undefined}
                onDeclareExemption={() => undefined}
                onMarkNa={() => undefined}
                onUpload={() => undefined}
              />
            </div>
          </div>
          <footer>
            <p>src/modules/cha/components/jobs/workflow-documents-section.tsx</p>
          </footer>
        </article>

        <article className="mnx-catalogue-live-card">
          <header>
            <div>
              <span>upload & preview</span>
              <h3>Dropzone and preview frame</h3>
              <p>CHA uses both the shared document field and a richer workflow-specific dropzone/preview pair.</p>
            </div>
          </header>
          <div className="mnx-catalogue-live-preview">
            <div className="space-y-6">
              <DocumentDropzoneField
                id="cha-audit-dropzone"
                selectedFile={{ name: "delivery-order.pdf", sizeBytes: 186_000, statusLabel: "Selected" }}
                onInputChange={() => undefined}
                onClear={() => undefined}
              />
              <DocumentDropzone
                requirement={pendingWorkflowRequirement}
                requirementsList={[pendingWorkflowRequirement, workflowRequirement]}
                disabled={false}
                onRequirementIdChange={() => undefined}
                onInputChange={() => undefined}
              />
              <DocumentPreviewFrame
                version={null}
                previewUrl={null}
                downloadUrl={null}
                loadingPreview={false}
                onPreviewLoad={() => undefined}
                onPreviewError={() => undefined}
              />
            </div>
          </div>
          <footer>
            <p>src/modules/cha/components/jobs/workflow-documents-section.tsx</p>
          </footer>
        </article>
      </div>

      <WorkspaceSectionHeading
        index="05"
        title="Customs Master and Filing UI"
        description="The customs sub-workspace is the deepest CHA-owned composition: search, filter, master tables, filing sections, save states, and conflict dialogs."
        badge={<WorkspaceBadge variant="accent">Customs</WorkspaceBadge>}
      />
      <div className="mnx-catalogue-live-grid">
        <article className="mnx-catalogue-live-card">
          <header>
            <div>
              <span>customs masters</span>
              <h3>Header, toolbar, table, pagination, and row actions</h3>
              <p>These patterns drive customs-master register screens under CHA.</p>
            </div>
          </header>
          <div className="mnx-catalogue-live-preview">
            <div className="space-y-6">
              <CustomsMasterHeader
                title="Ports master"
                sourceVersion="v2026.08.31"
                lastImportedAt="31 Aug 2026, 09:30"
                actions={<CustomsDownloadAction />}
              />
              <CustomsMasterToolbar search="jnpt" activeFilterCount={2} onSearchChange={() => undefined}>
                <WorkspaceField label="Status" htmlFor="customs-status">
                  <ChaNativeSelect id="customs-status" defaultValue="active">
                    <option value="active">Active</option>
                    <option value="review">In review</option>
                  </ChaNativeSelect>
                </WorkspaceField>
              </CustomsMasterToolbar>
              <CustomsMasterTable
                columns={customsColumns}
                rows={customsRows}
                getRowLabel={(row) => row.label}
                sort={{ key: "label", direction: "asc" }}
                pagination={
                  <CustomsPagination
                    page={1}
                    pageSize={10}
                    totalCount={22}
                    onPageChange={() => undefined}
                    onPageSizeChange={() => undefined}
                  />
                }
              />
            </div>
          </div>
          <footer>
            <p>src/modules/cha/customs/ui/customs-workspace.tsx</p>
          </footer>
        </article>

        <article className="mnx-catalogue-live-card">
          <header>
            <div>
              <span>customs filing</span>
              <h3>Filing tabs, grid, line table, save state, and validation</h3>
              <p>The filing workspace layers status badges, grid forms, totals, and conflict handling over the CHA shell.</p>
            </div>
          </header>
          <div className="mnx-catalogue-live-preview">
            <div className="space-y-6">
              <CustomsFilingTabs
                tabs={[
                  { id: "be", label: "BE Main Details", status: "complete" as CustomsTabStatus, selected: true, onSelect: () => undefined },
                  { id: "invoice", label: "Invoice", status: "in_progress" as CustomsTabStatus, onSelect: () => undefined },
                  { id: "docs", label: "Supporting Documents", status: "blocked" as CustomsTabStatus, onSelect: () => undefined },
                ]}
              />
              <CustomsFilingSection
                title="Bill of Entry details"
                description="Representative filing panel with the customs form-grid and line-table families."
                actions={<CustomsSaveIndicator state="dirty" />}
              >
                <div className="space-y-5">
                  <CustomsDirtyStateWarning active />
                  <CustomsValidationSummary
                    errors={[
                      { fieldId: "beNo", label: "BE No", message: "Required before submission." },
                      { fieldId: "portCode", label: "Port code", message: "Port code does not match the selected customs house." },
                    ]}
                  />
                  <CustomsFormGrid columns={3}>
                    <WorkspaceField label="BE No" htmlFor="beNo">
                      <Input id="beNo" placeholder="Enter BE number" />
                    </WorkspaceField>
                    <WorkspaceField label="Customs house" htmlFor="customsHouse">
                      <DropdownSelect
                        id="customsHouse"
                        searchable={false}
                        defaultValue="jnch"
                        options={[
                          { value: "jnch", label: "JNCH Nhava Sheva" },
                          { value: "maa", label: "Chennai Customs" },
                        ]}
                      />
                    </WorkspaceField>
                    <WorkspaceField label="Remarks" htmlFor="remarks">
                      <Textarea id="remarks" defaultValue="Awaiting corrected port code." />
                    </WorkspaceField>
                  </CustomsFormGrid>
                  <CustomsLineItemTable
                    title="Invoice line items"
                    footer={<span className="mnx-numeric">Duty estimate INR 1,82,450</span>}
                  >
                    <OperationalDataTable>
                      <OperationalDataTableWrap>
                        <OperationalTable>
                          <thead>
                            <tr>
                              <OperationalTableHead>Product</OperationalTableHead>
                              <OperationalTableHead>Qty</OperationalTableHead>
                              <OperationalTableHead>Duty</OperationalTableHead>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <OperationalPrimaryCell primary="Power supply modules" secondary="RITC 85044090" />
                              <OperationalTableCell>100 NOS</OperationalTableCell>
                              <OperationalTableCell>INR 1,82,450</OperationalTableCell>
                            </tr>
                          </tbody>
                        </OperationalTable>
                      </OperationalDataTableWrap>
                    </OperationalDataTable>
                  </CustomsLineItemTable>
                  <div className="flex flex-wrap gap-3">
                    <WorkspaceAction size="compact" variant="outline" onClick={() => setCustomsEditOpen(true)}>
                      Open edit dialog
                    </WorkspaceAction>
                    <WorkspaceAction size="compact" variant="outline" onClick={() => setCustomsConflictOpen(true)}>
                      Open conflict dialog
                    </WorkspaceAction>
                  </div>
                </div>
              </CustomsFilingSection>
              <CustomsBulkImportPreview inserted={14} updated={3} unchanged={9} rejected={2} />
              <CustomsPermissionDeniedState />
            </div>
          </div>
          <footer>
            <p>src/modules/cha/customs/ui/customs-workspace.tsx</p>
          </footer>
        </article>
      </div>

      <WorkspaceSectionHeading
        index="06"
        title="Import Job Creation Lab"
        description="The experimental import-lab route has its own header, summary cards, tabs, validation summary, and record-table patterns."
        badge={<WorkspaceBadge variant="warning">Experimental</WorkspaceBadge>}
      />
      <div className="mnx-catalogue-live-grid">
        <article className="mnx-catalogue-live-card">
          <header>
            <div>
              <span>import lab</span>
              <h3>Header, summary cards, and validation</h3>
              <p>These components form the top of the import-lab experience.</p>
            </div>
          </header>
          <div className="mnx-catalogue-live-preview">
            <div className="space-y-6">
              <ImportJobHeader
                canReset
                hasUnsavedChanges
                isLocked={false}
                updatedAt="31 Aug 2026, 09:00"
                onLoadSample={() => undefined}
                onLockToggle={() => undefined}
                onManualSave={() => undefined}
                onReset={() => undefined}
              />
              <ImportJobSummaryCards draft={importDraft} />
              <ImportJobValidationSummary draft={importDraft} />
            </div>
          </div>
          <footer>
            <p>src/modules/cha/labs/import-job-creation/components/*.tsx</p>
          </footer>
        </article>

        <article className="mnx-catalogue-live-card">
          <header>
            <div>
              <span>import lab</span>
              <h3>Tab navigation and record table</h3>
              <p>Representative import-lab navigation and repeatable row editing surface.</p>
            </div>
          </header>
          <div className="mnx-catalogue-live-preview">
            <div className="space-y-6">
              <ImportJobTabNavigation
                activeTab="invoice"
                states={importTabStates}
                onChange={() => undefined}
              />
              <ImportRecordTable
                records={[
                  { id: "1", invoiceNo: "INV-7788", supplier: "Demo Supplier Co", value: "USD 12,500" },
                  { id: "2", invoiceNo: "INV-7792", supplier: "Orion Components", value: "USD 8,950" },
                ]}
                columns={[
                  { key: "invoiceNo", label: "Invoice No", render: (record) => record.invoiceNo },
                  { key: "supplier", label: "Supplier", render: (record) => record.supplier },
                  { key: "value", label: "Invoice Value", render: (record) => record.value },
                ]}
                emptyMessage="No invoices added yet."
                onDelete={() => undefined}
                onDuplicate={() => undefined}
                onEdit={() => undefined}
              />
            </div>
          </div>
          <footer>
            <p>src/modules/cha/labs/import-job-creation/components/*.tsx</p>
          </footer>
        </article>
      </div>

      <WorkspaceSectionHeading
        id="cha-class-audit"
        index="07"
        title="Class, Color, and Hover Audit"
        description="The class families and semantic color/interaction tokens that appear repeatedly across the CHA workspace."
        badge={<WorkspaceBadge variant="accent">Implementation evidence</WorkspaceBadge>}
      />
      <WorkspacePanel>
        <WorkspacePanelHeader
          eyebrow="Color and interaction language"
          title="Token-backed tones used in CHA"
          description="CHA reuses semantic surfaces and hover tokens instead of hard-coded theme values when it follows the current system."
        />
        <div className="mnx-catalogue-inventory-grid">
          <MonolithSurface className="mnx-catalogue-meta-card">
            <strong>Neutral structure</strong>
            <p><code>mnx-bg-surface</code> + <code>mnx-border</code> + <code>mnx-text-primary</code></p>
          </MonolithSurface>
          <MonolithSurface className="mnx-catalogue-meta-card">
            <strong>Accent interaction</strong>
            <p><code>mnx-bg-accent-soft</code> + <code>mnx-text-accent</code> + <code>mnx-hover-accent</code></p>
          </MonolithSurface>
          <MonolithSurface className="mnx-catalogue-meta-card">
            <strong>Warning urgency</strong>
            <p><code>mnx-bg-warning</code> + <code>mnx-border-warning</code> + <code>mnx-hover-warning</code></p>
          </MonolithSurface>
          <MonolithSurface className="mnx-catalogue-meta-card">
            <strong>Danger affordance</strong>
            <p><code>mnx-bg-danger</code> + <code>mnx-border-danger</code> + <code>mnx-hover-danger</code></p>
          </MonolithSurface>
        </div>
      </WorkspacePanel>
      <ClassFamilySection />

      <WorkspaceSectionHeading
        index="08"
        title="Inventory-Only Components"
        description="These CHA elements are part of the audit but are intentionally not auto-opened live on this page because they redirect, depend on full route orchestration, or are destructive."
        badge={<WorkspaceBadge variant="warning">Documented</WorkspaceBadge>}
      />
      <div className="mnx-catalogue-live-grid">
        {componentInventory.map((item) => (
          <article className="mnx-catalogue-live-card" key={item.name}>
            <header>
              <div>
                <span>inventory only</span>
                <h3>{item.name}</h3>
                <p>{item.reason}</p>
              </div>
            </header>
            <div className="mnx-catalogue-live-preview">
              <div className="space-y-4">
                <WorkspaceEmptyState
                  title={item.name}
                  description={item.reason}
                />
                <WorkspaceAlert variant="info">
                  <FileSearch size={16} aria-hidden="true" />
                  Source: <code>{item.source}</code>
                </WorkspaceAlert>
              </div>
            </div>
            <footer>
              <p>{item.source}</p>
            </footer>
          </article>
        ))}
      </div>

      <ChaModal
        open={chaModalOpen}
        onClose={() => setChaModalOpen(false)}
        title="CHA modal specimen"
        description="This demonstrates the CHA dialog shell, eyebrow, spacing, and footer action treatment."
      >
        <div className="space-y-4">
          <WorkspaceAlert variant="info">
            <Info size={16} aria-hidden="true" />
            CHA modals commonly wrap operational confirmations, manager selection, document actions, and warnings.
          </WorkspaceAlert>
          <WorkspaceField label="Manager" htmlFor="cha-audit-manager">
            <ChaNativeSelect id="cha-audit-manager" defaultValue="manager-1">
              <option value="manager-1">Assigned manager</option>
              <option value="manager-2">Backup manager</option>
            </ChaNativeSelect>
          </WorkspaceField>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setChaModalOpen(false)}>Cancel</Button>
            <Button onClick={() => setChaModalOpen(false)}>Save changes</Button>
          </div>
        </div>
      </ChaModal>

      <CustomsMasterEditDialog
        open={customsEditOpen}
        onClose={() => setCustomsEditOpen(false)}
        title="Edit customs master row"
      >
        <div className="space-y-4">
          <WorkspaceField label="Code" htmlFor="customs-edit-code">
            <Input id="customs-edit-code" defaultValue="CUS-001" />
          </WorkspaceField>
          <WorkspaceField label="Description" htmlFor="customs-edit-description">
            <Textarea id="customs-edit-description" defaultValue="Representative customs master row for the design audit." />
          </WorkspaceField>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCustomsEditOpen(false)}>Close</Button>
            <Button onClick={() => setCustomsEditOpen(false)}>Save</Button>
          </div>
        </div>
      </CustomsMasterEditDialog>

      <CustomsConcurrencyConflictDialog
        open={customsConflictOpen}
        onClose={() => setCustomsConflictOpen(false)}
        onReload={() => setCustomsConflictOpen(false)}
      />
    </main>
  );
}
