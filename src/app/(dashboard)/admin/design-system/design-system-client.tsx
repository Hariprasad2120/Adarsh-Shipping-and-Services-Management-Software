"use client";
/* eslint-disable no-restricted-syntax -- source-derived governance previews intentionally mirror current raw implementations for comparison. */

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  FileSearch,
  GitCompare,
  LayoutDashboard,
  Layers3,
  ListChecks,
  Palette,
  RefreshCcw,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button, ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MonolithSurface,
  WorkspaceAlert,
  WorkspaceBadge,
  WorkspaceEmptyState,
  WorkspaceField,
  WorkspaceMetric,
  WorkspacePageHeader,
  WorkspacePanel,
  WorkspacePanelHeader,
  WorkspaceSectionHeading,
  WorkspaceState,
} from "@/components/monolith";
import {
  moduleCatalogue,
  sharedCatalogue,
  type CatalogueEntry,
} from "@/components/monolith/catalogue";
import {
  approveDesignFindingAction,
  markDesignFindingManualReviewAction,
  replaceDesignFindingAction,
} from "./actions";
import type {
  GovernanceCategory,
  GovernanceFinding,
  GovernancePreviewKind,
  GovernanceStatus,
} from "@/modules/admin/components/design-system-governance";

type DesignSystemSnapshot = {
  generatedAt: string;
  categoryChoices: GovernanceCategory[];
  findings: GovernanceFinding[];
  summary: {
    totalFindings: number;
    pendingReview: number;
    approved: number;
    replacementPending: number;
    replaced: number;
    potentialDuplicates: number;
    manualReview: number;
    coveragePercent: number;
  };
};

type Mode = "catalogue" | "review";

type Props = {
  mode: Mode;
  snapshot: DesignSystemSnapshot;
};

type AlternativeRecord = {
  id: string;
  label: string;
  description: string;
  render: () => React.ReactNode;
};

const statusOptions: Array<{ label: string; value: GovernanceStatus | "all" }> = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending_review" },
  { label: "Potential duplicate", value: "potential_duplicate" },
  { label: "Approved", value: "approved" },
  { label: "Replaced", value: "replaced" },
  { label: "Needs manual review", value: "needs_manual_review" },
];

const topLevelLinks = [
  {
    href: "/admin/design-system",
    label: "Design System",
    description: "Official foundations and approved catalogue",
  },
  {
    href: "/admin/design-system/unverified-designs",
    label: "Unverified Designs",
    description: "Review queue, comparisons, and decisions",
  },
] as const;

