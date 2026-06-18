"use client";

import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({ open, title, description, confirmLabel, onConfirm, onCancel }: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a]/35 px-4">
      <div className="w-full max-w-md rounded-lg border border-[#d9dee7] bg-white shadow-[0_20px_50px_rgba(15,23,42,0.18)]">
        <div className="flex items-center justify-between border-b border-[#e5e7eb] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-full bg-[#fff1f1] text-[#fe4242]">
              <AlertTriangle className="size-4" />
            </div>
            <h2 className="text-[15px] font-semibold text-[#1f2937]">{title}</h2>
          </div>
          <button type="button" onClick={onCancel} className="rounded p-1 text-[#6b7280] hover:bg-[#f3f4f6]" aria-label="Close dialog">
            <X className="size-4" />
          </button>
        </div>
        <div className="px-5 py-4">
          <p className="text-[13px] leading-6 text-[#4b5563]">{description}</p>
        </div>
        <div className="flex justify-end gap-2 border-t border-[#e5e7eb] px-5 py-4">
          <Button variant="outline" className="h-9 border-[#d9dee7] px-4 text-[12px]" onClick={onCancel}>
            Cancel
          </Button>
          <Button className="h-9 bg-[#00cec4] px-4 text-[12px] hover:bg-[#00b8af]" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

