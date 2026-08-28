import {
  PerformanceSection,
  PerformanceSectionHeader,
  PerformanceTable,
  PerformanceTableBody,
  PerformanceTableCell,
  PerformanceTableHead,
  PerformanceTableHeader,
  PerformanceTableRow,
} from "@/modules/performance/components/performance-workspace";
import { WorkspaceBadge, WorkspaceState } from "@/components/layout/workspace";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { HistoryFilters } from "./history-filters";

const STAGE_COLORS: Record<string, string> = {
  DUE_NOTIFIED:
    "bg-mono-soft text-mono-muted dark:bg-mono-card dark:text-mono-muted",
  REVIEWERS_ASSIGNED:
    "bg-mono-accent/10 text-mono-accent dark:bg-mono-accent/30 dark:text-mono-accent",
  SELF_ASSESSMENT_OPEN:
    "bg-mono-accent/10 text-mono-accent dark:bg-mono-accent/40 dark:text-mono-accent",
  REVIEWER_RATING:
    "bg-[var(--mnx-warning-bg)] text-[var(--mnx-warning)] dark:bg-[var(--mnx-warning-bg)] dark:text-[var(--mnx-warning)]",
  MANAGEMENT_REVIEW:
    "bg-mono-accent/10 text-mono-accent dark:bg-mono-accent/30 dark:text-mono-accent",
  DATE_VOTING:
    "bg-mono-accent/10 text-mono-accent dark:bg-mono-accent/30 dark:text-mono-accent",
  MEETING_PENDING:
    "bg-[var(--mnx-warning-bg)] text-[var(--mnx-warning)] dark:bg-[var(--mnx-warning-bg)] dark:text-[var(--mnx-warning)]",
  MEETING_LIVE:
    "bg-mono-accent/10 text-mono-accent dark:bg-mono-accent/30 dark:text-mono-accent",
  HIKE_FINALISATION:
    "bg-mono-accent/10 text-mono-accent dark:bg-mono-accent/30 dark:text-mono-accent",
  CLOSED:
    "bg-[var(--mnx-success-bg)] text-[var(--mnx-success)] dark:bg-[var(--mnx-success-bg)] dark:text-[var(--mnx-success)]",
};

function toTitleCase(str?: string | null): string {
  if (!str) return "";
  return str.replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase(),
  );
}

function getAverageReviewerRating(reviewerRatings: unknown[]) {
  if (!reviewerRatings || reviewerRatings.length === 0) return null;

  let totalScore = 0;
  let count = 0;

  for (const reviewerRating of reviewerRatings) {
    const ratingsObj = reviewerRating as {
      ratings?: { categoryPoints?: Record<string, unknown> };
    };
    const categoryPoints = ratingsObj.ratings?.categoryPoints ?? {};
    const values = Object.values(categoryPoints)
      .map(Number)
      .filter((value) => !Number.isNaN(value));

    if (values.length > 0) {
      totalScore += values.reduce((sum, value) => sum + value, 0) / values.length;
      count++;
    }
  }

  return count > 0 ? totalScore / count : null;
}

