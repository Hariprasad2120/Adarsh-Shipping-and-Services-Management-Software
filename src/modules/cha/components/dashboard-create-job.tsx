"use client";

import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DashboardCreateJobProps {
  canCreateJob: boolean;
}

export function DashboardCreateJob({ canCreateJob }: DashboardCreateJobProps) {
  const router = useRouter();

  return (
    canCreateJob ? (
      <Button size="sm" onClick={() => router.push("/cha/jobs/new")}>
        <Plus aria-hidden="true" />
        New Job
      </Button>
    ) : null
  );
}
