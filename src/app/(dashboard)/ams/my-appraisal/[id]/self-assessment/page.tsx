import { auth } from "@/lib/auth";
import { getNow } from "@/lib/clock";
import { getAppraisal, getSelfFormTemplate } from "@/modules/ams/service";
import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { SelfAssessmentForm } from "./self-assessment-form";
import type { AppraisalSelfFormTemplate, SelfAssessmentAnswers } from "@/modules/ams/criteria-config";
import { mapCriterionRowToPoint } from "@/modules/ams/form-template";
import { resolveSelfFormTemplate } from "@/modules/ams/self-form-template";
import type { CriterionPoint } from "@/modules/ams/types";

export default async function SelfAssessmentPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;
  const orgId = session.user.orgId!;

  const [appraisal, now, selfTemplate] = await Promise.all([
    getAppraisal(id),
    getNow(),
    getSelfFormTemplate(orgId),
  ]);

  if (!appraisal) notFound();
  if (appraisal.employee.id !== session.user.id) notFound();
  const deadlinePassed = appraisal.selfAssessmentDeadline
    ? now >= new Date(appraisal.selfAssessmentDeadline)
    : false;
  const canEdit = appraisal.stage === "SELF_ASSESSMENT_OPEN" && !deadlinePassed;

  if (appraisal.stage !== "SELF_ASSESSMENT_OPEN" && !appraisal.selfAssessment) {
    redirect("/ams/my-appraisal");
  }

  // Load criteria for SELF phase
  const criteriaRows = await db.appraisalCriterion.findMany({
    where: { orgId, phase: "SELF", parentId: null },
    orderBy: { order: "asc" },
    include: { children: { orderBy: { order: "asc" } } },
  });

  const categories: CriterionPoint[] = criteriaRows
    .filter((row) => row.kind === "CATEGORY")
    .map(mapCriterionRowToPoint);
  const resolvedSelfTemplate = resolveSelfFormTemplate(categories, selfTemplate as AppraisalSelfFormTemplate);

  const existingAnswers: SelfAssessmentAnswers | null = appraisal.selfAssessment?.answers
    ? {
        ...(appraisal.selfAssessment.answers as SelfAssessmentAnswers),
        employeeInfo: {},
      }
    : {
        version: "v2",
        employeeInfo: {},
        responses: {},
        categoryPoints: {},
        feedback: "",
      };

  return (
    <div className="space-y-6 max-w-4xl">
      <SelfAssessmentForm
        appraisalId={id}
        criteria={categories}
        initialAnswers={existingAnswers}
        selfAssessmentDeadline={appraisal.selfAssessmentDeadline?.toISOString() ?? null}
        serverNow={now.toISOString()}
        canEdit={canEdit}
        status={appraisal.selfAssessment?.status ?? null}
        template={resolvedSelfTemplate}
      />
    </div>
  );
}
