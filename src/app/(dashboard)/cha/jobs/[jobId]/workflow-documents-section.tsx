"use client";
/* eslint-disable @next/next/no-img-element */

import * as React from "react";
import {
  CheckCircle2,
  Ban,
  Circle,
  Download,
  Eye,
  FileText,
  Filter,
  Maximize2,
  Search,
  ShieldCheck,
  Trash,
  Undo2,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import { Badge } from "@/components/monolith/badge";
import { Button } from "@/components/monolith/button";
import { DropdownSelect } from "@/components/monolith/dropdown-select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/monolith/dropdown-menu";
import { Input } from "@/components/monolith/input";
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

type FilterMode = "ALL" | "PENDING" | "UPLOADED" | "DECLARED_EXEMPTION" | "MARKED_NA";

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
  showExceptionActions?: boolean;
  uploadButtonLabel?: string;
  hideUploadWhenExempted?: boolean;
  uploadDisabled?: boolean;
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
  showExceptionActions?: boolean;
  showDeleteAction?: boolean;
  uploadButtonLabel?: string;
  statusOverride?: string;
  helperContent?: React.ReactNode;
  footerActions?: React.ReactNode;
  uploadDisabled?: boolean;
};

type WorkflowDocumentsSectionHeaderProps = {
  uploadedCount: number;
  searchValue: string;
  onSearchChange: (value: string) => void;
  filterMode: FilterMode;
  onFilterChange: (value: FilterMode) => void;
};

type WorkflowProgressPanelProps = {
  steps: WorkflowProgressStep[];
  overallProgress: number;
  currentStepLabel: string;
  eyebrow?: string;
  title?: string;
  helperNote?: string;
};

type DocumentMetaItemProps = {
  label: string;
  value: React.ReactNode;
  accent?: "default" | "success" | "warning";
};

type DocumentDropzoneProps = {
  requirement: WorkflowDocumentRequirement | null;
  requirementsList?: WorkflowDocumentRequirement[];
  onRequirementIdChange?: (id: string) => void;
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

function OrangeDocumentBadge({ children }: { children: React.ReactNode }) {
  return (
    <Badge variant="warning" className="!border-[#D88700]/35 !bg-[#D88700]/10 !text-[#D88700]">
      {children}
    </Badge>
  );
}

function getDocumentStatusBadge(status: string) {
  if (status === "UPLOADED") {
    return <Badge variant="success">UPLOADED</Badge>;
  }
  if (status === "ACCEPTED") {
    return <Badge variant="success">ACCEPTED</Badge>;
  }
  if (status === "UNDER_REVIEW") {
    return <Badge variant="secondary">UNDER REVIEW</Badge>;
  }
  if (status === "CLARIFICATION_REQUIRED") {
    return <Badge variant="warning">CLARIFICATION REQUIRED</Badge>;
  }
  if (status === "REUPLOAD_REQUIRED") {
    return <Badge variant="warning">REUPLOAD REQUIRED</Badge>;
  }
  if (status === "REJECTED") {
    return <Badge variant="destructive">REJECTED</Badge>;
  }
  if (status === "NOT_AVAILABLE") {
    return <OrangeDocumentBadge>NOT AVAILABLE</OrangeDocumentBadge>;
  }
  return <Badge variant="secondary">PENDING</Badge>;
}

function DocumentStatusBadge({ status }: { status: string }) {
  if (status === "UPLOADED" || status === "ACCEPTED") {
    return <Badge variant="success">UPLOADED</Badge>;
  }

  if (status === "UNDER_REVIEW") {
    return <Badge variant="secondary">UNDER REVIEW</Badge>;
  }

  if (status === "CLARIFICATION_REQUIRED") {
    return <Badge variant="warning">CLARIFICATION REQUIRED</Badge>;
  }

  if (status === "REUPLOAD_REQUIRED") {
    return <Badge variant="warning">REUPLOAD NEEDED</Badge>;
  }

  if (status === "REJECTED") {
    return <Badge variant="destructive">REJECTED</Badge>;
  }

  if (status === "NOT_AVAILABLE") {
    return <OrangeDocumentBadge>NOT AVAILABLE</OrangeDocumentBadge>;
  }

  return <Badge variant="secondary">PENDING</Badge>;
}

function DocumentDetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="monolith-label">{label}</span>
      <span className="max-w-[60%] text-right text-sm text-mono-text">{value}</span>
    </div>
  );
}

function PreviewSectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[4px_minmax(0,1fr)] items-center gap-4">
      <span className="h-7 w-1 rounded-sm bg-[#F9D972]" aria-hidden="true" />
      <h4 className="monolith-h3 text-mono-text">{children}</h4>
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
  showExceptionActions = true,
  uploadButtonLabel,
  hideUploadWhenExempted = false,
  uploadDisabled = false,
}: RequirementDocumentCardProps) {
  const isExempted = requirement.status === "NOT_AVAILABLE" || !!requirement.exception;
  const isNa = requirement.exception?.reason === "N/A";
  const metadataLabel = isNa ? "Marked by" : "Declared by";
  const shouldShowUpload = !hideUploadWhenExempted || !isExempted;
  const statusPanelClass = isNa
    ? "border-mono-border/60 bg-mono-soft"
    : "border-[#D88700]/20 bg-[#D88700]/8";
  const statusIconClass = isNa
    ? "bg-mono-soft text-mono-muted"
    : "bg-[#D88700]/12 text-[#D88700]";
  const statusHeadingClass = isNa ? "text-mono-muted" : "text-[#D88700]";

  return (
    <div
      className={cn(
        "flex h-full min-h-[260px] flex-col rounded-xl border border-[#F9D972]/35 bg-mono-card p-5 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.18)] transition-all",
        selected ? "ring-2 ring-[#F9D972]/25 shadow-[0_22px_44px_-32px_rgba(0,206,196,0.28)]" : "hover:-translate-y-px",
      )}
      onClick={() => onSelect?.(requirement.id)}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-base font-normal uppercase tracking-[0.12em] text-mono-text">{requirement.name}</h3>
        </div>
        <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-2">
          {requirement.isMandatory ? <OrangeDocumentBadge>MANDATORY</OrangeDocumentBadge> : <Badge variant="secondary">OPTIONAL</Badge>}
          {getDocumentStatusBadge(requirement.status)}
        </div>
      </div>

      <div className="mt-4 flex-1">
        <div className={cn("rounded-xl border px-4 py-3.5", statusPanelClass)}>
          <div className="flex items-start gap-3">
            <span className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl", statusIconClass)}>
              {isNa ? <Ban size={15} /> : isExempted ? <Circle size={10} fill="currentColor" /> : <Upload size={15} />}
            </span>
            <div className="min-w-0">
              <p className={cn("text-xs font-normal uppercase tracking-[0.12em]", statusHeadingClass)}>{isNa ? "Marked as N/A" : isExempted ? "Exemption Declared" : "Awaiting Upload"}</p>
              {requirement.requirementItem?.description ? (
                <p className="mt-1 text-xs text-mono-muted">{requirement.requirementItem.description}</p>
              ) : null}
              <p className="mt-1 text-xs text-mono-muted">
                {isExempted
                  ? `${metadataLabel}: ${requirement.exception?.user?.name || "Unknown"} • ${formatDateTime(requirement.exception?.createdAt)}`
                  : "This requirement is still waiting for an uploaded file or an approved exception."}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-auto flex flex-wrap items-center justify-end gap-3 border-t border-mono-border/20 pt-3.5">
        <div className="flex flex-wrap gap-2">
          {showExceptionActions ? (
            isExempted ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2 border-[#D88700]/50 text-[#D88700] hover:bg-mono-card"
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
                  className="gap-2 border-[#D88700]/50 text-[#D88700] hover:bg-mono-card"
                  disabled={loadingKey !== null}
                  onClick={() => onMarkNa(requirement.id)}
                >
                  Mark as N/A
                </Button>
              </>
            )
          ) : null}
        </div>
        {shouldShowUpload ? (
          <Button type="button" size="sm" className="min-w-[160px] gap-2" disabled={loadingKey !== null || uploadDisabled} onClick={() => onUpload(requirement.id)}>
            <Upload size={14} />
            {uploadButtonLabel || (isExempted ? "Upload File Anyway" : "Upload File")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function WorkflowDocumentsSectionHeader({
  uploadedCount,
  searchValue,
  onSearchChange,
  filterMode,
  onFilterChange,
}: WorkflowDocumentsSectionHeaderProps) {
  const title = uploadedCount === 1 ? "Uploaded Document" : "Uploaded Documents";
  const filterOptions: Array<{ value: FilterMode; label: string }> = [
    { value: "ALL", label: "All Documents" },
    { value: "UPLOADED", label: "Uploaded" },
    { value: "PENDING", label: "Pending" },
    { value: "DECLARED_EXEMPTION", label: "Declared Exemption" },
    { value: "MARKED_NA", label: "Marked as N/A" },
  ];
  const selectedFilterLabel = filterOptions.find((option) => option.value === filterMode)?.label ?? "All Documents";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid min-w-0 grid-cols-[4px_minmax(0,1fr)] items-start gap-4">
          <span className="mt-0.5 h-7 w-1 rounded-sm bg-[#F9D972]" aria-hidden="true" />
          <div className="min-w-0">
            <h3 className="monolith-h3 text-mono-text">{title}</h3>
            <p className="mt-1 text-sm text-mono-muted">
              Review uploaded document files, metadata, and workflow context.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1 sm:min-w-[280px]">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mono-muted" />
            <Input
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search documents..."
              className="pl-10"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                mode="icon"
                aria-label={`Filter documents. Current filter ${selectedFilterLabel}`}
                className="!h-11 !w-11 !min-w-11 shrink-0 !px-0"
              >
                <Filter size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="monolith-label">Document Status</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={filterMode} onValueChange={(value) => onFilterChange(value as FilterMode)}>
                <DropdownMenuRadioItem value="ALL">All Documents</DropdownMenuRadioItem>
                <DropdownMenuSeparator />
                <DropdownMenuRadioItem value="UPLOADED">Uploaded</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="PENDING">Pending</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="DECLARED_EXEMPTION">Declared Exemption</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="MARKED_NA">Marked as N/A</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <span className="monolith-label">Filter</span>
        <Badge variant={filterMode === "ALL" ? "secondary" : "default"}>{selectedFilterLabel}</Badge>
      </div>
    </div>
  );
}

export function DocumentMetaItem({ label, value, accent = "default" }: DocumentMetaItemProps) {
  return (
    <div
      className={cn(
        "min-w-0 border-r border-mono-border/30 px-3 py-1.5 last:border-r-0",
        accent === "success" ? "bg-green-500/6" : accent === "warning" ? "bg-[#D88700]/8" : "",
      )}
    >
      <p className="monolith-label">{label}</p>
      <div className="mt-2 text-sm text-mono-text">{value}</div>
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
  showExceptionActions = true,
  showDeleteAction = true,
  uploadButtonLabel,
  statusOverride,
  helperContent,
  footerActions,
  uploadDisabled = false,
}: UploadedWorkflowDocumentCardProps) {
  const canDeleteCurrentVersion = canDelete || currentUserId === version.uploadedById;
  const fileSize = formatFileSize(version.sizeBytes);
  const headerStatus = statusOverride || requirement.status;

  return (
    <div
      className={cn(
        "flex h-full min-h-[260px] flex-col rounded-xl border border-[#F9D972]/35 bg-mono-card p-5 shadow-[0_22px_48px_-36px_rgba(15,23,42,0.18)] transition-all",
        selected ? "ring-2 ring-[#F9D972]/25 shadow-[0_24px_52px_-34px_rgba(0,206,196,0.24)]" : "hover:-translate-y-px",
      )}
      onClick={() => onSelect?.(requirement.id)}
    >
      <div className="flex h-full flex-col gap-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="monolith-icon-badge">
              <FileText size={18} />
            </span>
            <div className="min-w-0">
              <h3 className="text-base font-normal uppercase tracking-[0.12em] text-mono-text">{requirement.name}</h3>
            </div>
          </div>
          <div className="flex shrink-0 items-center">
            <DocumentStatusBadge status={headerStatus} />
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-mono-border/45 bg-mono-card shadow-[inset_0_1px_0_rgba(255,255,255,0.32)]">
          <div className="flex flex-col gap-3 px-4 py-3.5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2 text-left text-sm font-semibold text-mono-text">
                  <span className="truncate">{version.fileName}</span>
                  <Download size={16} className="shrink-0 text-[#F9D972]" />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="monolith-numeric text-sm text-mono-muted">{fileSize}</span>
              {showDeleteAction && canDeleteCurrentVersion ? (
                <Button
                  type="button"
                  variant="outline"
                  mode="icon"
                  size="sm"
                  className="monolith-plain !h-9 !w-9 !min-w-9 !rounded-xl !border-red-500/35 !bg-mono-card !p-0 !text-red-500 hover:!border-red-500 hover:!bg-red-500/10 hover:!text-red-600"
                  onClick={() => onDelete(requirement.id, version.id, version.fileName)}
                  disabled={loadingKey !== null}
                  aria-label={`Delete ${version.fileName}`}
                >
                  <Trash className="h-4 w-3.5" strokeWidth={1.9} />
                </Button>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-0 bg-mono-soft/25 px-3 py-2 [&>*]:w-full">
            <DocumentMetaItem
              label="Source"
              value={
                version.source === "FILING_WORKFLOW"
                  ? "Filing Workflow"
                  : version.source === "CUSTOMER_PORTAL"
                    ? "Customer Portal"
                    : "Documents Page"
              }
            />
            <DocumentMetaItem label="Uploaded By" value={version.uploadedBy?.name || "Unknown"} />
            <DocumentMetaItem label="Uploaded On" value={<span className="monolith-numeric">{formatDateOnly(version.uploadedAt)}</span>} />
            <DocumentMetaItem label="Validity" value={version.validityDate ? <span className="monolith-numeric">{formatDateOnly(version.validityDate)}</span> : "Not required"} accent={version.validityDate ? "default" : "success"} />
          </div>
        </div>

        {helperContent ? <div className="rounded-xl border border-mono-border/35 bg-mono-soft/45 p-3">{helperContent}</div> : null}

        <div className="mt-auto flex flex-wrap items-center justify-end gap-3 border-t border-mono-border/20 pt-3.5">
          <Button type="button" variant="outline" className="gap-2" onClick={() => onPreview(requirement.id)}>
            <Eye size={16} />
            View File
          </Button>
          {showExceptionActions ? (
            <>
              <Button type="button" variant="outline" className="gap-2" onClick={() => onDeclareExemption(requirement.id)} disabled={loadingKey !== null}>
                <ShieldCheck size={16} />
                Declare Exemption
              </Button>
              <Button
                type="button"
                variant="outline"
                className="gap-2 border-[#D88700]/50 text-[#D88700] hover:bg-mono-card"
                onClick={() => onMarkNa(requirement.id)}
                disabled={loadingKey !== null}
              >
                Mark as N/A
              </Button>
            </>
          ) : null}
          <Button type="button" className="min-w-[160px] gap-2" onClick={() => onUpload(requirement.id)} disabled={loadingKey !== null || uploadDisabled}>
            <Upload size={16} />
            {uploadButtonLabel || "Re-upload"}
          </Button>
          {footerActions}
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
  const [pdfPreviewState, setPdfPreviewState] = React.useState<{ key: string; url: string } | null>(null);
  const onPreviewErrorRef = React.useRef(onPreviewError);
  const previewStateKey = `${version?.id || "none"}-${activeTab}`;
  const pdfPreviewKey = `${version?.id || "none"}:${previewUrl || ""}`;
  const effectivePdfPreviewUrl = previewUrl?.startsWith("blob:")
    ? previewUrl
    : pdfPreviewState?.key === pdfPreviewKey
      ? pdfPreviewState.url
      : null;

  React.useEffect(() => {
    onPreviewErrorRef.current = onPreviewError;
  }, [onPreviewError]);

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

  React.useEffect(() => {
    if (!open || !version || version.mimeType !== "application/pdf" || !previewUrl || previewUrl.startsWith("blob:")) {
      return;
    }

    let isCancelled = false;
    let objectUrl: string | null = null;

    fetch(previewUrl, { credentials: "include" })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to load PDF preview.");
        }
        return response.blob();
      })
      .then((blob) => {
        if (isCancelled) return;
        objectUrl = URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
        setPdfPreviewState({ key: pdfPreviewKey, url: objectUrl });
      })
      .catch(() => {
        if (!isCancelled) {
          onPreviewErrorRef.current();
        }
      });

    return () => {
      isCancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [open, pdfPreviewKey, previewUrl, version]);

  if (!open || !requirement) {
    return null;
  }

  const mimeType = version?.mimeType || "application/octet-stream";
  const isImage = version ? mimeType.startsWith("image/") : false;
  const isPdf = version ? mimeType === "application/pdf" : false;
  const canPreview = version ? (Boolean(previewUrl) && (isImage || isPdf)) : false;
  const sourceLabel = version?.source === "FILING_WORKFLOW" ? "Filing Workflow" : "Documents Page";
  const fileSize = version ? formatFileSize(version.sizeBytes) : "";
  const previewDocumentNameClass = "monolith-label text-mono-text";
  const previewIconButtonClass = "!h-11 !w-11 !min-w-11 !rounded-xl !p-0";
  const exceptionState = requirement.exception?.reason
    ? requirement.exception.reason === "N/A"
      ? "Marked as N/A"
      : `Exempted: ${requirement.exception.reason}`
    : "None";

  return (
    <aside className="rounded-xl border border-mono-border/45 bg-mono-card px-6 py-5 shadow-[0_24px_60px_-38px_rgba(15,23,42,0.22)] xl:sticky xl:top-24">
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <div className="flex items-start gap-3">
              <div className="min-w-0 space-y-2">
                <h3 className="truncate text-base font-normal uppercase tracking-[0.12em] text-mono-text">{requirement.name}</h3>
                <DocumentStatusBadge status={requirement.status} />
              </div>
            </div>
          </div>
          <Button type="button" variant="outline" mode="icon" className={previewIconButtonClass} onClick={onClose} aria-label="Close document preview drawer">
            <X size={16} />
          </Button>
        </div>

        <div className="border-b border-mono-border/20">
          <div role="tablist" aria-label="Document preview tabs" className="flex items-center gap-8">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "preview"}
              className={cn(
                "border-b-2 px-1 pb-3 text-base font-medium transition-colors",
                activeTab === "preview" ? "border-[#F9D972] text-[#F9D972]" : "border-transparent text-mono-text",
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
                activeTab === "details" ? "border-[#F9D972] text-[#F9D972]" : "border-transparent text-mono-text",
              )}
              onClick={() => onTabChange("details")}
            >
              Details
            </button>
          </div>
        </div>

        {activeTab === "preview" ? (
          <div className="space-y-5">
            <div className="overflow-hidden rounded-xl border border-mono-border/35 bg-mono-card shadow-[0_18px_40px_-34px_rgba(15,23,42,0.14)]">
              <div className="relative flex min-h-[340px] items-center justify-center overflow-hidden border-b border-mono-border/15 bg-mono-soft/25">
                {!version ? (
                  <div className="space-y-4 p-6 text-center">
                    <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-500">
                      <FileText size={40} />
                    </span>
                    <div className="space-y-1">
                      <p className="text-base font-normal uppercase tracking-[0.12em] text-mono-text">No Document Uploaded</p>
                    </div>
                    <p className="mx-auto max-w-[240px] text-sm text-mono-muted">
                      Use the Quick Upload section or click the document card actions to add a file.
                    </p>
                  </div>
                ) : canPreview ? (
                  <>
                    {loadingPreview ? (
                      <div className="absolute inset-0 z-10 flex items-center justify-center bg-mono-card/80">
                        <span className="text-sm text-mono-muted">Loading preview...</span>
                      </div>
                    ) : null}
                    {isImage ? (
                      <img
                        key={previewStateKey}
                        src={previewUrl!}
                        alt={version.fileName}
                        className="h-full max-h-[340px] w-full object-contain transition-transform"
                        style={{ transform: `scale(${imageScale})` }}
                        onLoad={onPreviewLoad}
                        onError={onPreviewError}
                      />
                    ) : effectivePdfPreviewUrl ? (
                      <iframe
                        src={effectivePdfPreviewUrl}
                        className="h-[340px] w-full border-0"
                        title={version.fileName}
                        onLoad={onPreviewLoad}
                      />
                    ) : (
                      <div className="flex h-[340px] w-full items-center justify-center p-6 text-sm text-mono-muted">
                        Loading PDF preview...
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-4 p-6 text-center">
                    <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-xl border border-[#F9D972]/20 bg-[#F9D972]/10 text-[#F9D972]">
                      <FileText size={40} />
                    </span>
                    <div className="space-y-1">
                      <p className={previewDocumentNameClass}>{version.fileName}</p>
                      <p className="text-sm text-mono-muted">{fileSize}</p>
                    </div>
                    <p className="mx-auto max-w-[240px] text-sm text-mono-muted">
                      Inline preview is unavailable for this file type. Download the file to review it locally.
                    </p>
                  </div>
                )}
              </div>

              {version ? (
                <div className="space-y-3 px-4 py-3.5">
                  <div className="text-center">
                    <p className={previewDocumentNameClass}>{version.fileName}</p>
                    <p className="mt-1.5 text-sm text-mono-muted">{fileSize}</p>
                  </div>

                  <div className="flex items-center justify-center gap-3">
                    <Button type="button" variant="outline" mode="icon" className={previewIconButtonClass} onClick={() => setImageScale((current) => Math.max(0.75, current - 0.1))} disabled={!isImage}>
                      <ZoomOut size={16} />
                    </Button>
                    <Button type="button" variant="outline" mode="icon" className={previewIconButtonClass} onClick={() => setImageScale((current) => Math.min(2.5, current + 0.1))} disabled={!isImage}>
                      <ZoomIn size={16} />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      mode="icon"
                      className={previewIconButtonClass}
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
                      <Button type="button" variant="outline" mode="icon" className={previewIconButtonClass} disabled={!downloadUrl}>
                        <Download size={16} />
                      </Button>
                    </a>
                  </div>
                </div>
              ) : null}
            </div>

            {version ? (
              <div className="space-y-4">
                <PreviewSectionHeading>Document Health</PreviewSectionHeading>
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-green-500/10 text-green-600">
                        <CheckCircle2 size={14} />
                      </span>
                      <span className="text-mono-text">File uploaded</span>
                    </div>
                    <span className="text-mono-muted">{formatDateTime(version.uploadedAt)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-mono-soft text-mono-muted">
                        <Circle size={10} fill="currentColor" />
                      </span>
                      <span className="text-mono-text">Virus scan</span>
                    </div>
                    <span className="rounded-full bg-mono-soft px-3 py-1 text-xs font-medium text-mono-muted">Not checked</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-mono-soft text-mono-muted">
                        <Circle size={10} fill="currentColor" />
                      </span>
                      <span className="text-mono-text">File integrity</span>
                    </div>
                    <span className="rounded-full bg-mono-soft px-3 py-1 text-xs font-medium text-mono-muted">Not checked</span>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="border-t border-mono-border/20 pt-5">
              <PreviewSectionHeading>Workflow Context</PreviewSectionHeading>
              <div className="mt-4 space-y-1">
                <DocumentDetailRow label="Step" value={<span>{currentStageLabel}</span>} />
                {version ? (
                  <>
                    <DocumentDetailRow label="Current Status" value={<span className="rounded-full bg-[#F9D972]/10 px-3 py-1 text-xs font-medium text-[#F9D972]">{currentStepLabel}</span>} />
                    <DocumentDetailRow label="Due Date" value={dueDate ? <span className="monolith-numeric">{formatDateOnly(dueDate)}</span> : "Not scheduled"} />
                    <DocumentDetailRow label="Submitted By" value={version.uploadedBy?.name || "Unknown"} />
                    <DocumentDetailRow label="Requirement Status" value={requirement.status.replace(/_/g, " ")} />
                    <DocumentDetailRow label="Validity" value={version.validityDate ? formatDateOnly(version.validityDate) : "Not required"} />
                    <DocumentDetailRow label="Source" value={sourceLabel} />
                  </>
                ) : (
                  <>
                    <DocumentDetailRow label="Requirement Status" value={requirement.status.replace(/_/g, " ")} />
                    <DocumentDetailRow label="Due Date" value={dueDate ? <span className="monolith-numeric">{formatDateOnly(dueDate)}</span> : "Not scheduled"} />
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            <DocumentDetailRow label="Document Requirement" value={requirement.name} />
            {version ? (
              <>
                <DocumentDetailRow label="Original File Name" value={version.fileName} />
                <DocumentDetailRow label="MIME Type" value={mimeType} />
                <DocumentDetailRow label="File Size" value={<span className="monolith-numeric">{fileSize}</span>} />
                <DocumentDetailRow label="Source" value={sourceLabel} />
                <DocumentDetailRow label="Uploaded By" value={version.uploadedBy?.name || "Unknown"} />
                <DocumentDetailRow label="Uploaded On" value={<span className="monolith-numeric">{formatDateTime(version.uploadedAt)}</span>} />
                <DocumentDetailRow label="Validity" value={version.validityDate ? formatDateOnly(version.validityDate) : "Not required"} />
                <DocumentDetailRow label="Linked Job Stage" value={currentStageLabel} />
                <DocumentDetailRow label="Requirement Status" value={requirement.status.replace(/_/g, " ")} />
                <DocumentDetailRow label="Version State" value={version.isCurrent ? "Current Version" : "Previous Version"} />
              </>
            ) : (
              <>
                <DocumentDetailRow label="Mandatory" value={requirement.isMandatory ? "Yes" : "No"} />
                <DocumentDetailRow label="Linked Job Stage" value={currentStageLabel} />
                <DocumentDetailRow label="Requirement Status" value={requirement.status.replace(/_/g, " ")} />
              </>
            )}
            <DocumentDetailRow label="Exception State" value={exceptionState} />
            {requirement.exception?.createdAt ? (
              <DocumentDetailRow label="Exception Recorded On" value={<span className="monolith-numeric">{formatDateTime(requirement.exception.createdAt)}</span>} />
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
    <aside className="rounded-xl border border-mono-border/60 bg-mono-card p-5 shadow-[0_20px_46px_-34px_rgba(15,23,42,0.16)] xl:sticky xl:top-24">
      <div className="space-y-5">
        <div className="space-y-1">
          <p className="monolith-label text-[#F9D972]">{eyebrow}</p>
          <div className="grid grid-cols-[4px_minmax(0,1fr)] items-center gap-4">
            <span className="h-7 w-1 rounded-sm bg-[#F9D972]" aria-hidden="true" />
            <h3 className="monolith-h3 text-mono-text">{title}</h3>
          </div>
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
                          ? "border-[#F9D972]/40 bg-[#F9D972]/10 text-[#F9D972]"
                          : "border-mono-border/60 bg-mono-soft text-mono-muted",
                    )}
                  >
                    {step.status === "completed" ? <CheckCircle2 size={16} /> : <Circle size={12} fill="currentColor" />}
                  </span>
                  {!isLast ? (
                    <span
                      className={cn(
                        "mt-2 block h-10 w-px",
                        step.status === "completed" ? "bg-green-500/35" : step.status === "active" ? "bg-[#F9D972]/28" : "bg-outline-variant/50",
                      )}
                    />
                  ) : null}
                </div>
                <div className="min-w-0 pb-2">
                  <p className="text-sm font-medium text-mono-text">{step.title}</p>
                  <p className="mt-1 text-xs text-mono-muted">{step.detail}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="rounded-xl border border-mono-border/55 bg-mono-soft/55 p-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="monolith-label">Overall Progress</p>
              <p className="monolith-numeric mt-2 text-2xl text-mono-text">{overallProgress}%</p>
            </div>
            <span className="rounded-full border border-[#F9D972]/25 bg-[#F9D972]/10 px-3 py-1 text-xs font-medium text-[#F9D972]">
              {currentStepLabel}
            </span>
          </div>
          <div className="mt-4 h-2 rounded-full bg-mono-soft">
            <div
              className="h-2 rounded-full bg-[linear-gradient(90deg,#F9D972_0%,#13b8c4_100%)]"
              style={{ width: `${Math.max(0, Math.min(100, overallProgress))}%` }}
            />
          </div>
          <p className="mt-3 text-xs text-mono-muted">Current status: {currentStepLabel}</p>
          <p className="mt-2 text-xs text-mono-muted">{helperNote}</p>
        </div>
      </div>
    </aside>
  );
}

export function DocumentDropzone({
  requirement,
  requirementsList,
  onRequirementIdChange,
  maxFileSizeLabel = "15MB",
  disabled,
  onInputChange,
}: DocumentDropzoneProps) {
  const inputId = requirement ? `workflow-document-dropzone-${requirement.id}` : "workflow-document-dropzone-disabled";
  const [isDragActive, setIsDragActive] = React.useState(false);
  const requirementOptions =
    requirementsList?.map((req) => ({
      value: req.id,
      label: `${req.status === "UPLOADED" ? "[Uploaded]" : "[Pending]"} ${req.name}${req.isMandatory ? " *" : ""}`,
    })) ?? [];

  return (
    <div className="rounded-xl border border-mono-border/60 bg-mono-card p-5 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.14)]">
      <div className="mb-4 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="monolith-label">Quick Upload</p>
          {requirement ? getDocumentStatusBadge(requirement.status) : null}
        </div>
        {requirementsList && requirementsList.length > 0 ? (
          <div className="mt-1">
            <DropdownSelect
              ariaLabel="Select document slot to upload"
              contentClassName="rounded-xl"
              disabled={disabled}
              onValueChange={(value) => onRequirementIdChange?.(value)}
              options={requirementOptions}
              placeholder="Select document slot to upload..."
              triggerClassName="rounded-xl border-[#F9D972]/45 text-sm"
              value={requirement?.id || ""}
            />
          </div>
        ) : (
          <p className="mt-1 text-sm text-mono-muted">
            {requirement ? `Uploading to ${requirement.name}` : "Select a document card to upload into the correct slot."}
          </p>
        )}
      </div>
      <label
        htmlFor={inputId}
        className={cn(
          "flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-mono-border/60 bg-mono-card px-6 py-10 text-center transition hover:border-[#F9D972]/60 hover:bg-mono-soft/40",
          isDragActive ? "border-[#F9D972]/70 bg-mono-soft/50" : "",
          disabled || !requirement ? "pointer-events-none cursor-not-allowed opacity-60 bg-mono-soft/10" : "",
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
        <span className="monolith-icon-badge">
          <Upload size={18} />
        </span>
        <div>
          <p className="text-base font-medium text-mono-text">
            Drag and drop files here, or <span className="text-[#F9D972]">browse</span>
          </p>
          <p className="mt-1 text-sm text-mono-muted">Supports PNG, JPG, PDF up to {maxFileSizeLabel}</p>
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
