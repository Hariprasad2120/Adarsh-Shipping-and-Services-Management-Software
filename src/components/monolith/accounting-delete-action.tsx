"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { AccountingAction } from "./accounting-workspace";

export function AccountingDeleteAction({
  action,
  confirmMessage,
  id,
}: {
  action: (id: string) => Promise<{ ok: boolean; error?: string }>;
  confirmMessage: string;
  id: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <AccountingAction
      type="button"
      variant="destructive"
      size="compact"
      aria-label="Delete record"
      disabled={pending}
      onClick={() => {
        if (!window.confirm(confirmMessage)) return;
        startTransition(async () => {
          try {
            const result = await action(id);
            if (!result.ok) {
              toast.error(result.error || "The record could not be deleted");
              return;
            }
            toast.success("Record deleted");
            router.refresh();
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "The record could not be deleted");
          }
        });
      }}
    >
      {pending ? <Loader2 className="mnx-spin" aria-hidden="true" /> : <Trash2 aria-hidden="true" />}
    </AccountingAction>
  );
}
