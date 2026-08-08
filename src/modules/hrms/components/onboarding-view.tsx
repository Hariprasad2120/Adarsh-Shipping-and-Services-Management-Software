"use client";

import { CalendarClock, UserRoundPlus } from "lucide-react";
import { PeopleNotice } from "@/modules/people/components/people-workspace";

export function OnboardingView() {
  return (
    <PeopleNotice
      eyebrow="Planned rollout"
      title="Onboarding checklists are coming soon"
      description="This workspace is being rebuilt to match the current Monolith HRMS experience. Checklist setup, employee stage tracking, and guided onboarding actions will be enabled here in a later release."
      icon={<CalendarClock className="size-5" aria-hidden="true" />}
      action={
        <span className="mnx-status-pill">
          <UserRoundPlus className="size-4" aria-hidden="true" />
          Coming soon
        </span>
      }
    />
  );
}
