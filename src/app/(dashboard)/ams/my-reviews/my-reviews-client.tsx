"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useNotifications } from "@/components/notifications/notification-provider";
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
} from "@/components/data-table";

type ReviewEntry = {
  id: string;
  stage: string;
  dueDate: string;
  availabilityDeadline: string | null;
  reviewerRatingDeadline: string | null;
  employee: { id: string; name: string; designation: string | null };
  cycle: { name: string; year: number };
  reviewers: { kind: string; availabilityStatus: string }[];
};

const STAGE_COLOR: Record<string, string> = {
  DUE_NOTIFIED: "bg-yellow-50 text-yellow-700",
  REVIEWERS_ASSIGNED: "bg-blue-50 text-blue-700",
  SELF_ASSESSMENT_OPEN: "bg-purple-50 text-purple-700",
  REVIEWER_RATING: "bg-indigo-50 text-indigo-700",
  MANAGEMENT_REVIEW: "bg-orange-50 text-orange-700",
  MEETING_PENDING: "bg-cyan-50 text-cyan-700",
  MEETING_LIVE: "bg-green-50 text-green-700",
  HIKE_FINALISATION: "bg-pink-50 text-pink-700",
  CLOSED: "bg-gray-100 text-gray-500",
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-500",
  AVAILABLE: "bg-green-100 text-green-700",
  UNAVAILABLE: "bg-red-100 text-red-600",
  FORCED: "bg-orange-100 text-orange-600",
};

const KIND_LABEL: Record<string, string> = {
  HR: "HR",
  TL: "Team Lead",
  MANAGER: "Manager",
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
        <tr>
          {["Employee", "Cycle", "Stage", "Your Role", "Your Status", "Deadline", ""].map((h) => (
            <DataTableHead key={h}>{h}</DataTableHead>
          ))}
        </tr>
      </DataTableHeader>
      <DataTableBody>
        {appraisals.length === 0 ? (
          <DataTableEmpty colSpan={7} message="No appraisals assigned to you as reviewer." className="py-12 text-sm" />
        ) : (
          appraisals.map((a) => {
            const myReviewer = a.reviewers[0];
            const canSetAvailability =
              a.stage === "REVIEWERS_ASSIGNED" && myReviewer?.availabilityStatus === "PENDING";

            return (
              <DataTableRow key={a.id}>
                <DataTableCell>
                  <MetaText primary={a.employee.name} secondary={a.employee.designation ?? undefined} />
                </DataTableCell>
                <DataTableCell className="text-gray-500">
                  {a.cycle.name} {a.cycle.year}
                </DataTableCell>
                <DataTableCell>
                  <Badge className={STAGE_COLOR[a.stage] ?? "bg-gray-100 text-gray-500"}>
                    {a.stage.replace(/_/g, " ")}
                  </Badge>
                </DataTableCell>
                <DataTableCell className="text-gray-500">
                  {myReviewer ? KIND_LABEL[myReviewer.kind] ?? myReviewer.kind : "-"}
                </DataTableCell>
                <DataTableCell>
                  {myReviewer ? (
                    <Badge className={STATUS_COLOR[myReviewer.availabilityStatus] ?? "bg-gray-100 text-gray-500"}>
                      {myReviewer.availabilityStatus}
                    </Badge>
                  ) : "-"}
                </DataTableCell>
                <DataTableCell className="text-xs text-gray-500">
                  {getDeadlineLabel(a)}
                </DataTableCell>
                <DataTableCell>
                  {canSetAvailability ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setAvailability(a.id, true)}
                        disabled={loading !== null}
                        className="rounded-lg bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        {loading === a.id + "_yes" ? "..." : "Available"}
                      </button>
                      <button
                        onClick={() => setAvailability(a.id, false)}
                        disabled={loading !== null}
                        className="rounded-lg bg-red-500 px-3 py-1 text-xs font-medium text-white hover:bg-red-600 disabled:opacity-50"
                      >
                        {loading === a.id + "_no" ? "..." : "Unavailable"}
                      </button>
                    </div>
                  ) : (
                    <Link href={`/ams/my-reviews/${a.id}`} className="text-xs text-indigo-600 hover:underline">
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
