import {
  buildQuestionKey,
  clampRating,
  getVisibleCriteriaForRole,
  REVIEWER_CRITERIA_SEED,
  SELF_RATING_CRITERIA_SEED,
  type AppraisalQuestionDefinition,
  type AppraisalCriterionRecord,
  type AppraisalFormPhase,
  type EvaluatorRole,
  type QuestionResponse,
  type ReviewerCriterionSeed,
} from "./criteria-config";
import type { CriterionPoint, CriterionSubItem } from "./types";

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

type CriterionQuestionMeta = {
  id?: unknown;
  prompt?: unknown;
  questionType?: unknown;
  options?: unknown;
  responseConfig?: unknown;
};

function normalizeQuestionOptions(options: unknown) {
  if (!Array.isArray(options)) return undefined;
  const normalized = options
    .map((option, index) => {
      if (!option || typeof option !== "object") return null;
      const raw = option as Record<string, unknown>;
      const label = typeof raw.label === "string" ? raw.label.trim() : "";
      if (!label) return null;
      const value = typeof raw.id === "string" && raw.id.trim()
        ? raw.id
        : `option-${index + 1}`;
      return { value, label };
    })
    .filter((option): option is { value: string; label: string } => option !== null);

  return normalized.length > 0 ? normalized : undefined;
}

function mapQuestionMetaToDefinition(
  question: CriterionQuestionMeta,
  fallbackIndex: number,
  fallbackId?: string,
): AppraisalQuestionDefinition | null {
  const prompt = typeof question.prompt === "string" ? question.prompt.trim() : "";
  if (!prompt) return null;

  const questionType = typeof question.questionType === "string" ? question.questionType : "short_answer";
  const questionId = typeof question.id === "string" && question.id.trim()
    ? question.id
    : fallbackId || `question-${fallbackIndex + 1}`;

  switch (questionType) {
    case "paragraph":
      return { id: questionId, prompt, type: "textarea" };
    case "multiple_choice":
    case "dropdown": {
      const options = normalizeQuestionOptions(question.options);
      return {
        id: questionId,
        prompt,
        type: "radio",
        options,
      };
    }
    case "checkboxes": {
      const options = normalizeQuestionOptions(question.options);
      return {
        id: questionId,
        prompt,
        type: options ? "radio" : "textarea",
        options,
        allowExplanation: Boolean(options),
      };
    }
    case "slider":
    case "linear_scale":
    case "rating": {
      const responseConfig = question.responseConfig && typeof question.responseConfig === "object"
        ? question.responseConfig as Record<string, unknown>
        : null;
      const startLabel = typeof responseConfig?.startLabel === "string" ? responseConfig.startLabel.trim() : "";
      const endLabel = typeof responseConfig?.endLabel === "string" ? responseConfig.endLabel.trim() : "";
      const increment = typeof responseConfig?.increment === "number" ? responseConfig.increment : 5;
      const rangeHint = [startLabel, endLabel].filter(Boolean).join(" to ");
      return {
        id: questionId,
        prompt,
        type: "number",
        minValue: 1,
        maxValue: increment,
        startLabel: startLabel || undefined,
        endLabel: endLabel || undefined,
        placeholder: rangeHint ? `${rangeHint} (1-${increment})` : `Enter a value from 1 to ${increment}`,
      };
    }
    case "date":
      return { id: questionId, prompt, type: "text", placeholder: "DD/MM/YYYY" };
    case "time":
      return { id: questionId, prompt, type: "text", placeholder: "HH:MM" };
    case "short_answer":
    default:
      return { id: questionId, prompt, type: "text" };
  }
}

