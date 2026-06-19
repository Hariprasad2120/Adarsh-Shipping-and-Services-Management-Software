"use client";

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
    <div className="bg-white border-b border-[#d9dee7] flex-shrink-0">
      <div className="flex items-center justify-between px-6 py-3">
        <h1 className="text-sm font-semibold text-[#212529]">{title}</h1>
        <button
          type="button"
          onClick={handleClose}
          className="p-1.5 rounded border border-[#d9dee7] hover:bg-[#f3f5f8] text-[#6b7280] hover:text-[#212529] transition-colors"
          aria-label="Close form"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
