"use client";
/* eslint-disable @next/next/no-img-element */

import * as React from "react";
import {
  ArrowUpRight,
  CheckCircle2,
  Circle,
  Download,
  Eye,
  FileText,
  Filter,
  Maximize2,
  MoreHorizontal,
  Search,
  ShieldCheck,
  Trash2,
  Undo2,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type WorkflowDocumentVersion = {
  id: string;
  fileName: string;
  fileKey?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  uploadedAt?: string | Date | null;
  uploadedById?: string | null;
  uploadedBy?: { name?: string | null } | null;
  isCurrent?: boolean | null;
  source?: string | null;
  validityDate?: string | null;
};

export type WorkflowDocumentException = {
  reason?: string | null;
  user?: { name?: string | null } | null;
  createdAt?: string | Date | null;
};

export type WorkflowDocumentRequirement = {
  id: string;
  name: string;
  status: string;
  isMandatory: boolean;
  category?: string | null;
  requirementItem?: {
    description?: string | null;
    requiresValidityDate?: boolean | null;
    category?: { name?: string | null } | null;
  } | null;
  exception?: WorkflowDocumentException | null;
  versions: WorkflowDocumentVersion[];
};

type FilterMode = "ALL" | "PENDING" | "UPLOADED" | "EXCEPTIONS";

export type WorkflowProgressStep = {
  key: string;
  title: string;
  detail: string;
  status: "completed" | "active" | "pending";
};

type RequirementDocumentCardProps = {
  requirement: WorkflowDocumentRequirement;
  loadingKey: string | null;
  onUndo: (requirementId: string) => void;
  onUpload: (requirementId: string) => void;
  onDeclareExemption: (requirementId: string) => void;
  onMarkNa: (requirementId: string) => void;
  onSelect?: (requirementId: string) => void;
  selected?: boolean;
};

type UploadedWorkflowDocumentCardProps = {
  requirement: WorkflowDocumentRequirement;
  version: WorkflowDocumentVersion;
  loadingKey: string | null;
  currentUserId: string;
  canDelete: boolean;
  onPreview: (requirementId: string) => void;
  onDelete: (requirementId: string, versionId: string, fileName: string) => void;
  onDeclareExemption: (requirementId: string) => void;
  onMarkNa: (requirementId: string) => void;
  onUpload: (requirementId: string) => void;
  onSelect?: (requirementId: string) => void;
  selected?: boolean;
};

type WorkflowDocumentsSectionHeaderProps = {
  uploadedCount: number;
  searchValue: string;
  onSearchChange: (value: string) => void;
  filterMode: FilterMode;
  onFilterToggle: () => void;
};

type WorkflowProgressPanelProps = {
  steps: WorkflowProgressStep[];
  overallProgress: number;
  currentStepLabel: string;
  eyebrow?: string;
  title?: string;
  helperNote?: string;
};

type FilingDocumentsPageHeaderProps = {
  title?: string;
  subtitle?: string;
};

type DocumentMetaItemProps = {
  label: string;
  value: React.ReactNode;
  accent?: "default" | "success" | "warning";
};

type DocumentDropzoneProps = {
  requirement: WorkflowDocumentRequirement | null;
  maxFileSizeLabel?: string;
  disabled: boolean;
  onInputChange: (requirementId: string, event: React.ChangeEvent<HTMLInputElement>) => void;
};

type FilingDocumentPreviewDrawerProps = {
  open: boolean;
  requirement: WorkflowDocumentRequirement | null;
  version: WorkflowDocumentVersion | null;
  previewUrl: string | null;
  downloadUrl: string | null;
  loadingPreview: boolean;
  activeTab: "preview" | "details";
  currentStepLabel: string;
  currentStageLabel: string;
  dueDate?: string | null;
  onClose: () => void;
  onTabChange: (tab: "preview" | "details") => void;
  onPreviewLoad: () => void;
  onPreviewError: () => void;
};

function formatDateTime(value?: string | Date | null) {
  if (!value) return "Not available";
  return new Date(value).toLocaleString("en-IN");
}

function formatDateOnly(value?: string | Date | null) {
  if (!value) return "Not available";
  return new Date(value).toLocaleDateString("en-IN");
}

function formatFileSize(sizeBytes?: number | null) {
  if (!sizeBytes) return "Unknown";
  return `${(sizeBytes / 1024).toFixed(1)} KB`;
}

function getDocumentStatusBadge(status: string) {
  if (status === "UPLOADED") {
    return <Badge variant="success">UPLOADED</Badge>;
  }
  if (status === "NOT_AVAILABLE") {
    return <Badge variant="warning">NOT AVAILABLE</Badge>;
  }
  return <Badge variant="secondary">PENDING</Badge>;
}

function DocumentStatusBadge({ status }: { status: string }) {
  if (status === "UPLOADED") {
    return <span className="rounded-full bg-green-500/12 px-3 py-1 text-sm font-medium text-green-700 dark:text-green-300">Uploaded</span>;
  }

  if (status === "NOT_AVAILABLE") {
    return <span className="rounded-full bg-[#fb923c]/12 px-3 py-1 text-sm font-medium text-[#fb923c]">Not Available</span>;
  }

  return <span className="rounded-full bg-surface-container-low px-3 py-1 text-sm font-medium text-on-surface-variant">Pending</span>;
}

function DocumentDetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="text-sm text-on-surface-variant">{label}</span>
      <span className="max-w-[60%] text-right text-sm text-on-surface">{value}</span>
    </div>
  );
}