function buildAlternativeMap(entries: CatalogueEntry[]): Record<string, AlternativeRecord> {
  return {
    actions: {
      id: "actions",
      label: "Actions",
      description: "Canonical button hierarchy and icon actions.",
      render: () => entries.find((entry) => entry.id === "actions")?.render() ?? null,
    },
    "button-link": {
      id: "button-link",
      label: "Button link",
      description: "Link-based action that still matches the button contract.",
      render: () => entries.find((entry) => entry.id === "button-link")?.render() ?? null,
    },
    "workspace-fields": {
      id: "workspace-fields",
      label: "Workspace fields",
      description: "Canonical labels, hints, inputs, selects, and textarea controls.",
      render: () => entries.find((entry) => entry.id === "workspace-fields")?.render() ?? null,
    },
    "document-dropzone-field": {
      id: "document-dropzone-field",
      label: "Document dropzone",
      description: "Approved attachment and document-upload surface.",
      render: () =>
        entries.find((entry) => entry.id === "document-dropzone-field")?.render() ?? null,
    },
    "operational-data-table": {
      id: "operational-data-table",
      label: "Operational data table",
      description: "Approved operational register shell and row-action pattern.",
      render: () =>
        entries.find((entry) => entry.id === "operational-data-table")?.render() ?? null,
    },
    "workspace-page-header": {
      id: "workspace-page-header",
      label: "Workspace page header",
      description: "Canonical route identity surface.",
      render: () =>
        entries.find((entry) => entry.id === "workspace-page-header")?.render() ?? null,
    },
    "workspace-section-heading": {
      id: "workspace-section-heading",
      label: "Workspace section heading",
      description: "Canonical major section title and supporting copy.",
      render: () =>
        entries.find((entry) => entry.id === "workspace-section-heading")?.render() ?? null,
    },
    "workspace-panel": {
      id: "workspace-panel",
      label: "Workspace panel",
      description: "Approved static and interactive surface contract.",
      render: () => entries.find((entry) => entry.id === "workspace-panel")?.render() ?? null,
    },
    "monolith-surface": {
      id: "monolith-surface",
      label: "Foundation surface",
      description: "Low-level approved surface owner.",
      render: () => entries.find((entry) => entry.id === "monolith-surface")?.render() ?? null,
    },
    "workspace-badges": {
      id: "workspace-badges",
      label: "Workspace badges",
      description: "Approved status and semantic badge family.",
      render: () => entries.find((entry) => entry.id === "workspace-badges")?.render() ?? null,
    },
    "workspace-feedback": {
      id: "workspace-feedback",
      label: "Workspace feedback",
      description: "Approved alerts, progress, empty, and route-state patterns.",
      render: () => entries.find((entry) => entry.id === "workspace-feedback")?.render() ?? null,
    },
    "cha-section": {
      id: "cha-section",
      label: "CHA section",
      description: "Operational section composition reference.",
      render: () => entries.find((entry) => entry.id === "cha-section")?.render() ?? null,
    },
    "accounting-panel": {
      id: "accounting-panel",
      label: "Accounting panel",
      description: "Approved module panel composition for accounting surfaces.",
      render: () => entries.find((entry) => entry.id === "accounting-panel")?.render() ?? null,
    },
    "crm-panel": {
      id: "crm-panel",
      label: "CRM panel",
      description: "Approved CRM module panel composition.",
      render: () => entries.find((entry) => entry.id === "crm-panel")?.render() ?? null,
    },
    "communication-panel": {
      id: "communication-panel",
      label: "Communication panel",
      description: "Approved communication workspace surface contract.",
      render: () =>
        entries.find((entry) => entry.id === "communication-panel")?.render() ?? null,
    },
    "admin-panel": {
      id: "admin-panel",
      label: "Admin panel",
      description: "Approved administration workspace panel contract.",
      render: () => entries.find((entry) => entry.id === "admin-panel")?.render() ?? null,
    },
  };
}

function groupCatalogueEntries(entries: CatalogueEntry[]) {
  const grouped = new Map<string, CatalogueEntry[]>();
  for (const entry of entries) {
    const current = grouped.get(entry.category) ?? [];
    current.push(entry);
    grouped.set(entry.category, current);
  }
  return Array.from(grouped.entries()).sort(([left], [right]) => left.localeCompare(right));
}

