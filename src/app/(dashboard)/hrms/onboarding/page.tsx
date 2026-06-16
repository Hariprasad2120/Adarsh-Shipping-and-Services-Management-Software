import React from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { OnboardingView } from "@/components/hrms/peopleplus/onboarding-view";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return <OnboardingView />;
}
