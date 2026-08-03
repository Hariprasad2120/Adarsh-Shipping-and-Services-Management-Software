"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef, useState, useTransition, type FormEvent } from "react";
import { Check, FileClock, History, Pencil, Plus, Search, Upload, X } from "lucide-react";
import {
  CustomsBulkImportPreview,
  CustomsMasterEditDialog,
  CustomsMasterHeader,
  CustomsMasterTable,
  CustomsMasterToolbar,
  CustomsPagination,
  CustomsRowActionMenu,
  updateCustomsMasterSearchParams,
  type CustomsMasterColumn,
} from "@/modules/cha/customs/ui/customs-workspace";
import type {
  CustomsMasterPageConfig,
  CustomsMasterPageField,
} from "@/modules/cha/customs/masters/page-config";
import type { CustomsMasterKey } from "@/modules/cha/customs/masters/definitions";
import {
  applyCustomsMasterImportFromFormAction,
  previewCustomsMasterImportFromFormAction,
  saveCustomsMasterRecordAction,
  toggleCustomsMasterRecordAction,
  type MasterActionResult,
} from "../actions";
import {
  ChaAction,
  WorkspaceAction,
  WorkspaceAlert,
  WorkspaceBadge,
  WorkspaceField,
  WorkspaceInput,
  WorkspaceSelect,
  WorkspaceTextarea,
} from "@/components/monolith";
import { DateInput } from "@/components/monolith/date-input";

export type CustomsMasterGridRow = Record<string, unknown> & {
  id: string;
  status?: string;
  datasetVersion?: string;
};

export type CustomsMasterRegisterProps = {
  canImport: boolean;
  canManage: boolean;
  config: CustomsMasterPageConfig;
  downloadHref: string;
  rows: CustomsMasterGridRow[];
  sourceVersion: string | null;
  lastImportedAt: string | null;
  total: number;
  page: number;
  pageSize: number;
  search: string;
  sortKey: string | null;
  sortDirection: "asc" | "desc";
  filters: Record<string, string>;
  status?: string;
};

type ImportPreviewPayload = {
  insert: number;
  update: number;
  unchanged: number;
  reject: number;
  rejectionReportCsv: string;
};

