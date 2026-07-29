"use client";

import { CrmButton } from "@/components/monolith/crm-workspace";

import React from "react";

interface FixedItemActionBarProps {
  onSave: () => void;
  onSaveAndNew: () => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function FixedItemActionBar({
  onSave,
  onSaveAndNew,
  onCancel,
  isSubmitting = false,
}: FixedItemActionBarProps) {
  return (
    <div className="sticky bottom-0 z-20 bg-mono-card border-t border-[var(--mnx-border)] px-6 py-3 flex items-center gap-3 flex-shrink-0">
      <CrmButton
        type="button"
        onClick={onSave}
        disabled={isSubmitting}
        className="px-5 py-2 bg-[var(--mnx-accent)] hover:bg-[var(--mnx-accent)] text-mono-text text-sm font-semibold rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? "Saving…" : "Save"}
      </CrmButton>

      <CrmButton
        type="button"
        onClick={onSaveAndNew}
        disabled={isSubmitting}
        className="px-5 py-2 border border-[var(--mnx-border)] text-[var(--mnx-text-strong)] text-sm font-medium rounded hover:bg-[var(--mnx-surface)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Save and New
      </CrmButton>

      <CrmButton
        type="button"
        onClick={onCancel}
        disabled={isSubmitting}
        className="px-5 py-2 text-sm text-[var(--mnx-text-muted)] hover:text-[var(--mnx-text-strong)] transition-colors"
      >
        Cancel
      </CrmButton>
    </div>
  );
}
