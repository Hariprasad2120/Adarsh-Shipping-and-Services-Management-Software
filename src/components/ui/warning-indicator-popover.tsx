"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
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

const TONE_STYLES: Record<
  WarningIndicatorTone,
  {
    trigger: string;
    triggerStyle: CSSProperties;
    pulse: string;
    shell: string;
    icon: string;
    eyebrow: string;
  }
> = {
  warning: {
    trigger: "",
    triggerStyle: { background: "rgba(251,146,60,0.10)", color: "#fb923c" },
    pulse: "animate-pulse-orange",
    shell: "border-[#fb923c]/30",
    icon: "text-current",
    eyebrow: "!text-[#fb923c]",
  },
  destructive: {
    trigger: "",
    triggerStyle: { background: "rgba(239,68,68,0.10)", color: "#f87171" },
    pulse: "animate-pulse-red",
    shell: "border-red-500/30",
    icon: "text-current",
    eyebrow: "!text-red-400",
  },
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
          "ds-icon-badge size-9 rounded-2xl border-0 shadow-none transition-transform duration-200 hover:scale-105 focus-visible:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00cec4]/30",
          toneStyles.trigger,
          toneStyles.pulse,
        )}
        style={toneStyles.triggerStyle}
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
        <AlertTriangle className={cn("size-[14px]", toneStyles.icon)} strokeWidth={2.2} />
      </button>

      {isOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={panelRef}
              className="fixed z-[500] w-[22rem] max-w-[calc(100vw-2rem)]"
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
              <div
                className={cn(
                  "card-top-accent-orange overflow-hidden rounded-xl border bg-surface shadow-[0_20px_44px_-26px_rgba(251,146,60,0.45)]",
                  toneStyles.shell,
                )}
              >
                <div className="space-y-3 p-4">
                  <p className={cn("ds-label", toneStyles.eyebrow)}>{eyebrow}</p>
                  <p className="text-sm leading-relaxed text-on-surface">{description}</p>
                  {meta ? <p className="text-xs leading-relaxed text-on-surface-variant">{meta}</p> : null}

                  <div
                    className={cn(
                      childrenLayout === "stack" ? "flex flex-col gap-3 pt-1" : "grid grid-cols-2 gap-2 pt-1",
                      childrenClassName,
                    )}
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
