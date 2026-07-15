"use client";

import Image from "next/image";
import { useDeferredValue, useState } from "react";
import {
  AlertCircle,
  ArrowDownToLine,
  CheckCircle2,
  Clock3,
  Eye,
  FileArchive,
  FileImage,
  FileText,
  FileVideo,
  FolderOpen,
  Info,
  Search,
  ShieldAlert,
  UploadCloud,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { Input } from "@/components/ui/input";
import { PortalDocumentUploadForm } from "./client-actions";

type PortalDocumentVersion = {
  id: string;
  name: string;
  url: string;
  downloadUrl?: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
  uploadedAt?: string | null;
  uploadedAtValue?: string | null;
  uploadedAtLabel: string;
  uploadedByLabel?: string | null;
  statusLabel?: string | null;
  kindLabel?: string | null;
  description?: string | null;
};

type PortalShipmentDocument = {
  id: string;
  jobId: string;
  name: string;
  category: string;
  categoryOrder: number;
  statusKey:
    | "required"
    | "not_uploaded"
    | "uploaded"
    | "awaiting_verification"
    | "accepted"
    | "rejected"
    | "not_available"
    | "replaced"
    | "expired";
  statusLabel: string;
  statusVariant: "default" | "secondary" | "success" | "warning" | "destructive";
  customerActionRequired: boolean;
  isRequired: boolean;
  canUpload: boolean;
  canReplace: boolean;
  currentFileName?: string | null;
  uploadedAtLabel: string;
  uploadedAtValue?: string | null;
  updatedAtLabel: string;
  updatedAtValue?: string | null;
  sizeLabel: string;
  uploadedByLabel: string;
  reviewRemark?: string | null;
  customerRemark?: string | null;
  unavailableReason?: string | null;
  acceptedFileTypes: string[];
  versionCount: number;
  currentVersionId?: string | null;
  versions: PortalDocumentVersion[];
};

type PortalShipmentDocumentManagerProps = {
  documents: PortalShipmentDocument[];
  shipmentContext: {
    jobNumber: string;
    shipmentReference: string;
    customerName: string;
    shipmentType: string;
    clearanceType: string;
    stageLabel: string;
    lastUpdatedLabel: string;
  };
};

const sortOptions = [
  { value: "recent", label: "Recently updated" },
  { value: "oldest", label: "Oldest updated" },
  { value: "name", label: "Document name" },
  { value: "category", label: "Category" },
  { value: "status", label: "Status" },
] as const;

const statusOrder = [
  "required",
  "not_uploaded",
  "uploaded",
  "awaiting_verification",
  "accepted",
  "rejected",
  "not_available",
  "replaced",
  "expired",
] as const;

const statusFilterLabels: Record<PortalShipmentDocument["statusKey"], string> = {
  required: "Required",
  not_uploaded: "Not uploaded",
  uploaded: "Uploaded",
  awaiting_verification: "Awaiting verification",
  accepted: "Accepted",
  rejected: "Rejected",
  not_available: "Not available",
  replaced: "Replaced",
  expired: "Expired",
};

function formatFileSize(bytes?: number | null) {
  if (!bytes || !Number.isFinite(bytes) || bytes <= 0) return "Size unavailable";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function inferPreviewKind(file?: PortalDocumentVersion | null) {
  if (!file) return "other";
  const mime = file.mimeType?.toLowerCase() ?? "";
  const name = file.name.toLowerCase();

  if (mime.startsWith("image/") || /\.(png|jpe?g|gif|webp|bmp|svg)$/.test(name)) return "image";
  if (mime.includes("pdf") || name.endsWith(".pdf")) return "pdf";
  if (mime.startsWith("video/") || /\.(mp4|mov|webm|ogg)$/i.test(name)) return "video";
  if (mime.startsWith("text/") || /\.(txt|csv|log|json)$/i.test(name)) return "text";
  return "other";
}

function FileKindIcon({ file }: { file?: PortalDocumentVersion | null }) {
  if (!file) return <FileText className="size-[18px]" />;

  const kind = inferPreviewKind(file);
  if (kind === "image") return <FileImage className="size-[18px]" />;
  if (kind === "video") return <FileVideo className="size-[18px]" />;
  if (file.kindLabel?.toLowerCase().includes("folder")) return <FolderOpen className="size-[18px]" />;
  if (file.name.toLowerCase().endsWith(".zip") || file.name.toLowerCase().endsWith(".rar")) {
    return <FileArchive className="size-[18px]" />;
  }
  return <FileText className="size-[18px]" />;
}

function StatusBadge({ document }: { document: PortalShipmentDocument }) {
  const Icon =
    document.statusKey === "accepted"
      ? CheckCircle2
      : document.customerActionRequired
        ? ShieldAlert
        : document.statusKey === "awaiting_verification" || document.statusKey === "uploaded"
          ? Clock3
          : document.statusKey === "not_available"
            ? Info
            : document.statusKey === "expired" || document.statusKey === "rejected"
              ? AlertCircle
              : FileText;

  return (
    <Badge variant={document.statusVariant} className="inline-flex items-center gap-1.5">
      <Icon size={12} />
      {document.statusLabel}
    </Badge>
  );
}

function DocumentPreview({
  version,
  fallbackLabel,
}: {
  version?: PortalDocumentVersion | null;
  fallbackLabel: string;
}) {
  const previewKind = inferPreviewKind(version);

  if (!version) {
    return (
      <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 px-6 text-center">
        <div className="flex size-14 items-center justify-center rounded-3xl border border-outline-variant/50 bg-surface-container-low text-[#00cec4]">
          <UploadCloud size={22} />
        </div>
        <div className="space-y-1">
          <h4 className="ds-h3 text-on-surface">Waiting For Upload</h4>
          <p className="mx-auto max-w-md text-sm leading-6 text-on-surface-variant">
            Upload the requested file to start verification and make it available in this document center.
          </p>
        </div>
      </div>
    );
  }

  if (previewKind === "image") {
    return (
      <div className="flex min-h-[320px] items-center justify-center bg-surface-container-low/40 p-4">
        <Image
          src={version.url}
          alt={version.name}
          width={1600}
          height={1200}
          unoptimized
          className="max-h-[520px] w-auto max-w-full rounded-xl object-contain"
        />
      </div>
    );
  }

  if (previewKind === "pdf" || previewKind === "text") {
    return <iframe title={version.name} src={version.url} className="h-[420px] w-full bg-surface xl:h-[520px]" />;
  }

  if (previewKind === "video") {
    return (
      <video controls className="h-[420px] w-full bg-black/80 xl:h-[520px]">
        <source src={version.url} type={version.mimeType ?? undefined} />
      </video>
    );
  }

  return (
    <div className="flex min-h-[260px] flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex size-16 items-center justify-center rounded-3xl border border-outline-variant/50 bg-surface-container-low text-[#00cec4]">
        <FileKindIcon file={version} />
      </div>
      <div className="space-y-1">
        <h4 className="ds-h3 text-on-surface">Preview Not Available</h4>
        <p className="mx-auto max-w-md text-sm leading-6 text-on-surface-variant">
          {fallbackLabel} can still be opened in a separate tab or downloaded for local review.
        </p>
      </div>
    </div>
  );
}

function SelectedDocumentPanel({
  document,
  activeVersionId,
  onVersionChange,
}: {
  document: PortalShipmentDocument;
  activeVersionId: string;
  onVersionChange: (nextVersionId: string) => void;
}) {
  const activeVersion =
    document.versions.find((version) => version.id === activeVersionId) ?? document.versions[0] ?? null;
  const previewHeading = document.isRequired ? "Documents Required From Supplier" : "Latest Shared Document";
  const previewSummary =
    document.customerActionRequired
      ? "Customer action is currently required for this document."
      : "Review the latest file, metadata, and version history for this shipment document.";

  return (
    <section className="space-y-4">
      <div className="overflow-hidden rounded-[24px] border border-outline-variant/60 bg-surface shadow-sm">
        <div className="border-b border-outline-variant/60 px-5 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="ds-label">{previewHeading}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <h3 className="ds-h3 text-on-surface">{document.name}</h3>
                <StatusBadge document={document} />
              </div>
              <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                {previewSummary}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {activeVersion ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(activeVersion.url, "_blank", "noopener,noreferrer")}
                >
                  <Eye size={15} />
                  Open
                </Button>
              ) : null}
              {activeVersion?.downloadUrl ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => window.location.assign(activeVersion.downloadUrl!)}
                >
                  <ArrowDownToLine size={15} />
                  Download
                </Button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="space-y-4 p-4 sm:p-5">
          <div className="overflow-hidden rounded-[22px] border border-outline-variant/45 bg-surface-container-low/40">
            <div className="flex items-center gap-3 border-b border-outline-variant/45 bg-surface px-4 py-3">
              <span className="ds-icon-badge">
                <FileKindIcon file={activeVersion} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-on-surface">
                  {activeVersion?.name ?? document.currentFileName ?? document.name}
                </p>
                <p className="mt-0.5 text-xs text-on-surface-variant">
                  {activeVersion?.kindLabel ?? "Document preview"}
                </p>
              </div>
            </div>
            <DocumentPreview version={activeVersion} fallbackLabel={document.name} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-outline-variant/45 bg-surface-container-low/45 px-4 py-3">
              <p className="ds-label">Filename</p>
              <p className="mt-1 truncate text-sm font-semibold text-on-surface">
                {activeVersion?.name ?? document.currentFileName ?? "Pending upload"}
              </p>
            </div>
            <div className="rounded-2xl border border-outline-variant/45 bg-surface-container-low/45 px-4 py-3">
              <p className="ds-label">File Size</p>
              <p className="mt-1 text-sm font-semibold text-on-surface">
                {activeVersion ? formatFileSize(activeVersion.sizeBytes) : document.sizeLabel}
              </p>
            </div>
            <div className="rounded-2xl border border-outline-variant/45 bg-surface-container-low/45 px-4 py-3">
              <p className="ds-label">Updated</p>
              <p className="mt-1 text-sm font-semibold text-on-surface">
                {activeVersion?.uploadedAtLabel ?? document.updatedAtLabel}
              </p>
            </div>
            <div className="rounded-2xl border border-outline-variant/45 bg-surface-container-low/45 px-4 py-3">
              <p className="ds-label">Uploaded By</p>
              <p className="mt-1 text-sm font-semibold text-on-surface">
                {activeVersion?.uploadedByLabel ?? document.uploadedByLabel}
              </p>
            </div>
          </div>

          {document.reviewRemark ? (
            <div className="rounded-2xl border border-outline-variant/45 bg-surface-container-low/45 px-4 py-3">
              <p className="ds-label">Review Remark</p>
              <p className="mt-1 text-sm leading-6 text-on-surface">{document.reviewRemark}</p>
            </div>
          ) : null}

          {document.customerRemark ? (
            <div className="rounded-2xl border border-outline-variant/45 bg-surface-container-low/45 px-4 py-3">
              <p className="ds-label">Customer Note</p>
              <p className="mt-1 text-sm leading-6 text-on-surface">{document.customerRemark}</p>
            </div>
          ) : null}

          {document.unavailableReason ? (
            <div className="rounded-2xl border border-outline-variant/45 bg-surface-container-low/45 px-4 py-3">
              <p className="ds-label">Availability Note</p>
              <p className="mt-1 text-sm leading-6 text-on-surface">{document.unavailableReason}</p>
            </div>
          ) : null}

          {document.canUpload ? (
            <div className="rounded-[20px] border border-outline-variant/45 bg-surface p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="ds-icon-badge mt-0.5">
                  <UploadCloud size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="ds-h3 text-on-surface">
                    {document.canReplace ? "Replace document" : "Upload requested document"}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-on-surface-variant">
                    {document.canReplace
                      ? "Share an updated file if the current version needs correction."
                      : "Provide the requested file so the operations team can continue the shipment workflow."}
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <PortalDocumentUploadForm
                  jobId={document.jobId}
                  requirementId={document.id}
                  acceptedFileTypes={document.acceptedFileTypes}
                  helperText={
                    document.acceptedFileTypes.length
                      ? `Accepted formats: ${document.acceptedFileTypes.join(", ")}. Maximum upload size is 10 MB.`
                      : "PDF, JPG, PNG, and WEBP are supported up to 10 MB."
                  }
                />
              </div>
            </div>
          ) : null}

          {document.versions.length > 0 ? (
            <div className="rounded-[20px] border border-outline-variant/45 bg-surface p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="ds-h3 text-on-surface">Version History</p>
                  <p className="mt-1 text-xs text-on-surface-variant">
                    Inspect the current file and any previous visible versions.
                  </p>
                </div>
                <span className="rounded-full border border-outline-variant/60 bg-surface-container-low px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-on-surface-variant">
                  {document.versionCount} versions
                </span>
              </div>
              <div className="mt-4 space-y-2">
                {document.versions.map((version) => {
                  const isActive = version.id === activeVersionId;
                  return (
                    <button
                      key={version.id}
                      type="button"
                      onClick={() => onVersionChange(version.id)}
                      className={`grid w-full grid-cols-[44px_minmax(0,1fr)] items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-all ${
                        isActive
                          ? "border-primary/35 bg-primary/10 shadow-[0_8px_24px_rgba(0,196,182,0.10)]"
                          : "border-outline-variant/45 bg-surface-container-low/35 hover:border-outline-variant/70 hover:bg-surface-container-low/70"
                      }`}
                    >
                      <span className="flex size-11 items-center justify-center rounded-2xl border border-outline-variant/35 bg-surface text-[#00cec4]">
                        <FileKindIcon file={version} />
                      </span>
                      <span className="grid min-w-0 gap-1 sm:grid-cols-[minmax(0,1fr)_88px_120px] sm:items-center sm:gap-3">
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-on-surface">{version.name}</span>
                          <span className="mt-0.5 block text-xs text-on-surface-variant">
                            {version.kindLabel ?? "Document"}
                          </span>
                        </span>
                        <span className="hidden text-right text-xs text-on-surface-variant sm:block ds-numeric">
                          {formatFileSize(version.sizeBytes)}
                        </span>
                        <span className="hidden text-right text-xs text-on-surface-variant sm:block">
                          {version.uploadedAtLabel}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function PortalShipmentDocumentManager({
  documents,
  shipmentContext,
}: PortalShipmentDocumentManagerProps) {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState<(typeof sortOptions)[number]["value"]>("recent");
  const [selectedDocumentIdState, setSelectedDocumentId] = useState(documents[0]?.id ?? "");
  const [activeVersionIdState, setActiveVersionId] = useState(
    documents[0]?.currentVersionId ?? documents[0]?.versions[0]?.id ?? "",
  );

  const categories = Array.from(
    new Map(
      documents
        .slice()
        .sort((left, right) => left.categoryOrder - right.categoryOrder || left.category.localeCompare(right.category))
        .map((document) => [document.category, document.category]),
    ).values(),
  );

  const availableStatusOptions = statusOrder.filter((key) =>
    documents.some((document) => document.statusKey === key),
  );

  const filteredDocuments = documents
    .filter((document) => {
      if (categoryFilter !== "all" && document.category !== categoryFilter) return false;
      if (statusFilter !== "all" && document.statusKey !== statusFilter) return false;
      if (!deferredSearch.trim()) return true;

      const query = deferredSearch.trim().toLowerCase();
      return [
        document.name,
        document.currentFileName ?? "",
        document.category,
        document.reviewRemark ?? "",
        document.customerRemark ?? "",
      ].some((value) => value.toLowerCase().includes(query));
    })
    .sort((left, right) => {
      if (sortBy === "oldest") {
        return (left.updatedAtValue ?? "").localeCompare(right.updatedAtValue ?? "");
      }
      if (sortBy === "name") {
        return left.name.localeCompare(right.name);
      }
      if (sortBy === "category") {
        return left.categoryOrder - right.categoryOrder || left.category.localeCompare(right.category) || left.name.localeCompare(right.name);
      }
      if (sortBy === "status") {
        return statusOrder.indexOf(left.statusKey) - statusOrder.indexOf(right.statusKey) || left.name.localeCompare(right.name);
      }
      return (right.updatedAtValue ?? "").localeCompare(left.updatedAtValue ?? "");
    });

  const selectedDocumentId = filteredDocuments.some((document) => document.id === selectedDocumentIdState)
    ? selectedDocumentIdState
    : filteredDocuments[0]?.id ?? "";

  const selectedDocument =
    filteredDocuments.find((document) => document.id === selectedDocumentId) ??
    documents.find((document) => document.id === selectedDocumentId) ??
    null;
  const activeVersionId =
    selectedDocument?.versions.some((version) => version.id === activeVersionIdState)
      ? activeVersionIdState
      : selectedDocument?.currentVersionId ?? selectedDocument?.versions[0]?.id ?? "";

  const totalDocuments = documents.length;
  const actionRequiredCount = documents.filter((document) => document.customerActionRequired).length;
  const pendingVerificationCount = documents.filter((document) =>
    ["uploaded", "awaiting_verification"].includes(document.statusKey),
  ).length;
  const acceptedCount = documents.filter((document) => document.statusKey === "accepted").length;

  const activeFilterCount =
    Number(categoryFilter !== "all") + Number(statusFilter !== "all") + Number(search.trim().length > 0);

  return (
    <section className="mt-5 space-y-5">
      <div className="rounded-[22px] border border-outline-variant/60 bg-surface shadow-sm">
        <div className="border-b border-outline-variant/60 px-4 py-5 sm:px-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="ds-label">Documents</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <h2 className="ds-h2 text-on-surface">Shipment Document Center</h2>
                {actionRequiredCount > 0 ? (
                  <Badge variant="warning">{actionRequiredCount} action required</Badge>
                ) : null}
              </div>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-on-surface-variant">
                View shipment documents, track review statuses, and upload customer-requested files for this shipment.
              </p>
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-on-surface-variant">
                <span>Job {shipmentContext.jobNumber}</span>
                <span>{shipmentContext.shipmentReference}</span>
                <span>{shipmentContext.customerName}</span>
                <span>{shipmentContext.shipmentType}</span>
                <span>{shipmentContext.clearanceType}</span>
                <span>{shipmentContext.stageLabel}</span>
                <span>Updated {shipmentContext.lastUpdatedLabel}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="card-top-accent rounded-[20px] border border-outline-variant/60 bg-surface px-4 py-3.5 shadow-sm">
                <p className="ds-label">Total</p>
                <p className="mt-2 text-2xl text-on-surface ds-numeric">{totalDocuments}</p>
              </div>
              <div className="card-top-accent-orange rounded-[20px] border border-outline-variant/60 bg-surface px-4 py-3.5 shadow-sm">
                <p className="ds-label">Action</p>
                <p className="mt-2 text-2xl text-on-surface ds-numeric">{actionRequiredCount}</p>
              </div>
              <div className="rounded-[20px] border border-outline-variant/60 bg-surface px-4 py-3.5 shadow-sm">
                <p className="ds-label">Pending Review</p>
                <p className="mt-2 text-2xl text-on-surface ds-numeric">{pendingVerificationCount}</p>
              </div>
              <div className="rounded-[20px] border border-outline-variant/60 bg-surface px-4 py-3.5 shadow-sm">
                <p className="ds-label">Accepted</p>
                <p className="mt-2 text-2xl text-on-surface ds-numeric">{acceptedCount}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 px-4 py-4 sm:px-6">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_220px_220px_220px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" size={17} />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by document name, file name, or category"
                className="pl-10"
              />
            </div>
            <DropdownSelect
              ariaLabel="Filter documents by category"
              value={categoryFilter}
              onValueChange={setCategoryFilter}
              options={[
                { value: "all", label: "All documents" },
                ...categories.map((category) => ({ value: category, label: category })),
              ]}
            />
            <DropdownSelect
              ariaLabel="Filter documents by status"
              value={statusFilter}
              onValueChange={setStatusFilter}
              options={[
                { value: "all", label: "All statuses" },
                ...availableStatusOptions.map((status) => ({
                  value: status,
                  label: statusFilterLabels[status],
                })),
              ]}
            />
            <DropdownSelect
              ariaLabel="Sort documents"
              value={sortBy}
              onValueChange={(value) => setSortBy(value as (typeof sortOptions)[number]["value"])}
              options={sortOptions.map((option) => ({ value: option.value, label: option.label }))}
            />
          </div>

          {activeFilterCount > 0 ? (
            <div className="flex items-center justify-between gap-3 rounded-[20px] border border-outline-variant/60 bg-surface-container-low/35 px-4 py-3">
              <p className="text-sm text-on-surface-variant">
                Showing {filteredDocuments.length} of {documents.length} documents.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setCategoryFilter("all");
                  setStatusFilter("all");
                  setSortBy("recent");
                }}
              >
                Clear filters
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      {documents.length === 0 ? (
        <div className="rounded-[22px] border border-dashed border-outline-variant/60 bg-surface p-10 text-center shadow-sm">
          <FileText className="mx-auto text-on-surface-variant" size={34} />
          <h3 className="mt-4 text-base font-semibold text-on-surface">No documents are available yet.</h3>
          <p className="mt-1 text-sm text-on-surface-variant">
            Shipment documents will appear here as the operations team progresses this job.
          </p>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="rounded-[22px] border border-dashed border-outline-variant/60 bg-surface p-10 text-center shadow-sm">
          <Search className="mx-auto text-on-surface-variant" size={30} />
          <h3 className="mt-4 text-base font-semibold text-on-surface">No documents match your search.</h3>
          <p className="mt-1 text-sm text-on-surface-variant">
            Try another term or clear the active filters to see the full document list.
          </p>
        </div>
      ) : (
        <div className={`grid gap-5 ${selectedDocument ? "xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]" : ""}`}>
          <div className="space-y-3">
            <div className="overflow-hidden rounded-[24px] border border-outline-variant/60 bg-surface shadow-sm">
              <div className="border-b border-outline-variant/60 px-4 py-4 sm:px-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="ds-label">Documents Table</p>
                    <h3 className="ds-h3 mt-2 text-on-surface">Shipment Documents</h3>
                    <p className="mt-1 text-sm text-on-surface-variant">
                      Each row represents a shipment document available to this customer.
                    </p>
                  </div>
                  <Badge variant="secondary">{filteredDocuments.length} ITEMS</Badge>
                </div>
              </div>

              <div className="overflow-hidden rounded-b-[24px]">
                <div className="overflow-x-auto">
                  <table className="ds-table">
                    <thead>
                      <tr>
                        <th>Document</th>
                        <th>Category</th>
                        <th>Status</th>
                        <th>Updated</th>
                        <th>Size</th>
                        <th>Uploaded By</th>
                        <th>Versions</th>
                        <th className="text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDocuments.map((document) => {
                        const currentVersion = document.versions[0] ?? null;
                        const isSelected = selectedDocument?.id === document.id;

                        return (
                          <tr
                            key={document.id}
                            className={`cursor-pointer transition ${
                              isSelected ? "bg-[#00cec4]/8 shadow-[inset_3px_0_0_0_#00cec4]" : ""
                            }`}
                            onClick={() => {
                              setSelectedDocumentId(document.id);
                              setActiveVersionId(document.currentVersionId ?? document.versions[0]?.id ?? "");
                            }}
                          >
                            <td>
                              <div className="flex items-start gap-3">
                                <span className="ds-icon-badge mt-0.5 shrink-0">
                                  <FileKindIcon file={currentVersion} />
                                </span>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium text-on-surface">{document.name}</p>
                                  <p className="mt-1 truncate text-xs text-on-surface-variant">
                                    {document.currentFileName ?? "No file uploaded"}
                                  </p>
                                  {document.customerActionRequired ? (
                                    <p className="mt-1 text-xs text-[#fb923c]">Customer action required</p>
                                  ) : null}
                                </div>
                              </div>
                            </td>
                            <td className="text-sm text-on-surface">{document.category}</td>
                            <td>
                              <StatusBadge document={document} />
                            </td>
                            <td className="text-sm text-on-surface-variant">{document.updatedAtLabel}</td>
                            <td className="ds-numeric text-sm text-on-surface-variant">{document.sizeLabel}</td>
                            <td className="text-sm text-on-surface-variant">{document.uploadedByLabel}</td>
                            <td className="ds-numeric text-sm text-on-surface-variant">{document.versionCount}</td>
                            <td>
                              <div className="flex flex-wrap items-center justify-end gap-2">
                                {currentVersion ? (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      setSelectedDocumentId(document.id);
                                      setActiveVersionId(document.currentVersionId ?? document.versions[0]?.id ?? "");
                                    }}
                                  >
                                    <Eye size={15} />
                                    Preview
                                  </Button>
                                ) : null}
                                {currentVersion?.downloadUrl ? (
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      window.location.assign(currentVersion.downloadUrl!);
                                    }}
                                  >
                                    <ArrowDownToLine size={15} />
                                    Download
                                  </Button>
                                ) : null}
                                {document.canUpload ? (
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      setSelectedDocumentId(document.id);
                                      setActiveVersionId(document.currentVersionId ?? document.versions[0]?.id ?? "");
                                    }}
                                  >
                                    <UploadCloud size={15} />
                                    {document.canReplace ? "Replace" : "Upload"}
                                  </Button>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {selectedDocument ? (
            <div className="space-y-5">
              <div className="xl:hidden">
                <SelectedDocumentPanel
                  document={selectedDocument}
                  activeVersionId={activeVersionId}
                  onVersionChange={setActiveVersionId}
                />
              </div>
              <div className="hidden xl:block xl:sticky xl:top-24">
                <SelectedDocumentPanel
                  document={selectedDocument}
                  activeVersionId={activeVersionId}
                  onVersionChange={setActiveVersionId}
                />
              </div>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
