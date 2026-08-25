"use client";

import * as React from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { markPayrollBatchPaidAction } from "@/modules/hrms/payroll-batch-actions";

// `label`/`pendingLabel` let callers frame this the way Zoho's pay-run
// summary does ("Initiate Payment" / "Re-initiate Payment") without
// pretending a real bank-transfer provider exists — this still only flips
// PayrollBatch.status to PAID (markPayrollBatchPaidAction), it does not
// initiate an actual transfer. See that action's comment for why.
export function MarkPaidControl({
  batchId,
  label = "Mark as Paid",
  pendingLabel = "Saving…",
}: {
  batchId: string;
  label?: string;
  pendingLabel?: string;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleClick = async () => {
    setIsSubmitting(true);
    try {
      const response = await markPayrollBatchPaidAction(batchId);
      if (!response.ok) {
        toast.error(response.error);
        return;
      }
      toast.success("Marked as paid");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Button type="button" onClick={() => void handleClick()} disabled={isSubmitting}>
      {isSubmitting ? pendingLabel : label}
    </Button>
  );
}