export function CustomsMasterRegister({
  canImport,
  canManage,
  config,
  downloadHref,
  filters,
  lastImportedAt,
  page,
  pageSize,
  rows,
  search,
  sortDirection,
  sortKey,
  sourceVersion,
  status,
  total,
}: CustomsMasterRegisterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [editingRow, setEditingRow] = useState<CustomsMasterGridRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [result, setResult] = useState<MasterActionResult | null>(null);
  const [preview, setPreview] = useState<ImportPreviewPayload | null>(null);
  const [isPending, startTransition] = useTransition();
  const importFormRef = useRef<HTMLFormElement | null>(null);
  const tableFields = config.fields.filter((field) => field.table !== false);

  const columns: CustomsMasterColumn<CustomsMasterGridRow>[] = [
      {
        key: "actions",
        header: "Actions",
        sticky: "start",
        width: "5rem",
        cell: (row) => (
          <CustomsRowActionMenu
            canEdit={canManage}
            canToggle={canManage}
            onEdit={() => {
              setResult(null);
              setEditingRow(row);
            }}
            onDeactivate={() => {
              const nextStatus = row.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
              const reason = window.prompt(
                nextStatus === "ACTIVE"
                  ? "Reason for activating this customs master row"
                  : "Reason for deactivating this customs master row",
              );
              if (!reason) return;
              startTransition(async () => {
                setResult(await toggleCustomsMasterRecordAction(config.key, row.id, nextStatus, reason));
                router.refresh();
              });
            }}
          />
        ),
      },
      ...tableFields.map((field) => ({
        key: field.key,
        header: (
          <button
            className="mnx-customs-sort-button"
            type="button"
            onClick={() => updateSearch({ sortKey: field.key, sortDirection: sortKey === field.key && sortDirection === "asc" ? "desc" : "asc", page: 1 })}
          >
            {field.label}
          </button>
        ),
        cell: (row: CustomsMasterGridRow) => renderValue(row[field.key], field, row),
        sortable: true,
        filterable: true,
        sticky: field.sticky,
        width: field.width,
      })),
      {
        key: "audit",
        header: "Audit",
        sticky: "end",
        width: "7rem",
        cell: (row) => (
          <span className="mnx-customs-audit-link">
            <History size={14} aria-hidden="true" />
            {String(row.updatedAt ?? row.createdAt ?? "Pending")}
          </span>
        ),
      },
  ];

  function updateSearch(patch: Parameters<typeof updateCustomsMasterSearchParams>[1]) {
    const next = updateCustomsMasterSearchParams(searchParams, patch);
    router.replace(`${pathname}?${next.toString()}`);
  }

  async function submitRow(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const saved = await saveCustomsMasterRecordAction(config.key, editingRow?.id ?? null, formData);
      setResult(saved);
      if (saved.ok) {
        setEditingRow(null);
        setCreating(false);
        router.refresh();
      }
    });
  }

  async function submitImport(form: HTMLFormElement, mode: "preview" | "apply") {
    const formData = new FormData(form);
    startTransition(async () => {
      const response =
        mode === "preview"
          ? await previewCustomsMasterImportFromFormAction(config.key, formData)
          : await applyCustomsMasterImportFromFormAction(config.key, formData);
      setResult(response);
      if (response.ok && response.payload && typeof response.payload === "object") {
        const payload = response.payload as ImportPreviewPayload;
        setPreview(payload);
        if (mode === "apply") router.refresh();
      }
    });
  }

  return (
    <div className="mnx-customs-master-page">
      <CustomsMasterHeader
        title={config.title}
        sourceVersion={sourceVersion}
        lastImportedAt={lastImportedAt}
        actions={
          <div className="mnx-customs-header-actions">
            <WorkspaceBadge variant="neutral">{config.modelName}</WorkspaceBadge>
            <WorkspaceAction
              size="compact"
              disabled={!canManage}
              onClick={() => {
                setResult(null);
                setCreating(true);
              }}
            >
              <Plus size={14} aria-hidden="true" />
              New row
            </WorkspaceAction>
          </div>
        }
      />

      <WorkspaceAlert variant="info" className="mnx-customs-master-note">
        <FileClock size={16} aria-hidden="true" />
        <span>{config.lookupNote}</span>
      </WorkspaceAlert>

      {result ? (
        <WorkspaceAlert variant={result.ok ? "success" : "danger"}>
          {result.ok ? <Check size={16} aria-hidden="true" /> : <X size={16} aria-hidden="true" />}
          <span>{result.message}</span>
        </WorkspaceAlert>
      ) : null}

      <CustomsMasterToolbar
        search={search}
        activeFilterCount={Object.values(filters).filter(Boolean).length + (status ? 1 : 0)}
        onSearchChange={(value) => updateSearch({ search: value, page: 1 })}
      >
        <div className="mnx-customs-filter-grid">
          <WorkspaceField label="Status" htmlFor="customs-filter-status">
            <WorkspaceSelect
              id="customs-filter-status"
              value={status ?? ""}
              onChange={(event) => {
                const next = new URLSearchParams(searchParams.toString());
                if (event.target.value) next.set("status", event.target.value);
                else next.delete("status");
                next.set("page", "1");
                router.replace(`${pathname}?${next.toString()}`);
              }}
            >
              <option value="">Any status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="SUPERSEDED">Superseded</option>
            </WorkspaceSelect>
          </WorkspaceField>
          {tableFields.slice(0, 8).map((field) => (
            <WorkspaceField key={field.key} label={field.label} htmlFor={`customs-filter-${field.key}`}>
              <WorkspaceInput
                id={`customs-filter-${field.key}`}
                defaultValue={filters[field.key] ?? ""}
                onBlur={(event) => updateSearch({ filters: { [field.key]: event.target.value }, page: 1 })}
                placeholder={`Filter ${field.label}`}
              />
            </WorkspaceField>
          ))}
        </div>
      </CustomsMasterToolbar>

      <div className="mnx-customs-toolbar-actions mnx-customs-register-actions">
        <Link href={downloadHref} prefetch={false} className="mnx-button mnx-button-secondary mnx-button-compact mnx-customs-download-link">
          <FileClock size={14} aria-hidden="true" />
          Download filtered data
        </Link>
        <WorkspaceAction size="compact" variant="secondary" disabled={!canImport} onClick={() => setImportOpen(true)}>
          <Upload size={14} aria-hidden="true" />
          Bulk upload
        </WorkspaceAction>
      </div>

      <CustomsMasterTable
        rows={rows}
        columns={columns}
        sort={sortKey ? { key: sortKey, direction: sortDirection } : null}
        getRowLabel={(row) => `${config.title} ${String(row[tableFields[0]?.key] ?? row.id)}`}
        pagination={
          <CustomsPagination
            page={page}
            pageSize={pageSize}
            totalCount={total}
            onPageChange={(nextPage) => updateSearch({ page: nextPage })}
            onPageSizeChange={(nextPageSize) => updateSearch({ page: 1, pageSize: nextPageSize })}
          />
        }
      />

      <CustomsMasterEditDialog
        open={creating || editingRow !== null}
        onClose={() => {
          setCreating(false);
          setEditingRow(null);
        }}
        title={editingRow ? `Edit ${config.title}` : `Create ${config.title}`}
      >
        <MasterRowForm
          busy={isPending}
          canManage={canManage}
          config={config}
          row={editingRow}
          onSubmit={submitRow}
        />
      </CustomsMasterEditDialog>

      <CustomsMasterEditDialog open={importOpen} onClose={() => setImportOpen(false)} title={`Bulk import ${config.title}`}>
        <form
          ref={importFormRef}
          className="mnx-customs-edit-form"
          onSubmit={(event) => {
            event.preventDefault();
            submitImport(event.currentTarget, "preview");
          }}
        >
          <div className="mnx-customs-form-grid" data-columns="2">
            <WorkspaceField label="Dataset version" htmlFor="customs-import-version" required>
              <WorkspaceInput id="customs-import-version" name="datasetVersion" required placeholder="DGFT-2026-07" />
            </WorkspaceField>
            <WorkspaceField label="Source name" htmlFor="customs-import-source" required>
              <WorkspaceInput id="customs-import-source" name="sourceName" required placeholder="Controlled XLSX upload" />
            </WorkspaceField>
            <WorkspaceField label="Source reference" htmlFor="customs-import-reference">
              <WorkspaceInput id="customs-import-reference" name="sourceReference" />
            </WorkspaceField>
            <WorkspaceField label="Source publication date" htmlFor="customs-import-published">
              <DateInput id="customs-import-published" name="sourcePublicationDate" />
            </WorkspaceField>
            <WorkspaceField label="Source effective date" htmlFor="customs-import-effective">
              <DateInput id="customs-import-effective" name="sourceEffectiveDate" />
            </WorkspaceField>
            <WorkspaceField label="XLSX or CSV file" htmlFor="customs-import-file" required>
              <WorkspaceInput id="customs-import-file" name="file" type="file" accept=".xlsx,.csv" required />
            </WorkspaceField>
          </div>
          {preview ? (
            <>
              <CustomsBulkImportPreview
                inserted={preview.insert}
                updated={preview.update}
                unchanged={preview.unchanged}
                rejected={preview.reject}
              />
              <WorkspaceTextarea readOnly value={preview.rejectionReportCsv} aria-label="Rejection report CSV" />
            </>
          ) : null}
          <div className="mnx-customs-dialog-actions">
            <WorkspaceAction type="submit" variant="secondary" disabled={!canImport || isPending}>
              <Search size={14} aria-hidden="true" />
              Dry run
            </WorkspaceAction>
            <WorkspaceAction
              type="button"
              disabled={!canImport || isPending}
              onClick={() => {
                if (importFormRef.current) submitImport(importFormRef.current, "apply");
              }}
            >
              <Check size={14} aria-hidden="true" />
              Apply import
            </WorkspaceAction>
          </div>
        </form>
      </CustomsMasterEditDialog>
    </div>
  );
}

