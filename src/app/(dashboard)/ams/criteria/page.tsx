import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/rbac";
import { db } from "@/lib/db";
import { CriteriaClient } from "./criteria-client";
import { getAllowedRoles } from "@/modules/ams/criteria-config";

function isQuestionType(value: unknown): value is
  | "multiple_choice"
  | "checkboxes"
  | "dropdown"
  | "short_answer"
  | "paragraph"
  | "slider"
  | "linear_scale"
  | "rating"
  | "date"
  | "time" {
  return [
    "multiple_choice",
    "checkboxes",
    "dropdown",
    "short_answer",
    "paragraph",
    "slider",
    "linear_scale",
    "rating",
    "date",
    "time",
  ].includes(String(value));
}

function getDefaultResponseConfig(
  type:
    | "multiple_choice"
    | "checkboxes"
    | "dropdown"
    | "short_answer"
    | "paragraph"
    | "slider"
    | "linear_scale"
    | "rating"
    | "date"
    | "time",
) {
  switch (type) {
    case "slider":
      return { startLabel: "Low", endLabel: "High", increment: 5 };
    case "linear_scale":
      return { startLabel: "Low", endLabel: "High", increment: 5 };
    case "rating":
      return { startLabel: "Poor", endLabel: "Excellent", increment: 5 };
    default:
      return { startLabel: "", endLabel: "", increment: 5 };
  }
}

type QuestionItem = {
  id: string;
  prompt: string;
  questionType:
  | "multiple_choice"
  | "checkboxes"
  | "dropdown"
  | "short_answer"
  | "paragraph"
  | "slider"
  | "linear_scale"
  | "rating"
  | "date"
  | "time";
  options: { id: string; label: string }[];
  responseConfig: {
    startLabel: string;
    endLabel: string;
    increment: number;
  };
};

function parseQuestionItems(
  value: unknown,
  fallbackType:
    | "multiple_choice"
    | "checkboxes"
    | "dropdown"
    | "short_answer"
    | "paragraph"
    | "slider"
    | "linear_scale"
    | "rating"
    | "date"
    | "time",
  fallbackChildren: { id: string; label: string }[],
): QuestionItem[] {
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) => {
      if (!entry || typeof entry !== "object") return [];
      const raw = entry as Record<string, unknown>;
      const questionType = isQuestionType(raw.questionType) ? raw.questionType : fallbackType;
      const rawResponseConfig =
        raw.responseConfig && typeof raw.responseConfig === "object"
          ? (raw.responseConfig as Record<string, unknown>)
          : null;

      return [{
        id: typeof raw.id === "string" && raw.id.length > 0 ? raw.id : `question-${index + 1}`,
        prompt: typeof raw.prompt === "string" ? raw.prompt : "",
        questionType,
        options: Array.isArray(raw.options)
          ? raw.options.flatMap((option, optionIndex) => {
            if (!option || typeof option !== "object") return [];
            const rawOption = option as Record<string, unknown>;
            return [{
              id: typeof rawOption.id === "string" && rawOption.id.length > 0 ? rawOption.id : `option-${optionIndex + 1}`,
              label: typeof rawOption.label === "string" ? rawOption.label : "",
            }];
          })
          : [],
        responseConfig: {
          startLabel:
            typeof rawResponseConfig?.startLabel === "string"
              ? rawResponseConfig.startLabel
              : getDefaultResponseConfig(questionType).startLabel,
          endLabel:
            typeof rawResponseConfig?.endLabel === "string"
              ? rawResponseConfig.endLabel
              : getDefaultResponseConfig(questionType).endLabel,
          increment:
            typeof rawResponseConfig?.increment === "number" && Number.isFinite(rawResponseConfig.increment)
              ? Math.max(2, Math.round(rawResponseConfig.increment))
              : getDefaultResponseConfig(questionType).increment,
        },
      }];
    });
  }

  return fallbackChildren.map((child, index) => ({
    id: child.id || `question-${index + 1}`,
    prompt: child.label,
    questionType: fallbackType,
    options: [],
    responseConfig: getDefaultResponseConfig(fallbackType),
  }));
}

export default async function CriteriaPage() {
  const session = await auth();
  if (!session) redirect("/login");
  await requirePermission(session.user.id, "ams.criteria.manage");

  const orgId = session.user.orgId!;

  const loadPhase = (phase: string) =>
    db.appraisalCriterion.findMany({
      where: { orgId, phase, parentId: null },
      orderBy: { order: "asc" },
      include: { children: { orderBy: { order: "asc" } } },
    });

  const [selfRows, reviewerRows, mgmtRows] = await Promise.all([
    loadPhase("SELF"),
    loadPhase("REVIEWER"),
    loadPhase("MANAGEMENT"),
  ]);

  function toClientTopics(rows: typeof selfRows) {
    return rows.map((r) => {
      const meta = (r.meta as Record<string, unknown> | null) ?? null;
      return ({
        ...(function () {
          const questionType = isQuestionType(meta?.questionType) ? meta.questionType : "multiple_choice";
          const rawResponseConfig =
            meta?.responseConfig && typeof meta.responseConfig === "object"
              ? (meta.responseConfig as Record<string, unknown>)
              : null;
          return {
            questionType,
            responseConfig: {
              startLabel:
                typeof rawResponseConfig?.startLabel === "string"
                  ? rawResponseConfig.startLabel
                  : getDefaultResponseConfig(questionType).startLabel,
              endLabel:
                typeof rawResponseConfig?.endLabel === "string"
                  ? rawResponseConfig.endLabel
                  : getDefaultResponseConfig(questionType).endLabel,
              increment:
                typeof rawResponseConfig?.increment === "number" && Number.isFinite(rawResponseConfig.increment)
                  ? Math.max(2, Math.round(rawResponseConfig.increment))
                  : getDefaultResponseConfig(questionType).increment,
            },
            questionItems: parseQuestionItems(
              meta?.questionItems,
              questionType,
              r.children.map((child) => ({ id: child.id, label: child.label })),
            ),
          };
        })(),
        id: r.id,
        label: r.label,
        code: r.code ?? "",
        description: r.description ?? "",
        weight: r.weight,
        maxPoints: r.maxPoints,
        kind: r.kind,
        reviewerOnly: r.reviewerOnly,
        allowedRoles: getAllowedRoles({
          id: r.id,
          code: r.code,
          label: r.label,
          description: r.description,
          weight: r.weight,
          maxPoints: r.maxPoints,
          kind: r.kind,
          reviewerOnly: r.reviewerOnly,
          meta,
          children: [],
        }),
        questions: (r.questions as string[] | null) ?? [],
        order: r.order,
        subtopics: r.children.map((c) => ({
          id: c.id,
          code: c.code ?? "",
          label: c.label,
          weight: c.weight,
          order: c.order,
          maxPoints: c.maxPoints,
        })),
      });
    });
  }

  return (
    <CriteriaClient
      selfTree={toClientTopics(selfRows)}
      reviewerTree={toClientTopics(reviewerRows)}
      mgmtTree={toClientTopics(mgmtRows)}
    />
  );
}
