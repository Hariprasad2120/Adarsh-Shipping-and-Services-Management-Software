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
  const toneClass = "border-red-600/70 bg-red-600 text-white";
  const panelToneClass = "border-red-700 bg-red-600 text-white";

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
        className={`inline-flex h-7 w-7 items-center justify-center rounded-lg border ${toneClass} shadow-[0_0_0_1px_rgba(127,29,29,0.24)] transition-transform hover:scale-105 focus:scale-105`}
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
          <div className={`rounded-xl border p-4 shadow-[0_24px_48px_-20px_rgba(127,29,29,0.65)] ${panelToneClass}`}>
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/30 bg-white/12 text-white">
              <AlertTriangle size={16} />
            </span>
            <div className="min-w-0 space-y-1">
              <p className="ds-label text-white/80">
                {warning.severity === "expired" ? "DO Validity Expired" : "DO Validity Expiring"}
              </p>
              <p className="text-sm text-white">{warning.message}</p>
              <p className="text-xs text-white/80">
                Validity date: {new Date(warning.deliveryOrderValidity).toLocaleDateString("en-IN")}
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              className="h-8 flex-1 border border-white/30 bg-white text-red-700 hover:bg-white/90 hover:text-red-800 text-xs"
              onClick={handleOpen}
            >
              <ArrowUpRight size={13} />
              {openLabel}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 flex-1 border-white/30 bg-transparent text-white hover:bg-white/12 hover:text-white text-xs"
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
