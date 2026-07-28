"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

type WarningIndicatorTone = "warning" | "destructive";

type WarningIndicatorPopoverProps = {
  ariaLabel: string;
  description: string;
  eyebrow: string;
  meta?: string;
  tone?: WarningIndicatorTone;
  children: ReactNode;
  childrenClassName?: string;
  childrenLayout?: "grid" | "stack";
};

export function WarningIndicatorPopover({
  ariaLabel,
  description,
  eyebrow,
  meta,
  tone = "warning",
  children,
  childrenClassName,
  childrenLayout = "grid",
}: WarningIndicatorPopoverProps) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [panelPosition, setPanelPosition] = useState({ top: 0, left: 0 });

  function syncPanelPosition() {
    const triggerRect = triggerRef.current?.getBoundingClientRect();
    if (!triggerRect) return;
    const panelWidth = panelRef.current?.offsetWidth ?? 352;
    const nextLeft = Math.min(Math.max(16, triggerRect.left + triggerRect.width / 2 - panelWidth / 2), window.innerWidth - panelWidth - 16);
    setPanelPosition({ top: triggerRect.bottom + 12, left: nextLeft });
  }

  useEffect(() => {
    if (!isOpen) return;
    const frame = window.requestAnimationFrame(syncPanelPosition);
    window.addEventListener("resize", syncPanelPosition);
    window.addEventListener("scroll", syncPanelPosition, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", syncPanelPosition);
      window.removeEventListener("scroll", syncPanelPosition, true);
    };
  }, [isOpen]);

  const toneClass = tone === "destructive" ? "danger-badge" : "warning-badge";

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className={cn("monolith-icon-badge", toneClass)}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setIsOpen((current) => !current);
        }}
        onMouseEnter={() => setIsOpen(true)}
      >
        <AlertTriangle className="size-4" />
      </button>

      {isOpen && typeof document !== "undefined"
        ? createPortal(
            <div ref={panelRef} className="fixed z-[500] w-[22rem] max-w-[calc(100vw-2rem)]" style={panelPosition} onMouseLeave={() => setIsOpen(false)}>
              <div className="monolith-card p-4">
                <p className={cn("monolith-label", tone === "destructive" ? "text-red-500" : "text-[var(--warning)]")}>{eyebrow}</p>
                <p className="mt-2 text-sm leading-relaxed text-[var(--text)]">{description}</p>
                {meta ? <p className="mt-2 text-xs leading-relaxed text-[var(--muted)]">{meta}</p> : null}
                <div className={cn(childrenLayout === "stack" ? "mt-3 flex flex-col gap-3" : "mt-3 grid grid-cols-2 gap-2", childrenClassName)}>{children}</div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
