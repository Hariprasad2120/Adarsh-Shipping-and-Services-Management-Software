"use client";

import {
  PerformanceControlButton,
  PerformanceTableRow,
} from "@/modules/performance/components/performance-workspace";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useNotifications } from "@/modules/notifications/components/notification-provider";
import {
  Badge,
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableEmpty,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
  MetaText,
} from "@/modules/people/components/workspace-data-table";

type ReviewEntry = {
  id: string;
  stage: string;
  dueDate: string;
  availabilityDeadline: string | null;
  reviewerRatingDeadline: string | null;
  myRole: string;
  myStatus: string;
  detailHref: string;
  employee: { id: string; name: string; designation: string | null };
  cycle: { name: string; year: number };
};

const STAGE_COLOR: Record<string, string> = {
  DUE_NOTIFIED: "bg-[var(--mnx-warning-bg)] text-[var(--mnx-warning)]",
  REVIEWERS_ASSIGNED: "bg-mono-accent/10 text-mono-accent",
  SELF_ASSESSMENT_OPEN: "bg-mono-accent/10 text-mono-accent",
  REVIEWER_RATING: "bg-mono-accent/10 text-mono-accent",
  MANAGEMENT_REVIEW: "bg-[var(--mnx-warning-bg)] text-[var(--mnx-warning)]",
  MEETING_PENDING: "bg-mono-accent/10 text-mono-accent",
  MEETING_LIVE: "bg-[var(--mnx-success-bg)] text-[var(--mnx-success)]",
  HIKE_FINALISATION: "bg-mono-accent/10 text-mono-accent",
  CLOSED: "bg-mono-soft text-mono-muted",
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-mono-soft text-mono-muted",
  AVAILABLE: "bg-[var(--mnx-success-bg)] text-[var(--mnx-success)]",
  UNAVAILABLE: "bg-[var(--mnx-danger-bg)] text-[var(--mnx-danger)]",
  FORCED: "bg-[var(--mnx-warning-bg)] text-[var(--mnx-warning)]",
  CLAIMABLE: "bg-[var(--mnx-warning-bg)] text-[var(--mnx-warning)]",
  CLAIMED: "bg-mono-accent/10 text-mono-accent",
};

const KIND_LABEL: Record<string, string> = {
  HR: "HR",
  TL: "Team Lead",
  MANAGER: "Manager",
  MANAGEMENT: "Management",
};

function getDeadlineLabel(appraisal: ReviewEntry): string {
  if (appraisal.stage === "REVIEWERS_ASSIGNED") {
    return appraisal.availabilityDeadline
      ? new Date(appraisal.availabilityDeadline).toLocaleDateString("en-IN")
      : "-";
  }

  if (appraisal.stage === "REVIEWER_RATING") {
    return appraisal.reviewerRatingDeadline
      ? new Date(appraisal.reviewerRatingDeadline).toLocaleDateString("en-IN")
      : "-";
  }

  return "-";
}

function getActionLabel(stage: string): string {
  if (stage === "REVIEWER_RATING") return "Review";
  if (stage === "REVIEWERS_ASSIGNED") return "Open";
  if (stage === "MANAGEMENT_REVIEW") return "Open";
  return "View";
}

export function MyReviewsClient({ appraisals }: { appraisals: ReviewEntry[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const { success, error } = useNotifications();

  async function setAvailability(appraisalId: string, available: boolean) {
    setLoading(appraisalId + (available ? "_yes" : "_no"));
    const res = await fetch(`/api/ams/appraisals/${appraisalId}/availability`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ available }),
    });
    setLoading(null);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      error(d.error ?? "Action failed");
      return;
    }
    success(available ? "Availability confirmed" : "Marked unavailable");
    router.refresh();
  }

  return (
    <DataTable>
      <DataTableHeader>
        <PerformanceTableRow>
          {[
            "Employee",
            "Cycle",
            "Stage",
            "Your Role",
            "Your Status",
            "Deadline",
            "",
          ].map((h) => (
            <DataTableHead key={h}>{h}</DataTableHead>
          ))}
        </PerformanceTableRow>
      </DataTableHeader>
      <DataTableBody>
        {appraisals.length === 0 ? (
          <DataTableEmpty
            colSpan={7}
            message="No review assignments or management reviews are waiting for you."
            className="py-12 text-sm"
          />
        ) : (
          appraisals.map((a) => {
            const canSetAvailability =
              a.stage === "REVIEWERS_ASSIGNED" && a.myStatus === "PENDING";

            return (
              <DataTableRow key={a.id}>
                <DataTableCell>
                  <MetaText
                    primary={a.employee.name}
                    secondary={a.employee.designation ?? undefined}
                  />
                </DataTableCell>
                <DataTableCell className="text-mono-muted">
                  {a.cycle.name} {a.cycle.year}
                </DataTableCell>
                <DataTableCell>
                  <Badge
                    className={
                      STAGE_COLOR[a.stage] ?? "bg-mono-soft text-mono-muted"
                    }
                  >
                    {a.stage.replace(/_/g, " ")}
                  </Badge>
                </DataTableCell>
                <DataTableCell className="text-mono-muted">
                  {KIND_LABEL[a.myRole] ?? a.myRole}
                </DataTableCell>
                <DataTableCell>
                  <Badge
                    className={
                      STATUS_COLOR[a.myStatus] ?? "bg-mono-soft text-mono-muted"
                    }
                  >
                    {a.myStatus}
                  </Badge>
                </DataTableCell>
                <DataTableCell className="text-xs text-mono-muted">
                  {getDeadlineLabel(a)}
                </DataTableCell>
                <DataTableCell>
                  {canSetAvailability ? (
                    <div className="flex gap-2">
                      <PerformanceControlButton
                        onClick={() => setAvailability(a.id, true)}
                        disabled={loading !== null}
                        className="rounded-lg bg-[var(--mnx-success-bg)] px-3 py-1 text-xs font-medium text-mono-text hover:bg-[var(--mnx-success-bg)] disabled:opacity-50"
                      >
                        {loading === a.id + "_yes" ? "..." : "Available"}
                      </PerformanceControlButton>
                      <PerformanceControlButton
                        onClick={() => setAvailability(a.id, false)}
                        disabled={loading !== null}
                        className="rounded-lg bg-[var(--mnx-danger-bg)] px-3 py-1 text-xs font-medium text-mono-text hover:bg-[var(--mnx-danger-bg)] disabled:opacity-50"
                      >
                        {loading === a.id + "_no" ? "..." : "Unavailable"}
                      </PerformanceControlButton>
                    </div>
                  ) : (
                    <Link
                      href={a.detailHref}
                      className="text-xs text-mono-accent hover:underline"
                    >
                      {getActionLabel(a.stage)} →
                    </Link>
                  )}
                </DataTableCell>
              </DataTableRow>
            );
          })
        )}
      </DataTableBody>
    </DataTable>
  );
}
