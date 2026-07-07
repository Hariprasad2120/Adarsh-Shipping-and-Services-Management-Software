"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowUpRight, CalendarPlus, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WarningIndicatorPopover } from "@/components/ui/warning-indicator-popover";
import { DoExtensionModal } from "./do-extension-modal";
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
  const [acknowledging, setAcknowledging] = useState(false);
  const [extensionOpen, setExtensionOpen] = useState(false);

  const openTarget =
    warning.severity === "expired"
      ? `/cha/jobs/${jobId}?tab=additionalData&focus=deliveryOrderValidity`
      : `/cha/jobs/${jobId}`;

  const openLabel = warning.severity === "expired" ? "Update Validity" : "Review Job";
  const actionButtonClass =
    warning.severity === "expired"
      ? "w-full justify-start border border-red-500/25 bg-red-500/12 text-red-500 hover:bg-red-500/18 hover:text-red-600"
      : "w-full justify-start border border-[#fb923c]/25 bg-[#fb923c]/12 text-[#fb923c] hover:bg-[#fb923c]/18 hover:text-[#f97316]";

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
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to acknowledge warning.");
      setAcknowledging(false);
    }
  };

  const handleOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    router.push(openTarget);
  };

  return (
    <>
      <WarningIndicatorPopover
        ariaLabel="Delivery order validity warning"
        tone={warning.severity === "expired" ? "destructive" : "warning"}
        eyebrow={warning.severity === "expired" ? "DO VALIDITY EXPIRED" : "DO VALIDITY EXPIRING"}
        status={warning.severity === "expired" ? "Expired" : "Action Needed"}
        description={warning.message}
        meta={`Validity date: ${new Date(warning.deliveryOrderValidity).toLocaleDateString("en-IN")}`}
      >
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
          className="w-full justify-start border-outline-variant/50 bg-surface text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
          disabled={acknowledging}
          onClick={handleAcknowledge}
        >
          <CheckCheck size={13} />
          {acknowledging ? "Saving..." : "Acknowledge"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full justify-start border-[#00cec4]/40 bg-[#00cec4]/10 text-[#00cec4] hover:bg-[#00cec4]/15"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setExtensionOpen(true);
          }}
        >
          <CalendarPlus size={13} />
          Extension
        </Button>
      </WarningIndicatorPopover>

      <DoExtensionModal
        open={extensionOpen}
        jobId={jobId}
        currentValidity={warning.deliveryOrderValidity}
        onClose={() => setExtensionOpen(false)}
        onApplied={() => router.refresh()}
      />
    </>
  );
}
