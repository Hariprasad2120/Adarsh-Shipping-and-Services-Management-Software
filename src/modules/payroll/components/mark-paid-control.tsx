"use client";

import * as React from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { markPayrollBatchPaidAction } from "@/modules/hrms/payroll-batch-actions";

export function MarkPaidControl({ batchId }: { batchId: string }) {
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
      {isSubmitting ? "Saving…" : "Mark as Paid"}
    </Button>
  );
}