function normalizeQuestionItems(
  meta: Record<string, unknown> | null,
  prompts: string[],
  fallbackChildren: { id: string; label: string }[] = [],
): AppraisalQuestionDefinition[] {
  const questionItems = Array.isArray(meta?.questionItems)
    ? meta.questionItems
        .map((question, index) =>
          mapQuestionMetaToDefinition(
            (question as CriterionQuestionMeta) ?? {},
            index,
            fallbackChildren[index]?.id,
          )
        )
        .filter((question): question is AppraisalQuestionDefinition => question !== null)
    : [];

  if (questionItems.length > 0) return questionItems;

  // If the criterion has a topic-level questionType configured, use it with children as prompts
  const topicQuestionType = typeof meta?.questionType === "string" ? meta.questionType : null;
  if (topicQuestionType && fallbackChildren.length > 0) {
    return fallbackChildren
      .map((child, index) =>
        mapQuestionMetaToDefinition(
          {
            id: child.id,
            prompt: child.label,
            questionType: topicQuestionType,
            options: [],
          },
          index,
          child.id,
        )
      )
      .filter((question): question is AppraisalQuestionDefinition => question !== null);
  }

  return prompts
    .map<AppraisalQuestionDefinition | null>((prompt, index) => {
      const normalizedPrompt = prompt.trim();
      if (!normalizedPrompt) return null;
      return {
        id: buildQuestionKey("legacy", `question-${index + 1}`),
        prompt: normalizedPrompt,
        type: "text",
      };
    })
    .filter((question): question is AppraisalQuestionDefinition => question !== null);
}

export function mapCriterionRowToPoint(row: CriterionRowWithChildren): CriterionPoint {
  const meta = (row.meta as Record<string, unknown> | null) ?? null;
  const prompts = Array.isArray(row.questions) ? row.questions.filter((value): value is string => typeof value === "string") : [];
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
    questions: prompts,
    questionItems: normalizeQuestionItems(meta, prompts, row.children.map((child) => ({ id: child.id, label: child.label }))),
    meta,
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
  responses: Record<string, Record<string, QuestionResponse>>,
  comments: Record<string, string>,
) {
  const allowedNumericByCriterion = new Map(criteria.map((criterion) => [
    criterion.id,
    new Set(
      (criterion.questionItems.length > 0
        ? criterion.questionItems.filter((question) => question.type === "number").map((question) => question.id)
        : criterion.items.map((item) => item.id)),
    ),
  ]));
  const allowedResponseByCriterion = new Map(criteria.map((criterion) => [
    criterion.id,
    new Set(
      (criterion.questionItems.length > 0
        ? criterion.questionItems.map((question) => question.id)
        : criterion.items.map((item) => item.id)),
    ),
  ]));

  const nextSubItemRatings: Record<string, Record<string, number>> = {};
  const nextResponses: Record<string, Record<string, QuestionResponse>> = {};
  const categoryPoints: Record<string, number> = {};
  const nextComments: Record<string, string> = {};

  for (const criterion of criteria) {
    const allowedSubItems = allowedNumericByCriterion.get(criterion.id) ?? new Set<string>();
    const allowedResponses = allowedResponseByCriterion.get(criterion.id) ?? new Set<string>();
    const incoming = subItemRatings[criterion.id] ?? {};
    const incomingResponses = responses[criterion.id] ?? {};
    const sanitized: Record<string, number> = {};
    const sanitizedResponses: Record<string, QuestionResponse> = {};
    for (const [subItemId, rating] of Object.entries(incoming)) {
      if (!allowedSubItems.has(subItemId)) continue;
      sanitized[subItemId] = clampRating(rating);
    }
    for (const [questionId, response] of Object.entries(incomingResponses)) {
      if (!allowedResponses.has(questionId) || !response || typeof response !== "object") continue;
      const normalized: QuestionResponse = {
        value: typeof response.value === "string" ? response.value : undefined,
        option: typeof response.option === "string" ? response.option : undefined,
        explanation: typeof response.explanation === "string" ? response.explanation : undefined,
      };
      if (normalized.value || normalized.option || normalized.explanation) {
        sanitizedResponses[questionId] = normalized;
      }
    }
    if (Object.keys(sanitized).length > 0) {
      nextSubItemRatings[criterion.id] = sanitized;
      const values = Object.values(sanitized);
      categoryPoints[criterion.id] = Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
    }
    if (Object.keys(sanitizedResponses).length > 0) {
      nextResponses[criterion.id] = sanitizedResponses;
    }

    const comment = comments[criterion.id]?.trim();
    if (comment) nextComments[criterion.id] = comment;
  }

  return {
    categoryPoints,
    subItemRatings: nextSubItemRatings,
    responses: nextResponses,
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
