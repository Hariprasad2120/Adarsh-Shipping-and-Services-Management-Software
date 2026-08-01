"use client";

import { PeopleErrorState } from "@/modules/people/components/people-workspace";

export default function HrmsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <PeopleErrorState
      description={
        error.digest
          ? `The HRMS request failed. Reference: ${error.digest}`
          : "The HRMS request failed before the workspace could finish loading."
      }
      onRetry={reset}
    />
  );
}
