import React from "react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/rbac";
import { OnboardingView } from "@/modules/hrms/components/onboarding-view";

export default async function OnboardingPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  // Matches the guard on the onboarding APIs (hrms.onboarding.manage).
  await requirePermission(session.user.id, "hrms.onboarding.manage");

  return <OnboardingView />;
}
