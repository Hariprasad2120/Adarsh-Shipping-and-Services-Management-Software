import React from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { WorkReportsView } from "@/components/hrms/work-reports";
import { loadCaps } from "@/lib/rbac";

export default async function WorkReportsPage() {
  const session = await auth();
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
