import Link from "next/link";
import { auth } from "@/lib/auth";
import { getNow } from "@/lib/clock";
import { getAppraisal, getSelfFormTemplate } from "@/modules/ams/service";
import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { SelfAssessmentForm } from "./self-assessment-form";
import type { CriterionPoint } from "@/components/ams/criteria-points-form";
import type { AppraisalSelfFormTemplate, SelfAssessmentAnswers } from "@/modules/ams/criteria-config";
import { mapCriterionRowToPoint } from "@/modules/ams/form-template";

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
  if (appraisal.stage !== "SELF_ASSESSMENT_OPEN") {
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

  const existingAnswers: SelfAssessmentAnswers | null = appraisal.selfAssessment?.answers
    ? {
        ...(appraisal.selfAssessment.answers as SelfAssessmentAnswers),
        employeeInfo: {
          name: appraisal.employee.name,
          department: appraisal.employee.department?.name ?? "",
          position: appraisal.employee.designation ?? "",
          "years-of-association": appraisal.employee.employmentRecord?.joinDate
            ? String(
                Math.max(
                  0,
                  new Date(now).getFullYear() - new Date(appraisal.employee.employmentRecord.joinDate).getFullYear(),
                ),
              )
            : "",
          ...((appraisal.selfAssessment.answers as SelfAssessmentAnswers).employeeInfo ?? {}),
        },
      }
    : {
        version: "v2",
        employeeInfo: {
          name: appraisal.employee.name,
          department: appraisal.employee.department?.name ?? "",
          position: appraisal.employee.designation ?? "",
          "years-of-association": appraisal.employee.employmentRecord?.joinDate
            ? String(
                Math.max(
                  0,
                  new Date(now).getFullYear() - new Date(appraisal.employee.employmentRecord.joinDate).getFullYear(),
                ),
              )
            : "",
        },
        responses: {},
        categoryPoints: {},
        feedback: "",
      };

  const editCount = (appraisal.selfAssessment as { editCount?: number } | null)?.editCount ?? 0;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/ams/my-appraisal" className="text-sm text-gray-500 hover:text-gray-700">
          {"< My Appraisal"}
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-2xl font-bold text-gray-900">Self Assessment</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
        <p className="text-sm text-gray-500">{appraisal.cycle.name}</p>
        <p className="text-base font-semibold text-gray-900 mt-0.5">
          {appraisal.employee.name}
        </p>
        {editCount > 0 && (
          <p className="text-xs text-gray-400 mt-1">Edited {editCount} time{editCount !== 1 ? "s" : ""}</p>
        )}
      </div>

      <SelfAssessmentForm
        appraisalId={id}
        criteria={categories}
        initialAnswers={existingAnswers}
        selfAssessmentDeadline={appraisal.selfAssessmentDeadline?.toISOString() ?? null}
        serverNow={now.toISOString()}
        status={appraisal.selfAssessment?.status ?? null}
        template={selfTemplate as AppraisalSelfFormTemplate}
      />
    </div>
  );
}
