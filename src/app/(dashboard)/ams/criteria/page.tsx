import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/rbac";
import { db } from "@/lib/db";
import { CriteriaClient } from "./criteria-client";
import { getSelfFormTemplate } from "@/modules/ams/service";
import { getAllowedRoles, type AppraisalSelfFormTemplate } from "@/modules/ams/criteria-config";

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

  const [selfRows, reviewerRows, mgmtRows, selfTemplate] = await Promise.all([
    loadPhase("SELF"),
    loadPhase("REVIEWER"),
    loadPhase("MANAGEMENT"),
    getSelfFormTemplate(orgId),
  ]);

  const editorKey = JSON.stringify({
    self: selfRows.map((row) => ({ id: row.id, order: row.order, children: row.children.map((child) => ({ id: child.id, order: child.order })) })),
    reviewer: reviewerRows.map((row) => ({ id: row.id, order: row.order, children: row.children.map((child) => ({ id: child.id, order: child.order })) })),
    management: mgmtRows.map((row) => ({ id: row.id, order: row.order, children: row.children.map((child) => ({ id: child.id, order: child.order })) })),
  });

  function toClientTopics(rows: typeof selfRows) {
    return rows.map((r) => ({
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
    <div className="max-w-6xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Appraisal Criteria</h1>
      <CriteriaClient
        key={editorKey}
        selfTemplate={selfTemplate as AppraisalSelfFormTemplate}
        selfTree={toClientTopics(selfRows)}
        reviewerTree={toClientTopics(reviewerRows)}
        mgmtTree={toClientTopics(mgmtRows)}
      />
    </div>
  );
}
