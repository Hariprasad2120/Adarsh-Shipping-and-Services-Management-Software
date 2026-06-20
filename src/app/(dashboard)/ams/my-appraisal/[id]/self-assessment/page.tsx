import { auth } from "@/lib/auth";
import { getNow } from "@/lib/clock";
import { CycleProgressCard } from "@/components/ams/cycle-progress-card";
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
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] xl:items-start">
        <CycleProgressCard
          stage={appraisal.stage}
          cycleName={appraisal.cycle.name}
          cycleYear={appraisal.cycle.year}
          reviewers={appraisal.reviewers.map((reviewer) => ({
            kind: reviewer.kind,
            name: reviewer.user.name,
            availabilityStatus: reviewer.availabilityStatus,
          }))}
          selfAssessment={
            appraisal.selfAssessment
              ? {
                  submittedAt:
                    appraisal.selfAssessment.submittedAt?.toISOString() ?? null,
                  editCount: appraisal.selfAssessment.editCount ?? 0,
                }
              : null
          }
          management={{
            claimedByName:
              appraisal.reviewers.find((reviewer) => reviewer.kind === "MANAGEMENT")?.user.name ??
              null,
            submitted: appraisal.managementReviews.length > 0,
          }}
          meeting={{
            scheduledAt: appraisal.meeting?.scheduledAt.toISOString() ?? null,
            hasMinutes: (appraisal.meeting?.minutes.length ?? 0) > 0,
          }}
        />

        <div className="card-left-accent rounded-[24px] border border-outline-variant/35 bg-surface p-6">
          <h2 className="ds-h2 text-on-surface">Self-Assessment Summary</h2>
          <div className="mt-4 space-y-2 text-sm text-on-surface-variant">
            <p className="text-base font-semibold text-on-surface">{appraisal.employee.name}</p>
            <p>{appraisal.employee.designation ?? "No designation"}</p>
            <p>
              {appraisal.cycle.name} {appraisal.cycle.year}
            </p>
            <p>
              Current stage:{" "}
              <span className="font-medium text-on-surface">
                {appraisal.stage.replace(/_/g, " ")}
              </span>
            </p>
            {appraisal.selfAssessmentDeadline ? (
              <p>
                Self-assessment deadline:{" "}
                <span className="font-medium text-on-surface">
                  {new Date(appraisal.selfAssessmentDeadline).toLocaleDateString("en-IN")}
                </span>
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="max-w-4xl">
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
    </div>
  );
}
