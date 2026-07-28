"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type ModalProps = {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  titleClassName?: string;
};

export function Modal({ open, title, description, onClose, children, className, titleClassName }: ModalProps) {
  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6" role="dialog" aria-modal="true">
      <button type="button" aria-label="Close dialog backdrop" className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={onClose} />
      <div className={cn("monolith-modal relative z-10 flex max-h-[calc(100vh-3rem)] w-full max-w-5xl flex-col overflow-hidden", className)}>
        <div className="monolith-modal-header">
          <div className="min-w-0">
            <h2 className={cn("monolith-section-title", titleClassName)}>{title}</h2>
            {description ? <p>{description}</p> : null}
          </div>
          <button type="button" onClick={onClose} className="icon-button" aria-label="Close dialog">
            <X className="size-4" />
          </button>
        </div>
        <div className="overflow-y-auto p-6">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
