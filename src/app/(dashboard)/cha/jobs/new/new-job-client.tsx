"use client";

import { useRouter } from "next/navigation";

import { CreateJobDialog } from "@/modules/cha/components/create-job-dialog";

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
    <div className="min-h-[1px]">
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
        variant="dialog"
        fallbackHref={backHref}
      />
    </div>
  );
}
