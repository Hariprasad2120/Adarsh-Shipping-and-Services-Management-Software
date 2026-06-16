import React from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TravelView } from "@/components/hrms/peopleplus/travel-view";

export default async function TravelPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return <TravelView />;
}
