import { unstable_cache, revalidateTag } from "next/cache";
import { db } from "@/lib/db";

const CRITERIA_SELECT = {
  id: true,
  code: true,
  label: true,
  description: true,
  weight: true,
  maxPoints: true,
  kind: true,
  reviewerOnly: true,
  questions: true,
  meta: true,
  children: {
    orderBy: { order: "asc" as const },
    select: { id: true, code: true, label: true, weight: true, order: true },
  },
} as const;

function makeCriteriaLoader(orgId: string, phase: string) {
  return unstable_cache(
    () =>
      db.appraisalCriterion.findMany({
        where: { orgId, phase, parentId: null },
        orderBy: { order: "asc" },
        select: CRITERIA_SELECT,
      }),
    [`ams.criteria.${phase.toLowerCase()}`, orgId],
    { tags: [`ams:criteria:${orgId}`], revalidate: 300 },
  );
}

export function loadSelfCriteria(orgId: string) {
  return makeCriteriaLoader(orgId, "SELF")();
}

export function loadReviewerCriteria(orgId: string) {
  return makeCriteriaLoader(orgId, "REVIEWER")();
}

// Invalidate all criteria phases for an org (called after any criteria mutation)
export function invalidateReviewerCriteria(orgId: string) {
  revalidateTag(`ams:criteria:${orgId}`, "max");
}
