import {
  PerformanceTable,
  PerformanceTableBody,
  PerformanceTableCell,
  PerformanceTableHead,
  PerformanceTableHeader,
  PerformanceTableRow,
} from "@/modules/performance/components/performance-workspace";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { HistoryFilters } from "./history-filters";
import { redirect } from "next/navigation";
import { History } from "lucide-react";

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

function getAverageReviewerRating(reviewerRatings: any[]) {
  if (!reviewerRatings || reviewerRatings.length === 0) return null;
  let totalScore = 0;
  let count = 0;
  for (const rr of reviewerRatings) {
    const ratingsObj = rr.ratings as any;
    const categoryPoints = ratingsObj?.categoryPoints || {};
    const values = Object.values(categoryPoints)
      .map(Number)
      .filter((v) => !isNaN(v));
    if (values.length > 0) {
      totalScore += values.reduce((a, b) => a + b, 0) / values.length;
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
      <div className="rounded-xl border border-mono-border bg-mono-card p-8 text-center text-sm text-mono-muted">
        Organisation configuration missing.
      </div>
    );
  }

  const userRoleNames = currentUser.roles.map((r) => r.role.name);
  const isAdmin = userRoleNames.includes("Admin");
  const isManagement =
    userRoleNames.includes("Management") || userRoleNames.includes("Director");
  const isReviewer = userRoleNames.some((r) =>
    ["HR", "TL", "Manager"].includes(r),
  );

  const where: any = {};

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
    where.cycle = { ...where.cycle, year: Number(sp.year) };
  }

  if (sp.month && sp.year) {
    const yearVal = Number(sp.year);
    const monthVal = Number(sp.month);
    const startDate = new Date(Date.UTC(yearVal, monthVal - 1, 1));
    const endDate = new Date(Date.UTC(yearVal, monthVal, 0, 23, 59, 59));
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
  const canViewCycleDetail = true; // All roles can click to view details of their respective appraisals

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm text-mono-muted dark:text-mono-muted font-medium">
            Review history and status logs of employee appraisal cycles.
          </p>
        </div>
      </div>

      <div className="border-b border-mono-border pb-4">
        <HistoryFilters
          defaultQ={sp.q}
          defaultMonth={sp.month}
          defaultYear={sp.year}
          defaultStage={sp.stage}
          showSearch={isAdmin || isManagement || isReviewer}
        />
      </div>

      <p className="text-xs font-semibold text-mono-muted">
        {appraisals.length} record{appraisals.length !== 1 ? "s" : ""} found
      </p>

      <Card className="border-0 shadow-sm overflow-hidden bg-mono-card">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <PerformanceTable className="w-full text-sm text-left min-w-[800px]">
              <PerformanceTableHeader>
                <PerformanceTableRow className="border-b border-mono-border bg-mono-soft dark:bg-mono-card text-xs font-bold text-mono-muted dark:text-mono-muted">
                  <PerformanceTableHead className="py-3.5 px-5 font-semibold">
                    Employee
                  </PerformanceTableHead>
                  {(isAdmin || isManagement) && (
                    <PerformanceTableHead className="px-5 py-3.5 font-semibold">
                      Emp #
                    </PerformanceTableHead>
                  )}
                  <PerformanceTableHead className="px-5 py-3.5 font-semibold">
                    Appraisal Cycle
                  </PerformanceTableHead>
                  <PerformanceTableHead className="px-5 py-3.5 font-semibold">
                    Due Date
                  </PerformanceTableHead>
                  <PerformanceTableHead className="px-5 py-3.5 font-semibold">
                    Stage
                  </PerformanceTableHead>
                  <PerformanceTableHead className="px-5 py-3.5 font-semibold">
                    Avg Rating
                  </PerformanceTableHead>
                  <PerformanceTableHead className="px-5 py-3.5 font-semibold">
                    Grade
                  </PerformanceTableHead>
                  <PerformanceTableHead className="px-5 py-3.5 font-semibold">
                    Slab
                  </PerformanceTableHead>
                  <PerformanceTableHead className="px-5 py-3.5 font-semibold">
                    Final Hike
                  </PerformanceTableHead>
                  {canViewCycleDetail && (
                    <PerformanceTableHead className="px-5 py-3.5 font-semibold text-right">
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
                      className="py-16 text-center text-mono-muted text-sm font-medium"
                    >
                      No appraisal records found.
                    </PerformanceTableCell>
                  </PerformanceTableRow>
                )}
                {appraisals.map((c) => {
                  const avg = getAverageReviewerRating(c.reviewerRatings);
                  const decision = c.hikeDecision;
                  const hikeFinal = c.hikeFinal as any;
                  const hikePercent = decision?.percent ?? hikeFinal?.percent;
                  const hikeAmount = decision?.amount ?? hikeFinal?.amount;

                  return (
                    <PerformanceTableRow
                      key={c.id}
                      className="hover:bg-mono-soft/30 dark:hover:bg-mono-card transition duration-150"
                    >
                      <PerformanceTableCell className="py-3.5 px-5 font-bold text-mono-text dark:text-mono-text">
                        {canViewEmployeeDetail ? (
                          <Link
                            href={`/hrms/employees/${c.employee.id}`}
                            className="text-mono-accent hover:underline"
                          >
                            {toTitleCase(c.employee.name)}
                          </Link>
                        ) : (
                          toTitleCase(c.employee.name)
                        )}
                      </PerformanceTableCell>
                      {(isAdmin || isManagement) && (
                        <PerformanceTableCell className="px-5 py-3.5 text-mono-muted font-semibold">
                          {c.employee.employeeNumber ?? "—"}
                        </PerformanceTableCell>
                      )}
                      <PerformanceTableCell className="px-5 py-3.5 text-mono-muted dark:text-mono-muted">
                        {c.cycle.name} ({c.cycle.year})
                      </PerformanceTableCell>
                      <PerformanceTableCell className="px-5 py-3.5 text-mono-muted font-semibold">
                        {new Date(c.dueDate).toLocaleDateString("en-IN")}
                      </PerformanceTableCell>
                      <PerformanceTableCell className="px-5 py-3.5">
                        <span
                          className={`text-[10px] font-bold rounded-full px-2.5 py-1 ${STAGE_COLORS[c.stage] ?? "bg-mono-soft text-mono-muted"}`}
                        >
                          {c.stage.replace(/_/g, " ")}
                        </span>
                      </PerformanceTableCell>
                      <PerformanceTableCell className="px-5 py-3.5 font-bold text-mono-text dark:text-mono-text">
                        {avg !== null ? avg.toFixed(2) : "—"}
                      </PerformanceTableCell>
                      <PerformanceTableCell className="px-5 py-3.5">
                        {decision?.slab?.grade ? (
                          <span className="text-xs font-bold text-mono-accent dark:text-mono-accent">
                            {decision.slab.grade}
                          </span>
                        ) : (
                          "—"
                        )}
                      </PerformanceTableCell>
                      <PerformanceTableCell className="px-5 py-3.5 text-mono-muted dark:text-mono-muted max-w-xs truncate">
                        {decision?.slab?.label ?? "—"}
                      </PerformanceTableCell>
                      <PerformanceTableCell className="px-5 py-3.5">
                        {hikeAmount !== undefined &&
                        hikePercent !== undefined ? (
                          <span className="font-bold text-[var(--mnx-success)] dark:text-[var(--mnx-success)] whitespace-nowrap">
                            +₹{Number(hikeAmount).toLocaleString("en-IN")} (
                            {hikePercent}%)
                          </span>
                        ) : (
                          "—"
                        )}
                      </PerformanceTableCell>
                      {canViewCycleDetail && (
                        <PerformanceTableCell className="px-5 py-3.5 text-right">
                          <Link
                            href={`/ams/appraisals/${c.id}`}
                            className="text-xs text-mono-accent hover:underline font-bold"
                          >
                            View details →
                          </Link>
                        </PerformanceTableCell>
                      )}
                    </PerformanceTableRow>
                  );
                })}
              </PerformanceTableBody>
            </PerformanceTable>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
