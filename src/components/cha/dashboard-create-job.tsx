"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/monolith/button";
import { CreateJobPermissionGuard } from "./create-job-permission-guard";

const CreateJobDialog = dynamic(
  () => import("./create-job-dialog").then((module) => module.CreateJobDialog),
  { ssr: false },
);

interface DashboardCreateJobProps {
  currentUserId: string;
  canCreateJob: boolean;
}

type CreateOptions = React.ComponentProps<typeof CreateJobDialog>["options"];

export function DashboardCreateJob({ currentUserId, canCreateJob }: DashboardCreateJobProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedCreateNew = searchParams.get("new") === "true";
  const [isOpen, setIsOpen] = useState(() => requestedCreateNew && canCreateJob);
  const [options, setOptions] = useState<CreateOptions | null>(null);
  const optionsRequestRef = useRef<Promise<CreateOptions> | null>(null);

  const loadOptions = useCallback(async () => {
    if (options) return options;
    if (!optionsRequestRef.current) {
      optionsRequestRef.current = fetch("/api/cha/jobs/create-options", { cache: "no-store" })
        .then(async (response) => {
          if (!response.ok) throw new Error("Unable to load create-job options.");
          return response.json() as Promise<CreateOptions>;
        })
        .finally(() => {
          optionsRequestRef.current = null;
        });
    }
    const loaded = await optionsRequestRef.current;
    setOptions(loaded);
    return loaded;
  }, [options]);

  useEffect(() => {
    if (isOpen && canCreateJob) void loadOptions();
  }, [canCreateJob, isOpen, loadOptions]);

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
      {canCreateJob ? (
        <>
          <Button
            size="sm"
            className="gap-2"
            onClick={() => {
              setIsOpen(true);
              void loadOptions();
            }}
          >
            <Plus aria-hidden="true" />
            New Job
          </Button>
          {options ? (
            <CreateJobDialog
              open={isOpen}
              onOpenChange={handleOpenChange}
              options={options}
              currentUserId={currentUserId}
              onCreated={handleCreated}
            />
          ) : null}
        </>
      ) : null}
      <CreateJobPermissionGuard open={requestedCreateNew && !canCreateJob} fallbackHref="/cha" />
    </>
  );
}
