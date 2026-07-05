"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type FilingQueryWarning = {
  queryTitle: string;
  overdueQueryCount: number;
  reminderTriggeredAt: string;
  warningTriggeredAt: string;
  staleMinutes: number;
};

type JobFilingQueryWarningIndicatorProps = {
  jobId: string;
  warning: FilingQueryWarning;
};

export function JobFilingQueryWarningIndicator({
  jobId,
  warning,
}: JobFilingQueryWarningIndicatorProps) {
  const router = useRouter();
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [panelPosition, setPanelPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    setIsMounted(true);
  }, []);

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
        className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-orange-500/45 bg-orange-500/10 text-orange-500 shadow-sm transition-transform hover:scale-105 focus:scale-105"
        aria-label="Customs query update overdue"
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
                className="rounded-xl border border-orange-500/40 p-4 text-orange-500 shadow-lg bg-surface"
                style={{
                  backgroundImage: "linear-gradient(rgba(249, 115, 22, 0.1), rgba(249, 115, 22, 0.1))"
                }}
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-orange-500/20 bg-orange-500/10 text-orange-500">
                    <AlertTriangle size={16} />
                  </span>
                  <div className="min-w-0 space-y-1">
                    <p className="ds-label">Query Update Overdue</p>
                    <p className="text-sm text-on-surface">
                      &ldquo;{warning.queryTitle}&rdquo; has not been updated after the reminder sent at{" "}
                      {new Date(warning.reminderTriggeredAt).toLocaleString("en-IN")}.
                    </p>
                    <p className="text-xs text-on-surface-variant">
                      {warning.overdueQueryCount > 1
                        ? `${warning.overdueQueryCount} overdue query threads need attention.`
                        : `Stale for about ${Math.floor(warning.staleMinutes / 60)} hour(s).`}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 flex-1 border border-orange-500/25 bg-orange-500/12 text-orange-600 hover:bg-orange-500/18 hover:text-orange-700 text-xs"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      router.push(`/cha/jobs/${jobId}?tab=filing`);
                    }}
                  >
                    <ArrowUpRight size={13} />
                    Open Filing
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
