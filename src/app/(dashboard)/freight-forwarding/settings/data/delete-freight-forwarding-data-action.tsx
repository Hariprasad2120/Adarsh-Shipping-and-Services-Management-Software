"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/modules/notifications/client";
import { Trash2 } from "lucide-react";
import { WorkspaceAction } from "@/components/layout/workspace";
import { deleteAllFreightForwardingDataAction } from "@/modules/freight-forwarding/actions";

export function DeleteFreightForwardingDataAction({
  disabled,
}: {
  disabled: boolean;
}) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAllData = async () => {
    const confirmationPhrase = window.prompt(
      "This will permanently delete every Freight Forwarding transaction, booking group, and linked audit log in this organisation. Type DELETE ALL FREIGHT DATA to continue.",
    );
    if (confirmationPhrase === null) return;

    setIsDeleting(true);
    try {
      const response =
        await deleteAllFreightForwardingDataAction(confirmationPhrase);
      if (!response.ok) {
        toast.error(
          response.error || "Failed to delete Freight Forwarding data.",
        );
        return;
      }

      toast.success(
        `Deleted ${response.data.deletedTransactions} transaction(s), ${response.data.deletedBookingGroups} booking group(s), and ${response.data.deletedAuditLogs} audit log(s).`,
      );
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to delete Freight Forwarding data.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <WorkspaceAction
      type="button"
      variant="destructive"
      onClick={handleDeleteAllData}
      disabled={disabled || isDeleting}
    >
      <Trash2 aria-hidden="true" />
      {isDeleting ? "Deleting data" : "Delete all Freight Forwarding data"}
    </WorkspaceAction>
  );
}
