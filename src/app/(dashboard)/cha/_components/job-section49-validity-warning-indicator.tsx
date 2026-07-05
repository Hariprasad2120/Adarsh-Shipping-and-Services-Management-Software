"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type Section49ValidityWarning = {
  severity: "expired" | "expiring";
  daysUntilExpiry: number;
  validityDate: string;
  message: string;
};

type JobSection49ValidityWarningIndicatorProps = {
  jobId: string;
  warning: Section49ValidityWarning;
};

export function JobSection49ValidityWarningIndicator({
  jobId,
  warning,
}: JobSection49ValidityWarningIndicatorProps) {
  const router = useRouter();
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [panelPosition, setPanelPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const toneClass =
    warning.severity === "expired"
      ? "border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/15"
      : "border-[#fb923c]/45 bg-[#fb923c]/10 text-[#fb923c] hover:bg-[#fb923c]/15";
  const panelToneClass =
    warning.severity === "expired"
      ? "border-red-500/40 text-red-400"
      : "border-[#fb923c]/45 text-[#fb923c]";
  const iconBadgeToneClass =
    warning.severity === "expired"
      ? "border-red-500/20 bg-red-500/10 text-red-400"
      : "border-[#fb923c]/20 bg-[#fb923c]/10 text-[#fb923c]";

  const syncPanelPosition = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const panelWidth = 288;
    const panelHeight = 200;
    const gap = 10;
    const viewportPadding = 16;
    const nextLeft = Math.min(
      Math.max(viewportPadding, rect.left + rect.width / 2 - panelWidth / 2),
      window.innerWidth - panelWidth - viewportPadding,
    );
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const nextTop =
      spaceBelow < panelHeight + gap && spaceAbove > panelHeight + gap
        ? Math.max(viewportPadding, rect.top - panelHeight - gap)
        : Math.min(window.innerHeight - panelHeight - viewportPadding, rect.bottom + gap);
    setPanelPosition({
      top: nextTop,
      left: nextLeft,
    });
  };

  useEffect(() => {
    if (!isOpen) return;
    syncPanelPosition();
    const handleReposition = () => syncPanelPosition();
    window.addEventListener("scroll", handleReposition, true);
    window.addEventListener("resize", handleReposition);
    return () => {
      window.removeEventListener("scroll", handleReposition, true);
      window.removeEventListener("resize", handleReposition);
    };
  }, [isOpen]);

  return (
    <div
      ref={triggerRef}
      className="relative inline-flex"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onMouseEnter={() => {
        syncPanelPosition();
        setIsOpen(true);
      }}
      onMouseLeave={() => setIsOpen(false)}
      onFocus={() => {
        syncPanelPosition();
        setIsOpen(true);
      }}
      onBlur={() => setIsOpen(false)}
    >
      <span
        className={`inline-flex h-7 w-7 items-center justify-center rounded-lg border shadow-sm transition-transform hover:scale-105 focus:scale-105 ${toneClass}`}
        aria-label="Section 49 validity warning"
      >
        <AlertTriangle size={14} />
      </span>

      {isOpen && isMounted
        ? createPortal(
            <div
              className="fixed z-[500] w-72"
              style={{
                top: panelPosition.top,
                left: panelPosition.left,
              }}
              onMouseEnter={() => setIsOpen(true)}
              onMouseLeave={() => setIsOpen(false)}
            >
              <div
                className={`rounded-xl border p-4 shadow-lg bg-surface ${panelToneClass}`}
                style={{
                  backgroundImage: warning.severity === "expired"
                    ? "linear-gradient(rgba(239, 68, 68, 0.1), rgba(239, 68, 68, 0.1))"
                    : "linear-gradient(rgba(251, 146, 60, 0.1), rgba(251, 146, 60, 0.1))"
                }}
              >
                <div className="flex items-start gap-3">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${iconBadgeToneClass}`}>
                    <AlertTriangle size={16} />
                  </span>
                  <div className="min-w-0 space-y-1">
                    <p className="ds-label">
                      {warning.severity === "expired" ? "Section 49 Expired" : "Section 49 Expiring"}
                    </p>
                    <p className="text-sm text-on-surface">{warning.message}</p>
                    <p className="text-xs text-on-surface-variant">
                      Validity date: {new Date(warning.validityDate).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 flex-1 border border-[#fb923c]/25 bg-[#fb923c]/12 text-[#fb923c] hover:bg-[#fb923c]/18 hover:text-[#f97316] text-xs"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      router.push(`/cha/jobs/${jobId}?tab=docs`);
                    }}
                  >
                    <ArrowUpRight size={13} />
                    Open Documents
                  </Button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
