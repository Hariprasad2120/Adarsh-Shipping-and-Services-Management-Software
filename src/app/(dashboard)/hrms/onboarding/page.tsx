import React from "react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { OnboardingView } from "@/modules/hrms/components/onboarding-view";

export default async function OnboardingPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return <OnboardingView />;
}
