"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, ArrowUpRight, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import * as actions from "@/modules/cha/actions";

type DeliveryOrderWarning = {
  severity: "expired" | "expiring";
  daysUntilExpiry: number;
  deliveryOrderValidity: string;
  message: string;
};

type JobValidityWarningIndicatorProps = {
  jobId: string;
  warning: DeliveryOrderWarning;
};

export function JobValidityWarningIndicator({
  jobId,
  warning,
}: JobValidityWarningIndicatorProps) {
  const router = useRouter();
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const [acknowledging, setAcknowledging] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [panelPosition, setPanelPosition] = useState({ top: 0, left: 0 });

  const openTarget =
    warning.severity === "expired"
      ? `/cha/jobs/${jobId}?tab=additionalData&focus=deliveryOrderValidity`
      : `/cha/jobs/${jobId}`;

  const openLabel = warning.severity === "expired" ? "Update Validity" : "Review Job";
  const toneClass =
    warning.severity === "expired"
      ? "border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/15"
      : "border-[#fb923c]/45 bg-[#fb923c]/10 text-[#fb923c] hover:bg-[#fb923c]/15";
  const panelToneClass =
    warning.severity === "expired"
      ? "border-red-500/40 bg-red-500/10 text-red-400"
      : "border-[#fb923c]/45 bg-[#fb923c]/10 text-[#fb923c]";
  const iconBadgeToneClass =
    warning.severity === "expired"
      ? "border-red-500/20 bg-red-500/10 text-red-400"
      : "border-[#fb923c]/20 bg-[#fb923c]/10 text-[#fb923c]";
  const actionButtonClass =
    warning.severity === "expired"
      ? "h-8 flex-1 border border-red-500/25 bg-red-500/12 text-red-500 hover:bg-red-500/18 hover:text-red-600 text-xs"
      : "h-8 flex-1 border border-[#fb923c]/25 bg-[#fb923c]/12 text-[#fb923c] hover:bg-[#fb923c]/18 hover:text-[#f97316] text-xs";

  const syncPanelPosition = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const panelWidth = 288;
    const viewportPadding = 16;
    const nextLeft = Math.min(
      Math.max(viewportPadding, rect.left),
      window.innerWidth - panelWidth - viewportPadding,
    );
    setPanelPosition({
      top: rect.bottom + 10,
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

  const handleAcknowledge = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setAcknowledging(true);
    try {
      const response = await actions.acknowledgeDoValidityWarningAction(jobId);
      if (!response.ok) {
        toast.error(response.error || "Failed to acknowledge warning.");
        setAcknowledging(false);
        return;
      }
      toast.success("Delivery Order validity warning acknowledged.");
      router.refresh();
    } catch (error: any) {
      toast.error(error?.message || "Failed to acknowledge warning.");
      setAcknowledging(false);
    }
  };

  const handleOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    router.push(openTarget);
  };

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
        aria-label="Delivery order validity warning"
      >
        <AlertTriangle size={14} />
      </span>

      {isOpen ? (
        <div
          className="fixed z-[250] w-72"
          style={{
            top: panelPosition.top,
            left: panelPosition.left,
          }}
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
        >
          <div className={`rounded-xl border p-4 shadow-lg ${panelToneClass}`}>
          <div className="flex items-start gap-3">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${iconBadgeToneClass}`}>
              <AlertTriangle size={16} />
            </span>
            <div className="min-w-0 space-y-1">
              <p className="ds-label">
                {warning.severity === "expired" ? "DO Validity Expired" : "DO Validity Expiring"}
              </p>
              <p className="text-sm text-on-surface">{warning.message}</p>
              <p className="text-xs text-on-surface-variant">
                Validity date: {new Date(warning.deliveryOrderValidity).toLocaleDateString("en-IN")}
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              className={actionButtonClass}
              onClick={handleOpen}
            >
              <ArrowUpRight size={13} />
              {openLabel}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 flex-1 border-outline-variant/50 bg-surface text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface text-xs"
              disabled={acknowledging}
              onClick={handleAcknowledge}
            >
              <CheckCheck size={13} />
              {acknowledging ? "Saving..." : "Acknowledge"}
            </Button>
          </div>
        </div>
        </div>
      ) : null}
    </div>
  );
}
