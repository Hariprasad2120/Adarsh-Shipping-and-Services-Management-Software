import React from "react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { WorkReportsView } from "@/modules/hrms/components/work-reports";
import { loadCaps } from "@/lib/rbac";

export default async function WorkReportsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const caps = await loadCaps(session.user.id);

  return (
    <WorkReportsView
      currentUserId={session.user.id}
      canApprove={Boolean(caps["hrms.workreport.approve"])}
      canSubmit={Boolean(caps["hrms.workreport.submit"])}
      canViewAll={Boolean(caps["hrms.workreport.view_all"])}
    />
  );
}
