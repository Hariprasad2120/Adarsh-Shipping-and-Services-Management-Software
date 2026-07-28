"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { MonolithIconAction, MonolithSpecLabel } from "./foundation";

interface WorkspaceDialogProps {
  children: React.ReactNode;
  className?: string;
  description?: React.ReactNode;
  eyebrow: string;
  footer?: React.ReactNode;
  onClose: () => void;
  open: boolean;
  title: React.ReactNode;
}

export function WorkspaceDialog({
  children,
  className,
  description,
  eyebrow,
  footer,
  onClose,
  open,
  title,
}: WorkspaceDialogProps) {
  React.useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="mnx-dialog-layer">
      <button
        type="button"
        className="mnx-dialog-backdrop"
        onClick={onClose}
        aria-label="Close dialog"
      />
      <section
        className={cn("mnx-dialog", className)}
        role="dialog"
        aria-modal="true"
      >
        <header>
          <div>
            <MonolithSpecLabel>{eyebrow}</MonolithSpecLabel>
            <h2>{title}</h2>
            {description ? <p>{description}</p> : null}
          </div>
          <MonolithIconAction onClick={onClose} aria-label="Close dialog">
            <X size={17} />
          </MonolithIconAction>
        </header>
        <div className="mnx-dialog-content">{children}</div>
        {footer ? <footer>{footer}</footer> : null}
      </section>
    </div>,
    document.body,
  );
}
