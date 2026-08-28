import { db } from "@/lib/db";

const STAGE_ORDER = [
  "DUE_NOTIFIED",
  "REVIEWERS_ASSIGNED",
  "SELF_ASSESSMENT_OPEN",
  "REVIEWER_RATING",
  "MANAGEMENT_REVIEW",
  "DATE_VOTING",
  "MEETING_PENDING",
  "MEETING_LIVE",
  "HIKE_FINALISATION",
  "CLOSED",
] as const;

function percentile(sortedMs: number[], p: number): number | null {
  if (sortedMs.length === 0) return null;
  const index = Math.min(sortedMs.length - 1, Math.floor((p / 100) * sortedMs.length));
  return sortedMs[index];
}

function toDays(ms: number): number {
  return Math.round((ms / (24 * 60 * 60 * 1000)) * 10) / 10;
}

export type AppraisalAnalytics = {
  totalAppraisals: number;
  funnel: { stage: string; label: string; count: number }[];
  turnaround: { transition: string; medianDays: number | null; p90Days: number | null; samples: number }[];
  gradeMix: { grade: string; count: number }[];
  hikeDistribution: { bucket: string; count: number }[];
  reviewerLoad: { name: string; assigned: number; submitted: number }[];
  arrears: { status: string; count: number; amount: number }[];
};

export async function getAppraisalAnalytics(orgId: string, year?: number): Promise<AppraisalAnalytics> {
  const cycleWhere = year ? { orgId, year } : { orgId };
  const cycles = await db.appraisalCycle.findMany({ where: cycleWhere, select: { id: true } });
  const cycleIds = cycles.map((cycle) => cycle.id);
  if (cycleIds.length === 0) {
    return {
      totalAppraisals: 0,
      funnel: STAGE_ORDER.map((stage) => ({ stage, label: humanize(stage), count: 0 })),
      turnaround: [],
      gradeMix: [],
      hikeDistribution: [],
      reviewerLoad: [],
      arrears: [],
    };
  }

  const [appraisals, auditRows, hikeRows, reviewerRows, arrearGroups] = await Promise.all([
    db.appraisal.findMany({ where: { cycleId: { in: cycleIds } }, select: { id: true, stage: true } }),
    db.appraisalAuditLog.findMany({
      where: { appraisal: { cycleId: { in: cycleIds } }, action: "STAGE_TRANSITION" },
      select: { appraisalId: true, fromStage: true, toStage: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    db.hikeDecision.findMany({
      where: { appraisal: { cycleId: { in: cycleIds } } },
      select: { suggestedGrade: true, percent: true },
    }),
    db.appraisalReviewer.findMany({
      where: { appraisal: { cycleId: { in: cycleIds } }, kind: { not: "MANAGEMENT" } },
      select: {
        user: { select: { name: true } },
        ratings: { select: { status: true } },
      },
    }),
    db.appraisalArrear.groupBy({
      by: ["status"],
      where: { appraisal: { cycleId: { in: cycleIds } } },
      _count: { _all: true },
      _sum: { amount: true },
    }),
  ]);

  // Funnel
  const stageCount = new Map<string, number>();
  for (const appraisal of appraisals) {
    stageCount.set(appraisal.stage, (stageCount.get(appraisal.stage) ?? 0) + 1);
  }
  const funnel = STAGE_ORDER.map((stage) => ({
    stage,
    label: humanize(stage),
    count: stageCount.get(stage) ?? 0,
  }));

  // Turnaround per transition
  const transitionSamples = new Map<string, number[]>();
  const byAppraisal = new Map<string, { toStage: string; at: number }[]>();
  for (const row of auditRows) {
    const list = byAppraisal.get(row.appraisalId) ?? [];
    list.push({ toStage: row.toStage, at: row.createdAt.getTime() });
    byAppraisal.set(row.appraisalId, list);
  }
  for (const events of byAppraisal.values()) {
    for (let i = 1; i < events.length; i++) {
      const key = `${events[i - 1].toStage} → ${events[i].toStage}`;
      const delta = events[i].at - events[i - 1].at;
      if (delta <= 0) continue;
      const arr = transitionSamples.get(key) ?? [];
      arr.push(delta);
      transitionSamples.set(key, arr);
    }
  }
  const turnaround = [...transitionSamples.entries()]
    .map(([transition, samples]) => {
      const sorted = [...samples].sort((a, b) => a - b);
      return {
        transition,
        medianDays: sorted.length ? toDays(percentile(sorted, 50)!) : null,
        p90Days: sorted.length ? toDays(percentile(sorted, 90)!) : null,
        samples: sorted.length,
      };
    })
    .sort((a, b) => b.samples - a.samples);

  // Grade mix
  const gradeCount = new Map<string, number>();
  for (const row of hikeRows) {
    const grade = row.suggestedGrade ?? "Ungraded";
    gradeCount.set(grade, (gradeCount.get(grade) ?? 0) + 1);
  }
  const gradeMix = [...gradeCount.entries()]
    .map(([grade, count]) => ({ grade, count }))
    .sort((a, b) => b.count - a.count);

  // Hike % distribution
  const buckets = [
    { bucket: "0%", test: (p: number) => p <= 0 },
    { bucket: "1–10%", test: (p: number) => p > 0 && p <= 10 },
    { bucket: "11–20%", test: (p: number) => p > 10 && p <= 20 },
    { bucket: "21–30%", test: (p: number) => p > 20 && p <= 30 },
    { bucket: "30%+", test: (p: number) => p > 30 },
  ];
  const hikeDistribution = buckets.map(({ bucket, test }) => ({
    bucket,
    count: hikeRows.filter((row) => test(row.percent)).length,
  }));

  // Reviewer load
  const loadByName = new Map<string, { assigned: number; submitted: number }>();
  for (const row of reviewerRows) {
    const name = row.user?.name ?? "Unknown";
    const entry = loadByName.get(name) ?? { assigned: 0, submitted: 0 };
    entry.assigned += 1;
    if (row.ratings.some((rating) => rating.status === "SUBMITTED")) entry.submitted += 1;
    loadByName.set(name, entry);
  }
  const reviewerLoad = [...loadByName.entries()]
    .map(([name, value]) => ({ name, ...value }))
    .sort((a, b) => b.assigned - a.assigned);

  const arrears = arrearGroups.map((group) => ({
    status: group.status,
    count: group._count._all,
    amount: group._sum.amount ?? 0,
  }));

  return {
    totalAppraisals: appraisals.length,
    funnel,
    turnaround,
    gradeMix,
    hikeDistribution,
    reviewerLoad,
    arrears,
  };
}

function humanize(stage: string): string {
  return stage
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
