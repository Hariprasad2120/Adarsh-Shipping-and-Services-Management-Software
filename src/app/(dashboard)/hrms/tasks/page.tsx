import React from "react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/rbac";
import { TasksView } from "@/modules/hrms/components/tasks-view";

export default async function TasksPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  // The task APIs already require hrms.tasks.manage — gate the page too so an
  // unauthorised user gets a clean 403 instead of an empty, error-toasting view.
  await requirePermission(session.user.id, "hrms.tasks.manage");

  return <TasksView />;
}
