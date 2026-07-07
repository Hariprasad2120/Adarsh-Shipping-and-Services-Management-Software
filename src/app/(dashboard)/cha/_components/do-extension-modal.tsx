"use client";

import { DateInput } from "@/components/ui/date-input";
import { FileUploadField } from "@/components/ui/file-upload-field";
import { useState } from "react";
import { toast } from "sonner";
import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { applyDoExtensionAction } from "@/modules/cha/actions";

type DoExtensionModalProps = {
  open: boolean;
  jobId: string;
  /** ISO string of the current Delivery Order validity date */
  currentValidity: string;
  onClose: () => void;
  /** Called after the extension is applied successfully */
  onApplied?: () => void;
};

/**
 * Popup opened from the "Extension" action on a Delivery Order validity
 * warning. Captures the new extension date + extension document, applies the
 * extension (which updates the validity column and clears the active
 * notifications), then hands control back to the caller.
 */
export function DoExtensionModal({
  open,
  jobId,
  currentValidity,
  onClose,
  onApplied,
}: DoExtensionModalProps) {
  const [extensionDate, setExtensionDate] = useState("");
  const [extensionFile, setExtensionFile] = useState<File | null>(null);
  const [applying, setApplying] = useState(false);

  const handleApply = async () => {
    if (!extensionDate) {
      toast.error("Enter the new Delivery Order extension date.");
      return;
    }
    setApplying(true);
    try {
      const formData = new FormData();
      formData.append("extensionDate", extensionDate);
      if (extensionFile) formData.append("file", extensionFile);

      const response = await applyDoExtensionAction(jobId, formData);
      if (!response.ok) {
        toast.error(response.error || "Failed to apply extension.");
        return;
      }
      toast.success("Delivery Order extension applied. Validity date updated.");
      setExtensionDate("");
      setExtensionFile(null);
      onClose();
      onApplied?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to apply extension.");
    } finally {
      setApplying(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Apply Delivery Order Extension"
      description="Enter the new extension date and upload the extension document. The Delivery Order validity will update and this warning will be cleared."
      onClose={onClose}
      className="max-w-lg"
    >
      <div className="space-y-4">
        <label className="block space-y-1.5">
          <span className="ds-label">New Extension Date</span>
          <DateInput
            value={extensionDate}
            onChange={(e) => setExtensionDate(e.target.value)}
            min={new Date(currentValidity).toISOString().slice(0, 10)}
            className="w-full"
            required
          />
        </label>

        <FileUploadField
          id="do-extension-file-upload"
          label="Extension Document"
          accept="application/pdf,image/*"
          helperText="Upload the signed extension support document as a PDF or image."
          triggerText="Drag and drop or choose extension file to upload"
          selectedFile={
            extensionFile
              ? {
                  file: extensionFile,
                  name: extensionFile.name,
                  sizeBytes: extensionFile.size,
                  statusLabel: "Ready",
                }
              : null
          }
          onClear={() => setExtensionFile(null)}
          onInputChange={(e) => setExtensionFile(e.target.files?.[0] ?? null)}
        />

        <p className="text-xs text-on-surface-variant">
          Current validity: {new Date(currentValidity).toLocaleDateString("en-IN")}
        </p>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={applying}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={applying || !extensionDate}
            onClick={() => void handleApply()}
          >
            <CalendarPlus size={13} />
            {applying ? "Applying..." : "Apply Extension"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
