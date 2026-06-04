import type { CriterionPoint, CriterionSubItem } from "@/components/ams/criteria-points-form";
import {
  clampRating,
  getVisibleCriteriaForRole,
  REVIEWER_CRITERIA_SEED,
  SELF_RATING_CRITERIA_SEED,
  type AppraisalCriterionRecord,
  type AppraisalFormPhase,
  type EvaluatorRole,
  type ReviewerCriterionSeed,
} from "./criteria-config";

type CriterionChildRow = {
  id: string;
  code: string | null;
  label: string;
  weight: number;
  order: number;
};

type CriterionRowWithChildren = {
  id: string;
  code: string | null;
  label: string;
  description: string | null;
  weight: number;
  maxPoints: number;
  kind: string;
  reviewerOnly: boolean;
  questions: unknown;
  meta: unknown;
  children: CriterionChildRow[];
};

export function mapCriterionRowToPoint(row: CriterionRowWithChildren): CriterionPoint {
  const meta = (row.meta as Record<string, unknown> | null) ?? null;
  const subItems: CriterionSubItem[] = row.children.map((child) => ({
    id: child.id,
    code: child.code ?? child.id,
    label: child.label,
    weight: child.weight,
  }));

  return {
    id: row.id,
    code: row.code ?? row.id,
    label: row.label,
    description: row.description ?? "",
    weightage: row.weight,
    maxPoints: row.maxPoints,
    kind: row.kind,
    reviewerOnly: row.reviewerOnly,
    allowedRoles: Array.isArray(meta?.allowedEvaluatorRoles)
      ? meta.allowedEvaluatorRoles.filter((value): value is EvaluatorRole =>
          value === "MANAGEMENT" || value === "MANAGER" || value === "TL" || value === "HR"
        )
      : [],
    items: subItems,
    questions: Array.isArray(row.questions) ? row.questions.filter((value): value is string => typeof value === "string") : [],
    meta: null,
  };
}

export function toCriterionRecord(row: CriterionRowWithChildren): AppraisalCriterionRecord {
  return {
    id: row.id,
    code: row.code,
    label: row.label,
    description: row.description,
    weight: row.weight,
    maxPoints: row.maxPoints,
    kind: row.kind,
    reviewerOnly: row.reviewerOnly,
    meta: (row.meta as Record<string, unknown> | null) ?? null,
    children: row.children.map((child) => ({
      id: child.id,
      code: child.code,
      label: child.label,
      weight: child.weight,
      order: child.order,
    })),
  };
}

export function filterCriteriaPointsByRole(role: EvaluatorRole, rows: CriterionRowWithChildren[]): CriterionPoint[] {
  const visibleCodes = new Set(getVisibleCriteriaForRole(role, rows.map(toCriterionRecord)).map((criterion) => criterion.code));
  return rows
    .filter((row) => row.code && visibleCodes.has(row.code))
    .map(mapCriterionRowToPoint);
}

export function sanitizeSelfRatings(
  criteria: CriterionPoint[],
  ratings: Record<string, number>,
): Record<string, number> {
  const allowedIds = new Set(criteria.map((criterion) => criterion.id));
  return Object.entries(ratings).reduce<Record<string, number>>((acc, [criterionId, rating]) => {
    if (!allowedIds.has(criterionId)) return acc;
    acc[criterionId] = clampRating(rating);
    return acc;
  }, {});
}

export function sanitizeReviewerRatings(
  criteria: CriterionPoint[],
  subItemRatings: Record<string, Record<string, number>>,
  comments: Record<string, string>,
) {
  const allowedByCriterion = new Map(criteria.map((criterion) => [
    criterion.id,
    new Set(criterion.items.map((item) => item.id)),
  ]));

  const nextSubItemRatings: Record<string, Record<string, number>> = {};
  const categoryPoints: Record<string, number> = {};
  const nextComments: Record<string, string> = {};

  for (const criterion of criteria) {
    const allowedSubItems = allowedByCriterion.get(criterion.id) ?? new Set<string>();
    const incoming = subItemRatings[criterion.id] ?? {};
    const sanitized: Record<string, number> = {};
    for (const [subItemId, rating] of Object.entries(incoming)) {
      if (!allowedSubItems.has(subItemId)) continue;
      sanitized[subItemId] = clampRating(rating);
    }
    if (Object.keys(sanitized).length > 0) {
      nextSubItemRatings[criterion.id] = sanitized;
      const values = Object.values(sanitized);
      categoryPoints[criterion.id] = Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
    }

    const comment = comments[criterion.id]?.trim();
    if (comment) nextComments[criterion.id] = comment;
  }

  return {
    categoryPoints,
    subItemRatings: nextSubItemRatings,
    comments: nextComments,
  };
}

function buildCriterionSeed(seed: ReviewerCriterionSeed, phase: "REVIEWER" | "MANAGEMENT", order: number) {
  return {
    phase,
    code: seed.code,
    label: seed.title,
    description: seed.description,
    weight: seed.weightage,
    group: phase,
    order,
    maxPoints: 5,
    kind: "CATEGORY",
      reviewerOnly: true,
    meta: {
      allowedEvaluatorRoles: seed.allowedEvaluatorRoles,
      description: seed.description,
      weightage: seed.weightage,
    },
  };
}

export function buildSeedCriteriaForPhase(phase: AppraisalFormPhase) {
  if (phase === "SELF") {
    return SELF_RATING_CRITERIA_SEED.map((seed, index) => ({
      phase,
      code: seed.code,
      label: seed.title,
      description: `Employee self-rating for ${seed.title}.`,
      weight: seed.weightage,
      group: "SELF",
      order: index + 1,
      maxPoints: 5,
      kind: "CATEGORY",
      reviewerOnly: false,
      meta: {
        weightage: seed.weightage,
      },
      children: [],
    }));
  }

  return REVIEWER_CRITERIA_SEED.map((seed, index) => ({
    ...buildCriterionSeed(seed, phase, index + 1),
    children: seed.subCriteria.map((label, childIndex) => ({
      code: `${seed.code}-${childIndex + 1}`,
      label,
      weight: 1,
      group: phase,
      order: childIndex + 1,
      maxPoints: 0,
      kind: "CATEGORY",
      reviewerOnly: true,
      meta: null,
      description: null,
    })),
  }));
}
