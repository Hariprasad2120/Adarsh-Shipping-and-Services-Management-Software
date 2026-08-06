import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { getCreateJobOptions } from "@/modules/cha/jobs/queries";

import { NewJobClient } from "./new-job-client";

export default async function ChaNewJobPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId;
  if (!orgId) redirect("/setup");

  const allowed = await can(session.user.id, "cha.job.create");
  if (!allowed) redirect("/cha/jobs");

  const options = await getCreateJobOptions(orgId);

  return (
    <NewJobClient currentUserId={session.user.id} options={options} />
  );
}
