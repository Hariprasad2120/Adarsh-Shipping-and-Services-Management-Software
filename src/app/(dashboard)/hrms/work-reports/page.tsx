import React from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { WorkReportsView } from "@/components/hrms/work-reports";

export default async function WorkReportsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return <WorkReportsView />;
}
