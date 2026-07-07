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
  status?: string;
  tone?: WarningIndicatorTone;
  children: ReactNode;
};

const TONE_STYLES: Record<
  WarningIndicatorTone,
  {
    trigger: string;
    shell: string;
    accent: string;
    badge: string;
    eyebrow: string;
    status: string;
  }
> = {
  warning: {
    trigger:
      "border-[#fb923c]/35 bg-[#fb923c]/10 text-[#fb923c] hover:border-[#fb923c]/55 hover:bg-[#fb923c]/14",
    shell: "border-[#fb923c]/30",
    accent: "bg-[#fb923c]",
    badge: "border-[#fb923c]/20 bg-[#fb923c]/10 text-[#fb923c]",
    eyebrow: "text-[#fb923c]",
    status: "border-[#fb923c]/20 bg-[#fb923c]/10 text-[#fb923c]",
  },
  destructive: {
    trigger: "border-red-500/35 bg-red-500/10 text-red-400 hover:border-red-500/55 hover:bg-red-500/14",
    shell: "border-red-500/30",
    accent: "bg-red-500",
    badge: "border-red-500/20 bg-red-500/10 text-red-400",
    eyebrow: "text-red-400",
    status: "border-red-500/20 bg-red-500/10 text-red-400",
  },
};

export function WarningIndicatorPopover({
  ariaLabel,
  description,
  eyebrow,
  meta,
  status,
  tone = "warning",
  children,
}: WarningIndicatorPopoverProps) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [panelPosition, setPanelPosition] = useState({ top: 0, left: 0 });

  const toneStyles = TONE_STYLES[tone];

  const clearCloseTimeout = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  const scheduleClose = () => {
    clearCloseTimeout();
    closeTimeoutRef.current = setTimeout(() => setIsOpen(false), 120);
  };

  const syncPanelPosition = () => {
    const triggerRect = triggerRef.current?.getBoundingClientRect();
    if (!triggerRect) return;

    const panelWidth = panelRef.current?.offsetWidth ?? 352;
    const panelHeight = panelRef.current?.offsetHeight ?? 240;
    const gap = 12;
    const viewportPadding = 16;
    const nextLeft = Math.min(
      Math.max(viewportPadding, triggerRect.left + triggerRect.width / 2 - panelWidth / 2),
      window.innerWidth - panelWidth - viewportPadding,
    );
    const spaceBelow = window.innerHeight - triggerRect.bottom;
    const spaceAbove = triggerRect.top;
    const nextTop =
      spaceBelow < panelHeight + gap && spaceAbove > panelHeight + gap
        ? Math.max(viewportPadding, triggerRect.top - panelHeight - gap)
        : Math.min(window.innerHeight - panelHeight - viewportPadding, triggerRect.bottom + gap);

    setPanelPosition({ top: nextTop, left: nextLeft });
  };

  useEffect(() => () => clearCloseTimeout(), []);

  useEffect(() => {
    if (!isOpen) return;

    const frame = window.requestAnimationFrame(() => syncPanelPosition());
    const handleReposition = () => syncPanelPosition();
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("scroll", handleReposition, true);
    window.addEventListener("resize", handleReposition);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", handleReposition, true);
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const openPopover = () => {
    clearCloseTimeout();
    setIsOpen(true);
  };

  const closeIfOutsidePanel = (nextTarget: EventTarget | null) => {
    if (nextTarget instanceof Node && panelRef.current?.contains(nextTarget)) {
      return;
    }
    scheduleClose();
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className={cn(
          "inline-flex h-8 w-8 items-center justify-center rounded-xl border shadow-sm transition-all duration-200 hover:-translate-y-px focus-visible:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00cec4]/30",
          toneStyles.trigger,
        )}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          clearCloseTimeout();
          setIsOpen((current) => !current);
        }}
        onMouseEnter={openPopover}
        onMouseLeave={scheduleClose}
        onFocus={openPopover}
        onBlur={(event) => closeIfOutsidePanel(event.relatedTarget)}
      >
        <AlertTriangle size={15} />
      </button>

      {isOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={panelRef}
              className="fixed z-[500] w-80 max-w-[calc(100vw-2rem)]"
              style={panelPosition}
              onMouseEnter={openPopover}
              onMouseLeave={scheduleClose}
              onFocusCapture={openPopover}
              onBlurCapture={(event) => {
                if (!(event.relatedTarget instanceof Node) || !panelRef.current?.contains(event.relatedTarget)) {
                  scheduleClose();
                }
              }}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
            >
              <div className={cn("overflow-hidden rounded-2xl border bg-surface shadow-[var(--shadow-ambient-hover)]", toneStyles.shell)}>
                <div className={cn("h-1 w-full", toneStyles.accent)} />
                <div className="space-y-4 p-4">
                  <div className="grid grid-cols-[40px_minmax(0,1fr)] gap-x-3 gap-y-3">
                    <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border", toneStyles.badge)}>
                      <AlertTriangle size={18} />
                    </span>
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <p className={cn("ds-label", toneStyles.eyebrow)}>{eyebrow}</p>
                      {status ? (
                        <span
                          className={cn(
                            "rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.14em]",
                            toneStyles.status,
                          )}
                        >
                          {status}
                        </span>
                      ) : null}
                    </div>
                    <p className="col-span-2 text-sm leading-6 text-on-surface">{description}</p>
                    {meta ? (
                      <div className="col-span-2 rounded-xl border border-outline-variant/40 bg-surface-container-low px-3 py-2 text-xs text-on-surface-variant">
                        {meta}
                      </div>
                    ) : null}
                    </div>

                  <div
                    className="flex flex-col gap-2"
                    onClickCapture={(event) => {
                      const target = event.target;
                      if (target instanceof HTMLElement && target.closest("button, a")) {
                        setIsOpen(false);
                      }
                    }}
                  >
                    {children}
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
