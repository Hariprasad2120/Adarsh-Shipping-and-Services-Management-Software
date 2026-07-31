"use client";

import { AlertTriangle, Check, ChevronLeft, ChevronRight, Download, FileDown, FileUp, MoreHorizontal, Plus, Search, ShieldAlert, SlidersHorizontal, X } from "lucide-react";
import { useState, type ChangeEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  ChaAction,
  ChaDialogLayer,
  ChaFilterMenu,
  ChaPanel,
  ChaStatus,
  ChaTable,
  ChaToolbar,
} from "@/components/monolith/cha-workspace";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/monolith/dropdown-menu";
import {
  WorkspaceAction,
  WorkspaceAlert,
  WorkspaceBadge,
  WorkspaceEmptyTableRow,
  WorkspaceInput,
  WorkspacePanelHeader,
  WorkspaceState,
} from "@/components/monolith/workspace";
import type { ChaCustomsFeatureFlags } from "../feature-flags";
import type { ChaCustomsRouteMetadata } from "../routes";

export type CustomsColumnFilter = {
  key: string;
  label: string;
  value?: string;
};

export type CustomsSortState = {
  key: string;
  direction: "asc" | "desc";
} | null;

export type CustomsMasterColumn<T> = {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  sortable?: boolean;
  filterable?: boolean;
  sticky?: "start" | "end";
  width?: string;
};

export type CustomsPaginationState = {
  page: number;
  pageSize: number;
  totalCount: number;
};

export type CustomsSaveState = "idle" | "dirty" | "saving" | "saved" | "error";

export type CustomsTabStatus = "not_started" | "in_progress" | "complete" | "blocked";

export type CustomsMasterSearchPatch = {
  search?: string | null;
  page?: number;
  pageSize?: number;
  sortKey?: string | null;
  sortDirection?: "asc" | "desc" | null;
  filters?: Record<string, string | null | undefined>;
};

export function updateCustomsMasterSearchParams(
  current: URLSearchParams | string,
  patch: CustomsMasterSearchPatch,
) {
  const params = new URLSearchParams(typeof current === "string" ? current : current.toString());

  if ("search" in patch) setOrDelete(params, "q", patch.search);
  if (typeof patch.page === "number") params.set("page", String(Math.max(1, patch.page)));
  if (typeof patch.pageSize === "number") params.set("pageSize", String(Math.max(1, patch.pageSize)));
  if ("sortKey" in patch) setOrDelete(params, "sort", patch.sortKey);
  if ("sortDirection" in patch) setOrDelete(params, "dir", patch.sortDirection);

  if (patch.filters) {
    for (const [key, value] of Object.entries(patch.filters)) {
      setOrDelete(params, `filter.${key}`, value);
    }
  }

  return params;
}

export function canShowCustomsRoute(
  route: ChaCustomsRouteMetadata,
  flags: ChaCustomsFeatureFlags,
  caps: Record<string, boolean>,
) {
  return Boolean(caps[route.requiredPermission]) && flags[route.requiredFlag] === true;
}

function setOrDelete(params: URLSearchParams, key: string, value: string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    params.delete(key);
  } else {
    params.set(key, value);
  }
}

export function CustomsMasterHeader({
  actions,
  lastImportedAt,
  sourceVersion,
  title,
}: {
  actions?: ReactNode;
  lastImportedAt?: ReactNode;
  sourceVersion?: ReactNode;
  title: ReactNode;
}) {
  return (
    <ChaPanel className="mnx-customs-master-header">
      <WorkspacePanelHeader
        eyebrow="Customs master data"
        title={title}
        description={
          <span className="mnx-customs-master-meta">
            <span>Source version: <strong>{sourceVersion ?? "Not imported"}</strong></span>
            <span>Last imported: <strong>{lastImportedAt ?? "Pending"}</strong></span>
          </span>
        }
        actions={actions}
      />
    </ChaPanel>
  );
}

export function CustomsMasterToolbar({
  activeFilterCount = 0,
  children,
  onSearchChange,
  search,
}: {
  activeFilterCount?: number;
  children?: ReactNode;
  onSearchChange?: (value: string) => void;
  search?: string;
}) {
  const [filtersOpen, setFiltersOpen] = useState(false);

  return (
    <ChaToolbar className="mnx-customs-master-toolbar">
      <label className="mnx-customs-search">
        <Search size={16} aria-hidden="true" />
        <span className="sr-only">Search customs master data</span>
        <WorkspaceInput
          value={search ?? ""}
          onChange={(event: ChangeEvent<HTMLInputElement>) => onSearchChange?.(event.target.value)}
          placeholder="Search"
        />
      </label>
      <div className="mnx-customs-toolbar-actions">
        <ChaFilterMenu
          activeCount={activeFilterCount}
          label="Filters"
          open={filtersOpen}
          onOpenChange={setFiltersOpen}
        >
          <div className="mnx-customs-filter-panel">
            <WorkspacePanelHeader eyebrow="Filters" title="Column filters" />
            {children}
          </div>
        </ChaFilterMenu>
        <WorkspaceAction size="compact" variant="secondary">
          <FileDown size={14} aria-hidden="true" />
          Download
        </WorkspaceAction>
        <WorkspaceAction size="compact">
          <FileUp size={14} aria-hidden="true" />
          Upload
        </WorkspaceAction>
      </div>
    </ChaToolbar>
  );
}

