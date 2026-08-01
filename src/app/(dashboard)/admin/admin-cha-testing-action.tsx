"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import { AdminButton } from "@/modules/admin/components/admin-workspace";
import { deleteAllChaJobsForTestingAction } from "@/modules/cha/actions";

export function AdminChaTestingAction() {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAllJobs = async () => {
    const confirmationPhrase = window.prompt(
      "This will permanently delete every CHA job in this organisation for development/testing. Type DELETE ALL CHA JOBS to continue.",
    );
    if (confirmationPhrase === null) return;

    setIsDeleting(true);
    try {
      const response = await deleteAllChaJobsForTestingAction(confirmationPhrase);
      if (!response.ok) {
        toast.error(response.error || "Failed to delete CHA jobs.");
        return;
      }

      toast.success(`Deleted ${response.data.deletedJobs} CHA job(s).`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete CHA jobs.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AdminButton
      type="button"
      variant="destructive"
      onClick={handleDeleteAllJobs}
      disabled={isDeleting}
    >
      <Trash2 aria-hidden="true" />
      {isDeleting ? "Deleting" : "Delete All Jobs"}
    </AdminButton>
  );
}
