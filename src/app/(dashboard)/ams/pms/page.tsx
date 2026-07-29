import React from "react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PmsView } from "@/components/hrms/pms-view";

export default async function PmsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return <PmsView />;
}
