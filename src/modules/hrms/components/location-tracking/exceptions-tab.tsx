"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "@/modules/notifications/client";
import {
  PeopleErrorState,
  PeopleLoadingState,
  PeopleSection,
  PeopleTable,
  PeopleTableBody,
  PeopleTableCell,
  PeopleTableEmpty,
  PeopleTableHead,
  PeopleTableHeader,
  PeopleTableRow,
} from "@/modules/people/components";
import { WorkspaceAction, WorkspaceBadge, WorkspaceSectionHeading } from "@/components/layout/workspace";
import { fetchJson } from "./shared";

type LocationException = {
  id: string;
  exceptionType: string;
  status: string;
  severity: string;
  description: string | null;
  employeeExplanation: string | null;
  createdAt: string;
  employee: { id: string; name: string; designation?: string | null } | null;
};

const STATUS_VARIANT: Record<string, "success" | "accent" | "warning" | "danger" | "neutral"> = {
  OPEN: "danger",
  UNDER_REVIEW: "warning",
  EXPLANATION_REQUESTED: "warning",
  RESOLVED: "success",
  DISMISSED: "neutral",
};

export function ExceptionsTab() {
  const [exceptions, setExceptions] = useState<LocationException[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchJson<LocationException[]>("/api/hrms/location-tracking/exceptions");
      setExceptions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load exceptions");
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(load, 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  async function review(id: string, action: "REQUEST_EXPLANATION" | "RESOLVE" | "DISMISS") {
    try {
      await fetchJson(`/api/hrms/location-tracking/exceptions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      toast.success("Exception updated");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    }
  }

  if (error && !exceptions) return <PeopleErrorState description={error} onRetry={load} />;
  if (!exceptions) return <PeopleLoadingState description="Loading tracking exceptions." />;

  return (
    <PeopleSection>
      <WorkspaceSectionHeading
        index="01"
        title="Exceptions Center"
        description="GPS, geofence, and route-deviation exceptions. Evidence is shown to authorised reviewers as signals only — never an automatic accusation."
      />
      <PeopleTable>
        <PeopleTableHeader>
          <PeopleTableRow>
            <PeopleTableHead>Employee</PeopleTableHead>
            <PeopleTableHead>Type</PeopleTableHead>
            <PeopleTableHead>Severity</PeopleTableHead>
            <PeopleTableHead>Status</PeopleTableHead>
            <PeopleTableHead>Raised</PeopleTableHead>
            <PeopleTableHead>Explanation</PeopleTableHead>
            <PeopleTableHead>Actions</PeopleTableHead>
          </PeopleTableRow>
        </PeopleTableHeader>
        <PeopleTableBody>
          {exceptions.length === 0 ? (
            <PeopleTableEmpty colSpan={7} message="No tracking exceptions. This is where GPS failures, geofence breaches, and route deviations will surface for review." />
          ) : (
            exceptions.map((exc) => (
              <PeopleTableRow key={exc.id}>
                <PeopleTableCell>{exc.employee?.name ?? "—"}</PeopleTableCell>
                <PeopleTableCell>{exc.exceptionType.replace(/_/g, " ")}</PeopleTableCell>
                <PeopleTableCell>
                  <WorkspaceBadge variant={exc.severity === "HIGH" ? "danger" : exc.severity === "MEDIUM" ? "warning" : "neutral"}>{exc.severity}</WorkspaceBadge>
                </PeopleTableCell>
                <PeopleTableCell>
                  <WorkspaceBadge variant={STATUS_VARIANT[exc.status] ?? "neutral"}>{exc.status.replace(/_/g, " ")}</WorkspaceBadge>
                </PeopleTableCell>
                <PeopleTableCell>{new Date(exc.createdAt).toLocaleString()}</PeopleTableCell>
                <PeopleTableCell>{exc.employeeExplanation ?? "—"}</PeopleTableCell>
                <PeopleTableCell className="min-w-44">
                  <div className="flex flex-col items-start gap-1.5">
                    {exc.status !== "RESOLVED" && exc.status !== "DISMISSED" ? (
                      <>
                        <WorkspaceAction className="whitespace-nowrap" variant="outline" size="compact" onClick={() => review(exc.id, "REQUEST_EXPLANATION")}>
                          Request explanation
                        </WorkspaceAction>
                        <WorkspaceAction className="whitespace-nowrap" variant="outline" size="compact" onClick={() => review(exc.id, "RESOLVE")}>
                          Resolve
                        </WorkspaceAction>
                        <WorkspaceAction className="whitespace-nowrap" variant="outline" size="compact" onClick={() => review(exc.id, "DISMISS")}>
                          Dismiss
                        </WorkspaceAction>
                      </>
                    ) : (
                      "—"
                    )}
                  </div>
                </PeopleTableCell>
              </PeopleTableRow>
            ))
          )}
        </PeopleTableBody>
      </PeopleTable>
    </PeopleSection>
  );
}
