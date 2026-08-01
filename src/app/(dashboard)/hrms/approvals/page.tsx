import React from "react";
import { getSession } from "@/lib/auth";
import { loadCaps } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { ApprovalsView } from "@/modules/hrms/components/approvals-view";

export default async function ApprovalsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const caps = await loadCaps(session.user.id);
  const isAdmin = Boolean(caps["hrms.peopleplus.admin"] || caps["admin.org.manage"]);

  return <ApprovalsView isAdmin={isAdmin} />;
}
