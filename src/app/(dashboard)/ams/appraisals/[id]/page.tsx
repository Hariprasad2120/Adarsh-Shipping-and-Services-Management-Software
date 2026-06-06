import Link from "next/link";
import { auth } from "@/lib/auth";
import { getNow } from "@/lib/clock";
import { loadCaps } from "@/lib/rbac";
import { requirePermission } from "@/lib/rbac";
import { getRoles } from "@/modules/core/organisation/service";
import { getAppraisal, computeAppraisalScore, getSelfFormTemplate } from "@/modules/ams/service";
import { loadSelfCriteria, loadReviewerCriteria } from "@/modules/ams/criteria-cache";
import { listUsersSlim } from "@/modules/core/user/service";
import { notFound, redirect } from "next/navigation";
import { AppraisalDetail } from "./appraisal-detail";
import type { AppraisalSelfFormTemplate, SelfAssessmentAnswers } from "@/modules/ams/criteria-config";
import { filterCriteriaPointsByRole, mapCriterionRowToPoint } from "@/modules/ams/form-template";
import type { CriterionPoint } from "@/modules/ams/types";

type AppraisalDetailProps = React.ComponentProps<typeof AppraisalDetail>;

export default async function AppraisalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) redirect("/login");

  await requirePermission(session.user.id, "ams.appraisal.assign_reviewers");

  const { id } = await params;
  const orgId = session.user.orgId!;

  // All independent — run in parallel
  const [appraisal, roles, caps, now, selfRows, reviewerRows, selfTemplate] = await Promise.all([
    getAppraisal(id),
    getRoles(orgId),
    loadCaps(session.user.id),
    getNow(),
    loadSelfCriteria(orgId),      // cached — fast after first hit
    loadReviewerCriteria(orgId),  // cached — fast after first hit
    getSelfFormTemplate(orgId),
  ]);

  if (!appraisal) notFound();

  const selfCriteria = selfRows.filter((row) => row.kind === "CATEGORY").map(mapCriterionRowToPoint);
  const selfSupplementary: CriterionPoint[] = [];

  // Filter reviewer criteria by current user's role
  const myReviewer = appraisal.reviewers.find(
    (r) => r.userId === session.user.id && r.kind !== "MANAGEMENT"
  );
  const reviewerCriteria = myReviewer
    ? filterCriteriaPointsByRole(myReviewer.kind as "HR" | "TL" | "MANAGER" | "MANAGEMENT", reviewerRows)
    : reviewerRows.filter((row) => row.kind === "CATEGORY").map(mapCriterionRowToPoint);

  // Load score data for HIKE_FINALISATION only
  let scoreData: AppraisalDetailProps["scoreData"] = null;
  if (appraisal.stage === "HIKE_FINALISATION") {
    try {
      scoreData = await computeAppraisalScore(id);
    } catch {
      // score not available yet
    }
  }

  const hrRoleId = roles.find((r) => r.name === "HR")?.id;
  const tlRoleId = roles.find((r) => r.name === "TL")?.id;
  const managerRoleId = roles.find((r) => r.name === "Manager")?.id;

  // Use listUsersSlim — page only needs { id, name } for reviewer dropdowns
  const [hrUsers, tlUsers, managerUsers] = await Promise.all([
    hrRoleId ? listUsersSlim(orgId, { roleId: hrRoleId, active: true }) : [],
    tlRoleId ? listUsersSlim(orgId, { roleId: tlRoleId, active: true }) : [],
    managerRoleId ? listUsersSlim(orgId, { roleId: managerRoleId, active: true }) : [],
  ]);
  const safeAppraisal: AppraisalDetailProps["appraisal"] = {
    ...appraisal,
    dueDate: appraisal.dueDate.toISOString(),
    availabilityDeadline: appraisal.availabilityDeadline?.toISOString() ?? null,
    selfAssessmentDeadline: appraisal.selfAssessmentDeadline?.toISOString() ?? null,
    reviewerRatingDeadline: appraisal.reviewerRatingDeadline?.toISOString() ?? null,
    selfAssessment: appraisal.selfAssessment
      ? {
          answers: appraisal.selfAssessment.answers as SelfAssessmentAnswers,
          submittedAt: appraisal.selfAssessment.submittedAt?.toISOString() ?? appraisal.updatedAt.toISOString(),
          editCount: (appraisal.selfAssessment as { editCount?: number }).editCount ?? 0,
        }
      : null,
    reviewerRatings: appraisal.reviewerRatings as unknown as AppraisalDetailProps["appraisal"]["reviewerRatings"],
    managementReviews: appraisal.managementReviews as unknown as AppraisalDetailProps["appraisal"]["managementReviews"],
    reviewers: appraisal.reviewers.map((reviewer) => ({
      ...reviewer,
      assignedAt: reviewer.assignedAt.toISOString(),
    })),
    meeting: appraisal.meeting
      ? {
          ...appraisal.meeting,
          scheduledAt: appraisal.meeting.scheduledAt.toISOString(),
          minutes: appraisal.meeting.minutes.map((minute) => ({
            ...minute,
            createdAt: minute.createdAt.toISOString(),
          })),
        }
      : null,
    hikeDecision: appraisal.hikeDecision
      ? {
          ...appraisal.hikeDecision,
          effectiveFrom: appraisal.hikeDecision.effectiveFrom.toISOString(),
        }
      : null,
    auditLog: appraisal.auditLog.map((entry) => ({
      ...entry,
      createdAt: entry.createdAt.toISOString(),
    })),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/ams/appraisals" className="text-sm text-gray-500 hover:text-gray-700">
          {"< Appraisals"}
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-2xl font-bold text-gray-900">{appraisal.employee.name}</h1>
      </div>
      <AppraisalDetail
        appraisal={safeAppraisal}
        hrUsers={hrUsers as AppraisalDetailProps["hrUsers"]}
        tlUsers={tlUsers as AppraisalDetailProps["tlUsers"]}
        managerUsers={managerUsers as AppraisalDetailProps["managerUsers"]}
        caps={caps}
        currentUserId={session.user.id}
        serverNow={now.toISOString()}
        selfCriteria={selfCriteria}
        selfSupplementary={selfSupplementary}
        selfTemplate={selfTemplate as AppraisalSelfFormTemplate}
        reviewerCriteria={reviewerCriteria}
        scoreData={scoreData}
      />
    </div>
  );
}
