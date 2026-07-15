import Link from "next/link";
import {
  ArrowLeft,
  Bell,
  Check,
  ChevronDown,
  ChevronRight,
  FileCheck2,
  FileImage,
  FileText,
  LockKeyhole,
  MessageSquareText,
  PackageCheck,
  Play,
  ShieldCheck,
  Sparkles,
  UserRound,
  FolderClosed,
} from "lucide-react";
import { requirePortalSession } from "@/modules/customer-portal/auth";
import {
  getPortalShipmentDetail,
  listPortalRatingCategories,
} from "@/modules/customer-portal/service";
import {
  PortalChecklistActionForm,
  PortalQueryReplyForm,
  PortalRatingForm,
} from "../../_components/client-actions";
import { PortalShipmentDocumentManager } from "../../_components/portal-shipment-document-manager";
import { Badge } from "@/components/ui/badge";

type StageId = "document" | "additional-data" | "checklist" | "filing";
type StageState = "completed" | "active" | "locked";

type PortalRequirementView = {
  id: string;
  name: string;
  category?: string | null;
  isMandatory?: boolean;
  status?: string;
  exception?: { reason?: string | null } | null;
  requirementItem?: {
    acceptedFileTypes?: string[];
    maxUploadCount?: number | null;
    minUploadCount?: number | null;
    requiresValidityDate?: boolean;
    category?: {
      name?: string | null;
      sortOrder?: number | null;
    } | null;
  } | null;
  versions: Array<{
    id: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    uploadedAt: string | Date;
    validityDate?: string | Date | null;
    uploadedBy?: { name?: string | null; email?: string | null } | null;
  }>;
  customerSubmissions: Array<{
    id: string;
    status: string;
    updatedAt?: string | Date | null;
    reviewerComment?: string | null;
    customerComment?: string | null;
    portalUser?: { name?: string | null; email?: string | null } | null;
    versions?: Array<{
      id: string;
      fileName?: string | null;
      mimeType?: string | null;
      sizeBytes?: number | null;
      uploadedAt?: string | Date | null;
    }>;
  }>;
};

type PortalThreadView = {
  id: string;
  title: string;
  description: string;
  requiresCustomerAction: boolean;
  status: string;
  messages: Array<{
    id: string;
    body: string;
    createdAt: string | Date;
    authorUser?: { name?: string | null; email?: string | null } | null;
    authorPortalUser?: { name?: string | null; email?: string | null } | null;
  }>;
};

type PortalStageView = {
  id: StageId;
  internalStageKey: string;
  sortOrder: number;
  label: string;
  description?: string | null;
};

type PortalShipmentDetailView = {
  job: {
    id: string;
    jobNumber: string;
    title: string;
    stage: string;
    status: string;
    updatedAt: Date | string;
    customer?: { name?: string | null } | null;
    shipmentType?: { name?: string | null } | null;
    jobType?: { name?: string | null } | null;
    additionalData?: {
      vesselInwardDate?: string | Date | null;
      importGeneralManifest?: string | null;
      exportGeneralManifest?: string | null;
      customManifestValue?: string | null;
      deliveryOrderValidity?: string | Date | null;
      deliveryOrderExtensionDate?: string | Date | null;
      doDocumentFileName?: string | null;
      doDocumentUploadedAt?: string | Date | null;
      status?: string | null;
      updatedAt?: string | Date | null;
    } | null;
    filingDetails?: Record<string, unknown> | null;
    documentRequirements: PortalRequirementView[];
    checklistWorkflow?: {
      id: string;
      status: string;
      currentApprovalStage?: string | null;
      currentFileVersion?: {
        id: string;
        originalFileName?: string | null;
        uploadedAt?: string | Date | null;
        remarks?: string | null;
      } | null;
    } | null;
    customerQueryThreads: PortalThreadView[];
    shipmentRatings: Array<{ portalUserId: string }>;
  };
  stageMappings: PortalStageView[];
  currentStage: PortalStageView | null;
  actions: {
    hasActionRequired: boolean;
    pendingDocumentCount: number;
    checklistPending: boolean;
    openQueryCount: number;
    ratingPending?: boolean;
  };
};

const nestedDetailKeys = [
  "boeDetails",
  "billOfEntryDetails",
  "filingDetails",
  "additionalData",
  "shipmentDetails",
  "metadata",
] as const;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function readFirstValue(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }

  for (const nestedKey of nestedDetailKeys) {
    const nested = asRecord(record[nestedKey]);
    if (!nested) continue;
    for (const key of keys) {
      const value = nested[key];
      if (value !== undefined && value !== null && value !== "") return value;
    }
  }

  return null;
}

function readText(record: Record<string, unknown>, keys: string[], fallback = "Not shared yet") {
  const value = readFirstValue(record, keys);
  if (typeof value === "string" || typeof value === "number") return String(value);
  return fallback;
}

function formatDate(value: unknown, includeTime = false) {
  if (!value) return "Not shared yet";
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(includeTime
      ? {
          hour: "2-digit" as const,
          minute: "2-digit" as const,
        }
      : {}),
  }).format(date);
}