export function FilingDocumentsPageHeader({
  title = "Filing Workflow Documents",
  subtitle = "Upload and manage documents required for your workflow.",
}: FilingDocumentsPageHeaderProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-sm text-on-surface-variant">
        <span>Documents</span>
        <span aria-hidden="true" className="text-on-surface-variant/60">
          &gt;
        </span>
        <span className="text-on-surface">{title}</span>
      </div>
      <div className="space-y-1">
        <h2 className="text-[2.15rem] font-semibold tracking-[-0.04em] text-on-surface">{title}</h2>
        <p className="text-base text-on-surface-variant">{subtitle}</p>
      </div>
    </div>
  );
}

export function RequirementDocumentCard({
  requirement,
  loadingKey,
  onUndo,
  onUpload,
  onDeclareExemption,
  onMarkNa,
  onSelect,
  selected = false,
}: RequirementDocumentCardProps) {
  const isExempted = requirement.status === "NOT_AVAILABLE" || !!requirement.exception;
  const isNa = requirement.exception?.reason === "N/A";
  const metadataLabel = isNa ? "Marked by" : "Declared by";

  return (
    <div
      className={cn(
        "flex h-full min-h-[260px] flex-col rounded-[24px] border border-outline-variant/50 bg-surface p-5 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.18)] transition-all",
        selected ? "ring-2 ring-[#00cec4]/25 shadow-[0_22px_44px_-32px_rgba(0,206,196,0.28)]" : "hover:-translate-y-px",
      )}
      onClick={() => onSelect?.(requirement.id)}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[1.1rem] font-semibold text-on-surface">{requirement.name}</h3>
            {requirement.isMandatory ? <Badge variant="warning">MANDATORY</Badge> : <Badge variant="secondary">OPTIONAL</Badge>}
            {getDocumentStatusBadge(requirement.status)}
          </div>
        </div>
        <button
          type="button"
          className="ds-plain flex h-10 w-10 items-center justify-center rounded-xl border border-outline-variant/60 bg-surface text-on-surface-variant shadow-sm transition hover:border-[#00cec4]/45 hover:text-[#00cec4]"
          aria-label={`More actions for ${requirement.name}`}
        >
          <MoreHorizontal size={18} />
        </button>
      </div>

      <div className="mt-4 flex-1">
        <div className="rounded-2xl border border-[#fb923c]/20 bg-[#fb923c]/8 px-4 py-3.5">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#fb923c]/12 text-[#fb923c]">
              <Circle size={10} fill="currentColor" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#fb923c]">{isNa ? "Marked as N/A" : isExempted ? "Exemption Declared" : "Awaiting Upload"}</p>
              {requirement.requirementItem?.description ? (
                <p className="mt-1 text-xs text-on-surface-variant">{requirement.requirementItem.description}</p>
              ) : null}
              <p className="mt-1 text-xs text-on-surface-variant">
                {isExempted
                  ? `${metadataLabel}: ${requirement.exception?.user?.name || "Unknown"} • ${formatDateTime(requirement.exception?.createdAt)}`
                  : "This requirement is still waiting for an uploaded file or an approved exception."}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant/20 pt-3.5">
        <div className="flex flex-wrap gap-2">
          {isExempted ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2 border-[#fb923c]/50 text-[#fb923c] hover:bg-surface"
              disabled={loadingKey !== null}
              onClick={() => onUndo(requirement.id)}
            >
              <Undo2 size={14} />
              {isNa ? "Undo N/A" : "Undo Exemption"}
            </Button>
          ) : (
            <>
              <Button type="button" variant="outline" size="sm" className="gap-2" disabled={loadingKey !== null} onClick={() => onDeclareExemption(requirement.id)}>
                <ShieldCheck size={14} />
                Declare Exemption
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2 border-[#fb923c]/50 text-[#fb923c] hover:bg-surface"
                disabled={loadingKey !== null}
                onClick={() => onMarkNa(requirement.id)}
              >
                Mark as N/A
              </Button>
            </>
          )}
        </div>
        <Button type="button" size="sm" className="min-w-[160px] gap-2" disabled={loadingKey !== null} onClick={() => onUpload(requirement.id)}>
          <Upload size={14} />
          {isExempted ? "Upload File Anyway" : "Upload File"}
        </Button>
      </div>
    </div>
  );
}

export function WorkflowDocumentsSectionHeader({
  uploadedCount,
  searchValue,
  onSearchChange,
  filterMode,
  onFilterToggle,
}: WorkflowDocumentsSectionHeaderProps) {
  const title = uploadedCount === 1 ? "Uploaded Document" : "Uploaded Documents";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <span className="block h-8 w-1.5 rounded-full bg-[#00cec4]" aria-hidden="true" />
          <div className="min-w-0">
            <h3 className="text-[1.1rem] font-semibold text-on-surface">{title}</h3>
            <p className="mt-1 text-sm text-on-surface-variant">
              Review uploaded document files, metadata, and workflow context.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1 sm:min-w-[280px]">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <Input
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search documents..."
              className="pl-10"
            />
          </div>
          <Button type="button" variant="outline" mode="icon" aria-label={`Filter documents. Current filter ${filterMode}`} onClick={onFilterToggle}>
            <Filter size={16} />
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="ds-label">Filter</span>
        <Badge variant={filterMode === "ALL" ? "secondary" : "default"}>{filterMode}</Badge>
      </div>
    </div>
  );
}

