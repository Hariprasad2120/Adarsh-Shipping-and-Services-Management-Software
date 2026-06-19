"use client";

import React from "react";
import { X } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Discard",
  cancelLabel = "Keep Editing",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-sm mx-4 p-6">
        <button
          onClick={onCancel}
          className="absolute top-3 right-3 p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
          aria-label="Close dialog"
        >
          <X size={16} />
        </button>
        <h2 id="confirm-dialog-title" className="text-base font-semibold text-[#212529] mb-2">
          {title}
        </h2>
        <p className="text-sm text-[#6b7280] mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm border border-[#d9dee7] rounded text-[#212529] hover:bg-[#f7f9fb] transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm bg-[#fe4242] text-white rounded hover:bg-red-600 transition-colors"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
