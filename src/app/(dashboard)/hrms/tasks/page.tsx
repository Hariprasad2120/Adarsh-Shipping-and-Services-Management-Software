import React from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TasksView } from "@/components/hrms/tasks-view";

export default async function TasksPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return <TasksView />;
}
