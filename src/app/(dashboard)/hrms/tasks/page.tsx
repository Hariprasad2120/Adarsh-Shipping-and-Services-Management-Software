import React from "react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TasksView } from "@/components/hrms/tasks-view";

export default async function TasksPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return <TasksView />;
}
