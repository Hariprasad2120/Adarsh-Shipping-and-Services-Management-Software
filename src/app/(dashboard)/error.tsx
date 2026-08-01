"use client";

import { RotateCcw } from "lucide-react";
import { WorkspaceAction, WorkspacePage, WorkspaceState } from "@/components/layout/workspace";

export default function DashboardRouteError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <WorkspacePage>
      <WorkspaceState
        variant="danger"
        eyebrow="Workspace unavailable"
        icon={<RotateCcw size={25} aria-hidden="true" />}
        title="We couldn’t load this page"
        description="Your data is safe. Retry the request to continue where you left off."
        action={
          <WorkspaceAction onClick={reset}>
            Try again <RotateCcw size={15} aria-hidden="true" />
          </WorkspaceAction>
        }
        role="alert"
      />
    </WorkspacePage>
  );
}
