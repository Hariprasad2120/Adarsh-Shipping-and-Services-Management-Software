"use client";

import { CrmDialog } from "@/modules/crm/components/workspace/crm-workspace";

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
  return (
    <CrmDialog
      open={open}
      onClose={onCancel}
      title={title}
      description={description}
      size="compact"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" className="h-9 border-[var(--mnx-border)] px-4 text-[12px]" onClick={onCancel}>
            Cancel
          </Button>
          <Button className="h-9 bg-[var(--mnx-accent)] px-4 text-[12px] hover:bg-[var(--mnx-accent)]" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <p className="mnx-text-muted">{description}</p>
    </CrmDialog>
  );
}

