"use client";

import { DateInput } from "@/components/ui/date-input";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { CalendarPlus, FileUp } from "lucide-react";
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
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [extensionDate, setExtensionDate] = useState("");
  const [fileName, setFileName] = useState("");
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
      const file = fileRef.current?.files?.[0];
      if (file) formData.append("file", file);

      const response = await applyDoExtensionAction(jobId, formData);
      if (!response.ok) {
        toast.error(response.error || "Failed to apply extension.");
        return;
      }
      toast.success("Delivery Order extension applied. Validity date updated.");
      setExtensionDate("");
      setFileName("");
      if (fileRef.current) fileRef.current.value = "";
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

        <div className="space-y-1.5">
          <span className="ds-label">Extension Document</span>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf,image/*"
            className="hidden"
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="ds-plain flex w-full cursor-pointer items-center gap-2 rounded-xl border border-dashed border-outline-variant/50 bg-surface px-4 py-3 text-sm text-on-surface-variant transition hover:border-[#00cec4]/60 hover:bg-surface-container-low/40"
          >
            <FileUp size={15} className="text-[#00cec4]" />
            {fileName || "Choose extension file (PDF or image)"}
          </button>
        </div>

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