function toIsoValue(value: unknown) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function normalizeLabel(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatFileSize(sizeBytes?: number | null) {
  if (!sizeBytes || sizeBytes <= 0) return "Pending";

  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = sizeBytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  const precision = size >= 100 || unitIndex === 0 ? 0 : size >= 10 ? 1 : 2;
  return `${size.toFixed(precision)} ${units[unitIndex]}`;
}

function getDocumentTypeMeta(name: string, mimeType?: string | null) {
  const normalizedName = name.toLowerCase();
  const normalizedMime = (mimeType ?? "").toLowerCase();

  if (normalizedMime.includes("pdf") || normalizedName.endsWith(".pdf")) {
    return {
      label: "PDF Document",
      Icon: FileText,
      accentClass: "text-[#00cec4]",
      shellClass: "bg-[#00cec4]/10",
    };
  }

  if (normalizedMime.includes("image") || /\.(png|jpe?g|gif|webp|svg)$/.test(normalizedName)) {
    return {
      label: "Image File",
      Icon: FileImage,
      accentClass: "text-[#00cec4]",
      shellClass: "bg-[#00cec4]/10",
    };
  }

  if (normalizedMime.includes("video") || /\.(mp4|mov|avi|mkv|webm)$/.test(normalizedName)) {
    return {
      label: "Video File",
      Icon: Play,
      accentClass: "text-[#fb923c]",
      shellClass: "bg-[#fb923c]/10",
    };
  }

  if (normalizedMime.includes("folder")) {
    return {
      label: "Folder",
      Icon: FolderClosed,
      accentClass: "text-[#00cec4]",
      shellClass: "bg-[#00cec4]/10",
    };
  }

  return {
    label: "Uploaded Document",
    Icon: FileText,
    accentClass: "text-on-surface-variant",
    shellClass: "bg-surface-container-low",
  };
}

function mapPortalDocumentStatus(requirement: PortalRequirementView, fallbackUpdatedAt: string | Date) {
  const submission = requirement.customerSubmissions[0];
  const latestInternalVersion = requirement.versions[0];
  const latestInternalValidity = latestInternalVersion?.validityDate ? new Date(String(latestInternalVersion.validityDate)) : null;
  const internalExpired =
    latestInternalValidity instanceof Date &&
    !Number.isNaN(latestInternalValidity.getTime()) &&
    latestInternalValidity.getTime() < Date.now();
  const hasExistingSubmission = Boolean(submission);
  const isPortalGeneric = requirement.category === "CUSTOMER_UPLOAD";
  const canUpload = !requirement.exception && (Boolean(requirement.isMandatory) || hasExistingSubmission || isPortalGeneric);
  const canReplace =
    canUpload &&
    submission !== undefined &&
    !["ACCEPTED", "APPROVED", "UNDER_REVIEW"].includes(submission.status);

  if (requirement.exception?.reason || requirement.status === "NOT_AVAILABLE") {
    return {
      statusKey: "not_available" as const,
      statusLabel: "Not available",
      statusVariant: "secondary" as const,
      customerActionRequired: false,
      canUpload: false,
      canReplace: false,
      updatedAtValue: toIsoValue(submission?.updatedAt ?? latestInternalVersion?.uploadedAt ?? fallbackUpdatedAt),
      updatedAtLabel: formatDate(submission?.updatedAt ?? latestInternalVersion?.uploadedAt ?? fallbackUpdatedAt, true),
    };
  }

  if (submission) {
    switch (submission.status) {
      case "ACCEPTED":
      case "APPROVED":
        return {
          statusKey: "accepted" as const,
          statusLabel: "Accepted",
          statusVariant: "success" as const,
          customerActionRequired: false,
          canUpload,
          canReplace: false,
          updatedAtValue: toIsoValue(submission.updatedAt ?? fallbackUpdatedAt),
          updatedAtLabel: formatDate(submission.updatedAt ?? fallbackUpdatedAt, true),
        };
      case "UNDER_REVIEW":
        return {
          statusKey: "awaiting_verification" as const,
          statusLabel: "Awaiting verification",
          statusVariant: "warning" as const,
          customerActionRequired: false,
          canUpload,
          canReplace: false,
          updatedAtValue: toIsoValue(submission.updatedAt ?? fallbackUpdatedAt),
          updatedAtLabel: formatDate(submission.updatedAt ?? fallbackUpdatedAt, true),
        };
      case "REJECTED":
      case "REUPLOAD_REQUIRED":
      case "CLARIFICATION_REQUIRED":
        return {
          statusKey: "rejected" as const,
          statusLabel: "Rejected",
          statusVariant: "destructive" as const,
          customerActionRequired: true,
          canUpload,
          canReplace,
          updatedAtValue: toIsoValue(submission.updatedAt ?? fallbackUpdatedAt),
          updatedAtLabel: formatDate(submission.updatedAt ?? fallbackUpdatedAt, true),
        };
      case "SUPERSEDED":
        return {
          statusKey: "replaced" as const,
          statusLabel: "Replaced",
          statusVariant: "secondary" as const,
          customerActionRequired: false,
          canUpload,
          canReplace,
          updatedAtValue: toIsoValue(submission.updatedAt ?? fallbackUpdatedAt),
          updatedAtLabel: formatDate(submission.updatedAt ?? fallbackUpdatedAt, true),
        };
      default:
        return {
          statusKey: "uploaded" as const,
          statusLabel: "Uploaded",
          statusVariant: "warning" as const,
          customerActionRequired: false,
          canUpload,
          canReplace,
          updatedAtValue: toIsoValue(submission.updatedAt ?? fallbackUpdatedAt),
          updatedAtLabel: formatDate(submission.updatedAt ?? fallbackUpdatedAt, true),
        };
    }
  }

  if (!latestInternalVersion && requirement.isMandatory) {
    return {
      statusKey: "required" as const,
      statusLabel: "Required",
      statusVariant: "destructive" as const,
      customerActionRequired: true,
      canUpload,
      canReplace: false,
      updatedAtValue: toIsoValue(fallbackUpdatedAt),
      updatedAtLabel: formatDate(fallbackUpdatedAt, true),
    };
  }

  if (!latestInternalVersion) {
    return {
      statusKey: "not_uploaded" as const,
      statusLabel: "Not uploaded",
      statusVariant: "secondary" as const,
      customerActionRequired: false,
      canUpload,
      canReplace: false,
      updatedAtValue: toIsoValue(fallbackUpdatedAt),
      updatedAtLabel: formatDate(fallbackUpdatedAt, true),
    };
  }

  if (internalExpired) {
    return {
      statusKey: "expired" as const,
      statusLabel: "Expired",
      statusVariant: "warning" as const,
      customerActionRequired: false,
      canUpload,
      canReplace: false,
      updatedAtValue: toIsoValue(latestInternalVersion.uploadedAt),
      updatedAtLabel: formatDate(latestInternalVersion.uploadedAt, true),
    };
  }

  if (requirement.status === "REPLACED") {
    return {
      statusKey: "replaced" as const,
      statusLabel: "Replaced",
      statusVariant: "secondary" as const,
      customerActionRequired: false,
      canUpload,
      canReplace: false,
      updatedAtValue: toIsoValue(latestInternalVersion.uploadedAt),
      updatedAtLabel: formatDate(latestInternalVersion.uploadedAt, true),
    };
  }

  return {
    statusKey: "uploaded" as const,
    statusLabel: "Uploaded",
    statusVariant: "success" as const,
    customerActionRequired: false,
    canUpload,
    canReplace: false,
    updatedAtValue: toIsoValue(latestInternalVersion.uploadedAt),
    updatedAtLabel: formatDate(latestInternalVersion.uploadedAt, true),
  };
}

function mapPortalStageKeyToStageId(stageKey: string): StageId {
  switch (stageKey) {
    case "DOCUMENT_COLLECTION":
      return "document";
    case "ADDITIONAL_DATA":
      return "additional-data";
    case "CHECKLIST":
    case "CHECKLIST_PREPARATION":
    case "CHECKLIST_APPROVAL":
      return "checklist";
    case "FILING":
    case "FILED":
      return "filing";
    default:
      return "document";
  }
}

function StatusPill({ state }: { state: StageState }) {
  if (state === "completed") {
    return <Badge variant="success">Completed</Badge>;
  }

  if (state === "active") {
    return <Badge variant="default">In Progress</Badge>;
  }

  return <Badge variant="secondary">Locked</Badge>;
}

function StageIcon({ stageId, size = 18 }: { stageId: StageId; size?: number }) {
  switch (stageId) {
    case "document":
      return <FileText size={size} />;
    case "additional-data":
      return <PackageCheck size={size} />;
    case "checklist":
      return <ShieldCheck size={size} />;
    case "filing":
      return <FileCheck2 size={size} />;
    default:
      return null;
  }
}

function SidebarStageItem({
  stage,
  index,
  state,
  href,
  selected,
}: {
  stage: PortalStageView;
  index: number;
  state: StageState;
  href: string;
  selected: boolean;
}) {
  const isHighlighted = selected || state === "active";
  const stateLabel = state === "completed" ? "Completed" : state === "active" ? "In progress" : "Locked";

  return (
    <Link
      href={href}
      aria-current={selected ? "page" : undefined}
      className={`group flex w-full items-center gap-3 rounded-[20px] border px-3.5 py-3.5 transition-all duration-200 ${
        isHighlighted
          ? "border-[#00cec4]/30 bg-[#00cec4]/8 shadow-[0_10px_30px_rgba(0,206,196,0.08)]"
          : "border-transparent bg-transparent hover:border-outline-variant/60 hover:bg-surface"
      }`}
    >
      <span
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition ${
          isHighlighted || state === "completed"
            ? "bg-[#00cec4] text-white shadow-[0_8px_20px_rgba(0,206,196,0.2)]"
            : "bg-surface text-on-surface-variant ring-1 ring-inset ring-outline-variant/60"
        }`}
      >
        {state === "locked" ? <LockKeyhole size={16} /> : <StageIcon stageId={stage.id} size={18} />}
      </span>

      <span className="min-w-0 flex-1 text-left">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold text-on-surface">
            {index + 1}. {stage.label}
          </span>
          {state === "completed" ? (
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#00cec4]/12 text-[#00cec4]">
              <Check size={12} strokeWidth={3} />
            </span>
          ) : null}
        </span>
        <span
          className={`mt-1.5 block text-[11px] font-medium ${
            isHighlighted || state === "completed" ? "text-[#00aFA7]" : "text-on-surface-variant"
          }`}
        >
          {stateLabel}
        </span>
      </span>

      <ChevronRight
        size={16}
        className={`shrink-0 transition-transform group-hover:translate-x-0.5 ${
          isHighlighted ? "text-[#00cec4]" : "text-on-surface-variant"
        }`}
      />
    </Link>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-2">
      <p className="ds-label">{label}</p>
      <div className="flex min-h-12 items-center rounded-xl border border-outline-variant/60 bg-surface px-4 text-sm font-medium text-on-surface shadow-sm">
        {value}
      </div>
    </div>
  );
}

function DocumentStagePanel({
  detail,
}: {
  detail: PortalShipmentDetailView;
}) {
  const documents = detail.job.documentRequirements
    .filter((requirement) =>
      Boolean(requirement.isMandatory) ||
      requirement.versions.length > 0 ||
      requirement.customerSubmissions.length > 0 ||
      Boolean(requirement.exception?.reason),
    )
    .map((requirement) => {
      const submission = requirement.customerSubmissions[0];
      const internalVersions = requirement.versions.map((version) => {
        const typeMeta = getDocumentTypeMeta(version.fileName, version.mimeType);
        return {
          id: version.id,
          name: version.fileName,
          url: `/api/customer-portal/cha-document-versions/${version.id}`,
          downloadUrl: `/api/customer-portal/cha-document-versions/${version.id}?download=true`,
          mimeType: version.mimeType,
          sizeBytes: version.sizeBytes,
          uploadedAt: toIsoValue(version.uploadedAt),
          uploadedAtValue: toIsoValue(version.uploadedAt),
          uploadedAtLabel: formatDate(version.uploadedAt, true),
          uploadedByLabel: version.uploadedBy?.name ?? version.uploadedBy?.email ?? "Operations team",
          statusLabel: "Shared file",
          kindLabel: typeMeta.label,
          description: "Shared by the operations team for this shipment.",
        };
      });
      const customerVersions = (submission?.versions ?? []).map((version) => {
        const fileName = version.fileName ?? requirement.name;
        const typeMeta = getDocumentTypeMeta(fileName, version.mimeType);
        return {
          id: version.id,
          name: fileName,
          url: `/api/customer-portal/document-versions/${version.id}`,
          downloadUrl: `/api/customer-portal/document-versions/${version.id}?download=true`,
          mimeType: version.mimeType,
          sizeBytes: version.sizeBytes,
          uploadedAt: toIsoValue(version.uploadedAt),
          uploadedAtValue: toIsoValue(version.uploadedAt),
          uploadedAtLabel: formatDate(version.uploadedAt, true),
          uploadedByLabel: submission?.portalUser?.name ?? submission?.portalUser?.email ?? "Customer",
          statusLabel: normalizeLabel(submission?.status ?? "UPLOADED"),
          kindLabel: typeMeta.label,
          description: submission?.customerComment ?? "Shared by the customer for review.",
        };
      });
      const combinedVersions = [...customerVersions, ...internalVersions].sort((left, right) =>
        (right.uploadedAtValue ?? "").localeCompare(left.uploadedAtValue ?? ""),
      );
      const primaryVersion = combinedVersions[0];
      const status = mapPortalDocumentStatus(requirement, detail.job.updatedAt);
      const categoryName =
        requirement.requirementItem?.category?.name ??
        (requirement.category === "CUSTOMER_UPLOAD" ? "Other Documents" : requirement.category) ??
        "Other Documents";

      return {
        id: requirement.id,
        jobId: detail.job.id,
        name: requirement.name,
        category: categoryName,
        categoryOrder: requirement.requirementItem?.category?.sortOrder ?? 999,
        statusKey: status.statusKey,
        statusLabel: status.statusLabel,
        statusVariant: status.statusVariant,
        customerActionRequired: status.customerActionRequired,
        isRequired: Boolean(requirement.isMandatory),
        canUpload: status.canUpload,
        canReplace: status.canReplace,
        currentFileName: primaryVersion?.name ?? null,
        uploadedAtLabel: primaryVersion?.uploadedAtLabel ?? "Awaiting upload",
        uploadedAtValue: primaryVersion?.uploadedAtValue ?? null,
        updatedAtLabel: status.updatedAtLabel,
        updatedAtValue: status.updatedAtValue,
        sizeLabel: primaryVersion ? formatFileSize(primaryVersion.sizeBytes) : "Pending",
        uploadedByLabel: primaryVersion?.uploadedByLabel ?? "Customer",
        reviewRemark: submission?.reviewerComment ?? null,
        customerRemark: submission?.customerComment ?? null,
        unavailableReason: requirement.exception?.reason ?? null,
        acceptedFileTypes: requirement.requirementItem?.acceptedFileTypes ?? [],
        versionCount: combinedVersions.length,
        currentVersionId: primaryVersion?.id ?? null,
        versions: combinedVersions,
      };
    });

  return (
    <PortalShipmentDocumentManager
      documents={documents}
      shipmentContext={{
        jobNumber: detail.job.jobNumber,
        shipmentReference: detail.job.title,
        customerName: detail.job.customer?.name ?? "Customer",
        shipmentType: detail.job.shipmentType?.name ?? "Shipment",
        clearanceType: detail.job.jobType?.name ?? "CHA",
        stageLabel: normalizeLabel(detail.job.stage),
        lastUpdatedLabel: formatDate(detail.job.updatedAt, true),
      }}
    />
  );
}

function AdditionalDataStagePanel({
  detail,
}: {
  detail: PortalShipmentDetailView;
}) {
  const additionalData = detail.job.additionalData;

  return (
    <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="rounded-[22px] border border-outline-variant/60 bg-surface p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-2">
          <PackageCheck size={19} className="text-[#00cec4]" />
          <h3 className="ds-h3 text-on-surface">Additional Data</h3>
        </div>
        <p className="mt-1 text-sm text-on-surface-variant">
          These are the operational values shared from the CHA additional-data stage.
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <ReadOnlyField label="Vessel Inward Date" value={formatDate(additionalData?.vesselInwardDate)} />
          <ReadOnlyField label="Delivery Order Validity" value={formatDate(additionalData?.deliveryOrderValidity)} />
          <ReadOnlyField label="Import General Manifest" value={additionalData?.importGeneralManifest || "Not shared yet"} />
          <ReadOnlyField label="Export General Manifest" value={additionalData?.exportGeneralManifest || "Not shared yet"} />
          <ReadOnlyField label="Custom Manifest Value" value={additionalData?.customManifestValue || "Not shared yet"} />
          <ReadOnlyField label="Extension Date" value={formatDate(additionalData?.deliveryOrderExtensionDate)} />
        </div>
      </div>

      <div className="space-y-5">
        <div className="rounded-[22px] border border-outline-variant/60 bg-surface p-5 shadow-sm">
          <h3 className="ds-h3 text-on-surface">Stage Summary</h3>
          <div className="mt-4 space-y-4">
            <ReadOnlyField label="Status" value={normalizeLabel(additionalData?.status ?? "PENDING")} />
            <ReadOnlyField label="Last Updated" value={formatDate(additionalData?.updatedAt ?? detail.job.updatedAt, true)} />
          </div>
        </div>

        <div className="rounded-[22px] border border-outline-variant/60 bg-surface p-5 shadow-sm">
          <h3 className="ds-h3 text-on-surface">Delivery Order File</h3>
          {additionalData?.doDocumentFileName ? (
            <div className="mt-4 rounded-2xl border border-outline-variant/60 bg-surface-container-low/30 p-4">
              <p className="text-sm font-semibold text-on-surface">{additionalData.doDocumentFileName}</p>
              <p className="mt-2 text-xs text-on-surface-variant">
                Uploaded {formatDate(additionalData.doDocumentUploadedAt, true)}
              </p>
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-outline-variant/60 bg-surface-container-low/30 p-5 text-center text-sm text-on-surface-variant">
              No delivery-order file has been shared yet.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function ChecklistStagePanel({
  detail,
}: {
  detail: PortalShipmentDetailView;
}) {
  const openQueryCount = detail.job.customerQueryThreads.filter((thread) => thread.requiresCustomerAction).length;

  return (
    <section className="mt-5 grid gap-5 2xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
      <div className="space-y-5">
        {detail.job.checklistWorkflow ? (
          <div className="rounded-[22px] border border-outline-variant/60 bg-surface p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ShieldCheck size={19} className="text-[#00cec4]" />
                <h3 className="ds-h3 text-on-surface">Checklist Approval</h3>
              </div>
              <span className="rounded-full bg-surface-container-low px-2.5 py-1 text-[11px] font-semibold text-on-surface-variant">
                {normalizeLabel(detail.job.checklistWorkflow.status)}
              </span>
            </div>
            <p className="mt-2 text-sm text-on-surface-variant">
              Review the latest checklist when customer approval is requested.
            </p>

            {detail.job.checklistWorkflow.currentFileVersion ? (
              <div className="mt-4 rounded-2xl border border-outline-variant/60 bg-surface-container-low/30 p-4">
                <p className="text-sm font-semibold text-on-surface">
                  {detail.job.checklistWorkflow.currentFileVersion.originalFileName ?? "Current checklist file"}
                </p>
                <p className="mt-2 text-xs text-on-surface-variant">
                  Uploaded {formatDate(detail.job.checklistWorkflow.currentFileVersion.uploadedAt, true)}
                </p>
                {detail.job.checklistWorkflow.currentFileVersion.remarks ? (
                  <p className="mt-2 text-xs leading-5 text-on-surface-variant">
                    {detail.job.checklistWorkflow.currentFileVersion.remarks}
                  </p>
                ) : null}
                <div className="mt-4">
                  <Link
                    href={`/api/customer-portal/checklist-files/${detail.job.checklistWorkflow.currentFileVersion.id}`}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-[#00cec4] hover:underline"
                  >
                    <FileCheck2 size={16} />
                    Preview current checklist
                  </Link>
                </div>
              </div>
            ) : null}

            {detail.actions.checklistPending ? (
              <div className="mt-4 border-t border-outline-variant/60 pt-4">
                <PortalChecklistActionForm jobId={detail.job.id} checklistId={detail.job.checklistWorkflow.id} />
              </div>
            ) : null}
          </div>
        ) : (
          <div className="rounded-[22px] border border-outline-variant/60 bg-surface p-5 text-sm text-on-surface-variant shadow-sm">
            No checklist workflow is available for this shipment yet.
          </div>
        )}
      </div>

      <details
        className="group rounded-[22px] border border-outline-variant/60 bg-surface p-5 shadow-sm"
        open={openQueryCount > 0}
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <MessageSquareText size={19} className="text-[#00cec4]" />
            <div>
              <h3 className="ds-h3 text-on-surface">Queries & Updates</h3>
              <p className="mt-1 text-xs text-on-surface-variant">Open to review shipment conversations tied to this stage.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {openQueryCount > 0 ? (
              <span className="rounded-full bg-[#fb923c]/12 px-2.5 py-1 text-[11px] font-semibold text-[#fb923c]">
                {openQueryCount} open
              </span>
            ) : null}
            <ChevronDown size={18} className="text-on-surface-variant transition-transform group-open:rotate-180" />
          </div>
        </summary>

        <div className="mt-5 space-y-4 border-t border-outline-variant/60 pt-4">
          {detail.job.customerQueryThreads.length === 0 ? (
            <div className="rounded-2xl bg-surface-container-low/40 p-5 text-center">
              <MessageSquareText className="mx-auto text-on-surface-variant" size={25} />
              <p className="mt-2 text-sm text-on-surface-variant">No queries have been raised for this shipment.</p>
            </div>
          ) : (
            detail.job.customerQueryThreads.map((thread) => (
              <div key={thread.id} className="rounded-2xl border border-outline-variant/60 bg-surface-container-low/30 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-on-surface">{thread.title}</p>
                    <p className="mt-1 text-xs leading-5 text-on-surface-variant">{thread.description}</p>
                  </div>
                  {thread.requiresCustomerAction ? (
                    <span className="shrink-0 rounded-full bg-[#fb923c]/12 px-2 py-1 text-[10px] font-semibold text-[#fb923c]">
                      Reply needed
                    </span>
                  ) : null}
                </div>

                <div className="mt-3 space-y-2">
                  {thread.messages.map((message) => (
                    <div key={message.id} className="rounded-xl border border-outline-variant/60 bg-surface p-3">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-on-surface-variant">
                        <span>{message.authorPortalUser?.name ?? message.authorUser?.name ?? "Portal update"}</span>
                        <span>{formatDate(message.createdAt, true)}</span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-on-surface">{message.body}</p>
                    </div>
                  ))}
                </div>

                {thread.requiresCustomerAction ? (
                  <div className="mt-3">
                    <PortalQueryReplyForm threadId={thread.id} />
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
      </details>
    </section>
  );
}

function FilingStagePanel({
  detail,
}: {
  detail: PortalShipmentDetailView;
}) {
  const filingRecord = asRecord(detail.job.filingDetails) ?? {};

  return (
    <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="rounded-[22px] border border-outline-variant/60 bg-surface p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-2">
          <FileCheck2 size={19} className="text-[#00cec4]" />
          <h3 className="ds-h3 text-on-surface">Filing Details</h3>
        </div>
        <p className="mt-1 text-sm text-on-surface-variant">
          View the filing references currently shared from the CHA filing stage.
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <ReadOnlyField label="BOE Number" value={readText(filingRecord, ["boeNumber", "billOfEntryNumber"])} />
          <ReadOnlyField label="Shipping Bill Number" value={readText(filingRecord, ["shippingBillNumber"])} />
          <ReadOnlyField label="Filing Reference" value={readText(filingRecord, ["filingRef"])} />
          <ReadOnlyField label="Filing Date" value={formatDate(readFirstValue(filingRecord, ["filingDate", "boeDate"]))} />
          <ReadOnlyField label="CHA Name" value={readText(filingRecord, ["chaName"])} />
          <ReadOnlyField label="Port Code" value={readText(filingRecord, ["portCode"])} />
        </div>
      </div>

      <div className="rounded-[22px] border border-outline-variant/60 bg-surface p-5 shadow-sm">
        <h3 className="ds-h3 text-on-surface">Remarks</h3>
        <div className="mt-4 min-h-32 rounded-2xl border border-outline-variant/60 bg-surface-container-low/30 px-4 py-3 text-sm leading-6 text-on-surface">
          {readText(
            filingRecord,
            ["filingRemarks", "delayReason", "exceptionReason", "remarks"],
            "Filing updates will appear here when shared by the CHA team.",
          )}
        </div>
        <div className="mt-4">
          <ReadOnlyField label="Last Updated" value={formatDate(readFirstValue(filingRecord, ["lastUpdatedAt"]), true)} />
        </div>
      </div>
    </section>
  );
}

export default async function CustomerPortalShipmentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ shipmentId: string }>;
  searchParams?: Promise<{ stage?: string }>;
}) {
  const session = await requirePortalSession();
  const { shipmentId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const detail = (await getPortalShipmentDetail(session.portalUserId, shipmentId)) as PortalShipmentDetailView;
  const ratingCategories = await listPortalRatingCategories(session.portalUserId);
  const ratingSubmitted = detail.job.shipmentRatings.some(
    (rating: { portalUserId: string }) => rating.portalUserId === session.portalUserId,
  );

  const stages = [...detail.stageMappings].sort((left, right) => left.sortOrder - right.sortOrder);
  const matchedStageIndex = stages.findIndex((stage) => stage.internalStageKey === detail.job.stage);
  const activeStageIndex = matchedStageIndex >= 0 ? matchedStageIndex : 0;
  const currentStage = stages[activeStageIndex] ?? detail.currentStage;
  const currentStageId = mapPortalStageKeyToStageId(currentStage?.internalStageKey ?? detail.job.stage);
  const requestedStageId = resolvedSearchParams?.stage;
  const selectedStage =
    stages.find((stage) => stage.id === requestedStageId) ??
    stages.find((stage) => stage.id === currentStageId) ??
    stages[0] ??
    null;
  const selectedStageIndex = selectedStage ? stages.findIndex((stage) => stage.id === selectedStage.id) : 0;
  const isShipmentCompleted = detail.job.status === "COMPLETED" || detail.job.stage === "FILED";
  const selectedStageState: StageState = isShipmentCompleted
    ? "completed"
    : selectedStageIndex < activeStageIndex
      ? "completed"
      : selectedStageIndex === activeStageIndex
        ? "active"
        : "locked";
  const completedStageCount = isShipmentCompleted ? stages.length : Math.max(activeStageIndex, 0);
  const progressPercent = stages.length > 0 ? Math.round((completedStageCount / stages.length) * 100) : 0;

  const shipmentLabel = detail.job.shipmentType?.name ?? "Shipment";
  const clearanceLabel = detail.job.jobType?.name ?? "CHA";
  const statusLabel = normalizeLabel(String(detail.job.status ?? "IN_PROGRESS"));
  const updatedAt = formatDate(detail.job.updatedAt, true);
  const openQueryCount = detail.job.customerQueryThreads.filter(
    (thread: PortalThreadView) => thread.requiresCustomerAction,
  ).length;
  const portalUserRecord = asRecord(session.portalUser) ?? {};
  const portalUserLabel = readText(portalUserRecord, ["name", "email"], session.portalUser.customer.name);

  return (
    <div className="w-full">
      <section className="overflow-hidden rounded-[28px] border border-outline-variant/60 bg-surface shadow-sm">
        <header className="flex min-h-24 flex-col gap-4 border-b border-outline-variant/60 px-5 py-5 sm:flex-row sm:items-center sm:justify-between lg:px-7">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/customer-portal/shipments"
              aria-label="Back to shipments"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-outline-variant/60 bg-surface text-on-surface-variant transition hover:border-[#00cec4]/45 hover:text-[#00cec4]"
            >
              <ArrowLeft size={18} />
            </Link>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="ds-h2 truncate text-on-surface">{detail.job.title}</h1>
                <span className="ds-numeric text-sm text-on-surface-variant">#{detail.job.jobNumber}</span>
                <Badge variant="success">{statusLabel}</Badge>
              </div>
              <p className="mt-1 text-sm text-on-surface-variant">
                {shipmentLabel} • {clearanceLabel} • Last updated {updatedAt}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Link
              href="/customer-portal/notifications"
              className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-outline-variant/60 bg-surface text-on-surface-variant transition hover:border-[#00cec4]/45 hover:text-[#00cec4]"
              aria-label="Open notifications"
            >
              <Bell size={18} />
              {openQueryCount > 0 ? (
                <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[#fb923c] px-1 text-[10px] font-bold text-white">
                  {openQueryCount}
                </span>
              ) : null}
            </Link>
            <div className="hidden items-center gap-3 rounded-2xl border border-outline-variant/60 bg-surface-container-low/40 px-3 py-2.5 sm:flex">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#00cec4]/12 text-[#00cec4]">
                <UserRound size={16} />
              </div>
              <div className="max-w-44">
                <p className="truncate text-xs font-semibold text-on-surface">{portalUserLabel}</p>
                <p className="truncate text-[11px] text-on-surface-variant">{session.portalUser.customer.name}</p>
              </div>
            </div>
          </div>
        </header>

        <div className="grid min-h-[calc(100vh-12rem)] xl:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="border-b border-outline-variant/60 bg-surface-container-low/30 xl:border-b-0 xl:border-r">
            <div className="p-4 sm:p-5 xl:sticky xl:top-24">
              <div className="rounded-[22px] border border-outline-variant/60 bg-surface p-5 shadow-sm">
                <p className="ds-label">Shipment</p>
                <p className="mt-2 truncate text-base font-semibold text-on-surface">{detail.job.jobNumber}</p>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-on-surface-variant">{detail.job.title}</p>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="ds-label">Overall Progress</p>
                    <p className="mt-1 text-2xl tracking-tight text-[#00cec4] ds-numeric">{progressPercent}%</p>
                  </div>
                  <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-[#00cec4]/10 text-[#00cec4]">
                    <PackageCheck size={21} />
                  </div>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-container">
                  <div
                    className="h-full rounded-full bg-[#00cec4] transition-[width] duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <p className="mt-2 text-[11px] text-on-surface-variant">
                  {completedStageCount} of {stages.length} stages completed
                </p>
              </div>

              <nav className="mt-5" aria-label="Shipment workflow stages">
                <div className="mb-2 px-2">
                  <p className="ds-label">Workflow stages</p>
                </div>
                <div className="space-y-2">
                  {stages.map((stage, index) => {
                    const state: StageState = isShipmentCompleted || index < activeStageIndex
                      ? "completed"
                      : index === activeStageIndex
                        ? "active"
                        : "locked";

                    return (
                      <SidebarStageItem
                        key={stage.id}
                        stage={stage}
                        index={index}
                        state={state}
                        href={`/customer-portal/shipments/${detail.job.id}?stage=${stage.id}`}
                        selected={selectedStage?.id === stage.id}
                      />
                    );
                  })}
                </div>
              </nav>

              <div className="mt-5 border-t border-outline-variant/60 pt-5">
                <Link
                  href="/customer-portal/notifications"
                  className="flex items-center gap-3 rounded-[22px] border border-outline-variant/60 bg-surface px-3.5 py-3.5 text-sm font-semibold text-on-surface transition hover:border-[#00cec4]/35 hover:shadow-[0_10px_30px_rgba(0,206,196,0.08)]"
                >
                  <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-surface text-on-surface-variant ring-1 ring-inset ring-outline-variant/60">
                    <MessageSquareText size={18} />
                    {openQueryCount > 0 ? (
                      <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[#fb923c] px-1 text-[10px] font-bold text-white">
                        {openQueryCount}
                      </span>
                    ) : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block ds-h3 text-on-surface">Queries & Updates</span>
                    <span className="mt-0.5 block text-[11px] font-normal text-on-surface-variant">
                      {openQueryCount > 0 ? `${openQueryCount} response${openQueryCount === 1 ? "" : "s"} required` : "No pending responses"}
                    </span>
                  </span>
                  <ChevronRight size={16} className="text-on-surface-variant" />
                </Link>
              </div>
            </div>
          </aside>

          <main className="min-w-0 bg-background/20 p-4 sm:p-6 lg:p-7">
            {selectedStage ? (
              <>
                <section className="rounded-[24px] border border-outline-variant/60 bg-surface p-5 shadow-sm sm:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 items-start gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] bg-[#00cec4] text-white shadow-[0_10px_25px_rgba(0,206,196,0.22)]">
                        <StageIcon stageId={selectedStage.id} size={22} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="ds-h2 text-on-surface">
                            {selectedStageIndex + 1}. {selectedStage.label}
                          </h2>
                          <StatusPill state={selectedStageState} />
                        </div>
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-on-surface-variant">
                          {selectedStage.description ?? "View the information and actions available for this shipment stage."}
                        </p>
                      </div>
                    </div>
                  </div>
                </section>

                {selectedStage.id === "document" ? <DocumentStagePanel detail={detail} /> : null}
                {selectedStage.id === "additional-data" ? <AdditionalDataStagePanel detail={detail} /> : null}
                {selectedStage.id === "checklist" ? <ChecklistStagePanel detail={detail} /> : null}
                {selectedStage.id === "filing" ? <FilingStagePanel detail={detail} /> : null}

                {selectedStage.id === "filing" && isShipmentCompleted && !ratingSubmitted ? (
                  <section className="mt-5 rounded-[22px] border border-[#fb923c]/30 bg-[#fb923c]/8 p-5 shadow-sm sm:p-6">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#fb923c]/12 text-[#fb923c]">
                        <Sparkles size={20} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="ds-h3 text-on-surface">Rate This Shipment Experience</h3>
                        <p className="mt-1 text-sm text-on-surface-variant">
                          Your feedback helps improve service quality and response times.
                        </p>
                        <div className="mt-4">
                          <PortalRatingForm
                            jobId={detail.job.id}
                            categories={ratingCategories.map((category) => ({
                              key: category.key,
                              label: category.label,
                            }))}
                          />
                        </div>
                      </div>
                    </div>
                  </section>
                ) : null}
              </>
            ) : (
              <section className="rounded-[22px] border border-dashed border-outline-variant/60 bg-surface p-10 text-center shadow-sm">
                <PackageCheck className="mx-auto text-on-surface-variant" size={30} />
                <h2 className="ds-h3 mt-4 text-on-surface">No Workflow Stages Are Configured</h2>
                <p className="mt-2 text-sm text-on-surface-variant">
                  Add customer-portal stage mappings before opening this shipment page.
                </p>
              </section>
            )}
          </main>
        </div>
      </section>
    </div>
  );
}
