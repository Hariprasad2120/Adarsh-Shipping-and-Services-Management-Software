"use client";

import { DateInput } from "@/components/ui/date-input";
import { FileUploadField } from "@/components/ui/file-upload-field";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ExternalLink, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import * as actions from "@/modules/cha/actions";

type DoExtension = {
  id: string;
  previousValidity: string | null;
  extensionDate: string;
  fileKey: string | null;
  fileName: string | null;
  createdAt: string;
};

type DoValidityPanelProps = {
  jobId: string;
  canUpdateJob: boolean;
  additionalData: {
    deliveryOrderValidity: string | null;
    deliveryOrderExtensionDate: string | null;
    doDocumentFileKey: string | null;
    doDocumentFileName: string | null;
    doDocumentUploadedAt: string | null;
  };
  extensions: DoExtension[];
};

export function DoValidityPanel({ jobId, canUpdateJob, additionalData, extensions }: DoValidityPanelProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [extensionDate, setExtensionDate] = useState(additionalData.deliveryOrderExtensionDate?.slice(0, 10) ?? "");

  const originalValidity = additionalData.deliveryOrderValidity
    ? new Date(additionalData.deliveryOrderValidity)
    : null;
  const effectiveValidity = additionalData.deliveryOrderExtensionDate
    ? new Date(additionalData.deliveryOrderExtensionDate)
    : originalValidity;

  const handleUpload = async (file: File | null) => {
    if (!file) return;
    setBusy(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await actions.uploadDeliveryOrderDocumentAction(jobId, formData);
      if (!response.ok) {
        toast.error(response.error || "Failed to upload Delivery Order document.");
        return;
      }
      toast.success("Delivery Order document uploaded.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    setBusy(true);
    try {
      const response = await actions.deleteDeliveryOrderDocumentAction(jobId);
      if (!response.ok) {
        toast.error(response.error || "Failed to delete Delivery Order document.");
        return;
      }
      toast.success("Delivery Order document deleted.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const handleSaveExtensionDate = async () => {
    setBusy(true);
    try {
      const response = await actions.setDoExtensionDateAction(jobId, extensionDate || null);
      if (!response.ok) {
        toast.error(response.error || "Failed to update Delivery Order extension date.");
        return;
      }
      toast.success(extensionDate ? "Delivery Order extension date updated." : "Delivery Order extension date cleared.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ds-form-section space-y-4">
      <h3 className="ds-h3">Delivery Order Document &amp; Extension</h3>

      <div className="space-y-4">
        <div>
          <div>
            <span className="ds-label">DO Document Upload</span>
            <p className="mt-0.5 text-xs text-on-surface-variant">
              Attach the Delivery Order document here. Uploading a new file replaces the current one.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <FileUploadField
            id="do-document-upload"
            accept="application/pdf,image/*"
            disabled={busy || !canUpdateJob}
            helperText="Accepted formats: PDF and images. Uploading here replaces the current Delivery Order file."
            triggerText={
              additionalData.doDocumentFileKey
                ? "Drag and drop or choose file to replace the Delivery Order document"
                : "Drag and drop or choose file to upload the Delivery Order document"
            }
            selectedFile={
              additionalData.doDocumentFileKey
                ? {
                    href: additionalData.doDocumentFileKey,
                    name: additionalData.doDocumentFileName || "Delivery Order document",
                    statusLabel: additionalData.doDocumentUploadedAt
                      ? `Uploaded ${new Date(additionalData.doDocumentUploadedAt).toLocaleDateString("en-IN")}`
                      : "Uploaded",
                  }
                : null
            }
            onClear={additionalData.doDocumentFileKey && canUpdateJob ? () => void handleDelete() : undefined}
            onInputChange={(e) => void handleUpload(e.target.files?.[0] ?? null)}
          />
          {!additionalData.doDocumentFileKey ? (
            <span className="text-xs text-on-surface-variant">No Delivery Order document uploaded yet.</span>
          ) : null}
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <label className="space-y-1.5">
              <span className="ds-label">Delivery Order Extension Date</span>
              <DateInput
                id="deliveryOrderExtensionDate"
                value={extensionDate}
                onChange={(e) => setExtensionDate(e.target.value)}
                min={additionalData.deliveryOrderValidity?.slice(0, 10)}
                disabled={busy || !canUpdateJob || !additionalData.deliveryOrderValidity}
                className="w-full ds-numeric"
              />
            </label>
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleSaveExtensionDate()}
              disabled={busy || !canUpdateJob || !additionalData.deliveryOrderValidity}
              className="w-full md:w-auto"
            >
              {busy ? "Saving..." : "Save Extension Date"}
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-2 text-xs text-on-surface-variant md:grid-cols-2">
            <p>
              Original validity:{" "}
              <span className="ds-numeric text-on-surface">
                {originalValidity ? originalValidity.toLocaleDateString("en-IN") : "—"}
              </span>
            </p>
            <p>
              Effective validity:{" "}
              <span className="ds-numeric text-on-surface">
                {effectiveValidity ? effectiveValidity.toLocaleDateString("en-IN") : "—"}
              </span>
            </p>
          </div>
          {!additionalData.deliveryOrderValidity ? (
            <p className="text-xs text-[#fb923c]">
              Set the original Delivery Order validity first before saving an extension date.
            </p>
          ) : null}
        </div>

        {/* Extension history — reflected column */}
        {extensions.length > 0 ? (
          <div className="space-y-2 border-t border-outline-variant/40 pt-4">
            <span className="ds-label inline-flex items-center gap-1.5">
              <History size={12} />
              Extension History
            </span>
            <div className="card-cyan-outline overflow-hidden rounded-xl border border-outline-variant/40 bg-surface shadow-sm">
              <div className="overflow-x-auto">
                <table className="ds-table">
                  <thead>
                    <tr>
                      <th>Applied On</th>
                      <th>Previous Validity</th>
                      <th>Extended To</th>
                      <th>Document</th>
                    </tr>
                  </thead>
                  <tbody>
                    {extensions.map((ext) => (
                      <tr key={ext.id}>
                        <td className="ds-numeric">{new Date(ext.createdAt).toLocaleDateString("en-IN")}</td>
                        <td className="ds-numeric">
                          {ext.previousValidity
                            ? new Date(ext.previousValidity).toLocaleDateString("en-IN")
                            : "—"}
                        </td>
                        <td className="ds-numeric font-medium">
                          {new Date(ext.extensionDate).toLocaleDateString("en-IN")}
                        </td>
                        <td>
                          {ext.fileKey ? (
                            <a
                              href={ext.fileKey}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[#00cec4] hover:underline"
                            >
                              <ExternalLink size={12} />
                              {ext.fileName || "View"}
                            </a>
                          ) : (
                            <span className="text-on-surface-variant">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