function MasterRowForm({
  busy,
  canManage,
  config,
  onSubmit,
  row,
}: {
  busy: boolean;
  canManage: boolean;
  config: CustomsMasterPageConfig;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  row: CustomsMasterGridRow | null;
}) {
  return (
    <form className="mnx-customs-edit-form" onSubmit={onSubmit}>
      <div className="mnx-customs-form-grid" data-columns="3">
        {config.fields.map((field) => (
          <FieldControl key={field.key} field={field} row={row} />
        ))}
        <WorkspaceField label="Audit reason" htmlFor="customs-master-reason" required={isSensitive(config.key)}>
          <WorkspaceTextarea
            id="customs-master-reason"
            name="reason"
            required={isSensitive(config.key)}
            minLength={isSensitive(config.key) ? 5 : undefined}
            placeholder="Reason for this master-data change"
          />
        </WorkspaceField>
      </div>
      <div className="mnx-customs-dialog-actions">
        <ChaAction type="submit" disabled={!canManage || busy}>
          <Pencil size={14} aria-hidden="true" />
          Save row
        </ChaAction>
      </div>
    </form>
  );
}

function FieldControl({ field, row }: { field: CustomsMasterPageField; row: CustomsMasterGridRow | null }) {
  const id = `customs-master-${field.key}`;
  const value = row?.[field.key];
  const stringValue = value == null ? "" : String(value);

  if (field.type === "boolean") {
    return (
      <WorkspaceField label={field.label} htmlFor={id}>
        <label className="mnx-checkbox">
          <input id={id} name={field.key} type="checkbox" defaultChecked={value === true || value === "true"} />
          <span aria-hidden="true" />
          <em>Enabled</em>
        </label>
      </WorkspaceField>
    );
  }

  if (field.type === "status") {
    return (
      <WorkspaceField label={field.label} htmlFor={id}>
        <WorkspaceSelect id={id} name={field.key} defaultValue={stringValue || "ACTIVE"}>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="SUPERSEDED">Superseded</option>
        </WorkspaceSelect>
      </WorkspaceField>
    );
  }

  if (field.type === "date") {
    return (
      <WorkspaceField label={field.label} htmlFor={id} required={field.required}>
        <DateInput id={id} name={field.key} required={field.required} defaultValue={formatDateInputValue(value)} />
      </WorkspaceField>
    );
  }

  return (
    <WorkspaceField label={field.label} htmlFor={id} required={field.required}>
      <WorkspaceInput
        id={id}
        name={field.key}
        inputMode={field.type === "decimal" ? "decimal" : undefined}
        pattern={field.type === "decimal" ? "^-?\\d+(\\.\\d+)?$" : undefined}
        required={field.required}
        defaultValue={stringValue}
      />
    </WorkspaceField>
  );
}

