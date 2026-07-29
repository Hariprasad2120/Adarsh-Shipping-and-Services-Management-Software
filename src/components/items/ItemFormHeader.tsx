"use client";

import { CrmButton } from "@/components/monolith/crm-workspace";

import React from "react";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";

interface ItemFormHeaderProps {
  title?: string;
  backPath?: string;
  onClose?: () => void;
}

export function ItemFormHeader({
  title = "New Item",
  backPath = "/crm/items",
  onClose,
}: ItemFormHeaderProps) {
  const router = useRouter();

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      router.push(backPath);
    }
  };

  return (
    <div className="bg-mono-card border-b border-[var(--mnx-border)] flex-shrink-0">
      <div className="flex items-center justify-between px-6 py-3">
        <h1 className="text-sm font-semibold text-[var(--mnx-text-strong)]">{title}</h1>
        <CrmButton
          type="button"
          onClick={handleClose}
          className="p-1.5 rounded border border-[var(--mnx-border)] hover:bg-[var(--mnx-surface)] text-[var(--mnx-text-muted)] hover:text-[var(--mnx-text-strong)] transition-colors"
          aria-label="Close form"
        >
          <X size={15} />
        </CrmButton>
      </div>
    </div>
  );
}
