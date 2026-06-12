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
      return { startLabel: "Low", endLabel: "High" };
    case "linear_scale":
      return { startLabel: "Low", endLabel: "High" };
    case "rating":
      return { startLabel: "Poor", endLabel: "Excellent" };
    default:
      return { startLabel: "", endLabel: "" };
  }
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
    return rows.map((r) => ({
      ...(function () {
        const meta = (r.meta as Record<string, unknown> | null) ?? null;
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
          },
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
        meta: (r.meta as Record<string, unknown> | null) ?? null,
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
    }));
  }

  return (
    <CriteriaClient
      selfTree={toClientTopics(selfRows)}
      reviewerTree={toClientTopics(reviewerRows)}
      mgmtTree={toClientTopics(mgmtRows)}
    />
  );
}
