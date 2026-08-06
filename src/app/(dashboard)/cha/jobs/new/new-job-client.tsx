"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { CreateJobDialog } from "@/modules/cha/components/create-job-dialog";
import { ChaRoutePageHeader } from "@/modules/cha/components/workspace/cha-workspace";

type NewJobClientProps = {
  currentUserId: string;
  options: React.ComponentProps<typeof CreateJobDialog>["options"];
  backHref?: string;
  initialValues?: React.ComponentProps<typeof CreateJobDialog>["initialValues"];
  onCreatedJob?: React.ComponentProps<typeof CreateJobDialog>["onCreatedJob"];
};

export function NewJobClient({
  currentUserId,
  options,
  backHref = "/cha/jobs",
  initialValues,
  onCreatedJob,
}: NewJobClientProps) {
  const router = useRouter();

  return (
    <div className="space-y-8">
      <ChaRoutePageHeader
        actions={
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(backHref)}
          >
            Back
          </Button>
        }
      />

      <CreateJobDialog
        open
        onOpenChange={(open) => {
          if (!open) {
            router.push(backHref);
          }
        }}
        options={options}
        currentUserId={currentUserId}
        initialValues={initialValues}
        onCreatedJob={onCreatedJob}
        variant="page"
        fallbackHref={backHref}
      />
    </div>
  );
}
