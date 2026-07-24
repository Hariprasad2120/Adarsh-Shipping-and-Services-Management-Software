"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
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
    <Button
      type="button"
      variant="outline"
      onClick={handleDeleteAllJobs}
      disabled={isDeleting}
      className="mt-4 gap-2 border-red-500/45 text-xs uppercase tracking-[0.14em] text-red-500 hover:border-red-500/70 hover:text-red-600 hover:shadow-[0_0_12px_rgba(239,68,68,0.22)]"
    >
      <Trash2 className="size-4" />
      {isDeleting ? "Deleting" : "Delete All Jobs"}
    </Button>
  );
}
