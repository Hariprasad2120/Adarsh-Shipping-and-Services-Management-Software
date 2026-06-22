import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type ModalProps = {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
};

export function Modal({ open, title, description, onClose, children, className }: ModalProps) {
  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Close dialog backdrop"
        className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div
        className={cn(
          "ds-shell-lg relative z-10 flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden border border-outline-variant/50 bg-surface text-on-surface shadow-[0_24px_80px_-24px_rgba(15,23,42,0.55)]",
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-outline-variant/35 bg-surface-container-low px-6 py-5">
          <div className="min-w-0">
            <h2 className="ds-h2 text-on-surface">{title}</h2>
            {description ? <p className="mt-1 text-sm text-on-surface-variant">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-outline-variant/35 bg-surface p-2 text-on-surface-variant transition hover:bg-surface-container hover:text-on-surface"
            aria-label="Close dialog"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