function renderCurrentPreview(kind: GovernancePreviewKind, title: string) {
  if (kind === "actions") {
    return (
      <div className="mnx-catalogue-source-preview mnx-catalogue-source-preview-actions">
        <div>
          <span>Source-derived specimen</span>
          <strong>{title}</strong>
          <p>Local button cluster with mixed emphasis and spacing.</p>
        </div>
        <div className="mnx-catalogue-inline-actions">
          <button type="button">Approve</button>
          <button type="button">Save draft</button>
          <button type="button">More</button>
        </div>
      </div>
    );
  }

  if (kind === "forms") {
    return (
      <div className="mnx-catalogue-source-preview">
        <div className="mnx-catalogue-source-grid">
          <label>
            <span>Shipment reference</span>
            <input defaultValue="MAA-260724" />
          </label>
          <label>
            <span>Status</span>
            <select defaultValue="draft">
              <option value="draft">Draft</option>
              <option value="ready">Ready</option>
            </select>
          </label>
        </div>
        <label>
          <span>Route-local notes</span>
          <textarea defaultValue="Unregistered form shell with local spacing." />
        </label>
      </div>
    );
  }

  if (kind === "tables") {
    return (
      <div className="mnx-catalogue-source-preview">
        <div className="mnx-catalogue-source-toolbar">
          <input defaultValue="Search records" />
          <button type="button">Filter</button>
          <button type="button">Export</button>
        </div>
        <div className="mnx-catalogue-source-table">
          <div>
            <strong>Job</strong>
            <strong>Status</strong>
            <strong>Action</strong>
          </div>
          <div>
            <span>MAA-260724</span>
            <span>Queued</span>
            <button type="button">Open</button>
          </div>
        </div>
      </div>
    );
  }

  if (kind === "headings") {
    return (
      <div className="mnx-catalogue-source-preview">
        <div>
          <span>Eyebrow</span>
          <h3>{title}</h3>
          <p>Route-local heading stack with custom copy spacing and a manually positioned supporting line.</p>
        </div>
      </div>
    );
  }

  if (kind === "dialogs") {
    return (
      <div className="mnx-catalogue-source-preview">
        <div>
          <span>Route-local confirmation</span>
          <strong>Replace this implementation?</strong>
          <p>Custom confirmation footer and spacing detected.</p>
        </div>
        <div className="mnx-catalogue-inline-actions">
          <button type="button">Cancel</button>
          <button type="button">Confirm</button>
        </div>
      </div>
    );
  }

  if (kind === "navigation") {
    return (
      <div className="mnx-catalogue-source-preview">
        <div className="mnx-catalogue-source-pills">
          <span>Overview</span>
          <span data-active="true">Approvals</span>
          <span>History</span>
        </div>
        <p>Custom route switcher with local active-state treatment.</p>
      </div>
    );
  }

  if (kind === "timeline") {
    return (
      <div className="mnx-catalogue-source-preview">
        <div className="mnx-catalogue-source-timeline">
          <span />
          <div>
            <strong>Reviewers assigned</strong>
            <p>Stage 02 with a route-local workflow row treatment.</p>
          </div>
        </div>
      </div>
    );
  }

  if (kind === "status") {
    return (
      <div className="mnx-catalogue-source-preview">
        <div className="mnx-catalogue-source-pills">
          <span data-tone="success">Approved</span>
          <span data-tone="warning">Pending</span>
          <span data-tone="danger">Blocked</span>
        </div>
        <p>Route-local semantic badges and warnings.</p>
      </div>
    );
  }

  if (kind === "attachments") {
    return (
      <div className="mnx-catalogue-source-preview">
        <div className="mnx-catalogue-source-upload">
          <strong>Upload purchase-order.pdf</strong>
          <p>Local attachment card with custom helper copy and action spacing.</p>
          <button type="button">Browse files</button>
        </div>
      </div>
    );
  }

  if (kind === "module") {
    return (
      <div className="mnx-catalogue-source-preview">
        <div className="mnx-catalogue-source-module">
          <strong>{title}</strong>
          <p>Reusable module composition detected in production but not fully documented in the Design System.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mnx-catalogue-source-preview">
      <div className="mnx-catalogue-token-list">
        <span>#3478F6</span>
        <span>17px</span>
        <span>7px radius</span>
        <span>custom shadow</span>
      </div>
      <p>Recurring token deviations detected from active stylesheets.</p>
    </div>
  );
}

function renderGovernanceApprovedPreview(finding: GovernanceFinding) {
  return (
    <div className="mnx-catalogue-approved-preview">
      {renderCurrentPreview(finding.previewKind, finding.name)}
    </div>
  );
}

function ReviewQueue({ snapshot, alternatives }: { snapshot: DesignSystemSnapshot; alternatives: Record<string, AlternativeRecord> }) {
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState<GovernanceStatus | "all">("all");
  const [moduleFilter, setModuleFilter] = React.useState("all");
  const [categoryFilter, setCategoryFilter] = React.useState("all");
  const [selectedId, setSelectedId] = React.useState(snapshot.findings[0]?.id ?? "");
  const [hoverAlternativeId, setHoverAlternativeId] = React.useState<string | null>(null);
  const [lockedAlternativeId, setLockedAlternativeId] = React.useState<string | null>(null);
  const [approveOpen, setApproveOpen] = React.useState(false);
  const [replaceOpen, setReplaceOpen] = React.useState(false);
  const [selectedCategory, setSelectedCategory] = React.useState<GovernanceCategory>(
    snapshot.categoryChoices[0] ?? "Pattern",
  );
  const [isPending, startTransition] = React.useTransition();

  const modules = React.useMemo(
    () => Array.from(new Set(snapshot.findings.flatMap((finding) => finding.modules))).sort(),
    [snapshot.findings],
  );
  const categories = React.useMemo(
    () => Array.from(new Set(snapshot.findings.map((finding) => finding.category))).sort(),
    [snapshot.findings],
  );

  const filtered = React.useMemo(() => {
    const searchValue = search.trim().toLowerCase();
    return snapshot.findings.filter((finding) => {
      if (status !== "all" && finding.status !== status) return false;
      if (moduleFilter !== "all" && !finding.modules.includes(moduleFilter)) return false;
      if (categoryFilter !== "all" && finding.category !== categoryFilter) return false;
      if (!searchValue) return true;
      return [
        finding.name,
        finding.designType,
        finding.category,
        ...finding.modules,
        ...finding.routes,
        ...finding.files,
        ...finding.sourceComponents,
      ]
        .join(" ")
        .toLowerCase()
        .includes(searchValue);
    });
  }, [categoryFilter, moduleFilter, search, snapshot.findings, status]);

  const selected = filtered.find((finding) => finding.id === selectedId) ?? filtered[0] ?? null;
  const activeAlternativeId = lockedAlternativeId ?? hoverAlternativeId ?? selected?.recommendedAlternativeIds[0] ?? null;
  const activeAlternative = activeAlternativeId ? alternatives[activeAlternativeId] : null;

  async function approveSelected() {
    if (!selected) return;
    startTransition(async () => {
      await approveDesignFindingAction({
        findingId: selected.id,
        approvedCategory: selectedCategory,
      });
      setApproveOpen(false);
      router.refresh();
    });
  }

  async function replaceSelected() {
    if (!selected || !activeAlternative) return;
    startTransition(async () => {
      await replaceDesignFindingAction({
        findingId: selected.id,
        replacementTargetId: activeAlternative.id,
        replacementTargetLabel: activeAlternative.label,
      });
      setReplaceOpen(false);
      router.refresh();
    });
  }

  async function markManualReview() {
    if (!selected) return;
    startTransition(async () => {
      await markDesignFindingManualReviewAction({ findingId: selected.id });
      router.refresh();
    });
  }

  if (filtered.length === 0) {
    return (
      <WorkspacePanel>
        <WorkspaceEmptyState
          title="All caught up"
          description="Every discovered pattern already matches the current filters. Try widening the search or browse the approved catalogue."
          action={{ href: "/admin/design-system", label: "Browse Design System" }}
        />
      </WorkspacePanel>
    );
  }

  return (
    <>
      <div className="mnx-catalogue-queue-summary">
        <WorkspaceMetric label="Pending review" value={String(snapshot.summary.pendingReview)} detail="Awaiting approval or replacement" />
        <WorkspaceMetric label="Potential duplicates" value={String(snapshot.summary.potentialDuplicates)} detail="Grouped for deliberate review" />
        <WorkspaceMetric label="Approved today" value={String(snapshot.summary.approved)} detail="Now part of the living Design System" />
        <WorkspaceMetric label="Coverage" value={`${snapshot.summary.coveragePercent}%`} detail="Approved or replaced findings" />
      </div>

      <WorkspacePanel>
        <WorkspacePanelHeader
          eyebrow="Review controls"
          title="Unverified design filters"
          description="Search by component name, route, file, or design type and narrow the queue by module, category, and status."
        />
        <div className="mnx-catalogue-filter-row">
          <label className="mnx-catalogue-filter-search">
            <Search size={16} aria-hidden="true" />
            <input
              aria-label="Search unverified designs"
              placeholder="Search component, route, file, or design type"
              value={search}
              onChange={(event) => setSearch(event.currentTarget.value)}
            />
          </label>
          <select aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.currentTarget.value as GovernanceStatus | "all")}>
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select aria-label="Filter by module" value={moduleFilter} onChange={(event) => setModuleFilter(event.currentTarget.value)}>
            <option value="all">All modules</option>
            {modules.map((module) => (
              <option key={module} value={module}>
                {module}
              </option>
            ))}
          </select>
          <select aria-label="Filter by category" value={categoryFilter} onChange={(event) => setCategoryFilter(event.currentTarget.value)}>
            <option value="all">All categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
      </WorkspacePanel>

      <div className="mnx-catalogue-review-shell">
        <WorkspacePanel className="mnx-catalogue-review-list">
          <WorkspacePanelHeader
            eyebrow="Unverified items"
            title={`${filtered.length} queue item${filtered.length === 1 ? "" : "s"}`}
            description="Select an item to inspect the current pattern, its known usage, and the recommended approved alternative."
          />
          <div className="mnx-catalogue-review-items" aria-label="Unverified design findings">
            {filtered.map((finding) => (
              <button
                key={finding.id}
                type="button"
                className="mnx-catalogue-review-item"
                aria-pressed={finding.id === selected?.id}
                onClick={() => {
                  setSelectedId(finding.id);
                  setLockedAlternativeId(null);
                  setHoverAlternativeId(null);
                }}
              >
                <div>
                  <span>{finding.status.replaceAll("_", " ")}</span>
                  <strong>{finding.name}</strong>
                  <p>{finding.modules.join(", ")}</p>
                </div>
                <Badge variant="secondary">{finding.occurrences} uses</Badge>
              </button>
            ))}
          </div>
        </WorkspacePanel>

        {selected ? (
          <WorkspacePanel className="mnx-catalogue-review-detail">
            <WorkspacePanelHeader
              eyebrow="Review"
              title={selected.name}
              description={selected.description}
              actions={<WorkspaceBadge variant="accent">{selected.designType}</WorkspaceBadge>}
            />

            <div className="mnx-catalogue-review-meta">
              <MonolithSurface className="mnx-catalogue-meta-card">
                <strong>Source</strong>
                <p>Modules: {selected.modules.join(", ")}</p>
                <p>Routes: {selected.routes.slice(0, 4).join(", ") || "Module-owned components"}</p>
                <p>Occurrences: {selected.occurrences}</p>
              </MonolithSurface>
              <MonolithSurface className="mnx-catalogue-meta-card">
                <strong>Recommendation</strong>
                <p>{selected.similarityLabel}</p>
                <p>{selected.replacementTargetLabel ? `Previously mapped to ${selected.replacementTargetLabel}.` : "No replacement committed yet."}</p>
              </MonolithSurface>
            </div>

            <div className="mnx-catalogue-comparison-shell">
              <div>
                <p className="mnx-catalogue-comparison-label">Current</p>
                <div className="mnx-catalogue-preview-frame">
                  {renderCurrentPreview(selected.previewKind, selected.name)}
                </div>
              </div>
              <div>
                <p className="mnx-catalogue-comparison-label">Design System</p>
                <div className="mnx-catalogue-preview-frame">
                  {activeAlternative ? activeAlternative.render() : <WorkspaceState variant="empty" eyebrow="No alternative" title="No approved comparison yet" description="This pattern still needs a manual approved comparison." icon={<FileSearch size={20} aria-hidden="true" />} />}
                </div>
              </div>
            </div>

            <div className="mnx-catalogue-alternative-grid" aria-label="Suggested alternatives">
              {selected.recommendedAlternativeIds.map((alternativeId) => {
                const alternative = alternatives[alternativeId];
                if (!alternative) return null;
                const locked = activeAlternativeId === alternativeId;
                return (
                  <button
                    key={alternativeId}
                    type="button"
                    className="mnx-catalogue-alternative"
                    data-active={locked ? "true" : undefined}
                    onClick={() =>
                      setLockedAlternativeId((current) =>
                        current === alternativeId ? null : alternativeId,
                      )
                    }
                    onMouseEnter={() => setHoverAlternativeId(alternativeId)}
                    onMouseLeave={() => setHoverAlternativeId(null)}
                    onFocus={() => setHoverAlternativeId(alternativeId)}
                    onBlur={() => setHoverAlternativeId(null)}
                  >
                    <div>
                      <strong>{alternative.label}</strong>
                      <p>{alternative.description}</p>
                    </div>
                    <Badge variant="secondary">{alternativeId === selected.recommendedAlternativeIds[0] ? "Recommended" : "Alternative"}</Badge>
                  </button>
                );
              })}
            </div>

            <div className="mnx-catalogue-difference-grid">
              {selected.differences.map((difference) => (
                <MonolithSurface className="mnx-catalogue-meta-card" key={difference}>
                  <strong>Difference</strong>
                  <p>{difference}</p>
                </MonolithSurface>
              ))}
            </div>

            <WorkspaceAlert variant="info">
              <ShieldCheck size={16} aria-hidden="true" />
              Automatic source-code replacement is intentionally conservative here. Review decisions are persisted immediately, while real UI swaps stay queued for developer-safe implementation guidance.
            </WorkspaceAlert>

            <div className="mnx-catalogue-inline-actions">
              <Button onClick={() => setApproveOpen(true)}>
                <CheckCircle2 size={16} aria-hidden="true" />
                Approve current design
              </Button>
              <Button variant="outline" onClick={() => setReplaceOpen(true)}>
                <GitCompare size={16} aria-hidden="true" />
                Replace with existing
              </Button>
              <Button variant="inverse" onClick={() => void markManualReview()} disabled={isPending}>
                <RefreshCcw size={16} aria-hidden="true" />
                Needs manual review
              </Button>
            </div>

            <div className="mnx-catalogue-history">
              <strong>Review history</strong>
              {selected.history.length === 0 ? (
                <p>No persisted review history yet.</p>
              ) : (
                selected.history.map((entry) => (
                  <p key={`${entry.at}-${entry.note}`}>
                    {new Date(entry.at).toLocaleString()} • {entry.actor} • {entry.note}
                  </p>
                ))
              )}
            </div>
          </WorkspacePanel>
        ) : null}
      </div>

      <Modal
        open={approveOpen}
        onClose={() => setApproveOpen(false)}
        title="Approve current design?"
        description={
          selected
            ? `This will add ${selected.name} to the Design System, mark ${selected.occurrences} usage(s) as approved, and make it available as a future comparison target.`
            : undefined
        }
      >
        <div className="mnx-catalogue-modal-stack">
          <WorkspaceField label="Design-system category" htmlFor="approve-category">
            <select
              id="approve-category"
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.currentTarget.value as GovernanceCategory)}
            >
              {snapshot.categoryChoices.map((choice) => (
                <option key={choice} value={choice}>
                  {choice}
                </option>
              ))}
            </select>
          </WorkspaceField>
          <div className="mnx-catalogue-inline-actions">
            <Button variant="outline" onClick={() => setApproveOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void approveSelected()} disabled={isPending}>
              Approve &amp; add
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={replaceOpen}
        onClose={() => setReplaceOpen(false)}
        title="Replace this pattern with an approved alternative?"
        description={
          selected && activeAlternative
            ? `This will record ${activeAlternative.label} as the approved replacement for ${selected.name}. The queue will keep the affected files visible for safe developer follow-up.`
            : undefined
        }
      >
        <div className="mnx-catalogue-modal-stack">
          <p>{activeAlternative ? `Replacement target: ${activeAlternative.label}` : "No replacement selected yet."}</p>
          <p>{selected ? `Affected usage count: ${selected.occurrences}` : null}</p>
          <div className="mnx-catalogue-inline-actions">
            <Button variant="outline" onClick={() => setReplaceOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void replaceSelected()} disabled={isPending || !activeAlternative}>
              Replace
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

