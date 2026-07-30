import React from "react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TravelView } from "@/modules/hrms/components/travel-view";

export default async function TravelPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return <TravelView />;
}
