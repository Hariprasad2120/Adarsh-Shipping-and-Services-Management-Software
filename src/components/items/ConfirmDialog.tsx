"use client";

import { CrmButton, CrmDialog } from "@/components/monolith/crm-workspace";

import React from "react";

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
  return (
    <CrmDialog
      open={open}
      onClose={onCancel}
      title={title}
      description={message}
      size="compact"
      footer={
        <div className="flex gap-3 justify-end">
          <CrmButton
            onClick={onCancel}
            variant="secondary"
          >
            {cancelLabel}
          </CrmButton>
          <CrmButton
            onClick={onConfirm}
            variant="destructive"
          >
            {confirmLabel}
          </CrmButton>
        </div>
      }
    >
      <p className="mnx-text-muted">{message}</p>
    </CrmDialog>
  );
}
