import React from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { HelpDeskView } from "@/modules/hrms/components/helpdesk-view";

export default async function HelpDeskPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  await requirePermission(session.user.id, "hrms.helpdesk.read");

  return <HelpDeskView />;
}