export function DocumentMetaItem({ label, value, accent = "default" }: DocumentMetaItemProps) {
  return (
    <div
      className={cn(
        "border-r border-outline-variant/30 px-4 py-2 last:border-r-0 md:border-r-0 xl:border-r xl:last:border-r-0",
        accent === "success" ? "bg-green-500/6" : accent === "warning" ? "bg-[#fb923c]/8" : "",
      )}
    >
      <p className="ds-label">{label}</p>
      <div className="mt-2 text-sm text-on-surface">{value}</div>
    </div>
  );
}

export function UploadedWorkflowDocumentCard({
  requirement,
  version,
  loadingKey,
  currentUserId,
  canDelete,
  onPreview,
  onDelete,
  onDeclareExemption,
  onMarkNa,
  onUpload,
  onSelect,
  selected = false,
}: UploadedWorkflowDocumentCardProps) {
  const canDeleteCurrentVersion = canDelete || currentUserId === version.uploadedById;
  const fileSize = formatFileSize(version.sizeBytes);

  return (
    <div
      className={cn(
        "flex h-full min-h-[260px] flex-col rounded-[24px] border border-[#00cec4]/35 bg-surface p-5 shadow-[0_22px_48px_-36px_rgba(15,23,42,0.18)] transition-all",
        selected ? "ring-2 ring-[#00cec4]/25 shadow-[0_24px_52px_-34px_rgba(0,206,196,0.24)]" : "hover:-translate-y-px",
      )}
      onClick={() => onSelect?.(requirement.id)}
    >
      <div className="flex h-full flex-col gap-3.5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="ds-icon-badge">
              <FileText size={18} />
            </span>
            <div>
              <h3 className="text-[1.05rem] font-semibold text-on-surface">{requirement.name}</h3>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DocumentStatusBadge status="UPLOADED" />
            <button
              type="button"
              className="ds-plain flex h-10 w-10 items-center justify-center rounded-xl border border-outline-variant/60 bg-surface text-on-surface-variant shadow-sm transition hover:border-[#00cec4]/45 hover:text-[#00cec4]"
              aria-label={`More actions for ${requirement.name}`}
            >
              <MoreHorizontal size={18} />
            </button>
          </div>
        </div>

        <div className="rounded-[20px] border border-outline-variant/45 bg-surface px-4 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.32)]">
          <div className="flex flex-col gap-3 border-b border-outline-variant/20 pb-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <span className="ds-icon-badge shrink-0">
                <FileText size={18} />
              </span>
              <div className="min-w-0">
                <button type="button" className="ds-plain flex min-w-0 items-center gap-2 text-left text-sm font-semibold text-on-surface" onClick={() => onPreview(requirement.id)}>
                  <span className="truncate">{version.fileName}</span>
                  <ArrowUpRight size={16} className="shrink-0 text-[#00cec4]" />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="ds-numeric text-sm text-on-surface-variant">{fileSize}</span>
              {canDeleteCurrentVersion ? (
                <Button
                  type="button"
                  variant="outline"
                  mode="icon"
                  size="sm"
                  className="border-red-500/20 text-red-500 hover:bg-red-500/10 hover:text-red-600"
                  onClick={() => onDelete(requirement.id, version.id, version.fileName)}
                  disabled={loadingKey !== null}
                >
                  <Trash2 size={16} />
                </Button>
              ) : null}
            </div>
          </div>

          <div className="mt-3 grid gap-2 border border-outline-variant/20 bg-surface-container-low/25 px-2 py-2 md:grid-cols-2 xl:grid-cols-4">
            <DocumentMetaItem label="Source" value={version.source === "FILING_WORKFLOW" ? "Filing Workflow" : "Documents Page"} />
            <DocumentMetaItem label="Uploaded By" value={version.uploadedBy?.name || "Unknown"} />
            <DocumentMetaItem label="Uploaded On" value={<span className="ds-numeric">{formatDateOnly(version.uploadedAt)}</span>} />
            <DocumentMetaItem label="Validity" value={version.validityDate ? <span className="ds-numeric">{formatDateOnly(version.validityDate)}</span> : "Not required"} accent={version.validityDate ? "default" : "success"} />
          </div>
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-3 border-t border-outline-variant/20 pt-3.5">
          <Button type="button" variant="outline" className="gap-2" onClick={() => onPreview(requirement.id)}>
            <Eye size={16} />
            View File
          </Button>
          <Button type="button" variant="outline" className="gap-2" onClick={() => onDeclareExemption(requirement.id)} disabled={loadingKey !== null}>
            <ShieldCheck size={16} />
            Declare Exemption
          </Button>
          <Button
            type="button"
            variant="outline"
            className="gap-2 border-[#fb923c]/50 text-[#fb923c] hover:bg-surface"
            onClick={() => onMarkNa(requirement.id)}
            disabled={loadingKey !== null}
          >
            Mark as N/A
          </Button>
          <Button type="button" className="ml-auto min-w-[160px] gap-2" onClick={() => onUpload(requirement.id)} disabled={loadingKey !== null}>
            <Upload size={16} />
            Re-upload
          </Button>
        </div>
      </div>
    </div>
  );
}