export const metadata = {
  title: "Appraisal History | AMS | Adarsh Shipping",
};

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{
    month?: string;
    year?: string;
    q?: string;
    stage?: string;
  }>;
}) {
  const sp = await searchParams;
  const session = await getSession();
  if (!session) redirect("/login");

  const currentUser = await db.user.findUnique({
    where: { id: session.user.id },
    include: { roles: { include: { role: true } } },
  });
  if (!currentUser) redirect("/login");

  const orgId = currentUser.orgId;
  if (!orgId) {
    return (
      <WorkspaceState
        variant="danger"
        eyebrow="Performance reporting"
        title="Configuration error"
        description="Organisation configuration is missing."
        icon={<ShieldAlert aria-hidden="true" />}
      />
    );
  }

  const userRoleNames = currentUser.roles.map((role) => role.role.name);
  const isAdmin = userRoleNames.includes("Admin");
  const isManagement =
    userRoleNames.includes("Management") || userRoleNames.includes("Director");
  const isReviewer = userRoleNames.some((role) =>
    ["HR", "TL", "Manager"].includes(role),
  );

  const where: Record<string, unknown> = {};

  if (isAdmin || isManagement) {
    where.cycle = { orgId };
  } else if (isReviewer) {
    where.cycle = { orgId };
    where.OR = [
      { employeeId: session.user.id },
      { reviewers: { some: { userId: session.user.id } } },
    ];
  } else {
    where.employeeId = session.user.id;
  }

  if (sp.q) {
    where.employee = {
      OR: [
        { name: { contains: sp.q, mode: "insensitive" } },
        { employeeNumber: { equals: Number(sp.q) || undefined } },
      ],
    };
  }

  if (sp.stage) {
    where.stage = sp.stage;
  }

  if (sp.year) {
    where.cycle = { ...(where.cycle as object), year: Number(sp.year) };
  }

  if (sp.month && sp.year) {
    const yearValue = Number(sp.year);
    const monthValue = Number(sp.month);
    const startDate = new Date(Date.UTC(yearValue, monthValue - 1, 1));
    const endDate = new Date(Date.UTC(yearValue, monthValue, 0, 23, 59, 59));

    where.dueDate = {
      gte: startDate,
      lte: endDate,
    };
  }

  const appraisals = await db.appraisal.findMany({
    where,
    include: {
      cycle: true,
      employee: {
        select: {
          id: true,
          name: true,
          employeeNumber: true,
          department: { select: { name: true } },
        },
      },
      hikeDecision: {
        include: {
          slab: true,
        },
      },
      reviewerRatings: true,
      reviewers: {
        include: {
          user: {
            select: {
              name: true,
            },
          },
        },
      },
    },
    orderBy: { dueDate: "desc" },
    take: 100,
  });

  const canViewEmployeeDetail = isAdmin || isManagement;
  const canViewCycleDetail = true;

  return (
    <div className="space-y-6">
      <PerformanceSection>
        <PerformanceSectionHeader
          eyebrow="Performance reporting"
          title="Appraisal history"
          description="Review history and status logs of employee appraisal cycles."
          actions={
            <WorkspaceBadge variant="accent">
              {appraisals.length} record{appraisals.length !== 1 ? "s" : ""}
            </WorkspaceBadge>
          }
        />

        <div className="px-5 pb-5">
          <HistoryFilters
            defaultQ={sp.q}
            defaultMonth={sp.month}
            defaultYear={sp.year}
            defaultStage={sp.stage}
            showSearch={isAdmin || isManagement || isReviewer}
          />
        </div>

        <div className="px-5 pb-5">
          <div className="overflow-x-auto">
            <PerformanceTable className="min-w-[800px] w-full text-left text-sm">
              <PerformanceTableHeader>
                <PerformanceTableRow className="border-b border-mono-border bg-mono-soft text-xs font-bold text-mono-muted dark:bg-mono-card dark:text-mono-muted">
                  <PerformanceTableHead className="px-5 py-3.5 font-semibold">
                    Employee
                  </PerformanceTableHead>
                  {(isAdmin || isManagement) && (
                    <PerformanceTableHead className="px-5 py-3.5 font-semibold">
                      Emp #
                    </PerformanceTableHead>
                  )}
                  <PerformanceTableHead className="px-5 py-3.5 font-semibold">
                    Appraisal cycle
                  </PerformanceTableHead>
                  <PerformanceTableHead className="px-5 py-3.5 font-semibold">
                    Due date
                  </PerformanceTableHead>
                  <PerformanceTableHead className="px-5 py-3.5 font-semibold">
                    Stage
                  </PerformanceTableHead>
                  <PerformanceTableHead className="px-5 py-3.5 font-semibold">
                    Avg rating
                  </PerformanceTableHead>
                  <PerformanceTableHead className="px-5 py-3.5 font-semibold">
                    Grade
                  </PerformanceTableHead>
                  <PerformanceTableHead className="px-5 py-3.5 font-semibold">
                    Slab
                  </PerformanceTableHead>
                  <PerformanceTableHead className="px-5 py-3.5 font-semibold">
                    Final hike
                  </PerformanceTableHead>
                  {canViewCycleDetail && (
                    <PerformanceTableHead className="px-5 py-3.5 text-right font-semibold">
                      Actions
                    </PerformanceTableHead>
                  )}
                </PerformanceTableRow>
              </PerformanceTableHeader>
              <PerformanceTableBody className="divide-y divide-outline-variant/60 font-medium text-mono-muted dark:text-mono-text">
                {appraisals.length === 0 && (
                  <PerformanceTableRow>
                    <PerformanceTableCell
                      colSpan={10}
                      className="py-16 text-center text-sm font-medium text-mono-muted"
                    >
                      No appraisal records found.
                    </PerformanceTableCell>
                  </PerformanceTableRow>
                )}

                {appraisals.map((appraisal) => {
                  const avg = getAverageReviewerRating(appraisal.reviewerRatings);
                  const decision = appraisal.hikeDecision;
                  const hikeFinal = appraisal.hikeFinal as
                    | { percent?: number; amount?: number }
                    | null;
                  const hikePercent = decision?.percent ?? hikeFinal?.percent;
                  const hikeAmount = decision?.amount ?? hikeFinal?.amount;

                  return (
                    <PerformanceTableRow
                      key={appraisal.id}
                      className="transition duration-150 hover:bg-mono-soft/30 dark:hover:bg-mono-card"
                    >
                      <PerformanceTableCell className="px-5 py-3.5 font-bold text-mono-text dark:text-mono-text">
                        {canViewEmployeeDetail ? (
                          <Link
                            href={`/hrms/employees/${appraisal.employee.id}`}
                            className="text-mono-accent hover:underline"
                          >
                            {toTitleCase(appraisal.employee.name)}
                          </Link>
                        ) : (
                          toTitleCase(appraisal.employee.name)
                        )}
                      </PerformanceTableCell>
                      {(isAdmin || isManagement) && (
                        <PerformanceTableCell className="px-5 py-3.5 font-semibold text-mono-muted">
                          {appraisal.employee.employeeNumber ?? "-"}
                        </PerformanceTableCell>
                      )}
                      <PerformanceTableCell className="px-5 py-3.5 text-mono-muted dark:text-mono-muted">
                        {appraisal.cycle.name} ({appraisal.cycle.year})
                      </PerformanceTableCell>
                      <PerformanceTableCell className="px-5 py-3.5 font-semibold text-mono-muted">
                        {new Date(appraisal.dueDate).toLocaleDateString("en-IN")}
                      </PerformanceTableCell>
                      <PerformanceTableCell className="px-5 py-3.5">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${STAGE_COLORS[appraisal.stage] ?? "bg-mono-soft text-mono-muted"}`}
                        >
                          {appraisal.stage.replace(/_/g, " ")}
                        </span>
                      </PerformanceTableCell>
                      <PerformanceTableCell className="px-5 py-3.5 font-bold text-mono-text dark:text-mono-text">
                        {avg !== null ? avg.toFixed(2) : "-"}
                      </PerformanceTableCell>
                      <PerformanceTableCell className="px-5 py-3.5">
                        {decision?.slab?.grade ? (
                          <span className="text-xs font-bold text-mono-accent dark:text-mono-accent">
                            {decision.slab.grade}
                          </span>
                        ) : (
                          "-"
                        )}
                      </PerformanceTableCell>
                      <PerformanceTableCell className="max-w-xs truncate px-5 py-3.5 text-mono-muted dark:text-mono-muted">
                        {decision?.slab?.label ?? "-"}
                      </PerformanceTableCell>
                      <PerformanceTableCell className="px-5 py-3.5">
                        {hikeAmount !== undefined &&
                        hikePercent !== undefined ? (
                          <span className="whitespace-nowrap font-bold text-[var(--mnx-success)] dark:text-[var(--mnx-success)]">
                            +Rs. {Number(hikeAmount).toLocaleString("en-IN")} (
                            {hikePercent}%)
                          </span>
                        ) : (
                          "-"
                        )}
                      </PerformanceTableCell>
                      {canViewCycleDetail && (
                        <PerformanceTableCell className="px-5 py-3.5 text-right">
                          <Link
                            href={`/ams/appraisals/${appraisal.id}`}
                            className="text-xs font-bold text-mono-accent hover:underline"
                          >
                            {"View details ->"}
                          </Link>
                        </PerformanceTableCell>
                      )}
                    </PerformanceTableRow>
                  );
                })}
              </PerformanceTableBody>
            </PerformanceTable>
          </div>
        </div>
      </PerformanceSection>
    </div>
  );
}
