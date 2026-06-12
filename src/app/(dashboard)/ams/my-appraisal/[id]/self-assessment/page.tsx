import Link from "next/link";
import { auth } from "@/lib/auth";
import { getNow } from "@/lib/clock";
import { getAppraisal, getSelfFormTemplate } from "@/modules/ams/service";
import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { SelfAssessmentForm } from "./self-assessment-form";
import type { AppraisalSelfFormTemplate, SelfAssessmentAnswers } from "@/modules/ams/criteria-config";
import { mapCriterionRowToPoint } from "@/modules/ams/form-template";
import type { CriterionPoint } from "@/modules/ams/types";
import type { EmployeeSummaryField } from "@/components/ams/criteria-points-form";

function formatDate(value: Date | null | undefined) {
  if (!value) return "-";
  return value.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatYearsOfAssociation(joinDate: Date | null | undefined, now: Date) {
  if (!joinDate) return "-";
  const diffMs = now.getTime() - joinDate.getTime();
  if (diffMs <= 0) return "Less than 1 month";
  const totalMonths = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.4375)));
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  if (years === 0) return `${months} month${months === 1 ? "" : "s"}`;
  if (months === 0) return `${years} year${years === 1 ? "" : "s"}`;
  return `${years} year${years === 1 ? "" : "s"} ${months} month${months === 1 ? "" : "s"}`;
}

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

  const editCount = (appraisal.selfAssessment as { editCount?: number } | null)?.editCount ?? 0;
  const employeeSummary: EmployeeSummaryField[] = [
    { label: "Employee", value: appraisal.employee.name },
    { label: "Department", value: appraisal.employee.department?.name ?? "-" },
    { label: "Designation", value: appraisal.employee.designation ?? "-" },
    { label: "Joining date", value: formatDate(appraisal.employee.employmentRecord?.joinDate) },
    { label: "Years of association", value: formatYearsOfAssociation(appraisal.employee.employmentRecord?.joinDate, now) },
    { label: "Appraisal cycle", value: appraisal.cycle.name },
    { label: "Due date", value: formatDate(appraisal.dueDate) },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/ams/my-appraisal" className="text-sm text-gray-500 hover:text-gray-700">
          {"< My Appraisal"}
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="ds-h1 text-gray-900">Self Assessment</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
        <p className="text-sm text-gray-500">{appraisal.cycle.name}</p>
        <p className="text-base font-semibold text-gray-900 mt-0.5">
          {appraisal.employee.name}
        </p>
        {editCount > 0 && (
          <p className="text-xs text-gray-400 mt-1">Edited {editCount} time{editCount !== 1 ? "s" : ""}</p>
        )}
        {!canEdit && appraisal.selfAssessment && (
          <p className="text-xs text-gray-500 mt-1">This self-assessment is available in view-only mode.</p>
        )}
      </div>

      <SelfAssessmentForm
        appraisalId={id}
        criteria={categories}
        initialAnswers={existingAnswers}
        selfAssessmentDeadline={appraisal.selfAssessmentDeadline?.toISOString() ?? null}
        serverNow={now.toISOString()}
        canEdit={canEdit}
        status={appraisal.selfAssessment?.status ?? null}
        template={selfTemplate as AppraisalSelfFormTemplate}
        employeeSummary={employeeSummary}
      />
    </div>
  );
}
