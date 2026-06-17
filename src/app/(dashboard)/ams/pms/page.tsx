import React from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PmsView } from "@/components/hrms/pms-view";

export default async function PmsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return <PmsView />;
}