export function CustomsMasterTable<T extends { id: string }>({
  columns,
  emptyMessage = "No customs master rows match the current view.",
  getRowLabel,
  pagination,
  rows,
  sort,
}: {
  columns: CustomsMasterColumn<T>[];
  emptyMessage?: ReactNode;
  getRowLabel?: (row: T) => string;
  pagination?: ReactNode;
  rows: T[];
  sort?: CustomsSortState;
}) {
  return (
    <div className="mnx-customs-table-region" role="region" aria-label="Customs master table" tabIndex={0}>
      <ChaTable className="mnx-customs-master-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={cn(
                  column.sticky === "start" && "is-sticky-start",
                  column.sticky === "end" && "is-sticky-end",
                )}
                style={column.width ? { width: column.width } : undefined}
                aria-sort={sort?.key === column.key ? (sort.direction === "asc" ? "ascending" : "descending") : undefined}
              >
                <span className="mnx-customs-table-heading">
                  {column.header}
                  {column.filterable ? <SlidersHorizontal size={13} aria-hidden="true" /> : null}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <WorkspaceEmptyTableRow colSpan={columns.length}>{emptyMessage}</WorkspaceEmptyTableRow>
          ) : (
            rows.map((row) => (
              <tr key={row.id} aria-label={getRowLabel?.(row)}>
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      column.sticky === "start" && "is-sticky-start",
                      column.sticky === "end" && "is-sticky-end",
                    )}
                  >
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </ChaTable>
      {pagination}
    </div>
  );
}

