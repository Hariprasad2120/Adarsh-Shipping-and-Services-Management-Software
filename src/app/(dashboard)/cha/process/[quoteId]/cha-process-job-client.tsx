"use client";

import { actionCompleteQuoteChaProcess } from "@/modules/crm/approval-actions";
import { NewJobClient } from "@/app/(dashboard)/cha/jobs/new/new-job-client";

type ChaProcessJobClientProps = {
  currentUserId: string;
  options: React.ComponentProps<typeof NewJobClient>["options"];
  quoteId: string;
  initialValues: React.ComponentProps<typeof NewJobClient>["initialValues"];
};

export function ChaProcessJobClient({
  currentUserId,
  options,
  quoteId,
  initialValues,
}: ChaProcessJobClientProps) {
  return (
    <NewJobClient
      currentUserId={currentUserId}
      options={options}
      backHref="/cha/process"
      initialValues={initialValues}
      onCreatedJob={async (job) => {
        await actionCompleteQuoteChaProcess(quoteId, job.id, job.jobNumber);
      }}
    />
  );
}