export function DesignSystemClient({ mode, snapshot }: Props) {
  const pathname = usePathname();
  const catalogueEntries = React.useMemo(() => [...sharedCatalogue, ...moduleCatalogue], []);
  const groupedEntries = React.useMemo(() => groupCatalogueEntries(catalogueEntries), [catalogueEntries]);
  const alternatives = React.useMemo(() => buildAlternativeMap(catalogueEntries), [catalogueEntries]);
  const approvedFindings = React.useMemo(
    () => snapshot.findings.filter((finding) => finding.status === "approved"),
    [snapshot.findings],
  );
  const isReviewMode = mode === "review";

  return (
    <main className="mnx-catalogue-page" data-production-catalogue="true">
      <WorkspacePageHeader
        className="mnx-catalogue-page-header"
        eyebrow="Monolith design governance"
        title={isReviewMode ? "Unverified Designs" : "Admin Design System"}
        description={
          isReviewMode
            ? "Review every discovered Monolith UI pattern that is not yet represented in the official Design System. Compare current implementations with approved alternatives, approve new patterns, or queue safe replacements."
            : "The living inventory of approved Monolith foundations, shared components, module compositions, and review-approved patterns."
        }
        icon={isReviewMode ? <ListChecks aria-hidden="true" /> : <Palette aria-hidden="true" />}
        actions={
          isReviewMode ? (
            <ButtonLink href="/admin/design-system" variant="outline">
              <LayoutDashboard size={16} aria-hidden="true" />
              Browse approved catalogue
            </ButtonLink>
          ) : (
            <ButtonLink href="/admin/design-system/unverified-designs">
              <Sparkles size={16} aria-hidden="true" />
              Open unverified queue
            </ButtonLink>
          )
        }
      />

      <section className="mnx-catalogue-overview">
        <WorkspacePanel className="mnx-catalogue-overview-panel">
          <WorkspacePanelHeader
            eyebrow="Navigate"
            title="Design-system sections"
            description="Move between the official catalogue and the active governance review queue."
          />
          <div className="mnx-catalogue-top-links" aria-label="Design-system sections">
            {topLevelLinks.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="mnx-catalogue-top-link"
                  aria-current={active ? "page" : undefined}
                >
                  <div>
                    <strong>{link.label}</strong>
                    <p>{link.description}</p>
                  </div>
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              );
            })}
          </div>
        </WorkspacePanel>

        <WorkspacePanel className="mnx-catalogue-overview-panel">
          <WorkspacePanelHeader
            eyebrow="Snapshot"
            title={isReviewMode ? "Review queue health" : "Design-system coverage"}
            description={
              isReviewMode
                ? "Track the current approval workload, duplicate pressure, and standardization progress."
                : "See the current balance between approved inventory and the patterns still waiting for governance."
            }
          />
          <div className="mnx-catalogue-summary-grid">
            <WorkspaceMetric label="Approved patterns" value={String(catalogueEntries.length + approvedFindings.length)} detail="Registered live catalogue plus reviewed additions" />
            <WorkspaceMetric label="Unverified" value={String(snapshot.summary.pendingReview)} detail="Pending design review queue" />
            <WorkspaceMetric label="Potential duplicates" value={String(snapshot.summary.potentialDuplicates)} detail="Grouped by likely overlapping component families" />
            <WorkspaceMetric label="Coverage" value={`${snapshot.summary.coveragePercent}%`} detail="Approved or replaced findings" />
          </div>
        </WorkspacePanel>
      </section>

      {isReviewMode ? (
        <>
          <WorkspaceSectionHeading
            index="01"
            title="Review Queue"
            description="Inspect current implementations, compare them with approved Design System alternatives, and commit a governance decision."
            badge={<WorkspaceBadge variant="accent">Live governance</WorkspaceBadge>}
          />
          <ReviewQueue snapshot={snapshot} alternatives={alternatives} />
        </>
      ) : (
        <>
          <section className="mnx-catalogue-intro-grid">
            <WorkspacePanel className="mnx-catalogue-intro-panel">
              <WorkspacePanelHeader
                eyebrow="Inventory overview"
                title="What lives here"
                description="This page is the approved front door for reusable Monolith UI. Each section below groups the real production components by responsibility, not by scattered demos."
              />
              <div className="mnx-catalogue-intro-list">
                <MonolithSurface className="mnx-catalogue-meta-card">
                  <strong>Foundations and shared primitives</strong>
                  <p>Buttons, fields, surfaces, feedback, and base interaction patterns.</p>
                </MonolithSurface>
                <MonolithSurface className="mnx-catalogue-meta-card">
                  <strong>Module compositions</strong>
                  <p>Approved operational shells from CHA, Accounting, CRM, People, Performance, Communication, and Admin.</p>
                </MonolithSurface>
                <MonolithSurface className="mnx-catalogue-meta-card">
                  <strong>Governed additions</strong>
                  <p>Patterns promoted from the unverified queue after review and category assignment.</p>
                </MonolithSurface>
              </div>
            </WorkspacePanel>

            <WorkspacePanel className="mnx-catalogue-intro-panel">
              <WorkspacePanelHeader
                eyebrow="How to use it"
                title="Recommended flow"
                description="Start with the grouped catalogue below. If a production screen uses a reusable pattern that is missing here, review it in Unverified Designs before introducing another variation."
              />
              <div className="mnx-catalogue-intro-list">
                <MonolithSurface className="mnx-catalogue-meta-card">
                  <strong>1. Browse the approved group</strong>
                  <p>Use the section headings to find the right category first.</p>
                </MonolithSurface>
                <MonolithSurface className="mnx-catalogue-meta-card">
                  <strong>2. Compare if needed</strong>
                  <p>Open the unverified queue when a route-local pattern does not match the approved inventory.</p>
                </MonolithSurface>
                <MonolithSurface className="mnx-catalogue-meta-card">
                  <strong>3. Standardize deliberately</strong>
                  <p>Approve useful patterns or map them to an existing approved alternative before more drift accumulates.</p>
                </MonolithSurface>
              </div>
            </WorkspacePanel>
          </section>

          <WorkspaceSectionHeading
            index="01"
            title="Official Inventory"
            description="The current Design System is composed from live production components only. Each specimen below renders the real shared or module-owned implementation."
            badge={<WorkspaceBadge variant="accent">Single source of truth</WorkspaceBadge>}
          />

          <WorkspacePanel>
            <WorkspacePanelHeader
              eyebrow="Coverage"
              title="Existing design-system inventory"
              description={`Generated ${new Date(snapshot.generatedAt).toLocaleString()}. Use the unverified queue to review reusable patterns that are active in production but not yet represented here.`}
            />
            <div className="mnx-catalogue-inventory-grid">
              <MonolithSurface className="mnx-catalogue-meta-card">
                <strong>Shared + foundation entries</strong>
                <p>{sharedCatalogue.length} live shared specimens are officially documented today.</p>
              </MonolithSurface>
              <MonolithSurface className="mnx-catalogue-meta-card">
                <strong>Module composition entries</strong>
                <p>{moduleCatalogue.length} module-owned compositions are currently represented.</p>
              </MonolithSurface>
              <MonolithSurface className="mnx-catalogue-meta-card">
                <strong>Review-approved additions</strong>
                <p>{approvedFindings.length} previously unverified patterns have now been approved into the living Design System.</p>
              </MonolithSurface>
            </div>
          </WorkspacePanel>

          {approvedFindings.length > 0 ? (
            <>
              <WorkspaceSectionHeading
                index="02"
                title="Approved From Review Queue"
                description="These patterns were discovered in production first and then approved through the unverified-design review flow."
                badge={<WorkspaceBadge variant="success">Governed</WorkspaceBadge>}
              />
              <div className="mnx-catalogue-live-grid">
                {approvedFindings.map((finding) => (
                  <article className="mnx-catalogue-live-card" key={finding.id}>
                    <header>
                      <div>
                        <span>Approved via governance</span>
                        <h3>{finding.name}</h3>
                        <p>{finding.description}</p>
                      </div>
                      <Badge variant="success">Approved</Badge>
                    </header>
                    <div className="mnx-catalogue-live-preview">
                      {renderGovernanceApprovedPreview(finding)}
                    </div>
                    <footer>
                      <p>{finding.modules.join(", ")}</p>
                    </footer>
                  </article>
                ))}
              </div>
            </>
          ) : null}

          <WorkspaceSectionHeading
            index="03"
            title="Live Monolith Catalogue"
            description="Every specimen below renders the registered production component or composition used elsewhere in Monolith."
            badge={<WorkspaceBadge variant="accent">Production-backed</WorkspaceBadge>}
          />

          {groupedEntries.map(([category, entries]) => (
            <section className="mnx-catalogue-live-group" key={category}>
              <header className="mnx-catalogue-live-group-header">
                <div>
                  <span>{category}</span>
                  <h2>{category}</h2>
                  <p>{entries.length} official specimen(s) grouped under this function</p>
                </div>
              </header>
              <div className="mnx-catalogue-live-grid">
                {entries.map((entry) => (
                  <article
                    className="mnx-catalogue-live-card"
                    data-catalogue-id={entry.id}
                    id={`catalogue-${entry.id}`}
                    key={entry.id}
                  >
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
            </section>
          ))}

          <WorkspaceSectionHeading
            index="04"
            title="Unverified Designs"
            description="The governance queue tracks patterns still active in production but not yet represented in the Design System. Use it to compare, approve, or replace them."
            badge={<WorkspaceBadge variant="warning">Needs review</WorkspaceBadge>}
          />

          <WorkspacePanel>
            <WorkspacePanelHeader
              eyebrow="Governance queue"
              title="Unverified design coverage"
              description="This queue is a working governance feature, not a screenshot archive. Each item keeps live source-derived previews, usage metadata, and an approved comparison target."
              actions={
                <ButtonLink href="/admin/design-system/unverified-designs">
                  <Layers3 size={16} aria-hidden="true" />
                  Open review queue
                </ButtonLink>
              }
            />
            <div className="mnx-catalogue-inventory-grid">
              <MonolithSurface className="mnx-catalogue-meta-card">
                <strong>Pending review</strong>
                <p>{snapshot.summary.pendingReview} discovered patterns still need a governance decision.</p>
              </MonolithSurface>
              <MonolithSurface className="mnx-catalogue-meta-card">
                <strong>Potential duplicates</strong>
                <p>{snapshot.summary.potentialDuplicates} grouped duplicate families are ready for comparison.</p>
              </MonolithSurface>
              <MonolithSurface className="mnx-catalogue-meta-card">
                <strong>Token deviations</strong>
                <p>{snapshot.summary.manualReview} recurring token deviations are tracked separately from reusable component patterns.</p>
              </MonolithSurface>
            </div>
          </WorkspacePanel>
        </>
      )}
    </main>
  );
}
