"use client";

import { useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronDown, ChevronRight, FolderKanban, Search, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import {
  RequirementDocumentCard,
  UploadedWorkflowDocumentCard,
  type WorkflowDocumentRequirement,
  type WorkflowDocumentVersion,
} from "@/app/(dashboard)/cha/jobs/[jobId]/workflow-documents-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileUploadField } from "@/components/ui/file-upload-field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import type { PortalDocumentRequirementSummary, PortalShipmentSummary } from "@/modules/customer-portal/types";

type PortalKycWorkspaceProps = {
  shipments: PortalShipmentSummary[];
  kycUploadsAllowed: boolean;
};

type ShipmentDocumentRequirement = PortalDocumentRequirementSummary & {
  jobId: string;
  jobNumber: string;
  shipmentTitle: string;
  currentStage: string;
  clearanceType: string;
  shipmentType: string;
};

type UploadTarget = {
  jobId: string;
  jobNumber: string;
  requirement: ShipmentDocumentRequirement;
};

type FilterMode = "all" | "pending" | "uploaded" | "exceptions";
type SubmissionActionState = {
  jobId: string;
  requirementId: string;
  action: "confirm";
} | null;

type ShipmentGroup = {
  shipment: PortalShipmentSummary;
  requirements: ShipmentDocumentRequirement[];
  pendingCount: number;
  uploadedCount: number;
  exceptionCount: number;
  totalCount: number;
  completedCount: number;
  uploadLocked: boolean;
};

type ShipmentRequirementCategoryGroup = {
  categoryName: string;
  requirements: ShipmentDocumentRequirement[];
};

function getRequirementStatus(requirement: PortalDocumentRequirementSummary) {
  const submissionStatus = requirement.customerSubmissions[0]?.status;
  if (requirement.status === "NOT_AVAILABLE" || requirement.exception) {
    return "NOT_AVAILABLE";
  }
  return submissionStatus ?? "PENDING";
}

function mapToWorkflowRequirement(requirement: ShipmentDocumentRequirement): WorkflowDocumentRequirement {
  const status = getRequirementStatus(requirement);

  return {
    id: requirement.id,
    name: requirement.name,
    status,
    isMandatory: requirement.isMandatory,
    category: requirement.category ?? requirement.requirementItem?.category?.name ?? null,
    requirementItem: requirement.requirementItem
      ? {
          description: requirement.requirementItem.description ?? null,
          requiresValidityDate: requirement.requirementItem.requiresValidityDate ?? false,
          category: requirement.requirementItem.category ?? null,
        }
      : null,
    exception: requirement.exception
      ? {
          reason: requirement.exception.reason ?? null,
          createdAt: requirement.exception.createdAt ?? null,
          user: requirement.exception.user ?? null,
        }
      : null,
    versions: [],
  };
}

function mapToWorkflowVersion(requirement: ShipmentDocumentRequirement): WorkflowDocumentVersion | null {
  const version = requirement.customerSubmissions[0]?.versions[0];
  if (!version) return null;

  return {
    id: version.id,
    fileName: version.fileName || requirement.name,
    mimeType: version.mimeType ?? "application/octet-stream",
    sizeBytes: version.sizeBytes ?? null,
    uploadedAt: version.uploadedAt ?? null,
    source: version.source ?? "DOCUMENTS_PAGE",
    validityDate: version.validityDate ? String(version.validityDate) : null,
  };
}

function getRequirementCategoryName(requirement: ShipmentDocumentRequirement) {
  return requirement.requirementItem?.category?.name || requirement.category || "General Documents";
}

function groupRequirementsByCategory(requirements: ShipmentDocumentRequirement[]): ShipmentRequirementCategoryGroup[] {
  const grouped = new Map<string, ShipmentDocumentRequirement[]>();

  for (const requirement of requirements) {
    const categoryName = getRequirementCategoryName(requirement);
    if (!grouped.has(categoryName)) {
      grouped.set(categoryName, []);
    }
    grouped.get(categoryName)?.push(requirement);
  }

  return Array.from(grouped.entries())
    .map(([categoryName, items]) => ({
      categoryName,
      requirements: [...items].sort((left, right) => left.name.localeCompare(right.name)),
    }))
    .sort((left, right) => left.categoryName.localeCompare(right.categoryName));
}

function buildShipmentRequirements(shipments: PortalShipmentSummary[]): ShipmentGroup[] {
  return shipments
    .filter((shipment) => shipment.scope !== "completed")
    .map((shipment) => {
      const requirements = shipment.documentRequirements.map((requirement) => ({
        ...requirement,
        jobId: shipment.id,
        jobNumber: shipment.jobNumber,
        shipmentTitle: shipment.customerRef || shipment.title || shipment.jobNumber,
        currentStage: shipment.currentStage,
        clearanceType: shipment.clearanceType,
        shipmentType: shipment.shipmentType,
      }));

      const pendingCount = requirements.filter((requirement) => {
        const status = getRequirementStatus(requirement);
        return status === "PENDING" || status === "REUPLOAD_REQUIRED" || status === "CLARIFICATION_REQUIRED" || status === "REJECTED";
      }).length;
      const uploadedCount = requirements.filter((requirement) => {
        const status = getRequirementStatus(requirement);
        return status === "UPLOADED" || status === "UNDER_REVIEW" || status === "ACCEPTED";
      }).length;
      const exceptionCount = requirements.filter((requirement) => getRequirementStatus(requirement) === "NOT_AVAILABLE").length;
      const totalCount = requirements.length;
      const completedCount = uploadedCount + exceptionCount;

      return {
        shipment,
        requirements,
        pendingCount,
        uploadedCount,
        exceptionCount,
        totalCount,
        completedCount,
        uploadLocked: pendingCount === 0,
      };
    })
    .filter((group) => group.requirements.length > 0);
}

export function PortalKycWorkspace({ shipments, kycUploadsAllowed }: PortalKycWorkspaceProps) {
  const [shipmentSubmissionOverrides, setShipmentSubmissionOverrides] = useState<Record<string, PortalDocumentRequirementSummary["customerSubmissions"][number]>>({});
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [uploadTarget, setUploadTarget] = useState<UploadTarget | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [comment, setComment] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submissionActionState, setSubmissionActionState] = useState<SubmissionActionState>(null);
  const [expandedShipmentId, setExpandedShipmentId] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());

  const liveShipments = useMemo(
    () =>
      shipments.map((shipment) => ({
        ...shipment,
        documentRequirements: shipment.documentRequirements.map((requirement) => {
          const overrideKey = `${shipment.id}:${requirement.id}`;
          const override = shipmentSubmissionOverrides[overrideKey];
          if (!override) {
            return requirement;
          }
          return {
            ...requirement,
            customerSubmissions: [override],
          };
        }),
      })),
    [shipmentSubmissionOverrides, shipments],
  );

  const groupedShipments = useMemo(() => buildShipmentRequirements(liveShipments), [liveShipments]);

  const updateShipmentRequirementSubmission = (params: {
    jobId: string;
    requirementId: string;
    submission: PortalDocumentRequirementSummary["customerSubmissions"][number];
  }) => {
    setShipmentSubmissionOverrides((current) => ({
      ...current,
      [`${params.jobId}:${params.requirementId}`]: params.submission,
    }));
  };

  const filteredShipments = useMemo(() => {
    return groupedShipments
      .map((group) => {
        const requirements = group.requirements.filter((requirement) => {
          const status = getRequirementStatus(requirement);
          const matchesSearch =
            deferredSearch.length === 0 ||
            requirement.name.toLowerCase().includes(deferredSearch) ||
            requirement.jobNumber.toLowerCase().includes(deferredSearch) ||
            requirement.shipmentTitle.toLowerCase().includes(deferredSearch);

          const matchesFilter =
            filterMode === "all" ||
            (filterMode === "pending" &&
              (status === "PENDING" || status === "REUPLOAD_REQUIRED" || status === "CLARIFICATION_REQUIRED" || status === "REJECTED")) ||
            (filterMode === "uploaded" && (status === "UPLOADED" || status === "UNDER_REVIEW" || status === "ACCEPTED")) ||
            (filterMode === "exceptions" && status === "NOT_AVAILABLE");

          return matchesSearch && matchesFilter;
        });

        return {
          ...group,
          requirements,
        };
      })
      .filter((group) => group.requirements.length > 0);
  }, [deferredSearch, filterMode, groupedShipments]);

  const totalPending = groupedShipments.reduce((sum, group) => sum + group.pendingCount, 0);
  const totalUploaded = groupedShipments.reduce((sum, group) => sum + group.uploadedCount, 0);
  const totalExceptions = groupedShipments.reduce((sum, group) => sum + group.exceptionCount, 0);

  const handleUploadSubmit = async () => {
    if (!uploadTarget || !selectedFile) {
      toast.error("Choose a file before uploading.");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.set("jobId", uploadTarget.jobId);
    formData.set("requirementId", uploadTarget.requirement.id);
    formData.set("comment", comment);
    formData.set("file", selectedFile);

    try {
      const response = await fetch("/api/customer-portal/documents/upload", {
        method: "POST",
        body: formData,
      });
      const json = await response.json();
      if (!json.ok) {
        throw new Error(json.error || "Upload failed");
      }
      updateShipmentRequirementSubmission({
        jobId: uploadTarget.jobId,
        requirementId: uploadTarget.requirement.id,
        submission: json.data,
      });
      toast.success(`${uploadTarget.requirement.name} uploaded successfully.`);
      setUploadTarget(null);
      setSelectedFile(null);
      setComment("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmUpload = async (requirement: ShipmentDocumentRequirement) => {
    setSubmissionActionState({
      jobId: requirement.jobId,
      requirementId: requirement.id,
      action: "confirm",
    });

    try {
      const response = await fetch("/api/customer-portal/documents/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: requirement.jobId,
          requirementId: requirement.id,
        }),
      });
      const json = await response.json();
      if (!json.ok) {
        throw new Error(json.error || "Unable to send document for verification.");
      }
      updateShipmentRequirementSubmission({
        jobId: requirement.jobId,
        requirementId: requirement.id,
        submission: json.data,
      });
      toast.success(`${requirement.name} sent to the CHA team for verification.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to confirm upload.");
    } finally {
      setSubmissionActionState(null);
    }
  };

  const toggleShipment = (shipmentId: string) => {
    setExpandedShipmentId((current) => (current === shipmentId ? null : shipmentId));
  };

  return (
    <div className="space-y-6 font-sans">
      <section className="card-top-accent rounded-xl border border-outline-variant/60 bg-surface p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="ds-icon-badge">
                <FolderKanban size={18} />
              </span>
              <p className="ds-label text-[#00cec4]">Shipment-wise document workspace</p>
            </div>
            <div>
              <h2 className="ds-h2">KYC & Compliance Vault</h2>
              <p className="mt-2 max-w-3xl text-sm text-on-surface-variant">
                Review shipments in a compact list, track document completion at a glance, and open only the file set you want to work on.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="card-top-accent rounded-xl border border-outline-variant/45 bg-surface-container-low p-4">
              <p className="ds-label">Pending</p>
              <p className="mt-2 ds-numeric text-2xl text-on-surface">{totalPending}</p>
              <p className="mt-1 text-xs text-on-surface-variant">Customer action required</p>
            </div>
            <div className="card-top-accent rounded-xl border border-outline-variant/45 bg-surface-container-low p-4">
              <p className="ds-label">Uploaded</p>
              <p className="mt-2 ds-numeric text-2xl text-on-surface">{totalUploaded}</p>
              <p className="mt-1 text-xs text-on-surface-variant">Files already on record</p>
            </div>
            <div className="card-top-accent-orange rounded-xl border border-outline-variant/45 bg-surface-container-low p-4">
              <p className="ds-label">N/A / Exempt</p>
              <p className="mt-2 ds-numeric text-2xl text-on-surface">{totalExceptions}</p>
              <p className="mt-1 text-xs text-on-surface-variant">Visible internal handling</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-outline-variant/55 bg-surface p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative min-w-0 flex-1 lg:max-w-md">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by shipment or document name"
              className="pl-10"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { key: "all", label: "All Documents" },
              { key: "pending", label: "Pending" },
              { key: "uploaded", label: "Uploaded" },
              { key: "exceptions", label: "N/A / Exempt" },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setFilterMode(item.key as FilterMode)}
                className={filterMode === item.key ? "ds-button" : "ds-button-outline"}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {!kycUploadsAllowed ? (
          <div className="mt-4 rounded-xl border border-[#fb923c]/30 bg-[#fb923c]/10 p-4 text-sm text-[#fb923c]">
            Uploads are currently disabled for this customer by the CHA operations team.
          </div>
        ) : null}
      </section>

      {filteredShipments.length === 0 ? (
        <section className="rounded-xl border border-outline-variant/55 bg-surface p-6 text-center shadow-sm">
          <UploadCloud className="mx-auto size-10 text-[#00cec4] opacity-60" />
          <h3 className="ds-h3 mt-4 text-on-surface">No matching shipments</h3>
          <p className="mt-2 text-sm text-on-surface-variant">
            Try another search term or switch filters to view shipment requirements.
          </p>
        </section>
      ) : (
        <section className="rounded-xl border border-outline-variant/55 bg-surface shadow-sm">
          <div className="space-y-0">
            {filteredShipments.map((group) => {
              const isExpanded = expandedShipmentId === group.shipment.id;
              const uploadsDisabled = !kycUploadsAllowed || group.uploadLocked;
              const categoryGroups = groupRequirementsByCategory(group.requirements);

              return (
                <div key={group.shipment.id} className="border-b border-outline-variant/20 p-4 last:border-b-0 sm:p-5">
                  <button
                    type="button"
                    onClick={() => toggleShipment(group.shipment.id)}
                    className="w-full rounded-xl border border-outline-variant/35 bg-surface-container-low/35 p-4 text-left transition hover:border-[#00cec4]/45 hover:bg-surface"
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                      <div className="flex items-start gap-3">
                        <span className="mt-1 flex h-9 w-9 items-center justify-center rounded-xl border border-outline-variant/35 bg-surface text-[#00cec4]">
                          {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        </span>
                        <div className="min-w-0 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="ds-label text-[#00cec4]">{group.shipment.jobNumber}</p>
                            <Badge variant="secondary">{group.shipment.currentStage.toUpperCase()}</Badge>
                            <Badge variant="secondary">{group.shipment.clearanceType.toUpperCase()}</Badge>
                            {group.uploadLocked ? <Badge variant="success">PREVIEW ONLY</Badge> : null}
                          </div>
                          <div className="min-w-0">
                            <h3 className="ds-h3 truncate text-on-surface">
                              {group.shipment.customerRef || group.shipment.title || group.shipment.jobNumber}
                            </h3>
                            <p className="mt-1 text-sm text-on-surface-variant">
                              {group.shipment.shipmentType} • {group.shipment.contactName || "Assigned coordinator visible in shipment view"}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-sm">
                            <span className="rounded-full bg-[#00cec4]/10 px-3 py-1 font-semibold text-[#008f89]">
                              <span className="ds-numeric">{group.uploadedCount}</span> / <span className="ds-numeric">{group.totalCount}</span> documents uploaded
                            </span>
                            <span className="text-on-surface-variant">
                              Pending <span className="ds-numeric text-on-surface">{group.pendingCount}</span>
                            </span>
                            <span className="text-on-surface-variant">
                              N/A / Exempt <span className="ds-numeric text-on-surface">{group.exceptionCount}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 xl:justify-end">
                        <div className="rounded-xl border border-outline-variant/35 bg-surface px-4 py-3">
                          <p className="ds-label">Completion</p>
                          <p className="mt-1 ds-numeric text-lg text-on-surface">
                            {group.completedCount}/{group.totalCount}
                          </p>
                        </div>
                        <div className="rounded-xl border border-outline-variant/35 bg-surface px-4 py-3">
                          <p className="ds-label">Shipment File</p>
                          <Link href={`/customer-portal/shipments/${group.shipment.id}?tab=documents`} className="ds-button-outline mt-2">
                            Open shipment file
                          </Link>
                        </div>
                      </div>
                    </div>
                  </button>

                  {isExpanded ? (
                    <div className="mt-4 space-y-4">
                      {group.uploadLocked ? (
                        <div className="rounded-xl border border-green-500/25 bg-green-500/10 p-4 text-sm text-on-surface">
                          All required documentation for this shipment is already completed. You can preview files here, and upload actions are locked.
                        </div>
                      ) : null}

                      <div className="space-y-5">
                        {categoryGroups.map((categoryGroup) => (
                          <section
                            key={`${group.shipment.id}-${categoryGroup.categoryName}`}
                            className="space-y-4 rounded-xl border border-outline-variant/45 bg-surface p-5 shadow-sm"
                          >
                            <div className="space-y-1 border-b border-outline-variant/20 pb-4">
                              <p className="text-lg font-semibold text-on-surface">{categoryGroup.categoryName}</p>
                              <p className="text-sm text-on-surface-variant">
                                {categoryGroup.requirements.length} requirement{categoryGroup.requirements.length === 1 ? "" : "s"} in this category.
                              </p>
                            </div>

                            <div className="grid gap-4 xl:grid-cols-2">
                              {categoryGroup.requirements.map((requirement) => {
                                const workflowRequirement = mapToWorkflowRequirement(requirement);
                                const workflowVersion = mapToWorkflowVersion(requirement);
                                const status = getRequirementStatus(requirement);
                                const submission = requirement.customerSubmissions[0];
                                const isConfirming =
                                  submissionActionState?.jobId === requirement.jobId &&
                                  submissionActionState?.requirementId === requirement.id &&
                                  submissionActionState.action === "confirm";

                                if (workflowVersion) {
                                  return (
                                    <UploadedWorkflowDocumentCard
                                      key={requirement.id}
                                      requirement={workflowRequirement}
                                      version={workflowVersion}
                                      loadingKey={uploading && uploadTarget?.requirement.id === requirement.id ? `doc-${requirement.id}` : null}
                                      currentUserId=""
                                      canDelete={false}
                                      showDeleteAction={false}
                                      showActionMenu={false}
                                      showExceptionActions={false}
                                      uploadDisabled={uploadsDisabled}
                                      statusOverride={status}
                                      uploadButtonLabel={
                                        group.uploadLocked
                                          ? "Upload Complete"
                                          : status === "REJECTED" || status === "REUPLOAD_REQUIRED"
                                            ? "Upload Corrected File"
                                            : "Upload Revision"
                                      }
                                      helperContent={
                                        status === "UPLOADED" ? (
                                          <div className="space-y-1.5">
                                            <p className="text-sm font-semibold text-on-surface">Verify this upload before CHA review</p>
                                            <p className="text-xs text-on-surface-variant">
                                              Confirm it if everything looks correct, or upload a corrected file from the same card.
                                            </p>
                                          </div>
                                        ) : status === "UNDER_REVIEW" ? (
                                          <div className="space-y-1.5">
                                            <p className="text-sm font-semibold text-on-surface">Submitted for verification</p>
                                            <p className="text-xs text-on-surface-variant">
                                              The CHA team is reviewing this file now. You can still preview it from this card.
                                            </p>
                                          </div>
                                        ) : submission?.reviewerComment ? (
                                          <div className="space-y-1.5">
                                            <p className="text-sm font-semibold text-on-surface">Review feedback</p>
                                            <p className="text-xs text-on-surface-variant">{submission.reviewerComment}</p>
                                          </div>
                                        ) : submission?.customerComment ? (
                                          <div className="space-y-1.5">
                                            <p className="text-sm font-semibold text-on-surface">Your upload note</p>
                                            <p className="text-xs text-on-surface-variant">{submission.customerComment}</p>
                                          </div>
                                        ) : null
                                      }
                                      footerActions={
                                        status === "UPLOADED" && !uploadsDisabled ? (
                                          <Button
                                            type="button"
                                            size="sm"
                                            className="gap-2"
                                            disabled={uploading || isConfirming}
                                            onClick={() => void handleConfirmUpload(requirement)}
                                          >
                                            <CheckCircle2 size={14} />
                                            {isConfirming ? "Sending..." : "Confirm & Send"}
                                          </Button>
                                        ) : null
                                      }
                                      onPreview={() => window.open(`/api/customer-portal/document-versions/${workflowVersion.id}`, "_blank", "noopener,noreferrer")}
                                      onDelete={() => undefined}
                                      onDeclareExemption={() => undefined}
                                      onMarkNa={() => undefined}
                                      onUpload={() =>
                                        !kycUploadsAllowed
                                          ? toast.error("Uploads are disabled for this customer.")
                                          : group.uploadLocked
                                            ? toast.error("All documentation for this shipment is already completed.")
                                            : setUploadTarget({
                                                jobId: requirement.jobId,
                                                jobNumber: requirement.jobNumber,
                                                requirement,
                                              })
                                      }
                                    />
                                  );
                                }

                                return (
                                  <RequirementDocumentCard
                                    key={requirement.id}
                                    requirement={workflowRequirement}
                                    loadingKey={uploading && uploadTarget?.requirement.id === requirement.id ? `doc-${requirement.id}` : null}
                                    showActionMenu={false}
                                    showExceptionActions={false}
                                    hideUploadWhenExempted={true}
                                    uploadDisabled={uploadsDisabled}
                                    uploadButtonLabel={group.uploadLocked ? "Upload Complete" : "Upload File"}
                                    onUndo={() => undefined}
                                    onDeclareExemption={() => undefined}
                                    onMarkNa={() => undefined}
                                    onUpload={() =>
                                      !kycUploadsAllowed
                                        ? toast.error("Uploads are disabled for this customer.")
                                        : group.uploadLocked
                                          ? toast.error("All documentation for this shipment is already completed.")
                                          : setUploadTarget({
                                              jobId: requirement.jobId,
                                              jobNumber: requirement.jobNumber,
                                              requirement,
                                            })
                                    }
                                  />
                                );
                              })}
                            </div>
                          </section>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      )}

      <Modal
        open={Boolean(uploadTarget)}
        onClose={() => {
          if (uploading) return;
          setUploadTarget(null);
          setSelectedFile(null);
          setComment("");
        }}
        title={uploadTarget ? `Upload ${uploadTarget.requirement.name}` : "Upload document"}
        description={
          uploadTarget
            ? `Shipment ${uploadTarget.jobNumber} • Use the same document workflow pattern as the CHA workspace.`
            : undefined
        }
        className="max-w-3xl"
      >
        {uploadTarget ? (
          <div className="space-y-5">
            <div className="rounded-xl border border-outline-variant/35 bg-surface-container-low/55 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="ds-label text-[#00cec4]">{uploadTarget.jobNumber}</span>
                <Badge variant="secondary">{uploadTarget.requirement.currentStage.toUpperCase()}</Badge>
              </div>
              <p className="mt-2 text-sm font-semibold text-on-surface">{uploadTarget.requirement.shipmentTitle}</p>
              <p className="mt-1 text-xs text-on-surface-variant">
                {uploadTarget.requirement.clearanceType} • {uploadTarget.requirement.shipmentType}
              </p>
            </div>

            <FileUploadField
              id={`portal-kyc-upload-${uploadTarget.requirement.id}`}
              label="Upload Document"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              helperText="PDF, JPG, PNG, and WebP are supported. Maximum upload size is 10 MB."
              triggerText={`Choose file for ${uploadTarget.requirement.name}`}
              uploading={uploading}
              uploadingLabel={`Uploading ${uploadTarget.requirement.name}...`}
              selectedFile={
                selectedFile
                  ? {
                      file: selectedFile,
                      name: selectedFile.name,
                      sizeBytes: selectedFile.size,
                      statusLabel: "Ready",
                    }
                  : null
              }
              onClear={() => setSelectedFile(null)}
              onInputChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
            />

            <div className="space-y-2">
              <label className="ds-label block">Upload Remark</label>
              <Input
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="Add an upload remark for the CHA team (optional)"
              />
            </div>

            <div className="flex flex-wrap justify-end gap-3 border-t border-outline-variant/20 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setUploadTarget(null);
                  setSelectedFile(null);
                  setComment("");
                }}
                disabled={uploading}
              >
                Cancel
              </Button>
              <Button type="button" onClick={handleUploadSubmit} disabled={uploading || !selectedFile}>
                {uploading ? "Uploading..." : "Upload Document"}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
