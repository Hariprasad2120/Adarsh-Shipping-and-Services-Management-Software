"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarClock, ExternalLink, FileUp, History } from "lucide-react";
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
    doUploadEnabled: boolean;
    doDocumentFileKey: string | null;
    doDocumentFileName: string | null;
    doDocumentUploadedAt: string | null;
    doExtensionEnabled: boolean;
  };
  extensions: DoExtension[];
};

function Toggle({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "bg-[#00cec4]" : "bg-surface-container"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-[18px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

export function DoValidityPanel({ jobId, canUpdateJob, additionalData, extensions }: DoValidityPanelProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);

  const validity = additionalData.deliveryOrderValidity
    ? new Date(additionalData.deliveryOrderValidity)
    : null;
  const warningActive = (() => {
    if (!validity) return false;
    const threshold = new Date();
    threshold.setDate(threshold.getDate() + 4);
    threshold.setHours(23, 59, 59, 999);
    return validity.getTime() <= threshold.getTime();
  })();

  const runToggle = async (kind: "upload" | "extension", enabled: boolean) => {
    setBusy(true);
    try {
      const response =
        kind === "upload"
          ? await actions.setDoUploadToggleAction(jobId, enabled)
          : await actions.setDoExtensionToggleAction(jobId, enabled);
      if (!response.ok) {
        toast.error(response.error || "Failed to update toggle.");
        return;
      }
      toast.success(
        kind === "upload"
          ? `DO document upload ${enabled ? "enabled" : "disabled"}.`
          : `DO extension flow ${enabled ? "enabled" : "disabled"}.`,
      );
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

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
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="ds-form-section space-y-4">
      <h3 className="ds-h3 text-on-surface">Delivery Order Document &amp; Extension</h3>

      <div className="space-y-4 rounded-xl border border-outline-variant bg-surface-container-low p-4">
        {/* DO document upload toggle + tab */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="ds-label">DO Document Upload</span>
            <p className="mt-0.5 text-xs text-on-surface-variant">
              Unlock the upload tab to attach the Delivery Order document.
            </p>
          </div>
          <Toggle
            checked={additionalData.doUploadEnabled}
            disabled={busy || !canUpdateJob}
            onChange={(next) => void runToggle("upload", next)}
            label="Toggle DO document upload"
          />
        </div>

        {additionalData.doUploadEnabled ? (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#00cec4]/30 bg-surface p-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,image/*"
              className="hidden"
              onChange={(e) => void handleUpload(e.target.files?.[0] ?? null)}
            />
            <Button
              type="button"
              size="sm"
              disabled={busy || !canUpdateJob}
              onClick={() => fileInputRef.current?.click()}
            >
              <FileUp size={14} />
              {additionalData.doDocumentFileKey ? "Replace DO Document" : "Upload DO Document"}
            </Button>
            {additionalData.doDocumentFileKey ? (
              <a
                href={additionalData.doDocumentFileKey}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[#00cec4] hover:underline"
              >
                <ExternalLink size={13} />
                {additionalData.doDocumentFileName || "View document"}
              </a>
            ) : (
              <span className="text-xs text-on-surface-variant">No Delivery Order document uploaded yet.</span>
            )}
          </div>
        ) : null}

        {/* Extension toggle */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant/40 pt-4">
          <div>
            <span className="ds-label">Extension</span>
            <p className="mt-0.5 text-xs text-on-surface-variant">
              When enabled, an Extension option appears next to Acknowledge on the DO validity
              warning notification. Applying it updates the validity date above and clears the
              active warning.
            </p>
          </div>
          <Toggle
            checked={additionalData.doExtensionEnabled}
            disabled={busy || !canUpdateJob}
            onChange={(next) => void runToggle("extension", next)}
            label="Toggle DO extension flow"
          />
        </div>

        {additionalData.doExtensionEnabled && !warningActive ? (
          <p className="rounded-xl border border-outline-variant/40 bg-surface p-3 text-xs text-on-surface-variant">
            <CalendarClock size={13} className="mr-1.5 inline-block text-[#fb923c]" />
            The extension form opens from the Delivery Order validity notification — it becomes
            available once the validity warning is active.
          </p>
        ) : null}

        {/* Extension history — reflected column */}
        {extensions.length > 0 ? (
          <div className="space-y-2 border-t border-outline-variant/40 pt-4">
            <span className="ds-label inline-flex items-center gap-1.5">
              <History size={12} />
              Extension History
            </span>
            <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface shadow-sm">
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
