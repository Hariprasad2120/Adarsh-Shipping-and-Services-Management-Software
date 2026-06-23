"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateJobDialog } from "./create-job-dialog";

interface DashboardCreateJobProps {
  options: {
    branches: { id: string; name: string; code: string }[];
    customers: { id: string; name: string }[];
    jobTypes: { id: string; name: string }[];
    users: { id: string; name: string; email: string }[];
    teamGroups: { id: string; name: string; memberIds: any }[];
    settings?: {
      jobNumberPrefix: string;
      jobNumberNextNum: number;
    };
  };
  currentUserId: string;
}

export function DashboardCreateJob({ options, currentUserId }: DashboardCreateJobProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);

  // Automatically open the dialog if new=true is in the query params (e.g. returning from customer draft creation)
  useEffect(() => {
    if (searchParams.get("new") === "true") {
      setIsOpen(isOpen || true);
    }
  }, [searchParams, isOpen]);

  const handleCreated = () => {
    // If we've successfully created the job, we should clear new=true from query parameters if present, and refresh the route
    if (searchParams.get("new") === "true") {
      router.push("/cha");
    } else {
      router.refresh();
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open && searchParams.get("new") === "true") {
      router.push("/cha");
    }
  };

  return (
    <>
      <Button size="sm" className="gap-2" onClick={() => setIsOpen(true)}>
        <Plus size={14} /> New Job
      </Button>
      <CreateJobDialog
        open={isOpen}
        onOpenChange={handleOpenChange}
        options={options}
        currentUserId={currentUserId}
        onCreated={handleCreated}
      />
    </>
  );
}
