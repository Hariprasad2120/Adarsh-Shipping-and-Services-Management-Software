import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { HistoryFilters } from "./history-filters";
import { redirect } from "next/navigation";
import { History } from "lucide-react";

const STAGE_COLORS: Record<string, string> = {
  DUE_NOTIFIED: "bg-surface-container-high text-on-surface-variant dark:bg-slate-800 dark:text-slate-400",
  REVIEWERS_ASSIGNED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  SELF_ASSESSMENT_OPEN: "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
  REVIEWER_RATING: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  MANAGEMENT_REVIEW: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  MEETING_PENDING: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  MEETING_LIVE: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  HIKE_FINALISATION: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  CLOSED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
};

function toTitleCase(str?: string | null): string {
  if (!str) return "";
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
}

function getAverageReviewerRating(reviewerRatings: any[]) {
  if (!reviewerRatings || reviewerRatings.length === 0) return null;
  let totalScore = 0;
  let count = 0;
  for (const rr of reviewerRatings) {
    const ratingsObj = rr.ratings as any;
    const categoryPoints = ratingsObj?.categoryPoints || {};
    const values = Object.values(categoryPoints).map(Number).filter((v) => !isNaN(v));
    if (values.length > 0) {
      totalScore += values.reduce((a, b) => a + b, 0) / values.length;
      count++;
    }
  }
  return count > 0 ? (totalScore / count) : null;
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
  const session = await auth();
  if (!session) redirect("/login");

  const currentUser = await db.user.findUnique({
    where: { id: session.user.id },
    include: { roles: { include: { role: true } } },
  });
  if (!currentUser) redirect("/login");

  const orgId = currentUser.orgId;
  if (!orgId) {
    return (
      <div className="rounded-xl border border-outline-variant bg-surface p-8 text-center text-sm text-on-surface-variant">
        Organisation configuration missing.
      </div>
    );
  }

  const userRoleNames = currentUser.roles.map((r) => r.role.name);
  const isAdmin = userRoleNames.includes("Admin");
  const isManagement = userRoleNames.includes("Management") || userRoleNames.includes("Director");
  const isReviewer = userRoleNames.some((r) => ["HR", "TL", "Manager"].includes(r));

  const where: any = {};

  if (isAdmin || isManagement) {
    where.cycle = { orgId };
  } else if (isReviewer) {
    where.cycle = { orgId };
    where.OR = [
      { employeeId: session.user.id },
      { reviewers: { some: { userId: session.user.id } } }
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
          <p className="text-sm text-on-surface-variant dark:text-slate-400 font-medium">
            Review history and status logs of employee appraisal cycles.
          </p>
        </div>
      </div>

      <div className="border-b border-outline-variant pb-4">
        <HistoryFilters
          defaultQ={sp.q}
          defaultMonth={sp.month}
          defaultYear={sp.year}
          defaultStage={sp.stage}
          showSearch={isAdmin || isManagement || isReviewer}
        />
      </div>

      <p className="text-xs font-semibold text-slate-400">
        {appraisals.length} record{appraisals.length !== 1 ? "s" : ""} found
      </p>

      <Card className="border-0 shadow-sm overflow-hidden bg-surface">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left min-w-[800px]">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container-high dark:bg-slate-800/30 text-xs font-bold text-on-surface-variant dark:text-slate-400">
                  <th className="py-3.5 px-5 font-semibold">Employee</th>
                  {(isAdmin || isManagement) && (
                    <th className="px-5 py-3.5 font-semibold">Emp #</th>
                  )}
                  <th className="px-5 py-3.5 font-semibold">Appraisal Cycle</th>
                  <th className="px-5 py-3.5 font-semibold">Due Date</th>
                  <th className="px-5 py-3.5 font-semibold">Stage</th>
                  <th className="px-5 py-3.5 font-semibold">Avg Rating</th>
                  <th className="px-5 py-3.5 font-semibold">Grade</th>
                  <th className="px-5 py-3.5 font-semibold">Slab</th>
                  <th className="px-5 py-3.5 font-semibold">Final Hike</th>
                  {canViewCycleDetail && (
                    <th className="px-5 py-3.5 font-semibold text-right">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/60 font-medium text-slate-700 dark:text-slate-300">
                {appraisals.length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-16 text-center text-slate-400/80 text-sm font-medium">
                      No appraisal records found.
                    </td>
                  </tr>
                )}
                {appraisals.map((c) => {
                  const avg = getAverageReviewerRating(c.reviewerRatings);
                  const decision = c.hikeDecision;
                  const hikeFinal = c.hikeFinal as any;
                  const hikePercent = decision?.percent ?? hikeFinal?.percent;
                  const hikeAmount = decision?.amount ?? hikeFinal?.amount;

                  return (
                    <tr key={c.id} className="hover:bg-surface-container-high/30 dark:hover:bg-slate-800/5 transition duration-150">
                      <td className="py-3.5 px-5 font-bold text-slate-900 dark:text-white">
                        {canViewEmployeeDetail ? (
                          <Link href={`/hrms/employees/${c.employee.id}`} className="text-[#00cec4] hover:underline">
                            {toTitleCase(c.employee.name)}
                          </Link>
                        ) : (
                          toTitleCase(c.employee.name)
                        )}
                      </td>
                      {(isAdmin || isManagement) && (
                        <td className="px-5 py-3.5 text-on-surface-variant font-semibold">
                          {c.employee.employeeNumber ?? "—"}
                        </td>
                      )}
                      <td className="px-5 py-3.5 text-on-surface-variant dark:text-slate-400">
                        {c.cycle.name} ({c.cycle.year})
                      </td>
                      <td className="px-5 py-3.5 text-on-surface-variant font-semibold">
                        {new Date(c.dueDate).toLocaleDateString("en-IN")}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`text-[10px] font-bold rounded-full px-2.5 py-1 ${STAGE_COLORS[c.stage] ?? "bg-surface-container-high text-on-surface-variant"}`}>
                          {c.stage.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-bold text-slate-800 dark:text-slate-200">
                        {avg !== null ? avg.toFixed(2) : "—"}
                      </td>
                      <td className="px-5 py-3.5">
                        {decision?.slab?.grade ? (
                          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                            {decision.slab.grade}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-on-surface-variant dark:text-slate-400 max-w-xs truncate">
                        {decision?.slab?.label ?? "—"}
                      </td>
                      <td className="px-5 py-3.5">
                        {hikeAmount !== undefined && hikePercent !== undefined ? (
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                            +₹{Number(hikeAmount).toLocaleString("en-IN")} ({hikePercent}%)
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      {canViewCycleDetail && (
                        <td className="px-5 py-3.5 text-right">
                          <Link href={`/ams/appraisals/${c.id}`} className="text-xs text-[#00cec4] hover:underline font-bold">
                            View details →
                          </Link>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