export function CustomsPagination({
  onPageChange,
  onPageSizeChange,
  page,
  pageSize,
  totalCount,
}: CustomsPaginationState & {
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const from = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(totalCount, page * pageSize);

  return (
    <footer className="mnx-customs-pagination" aria-label="Customs master pagination">
      <span>{from}-{to} of {totalCount}</span>
      <label>
        Rows per page
        <select value={pageSize} onChange={(event) => onPageSizeChange?.(Number(event.target.value))}>
          {[10, 25, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
        </select>
      </label>
      <div>
        <button type="button" onClick={() => onPageChange?.(page - 1)} disabled={page <= 1} aria-label="Previous page">
          <ChevronLeft size={16} aria-hidden="true" />
        </button>
        <button type="button" onClick={() => onPageChange?.(page + 1)} disabled={page >= totalPages} aria-label="Next page">
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      </div>
    </footer>
  );
}

export function CustomsRowActionMenu({
  canEdit = true,
  canToggle = true,
  onDeactivate,
  onEdit,
}: {
  canEdit?: boolean;
  canToggle?: boolean;
  onDeactivate?: () => void;
  onEdit?: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="mnx-icon-button" type="button" aria-label="Open row actions">
          <MoreHorizontal size={16} aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Row actions</DropdownMenuLabel>
        <DropdownMenuItem disabled={!canEdit} onSelect={onEdit}>Edit row</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={!canToggle} onSelect={onDeactivate}>Deactivate</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function CustomsBulkImportPreview({
  inserted,
  rejected,
  unchanged,
  updated,
}: {
  inserted: number;
  rejected: number;
  unchanged: number;
  updated: number;
}) {
  return (
    <div className="mnx-customs-import-preview" aria-label="Bulk import dry-run summary">
      <span><strong>{inserted}</strong> insert</span>
      <span><strong>{updated}</strong> update</span>
      <span><strong>{unchanged}</strong> unchanged</span>
      <span><strong>{rejected}</strong> reject</span>
    </div>
  );
}

export function CustomsMasterEditDialog({
  children,
  onClose,
  open,
  title = "Edit customs master row",
}: {
  children: ReactNode;
  onClose: () => void;
  open: boolean;
  title?: ReactNode;
}) {
  return (
    <ChaDialogLayer labelledBy="customs-master-edit-title" onClose={onClose} open={open} size="wide">
      <div className="mnx-customs-dialog-content">
        <WorkspacePanelHeader eyebrow="Master administration" title={<span id="customs-master-edit-title">{title}</span>} />
        {children}
      </div>
    </ChaDialogLayer>
  );
}

export function CustomsFilingTabs({
  tabs,
}: {
  tabs: { id: string; label: ReactNode; status: CustomsTabStatus; selected?: boolean; onSelect?: () => void }[];
}) {
  return (
    <div className="mnx-customs-filing-tabs" role="tablist" aria-label="Customs filing subtabs">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={tab.selected ? "true" : "false"}
          className={cn(tab.selected && "is-selected")}
          onClick={tab.onSelect}
        >
          <span>{tab.label}</span>
          <CustomsTabBadge status={tab.status} />
        </button>
      ))}
    </div>
  );
}

export function CustomsTabBadge({ status }: { status: CustomsTabStatus }) {
  const variant = status === "complete" ? "success" : status === "blocked" ? "danger" : status === "in_progress" ? "warning" : "neutral";
  return <WorkspaceBadge variant={variant}>{status.replace("_", " ")}</WorkspaceBadge>;
}

export function CustomsFilingSection({
  actions,
  children,
  description,
  readonly,
  title,
}: {
  actions?: ReactNode;
  children: ReactNode;
  description?: ReactNode;
  readonly?: boolean;
  title: ReactNode;
}) {
  return (
    <ChaPanel className={cn("mnx-customs-filing-section", readonly && "is-readonly")}>
      <WorkspacePanelHeader
        eyebrow="Filing workspace"
        title={title}
        description={description}
        actions={readonly ? <ChaStatus variant="warning">Read only after signing</ChaStatus> : actions}
      />
      {children}
    </ChaPanel>
  );
}

export function CustomsFormGrid({
  children,
  columns = 3,
}: {
  children: ReactNode;
  columns?: 2 | 3 | 4;
}) {
  return <div className="mnx-customs-form-grid" data-columns={columns}>{children}</div>;
}

export function CustomsLineItemTable({
  actions,
  children,
  footer,
  title,
}: {
  actions?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  title: ReactNode;
}) {
  return (
    <div className="mnx-customs-line-table">
      <div className="mnx-customs-line-table-header">
        <strong>{title}</strong>
        <div>{actions ?? <ChaAction size="compact"><Plus size={14} aria-hidden="true" /> New row</ChaAction>}</div>
      </div>
      {children}
      {footer ? <div className="mnx-customs-totals-footer">{footer}</div> : null}
    </div>
  );
}

export function CustomsSaveIndicator({ state }: { state: CustomsSaveState }) {
  const labels: Record<CustomsSaveState, string> = {
    idle: "No changes",
    dirty: "Unsaved changes",
    saving: "Saving",
    saved: "Saved",
    error: "Save error",
  };
  const variant = state === "saved" ? "success" : state === "error" ? "danger" : state === "dirty" || state === "saving" ? "warning" : "neutral";
  return <WorkspaceBadge variant={variant} aria-live="polite">{labels[state]}</WorkspaceBadge>;
}

export function CustomsValidationSummary({
  errors,
}: {
  errors: { fieldId: string; label: ReactNode; message: ReactNode }[];
}) {
  if (errors.length === 0) return null;
  return (
    <WorkspaceAlert variant="danger" className="mnx-customs-validation-summary">
      <AlertTriangle size={16} aria-hidden="true" />
      <div>
        <strong>Validation needs attention</strong>
        <ul>
          {errors.map((error) => (
            <li key={error.fieldId}>
              <a href={`#${error.fieldId}`}>{error.label}</a>
              <span>{error.message}</span>
            </li>
          ))}
        </ul>
      </div>
    </WorkspaceAlert>
  );
}

export function CustomsDirtyStateWarning({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <WorkspaceAlert variant="warning" className="mnx-customs-dirty-warning">
      <ShieldAlert size={16} aria-hidden="true" />
      <span>This filing draft has unsaved changes.</span>
    </WorkspaceAlert>
  );
}

export function CustomsConcurrencyConflictDialog({
  onClose,
  onReload,
  open,
}: {
  onClose: () => void;
  onReload?: () => void;
  open: boolean;
}) {
  return (
    <ChaDialogLayer labelledBy="customs-conflict-title" onClose={onClose} open={open} size="compact">
      <div className="mnx-customs-dialog-content">
        <WorkspacePanelHeader
          eyebrow="Draft conflict"
          title={<span id="customs-conflict-title">Another user updated this draft</span>}
          description="Reload the latest draft before making further changes."
        />
        <div className="mnx-customs-dialog-actions">
          <WorkspaceAction variant="secondary" onClick={onClose}><X size={14} aria-hidden="true" /> Close</WorkspaceAction>
          <WorkspaceAction onClick={onReload}><Check size={14} aria-hidden="true" /> Reload draft</WorkspaceAction>
        </div>
      </div>
    </ChaDialogLayer>
  );
}

export function CustomsPermissionDeniedState() {
  return (
    <WorkspaceState
      variant="permission"
      eyebrow="Customs permissions"
      title="Customs workspace access required"
      description="This customs route is hidden unless both the feature flag and the matching permission are enabled."
      icon={<ShieldAlert size={22} aria-hidden="true" />}
    />
  );
}

export function CustomsDownloadAction() {
  return (
    <WorkspaceAction size="compact" variant="secondary">
      <Download size={14} aria-hidden="true" />
      Download filtered data
    </WorkspaceAction>
  );
}
