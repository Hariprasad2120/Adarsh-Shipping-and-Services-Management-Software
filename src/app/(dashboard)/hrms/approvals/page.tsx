import React from "react";
import { auth } from "@/lib/auth";
import { loadCaps } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { ApprovalsView } from "@/components/hrms/peopleplus/approvals-view";

export default async function ApprovalsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const caps = await loadCaps(session.user.id);
  const isAdmin = Boolean(caps["hrms.peopleplus.admin"] || caps["admin.org.manage"]);

  return <ApprovalsView isAdmin={isAdmin} />;
}
