"use client";

import { PeopleErrorState } from "@/components/monolith/people-workspace";

export default function AttendanceError({
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
          ? `The attendance request failed. Reference: ${error.digest}`
          : "The attendance request failed before calculations could finish."
      }
      onRetry={reset}
    />
  );
}