function renderValue(value: unknown, field: CustomsMasterPageField, row?: CustomsMasterGridRow) {
  if (field.key === "amendNotification" && value) {
    return (
      <span className="mnx-customs-amendment-chain">
        {String(value)}
        {row?.amendYear ? <small>{String(row.amendYear)}</small> : null}
        {row?.amendSerialNo ? <small>Sl {String(row.amendSerialNo)}</small> : null}
      </span>
    );
  }
  if (field.type === "boolean") {
    return value === true || value === "true" ? <WorkspaceBadge variant="success">Yes</WorkspaceBadge> : <WorkspaceBadge variant="neutral">No</WorkspaceBadge>;
  }
  if (field.type === "status") {
    const text = String(value ?? "ACTIVE");
    return <WorkspaceBadge variant={text === "ACTIVE" ? "success" : text === "INACTIVE" ? "warning" : "neutral"}>{text}</WorkspaceBadge>;
  }
  if (field.type === "date") return formatDateDisplay(value);
  return String(value ?? "");
}

function formatDateDisplay(value: unknown) {
  if (!value) return "";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateInputValue(value: unknown) {
  if (!value) return "";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function isSensitive(masterType: CustomsMasterKey) {
  return !["RITC_TARIFF", "SCHEME_CODE"].includes(masterType);
}
