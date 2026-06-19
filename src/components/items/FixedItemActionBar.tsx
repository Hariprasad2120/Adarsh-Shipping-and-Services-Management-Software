"use client";

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
    <div className="sticky bottom-0 z-20 bg-white border-t border-[#d9dee7] px-6 py-3 flex items-center gap-3 flex-shrink-0">
      <button
        type="button"
        onClick={onSave}
        disabled={isSubmitting}
        className="px-5 py-2 bg-[#00cec4] hover:bg-[#00b8af] text-white text-sm font-semibold rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? "Saving…" : "Save"}
      </button>

      <button
        type="button"
        onClick={onSaveAndNew}
        disabled={isSubmitting}
        className="px-5 py-2 border border-[#d9dee7] text-[#212529] text-sm font-medium rounded hover:bg-[#f7f9fb] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Save and New
      </button>

      <button
        type="button"
        onClick={onCancel}
        disabled={isSubmitting}
        className="px-5 py-2 text-sm text-[#6b7280] hover:text-[#212529] transition-colors"
      >
        Cancel
      </button>
    </div>
  );
}