export function FilingDocumentPreviewDrawer({
  open,
  requirement,
  version,
  previewUrl,
  downloadUrl,
  loadingPreview,
  activeTab,
  currentStepLabel,
  currentStageLabel,
  dueDate,
  onClose,
  onTabChange,
  onPreviewLoad,
  onPreviewError,
}: FilingDocumentPreviewDrawerProps) {
  const [imageScale, setImageScale] = React.useState(1);
  const previewStateKey = `${version?.id || "none"}-${activeTab}`;

  React.useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open || !requirement || !version) {
    return null;
  }

  const mimeType = version.mimeType || "application/octet-stream";
  const isImage = mimeType.startsWith("image/");
  const isPdf = mimeType === "application/pdf";
  const canPreview = Boolean(previewUrl) && (isImage || isPdf);
  const sourceLabel = version.source === "FILING_WORKFLOW" ? "Filing Workflow" : "Documents Page";
  const fileSize = formatFileSize(version.sizeBytes);
  const exceptionState = requirement.exception?.reason
    ? requirement.exception.reason === "N/A"
      ? "Marked as N/A"
      : `Exempted: ${requirement.exception.reason}`
    : "None";

  return (
    <aside className="rounded-[28px] border border-outline-variant/45 bg-surface px-6 py-5 shadow-[0_24px_60px_-38px_rgba(15,23,42,0.22)] xl:sticky xl:top-24">
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="truncate text-[1.9rem] font-semibold tracking-[-0.04em] text-on-surface">{requirement.name}</h3>
              <DocumentStatusBadge status={requirement.status} />
            </div>
          </div>
          <Button type="button" variant="outline" mode="icon" onClick={onClose} aria-label="Close document preview drawer">
            <X size={16} />
          </Button>
        </div>

        <div className="border-b border-outline-variant/20">
          <div role="tablist" aria-label="Document preview tabs" className="flex items-center gap-8">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "preview"}
              className={cn(
                "border-b-2 px-1 pb-3 text-base font-medium transition-colors",
                activeTab === "preview" ? "border-[#00cec4] text-[#00cec4]" : "border-transparent text-on-surface",
              )}
              onClick={() => onTabChange("preview")}
            >
              Preview
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "details"}
              className={cn(
                "border-b-2 px-1 pb-3 text-base font-medium transition-colors",
                activeTab === "details" ? "border-[#00cec4] text-[#00cec4]" : "border-transparent text-on-surface",
              )}
              onClick={() => onTabChange("details")}
            >
              Details
            </button>
          </div>
        </div>

        {activeTab === "preview" ? (
          <div className="space-y-5">
            <div className="overflow-hidden rounded-[24px] border border-outline-variant/35 bg-surface shadow-[0_18px_40px_-34px_rgba(15,23,42,0.14)]">
              <div className="relative flex min-h-[340px] items-center justify-center overflow-hidden border-b border-outline-variant/15 bg-surface-container-low/25 px-6 py-8">
                {canPreview ? (
                  <>
                    {loadingPreview ? (
                      <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface/80">
                        <span className="text-sm text-on-surface-variant">Loading preview...</span>
                      </div>
                    ) : null}
                    {isImage ? (
                      <img
                        key={previewStateKey}
                        src={previewUrl!}
                        alt={version.fileName}
                        className="max-h-[320px] max-w-full object-contain transition-transform"
                        style={{ transform: `scale(${imageScale})` }}
                        onLoad={onPreviewLoad}
                        onError={onPreviewError}
                      />
                    ) : (
                      <iframe
                        src={previewUrl!}
                        className="h-[320px] w-full border-0"
                        title={version.fileName}
                        onLoad={onPreviewLoad}
                      />
                    )}
                  </>
                ) : (
                  <div className="space-y-4 text-center">
                    <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-[24px] border border-[#00cec4]/20 bg-[#00cec4]/10 text-[#00cec4]">
                      <FileText size={40} />
                    </span>
                    <div className="space-y-1">
                      <p className="text-[1.05rem] font-semibold text-on-surface">{version.fileName}</p>
                      <p className="text-sm text-on-surface-variant">{fileSize}</p>
                    </div>
                    <p className="mx-auto max-w-[240px] text-sm text-on-surface-variant">
                      Inline preview is unavailable for this file type. Download the file to review it locally.
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-4 px-6 py-5">
                <div className="text-center">
                  <p className="text-[1.7rem] font-semibold tracking-[-0.03em] text-on-surface">{version.fileName}</p>
                  <p className="mt-2 text-base text-on-surface-variant">{fileSize}</p>
                </div>

                <div className="flex items-center justify-center gap-4">
                  <Button type="button" variant="outline" mode="icon" onClick={() => setImageScale((current) => Math.max(0.75, current - 0.1))} disabled={!isImage}>
                    <ZoomOut size={16} />
                  </Button>
                  <Button type="button" variant="outline" mode="icon" onClick={() => setImageScale((current) => Math.min(2.5, current + 0.1))} disabled={!isImage}>
                    <ZoomIn size={16} />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    mode="icon"
                    onClick={() => {
                      if (previewUrl) {
                        window.open(previewUrl, "_blank", "noopener,noreferrer");
                      }
                    }}
                    disabled={!previewUrl}
                  >
                    <Maximize2 size={16} />
                  </Button>
                  <a href={downloadUrl || undefined} download={version.fileName} aria-label={`Download ${version.fileName}`}>
                    <Button type="button" variant="outline" mode="icon" disabled={!downloadUrl}>
                      <Download size={16} />
                    </Button>
                  </a>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-[1.1rem] font-semibold text-on-surface">Document Health</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-green-500/10 text-green-600">
                      <CheckCircle2 size={14} />
                    </span>
                    <span className="text-on-surface">File uploaded</span>
                  </div>
                  <span className="text-on-surface-variant">{formatDateTime(version.uploadedAt)}</span>
                </div>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-container-low text-on-surface-variant">
                      <Circle size={10} fill="currentColor" />
                    </span>
                    <span className="text-on-surface">Virus scan</span>
                  </div>
                  <span className="rounded-full bg-surface-container-low px-3 py-1 text-xs font-medium text-on-surface-variant">Not checked</span>
                </div>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-container-low text-on-surface-variant">
                      <Circle size={10} fill="currentColor" />
                    </span>
                    <span className="text-on-surface">File integrity</span>
                  </div>
                  <span className="rounded-full bg-surface-container-low px-3 py-1 text-xs font-medium text-on-surface-variant">Not checked</span>
                </div>
              </div>
            </div>

            <div className="border-t border-outline-variant/20 pt-5">
              <h4 className="text-[1.1rem] font-semibold text-on-surface">Workflow Context</h4>
              <div className="mt-4 space-y-1">
                <DocumentDetailRow label="Step" value={<span>{currentStageLabel}</span>} />
                <DocumentDetailRow label="Current Status" value={<span className="rounded-full bg-[#00cec4]/10 px-3 py-1 text-xs font-medium text-[#00cec4]">{currentStepLabel}</span>} />
                <DocumentDetailRow label="Due Date" value={dueDate ? <span className="ds-numeric">{formatDateOnly(dueDate)}</span> : "Not scheduled"} />
                <DocumentDetailRow label="Submitted By" value={version.uploadedBy?.name || "Unknown"} />
                <DocumentDetailRow label="Requirement Status" value={requirement.status.replace(/_/g, " ")} />
                <DocumentDetailRow label="Validity" value={version.validityDate ? formatDateOnly(version.validityDate) : "Not required"} />
                <DocumentDetailRow label="Source" value={sourceLabel} />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            <DocumentDetailRow label="Document Requirement" value={requirement.name} />
            <DocumentDetailRow label="Original File Name" value={version.fileName} />
            <DocumentDetailRow label="MIME Type" value={mimeType} />
            <DocumentDetailRow label="File Size" value={<span className="ds-numeric">{fileSize}</span>} />
            <DocumentDetailRow label="Source" value={sourceLabel} />
            <DocumentDetailRow label="Uploaded By" value={version.uploadedBy?.name || "Unknown"} />
            <DocumentDetailRow label="Uploaded On" value={<span className="ds-numeric">{formatDateTime(version.uploadedAt)}</span>} />
            <DocumentDetailRow label="Validity" value={version.validityDate ? formatDateOnly(version.validityDate) : "Not required"} />
            <DocumentDetailRow label="Linked Job Stage" value={currentStageLabel} />
            <DocumentDetailRow label="Requirement Status" value={requirement.status.replace(/_/g, " ")} />
            <DocumentDetailRow label="Version State" value={version.isCurrent ? "Current Version" : "Previous Version"} />
            <DocumentDetailRow label="Exception State" value={exceptionState} />
            {requirement.exception?.createdAt ? (
              <DocumentDetailRow label="Exception Recorded On" value={<span className="ds-numeric">{formatDateTime(requirement.exception.createdAt)}</span>} />
            ) : null}
          </div>
        )}
      </div>
    </aside>
  );
}

export function WorkflowProgressPanel({
  steps,
  overallProgress,
  currentStepLabel,
  eyebrow = "Document Status",
  title = "DOCUMENT UPLOAD STATUS",
  helperNote = "N/A and exempted documents are excluded from the progress calculation.",
}: WorkflowProgressPanelProps) {
  return (
    <aside className="rounded-[24px] border border-outline-variant/60 bg-surface p-5 shadow-[0_20px_46px_-34px_rgba(15,23,42,0.16)] xl:sticky xl:top-24">
      <div className="space-y-5">
        <div>
          <p className="ds-label text-[#00cec4]">{eyebrow}</p>
          <h3 className="mt-2 text-xl font-semibold text-on-surface">{title}</h3>
        </div>

        <div className="space-y-4">
          {steps.map((step, index) => {
            const isLast = index === steps.length - 1;
            return (
              <div key={step.key} className="relative flex gap-3">
                <div className="flex flex-col items-center">
                  <span
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full border",
                      step.status === "completed"
                        ? "border-green-500/30 bg-green-500/12 text-green-600"
                        : step.status === "active"
                          ? "border-[#00cec4]/40 bg-[#00cec4]/10 text-[#00cec4]"
                          : "border-outline-variant/60 bg-surface-container-low text-on-surface-variant",
                    )}
                  >
                    {step.status === "completed" ? <CheckCircle2 size={16} /> : <Circle size={12} fill="currentColor" />}
                  </span>
                  {!isLast ? (
                    <span
                      className={cn(
                        "mt-2 block h-10 w-px",
                        step.status === "completed" ? "bg-green-500/35" : step.status === "active" ? "bg-[#00cec4]/28" : "bg-outline-variant/50",
                      )}
                    />
                  ) : null}
                </div>
                <div className="min-w-0 pb-2">
                  <p className="text-sm font-medium text-on-surface">{step.title}</p>
                  <p className="mt-1 text-xs text-on-surface-variant">{step.detail}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="rounded-[22px] border border-outline-variant/55 bg-surface-container-low/55 p-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="ds-label">Overall Progress</p>
              <p className="mt-2 text-2xl font-semibold text-on-surface">{overallProgress}%</p>
            </div>
            <span className="rounded-full border border-[#00cec4]/25 bg-[#00cec4]/10 px-3 py-1 text-xs font-medium text-[#00cec4]">
              {currentStepLabel}
            </span>
          </div>
          <div className="mt-4 h-2 rounded-full bg-surface-container">
            <div
              className="h-2 rounded-full bg-[linear-gradient(90deg,#00cec4_0%,#13b8c4_100%)]"
              style={{ width: `${Math.max(0, Math.min(100, overallProgress))}%` }}
            />
          </div>
          <p className="mt-3 text-xs text-on-surface-variant">Current status: {currentStepLabel}</p>
          <p className="mt-2 text-xs text-on-surface-variant">{helperNote}</p>
        </div>
      </div>
    </aside>
  );
}

export function DocumentDropzone({ requirement, maxFileSizeLabel = "15MB", disabled, onInputChange }: DocumentDropzoneProps) {
  const inputId = requirement ? `workflow-document-dropzone-${requirement.id}` : "workflow-document-dropzone-disabled";
  const [isDragActive, setIsDragActive] = React.useState(false);

  return (
    <div className="rounded-[24px] border border-outline-variant/60 bg-surface p-5 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.14)]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="ds-label">Quick Upload</p>
          <p className="mt-1 text-sm text-on-surface-variant">
            {requirement ? `Uploading to ${requirement.name}` : "Select a document card to upload into the correct slot."}
          </p>
        </div>
        {requirement ? getDocumentStatusBadge(requirement.status) : null}
      </div>
      <label
        htmlFor={inputId}
        className={cn(
          "flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-[24px] border border-dashed border-outline-variant/60 bg-surface px-6 py-10 text-center transition hover:border-[#00cec4]/60 hover:bg-surface-container-low/40",
          isDragActive ? "border-[#00cec4]/70 bg-surface-container-low/50" : "",
          disabled || !requirement ? "pointer-events-none cursor-not-allowed opacity-60" : "",
        )}
        onDragOver={(event) => {
          if (disabled || !requirement) return;
          event.preventDefault();
          setIsDragActive(true);
        }}
        onDragLeave={() => setIsDragActive(false)}
        onDrop={(event) => {
          if (disabled || !requirement) return;
          event.preventDefault();
          setIsDragActive(false);
          const files = event.dataTransfer.files;
          if (!files?.length) return;
          onInputChange(
            requirement.id,
            {
              target: {
                files,
                value: "",
              },
            } as React.ChangeEvent<HTMLInputElement>,
          );
        }}
      >
        <span className="ds-icon-badge">
          <Upload size={18} />
        </span>
        <div>
          <p className="text-base font-medium text-on-surface">
            Drag and drop files here, or <span className="text-[#00cec4]">browse</span>
          </p>
          <p className="mt-1 text-sm text-on-surface-variant">Supports PNG, JPG, PDF up to {maxFileSizeLabel}</p>
        </div>
      </label>
      <input
        id={inputId}
        type="file"
        accept="image/png,image/jpeg,application/pdf,image/jpg"
        className="sr-only"
        disabled={disabled || !requirement}
        onChange={(event) => {
          setIsDragActive(false);
          if (!requirement) return;
          onInputChange(requirement.id, event);
        }}
      />
    </div>
  );
}
