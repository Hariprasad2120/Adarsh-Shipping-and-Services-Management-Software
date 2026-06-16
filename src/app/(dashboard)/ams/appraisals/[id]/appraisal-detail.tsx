"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, CheckCircle2, Circle, ClipboardList, FileText, Info, Star, Users } from "lucide-react";
import { CriteriaPointsView } from "@/components/ams/criteria-points-form";
import { Button } from "@/components/ui/button";
import type {
  AppraisalSelfFormTemplate,
  SelfAssessmentAnswers,
  ReviewerRatingAnswers,
  ManagementReviewAnswers,
} from "@/modules/ams/criteria-config";
import type { CriterionPoint } from "@/modules/ams/types";
import { useNotifications } from "@/components/notifications/notification-provider";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { Input } from "@/components/ui/input";

type Reviewer = {
  id: string;
  userId: string;
  kind: string;
  availabilityStatus: string;
  assignedAt: string;
  user: { id: string; name: string };
};
type MeetingMinute = { id: string; role: string; content: string; author: { name: string }; createdAt: string };
type Meeting = { id: string; scheduledAt: string; status: string; minutes: MeetingMinute[] } | null;
type HikeDecision = { percent: number; amount: number; effectiveFrom: string; notes: string | null } | null;

type ReviewerRatingRow = {
  id: string;
  ratings: ReviewerRatingAnswers;
  overallComments?: string | null;
  reviewer: { kind: string; user: { name: string } };
};
type ManagementReviewRow = {
  id: string;
  ratings: ManagementReviewAnswers;
  proposedDates: string[];
  reviewer: { name: string };
};

type Appraisal = {
  id: string; stage: string; dueDate: string;
  availabilityDeadline: string | null;
  selfAssessmentDeadline: string | null;
  reviewerRatingDeadline: string | null;
  employee: { id: string; name: string; designation: string | null };
  cycle: { name: string; year: number };
  reviewers: Reviewer[];
  selfAssessment: { answers: SelfAssessmentAnswers; submittedAt: string; editCount?: number } | null;
  reviewerRatings: ReviewerRatingRow[];
  managementReviews: ManagementReviewRow[];
  meeting: Meeting;
  hikeDecision: HikeDecision;
  auditLog: { id: string; fromStage: string | null; toStage: string; note: string | null; createdAt: string }[];
};

type ScoreData = {
  selfNormalized: number | null;
  reviewerNormalized: number | null;
  managementNormalized: number | null;
  finalNormalized: number | null;
  grade: string | null;
  gradeLabel: string | null;
  hikePercent: number | null;
} | null;

type SlimUser = { id: string; name: string };

const STAGE_COLOR: Record<string, string> = {
  DUE_NOTIFIED: "bg-yellow-50 text-yellow-700 border-yellow-200",
  REVIEWERS_ASSIGNED: "bg-blue-50 text-blue-700 border-blue-200",
  SELF_ASSESSMENT_OPEN: "bg-purple-50 text-purple-700 border-purple-200",
  REVIEWER_RATING: "bg-indigo-50 text-indigo-700 border-indigo-200",
  MANAGEMENT_REVIEW: "bg-orange-50 text-orange-700 border-orange-200",
  MEETING_PENDING: "bg-cyan-50 text-cyan-700 border-cyan-200",
  MEETING_LIVE: "bg-green-50 text-green-700 border-green-200",
  HIKE_FINALISATION: "bg-pink-50 text-pink-700 border-pink-200",
  CLOSED: "bg-surface-container-high text-on-surface-variant border-outline-variant",
};

const STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-surface-container-high text-on-surface-variant",
  AVAILABLE: "bg-green-100 text-green-700",
  UNAVAILABLE: "bg-red-100 text-red-600",
  FORCED: "bg-orange-100 text-orange-600",
};

const KIND_LABEL: Record<string, string> = {
  HR: "HR",
  TL: "Team Lead",
  MANAGER: "Manager",
  MANAGEMENT: "Management",
};

// ─── AppraisalDetail ──────────────────────────────────────────────────────────

export function AppraisalDetail({
  appraisal,
  hrUsers,
  tlUsers,
  managerUsers,
  caps,
  currentUserId,
  serverNow,
  selfCriteria,
  selfSupplementary,
  selfTemplate,
  reviewerCriteria,
  scoreData,
}: {
  appraisal: Appraisal;
  hrUsers: SlimUser[];
  tlUsers: SlimUser[];
  managerUsers: SlimUser[];
  caps: Record<string, boolean>;
  currentUserId: string;
  serverNow: string;
  selfCriteria: CriterionPoint[];
  selfSupplementary: CriterionPoint[];
  selfTemplate: AppraisalSelfFormTemplate;
  reviewerCriteria: CriterionPoint[];
  scoreData: ScoreData;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const { success, error } = useNotifications();

  async function api(path: string, body: object) {
    setSaving(true);
    const res = await fetch(`/api/ams/appraisals/${appraisal.id}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      error(d.error ?? "Action failed");
      return false;
    }
    success("Action completed");
    router.refresh();
    return true;
  }

  const isEmployee = currentUserId === appraisal.employee.id;
  const isReviewer = appraisal.reviewers.some(
    (r) => r.userId === currentUserId && r.kind !== "MANAGEMENT"
  );
  const myReviewer = appraisal.reviewers.find(
    (r) => r.userId === currentUserId && r.kind !== "MANAGEMENT"
  );
  const managementClaim = appraisal.reviewers.find((r) => r.kind === "MANAGEMENT");
  const isClaimant = managementClaim?.userId === currentUserId;
  const canClaimManagement = caps["ams.appraisal.management_review"] && !managementClaim;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Left — stage header + actions */}
      <div className="lg:col-span-2 space-y-4">
        {/* Stage header */}
        <div className={`rounded-xl border px-5 py-4 ${STAGE_COLOR[appraisal.stage] ?? ""}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide opacity-70">Current Stage</p>
              <p className="text-lg font-bold mt-0.5">{appraisal.stage.replace(/_/g, " ")}</p>
            </div>
            <div className="text-right text-sm opacity-70">
              <p>{appraisal.cycle.name}</p>
              <p>{appraisal.employee.designation}</p>
            </div>
          </div>
        </div>

        <ProgressTimeline appraisal={appraisal} />

        <StageActions
          appraisal={appraisal}
          hrUsers={hrUsers}
          tlUsers={tlUsers}
          managerUsers={managerUsers}
          caps={caps}
          isEmployee={isEmployee}
          isReviewer={isReviewer}
          myReviewer={myReviewer ?? null}
          isClaimant={isClaimant}
          canClaimManagement={canClaimManagement}
          onAction={api}
          saving={saving}
          serverNow={serverNow}
          selfCriteria={selfCriteria}
          selfSupplementary={selfSupplementary}
          selfTemplate={selfTemplate}
          reviewerCriteria={reviewerCriteria}
          scoreData={scoreData}
        />

        {appraisal.meeting && (
          <MeetingSection
            meeting={appraisal.meeting}
            onAddMinute={(role, content) => api("minutes", { role, content })}
            caps={caps}
            saving={saving}
          />
        )}
      </div>

      {/* Right — reviewers + hike + audit */}
      <div className="space-y-4">
        <ReviewersPanel
          reviewers={appraisal.reviewers}
          availabilityDeadline={appraisal.availabilityDeadline}
          selfAssessmentDeadline={appraisal.selfAssessmentDeadline}
          reviewerRatingDeadline={appraisal.reviewerRatingDeadline}
          stage={appraisal.stage}
          serverNow={serverNow}
        />

        {appraisal.hikeDecision && (
          <Card title="Hike Decision">
            <dl className="space-y-2 text-sm">
              <Dt label="Percent">{appraisal.hikeDecision.percent}%</Dt>
              <Dt label="Amount">₹{Number(appraisal.hikeDecision.amount).toLocaleString("en-IN")}</Dt>
              <Dt label="Effective">{new Date(appraisal.hikeDecision.effectiveFrom).toLocaleDateString("en-IN")}</Dt>
              {appraisal.hikeDecision.notes && <Dt label="Notes">{appraisal.hikeDecision.notes}</Dt>}
            </dl>
          </Card>
        )}

        <Card title="Audit Log">
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {appraisal.auditLog.map((log) => (
              <div key={log.id} className="text-xs text-on-surface-variant border-l-2 border-outline-variant pl-3">
                <p className="font-medium text-on-surface">→ {log.toStage.replace(/_/g, " ")}</p>
                {log.note && <p>{log.note}</p>}
                <p>{new Date(log.createdAt).toLocaleString("en-IN")}</p>
              </div>
            ))}
          </div>
        </Card>

      </div>
      </div>

      {appraisal.stage === "REVIEWERS_ASSIGNED" && caps["ams.appraisal.assign_reviewers"] ? (
        <UpdateReviewersCard
          appraisal={appraisal}
          hrUsers={hrUsers}
          tlUsers={tlUsers}
          managerUsers={managerUsers}
          caps={caps}
          onAction={api}
          saving={saving}
        />
      ) : null}
    </div>
  );
}

// ─── Stage Actions ────────────────────────────────────────────────────────────

function UpdateReviewersCard({
  appraisal,
  hrUsers,
  tlUsers,
  managerUsers,
  caps,
  onAction,
  saving,
}: {
  appraisal: Appraisal;
  hrUsers: SlimUser[];
  tlUsers: SlimUser[];
  managerUsers: SlimUser[];
  caps: Record<string, boolean>;
  onAction: (path: string, body: object) => Promise<boolean>;
  saving: boolean;
}) {
  const existingHR = appraisal.reviewers.find((reviewer) => reviewer.kind === "HR")?.userId ?? "";
  const existingTL = appraisal.reviewers.find((reviewer) => reviewer.kind === "TL")?.userId ?? "";
  const existingManager = appraisal.reviewers.find((reviewer) => reviewer.kind === "MANAGER")?.userId ?? "";
  const [selectedHR, setSelectedHR] = useState(existingHR);
  const [selectedTL, setSelectedTL] = useState(existingTL);
  const [selectedManager, setSelectedManager] = useState(existingManager);
  const [includeTL, setIncludeTL] = useState(Boolean(existingTL));
  const [includeManager, setIncludeManager] = useState(Boolean(existingManager));
  const canForceReviewer = caps["ams.appraisal.force_reviewer"];

  function buildReviewers() {
    const list: { userId: string; kind: string }[] = [];
    if (selectedHR) list.push({ userId: selectedHR, kind: "HR" });
    if (includeTL && selectedTL) list.push({ userId: selectedTL, kind: "TL" });
    if (includeManager && selectedManager) list.push({ userId: selectedManager, kind: "MANAGER" });
    return list;
  }

  return (
    <div className="card-top-accent rounded-[28px] border border-outline-variant/40 bg-surface p-5 shadow-sm sm:p-6">
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-[#00cec4]/10 text-[#00cec4]">
            <Users className="size-4.5" />
          </span>
          <div>
            <h2 className="ds-h2 text-on-surface">Assign Reviewers</h2>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-800">
          <span className="inline-flex items-center gap-2">
            <Info className="size-4 shrink-0" />
            <span>
              Appraisal active: <strong>{appraisal.cycle.name}</strong> - reviewer assignment updates will refresh availability.
            </span>
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <ToggleCard
            active={includeTL}
            label="Include TL Reviewer"
            description="Adds TL as an assigned reviewer"
            onToggle={() => {
              setIncludeTL((current) => {
                const next = !current;
                if (!next) setSelectedTL("");
                return next;
              });
            }}
          />
          <ToggleCard
            active={includeManager}
            label="Include Manager Reviewer"
            description="Adds Manager as an assigned reviewer"
            onToggle={() => {
              setIncludeManager((current) => {
                const next = !current;
                if (!next) setSelectedManager("");
                return next;
              });
            }}
          />
        </div>

        <div className="space-y-5">
          <div className="space-y-2">
            <span className="flex items-center gap-2 text-sm font-medium text-on-surface">
              <span className="inline-flex h-3.5 w-3.5 rounded-full bg-emerald-400" />
              HR Reviewer
            </span>
            <DropdownSelect
              ariaLabel="Select HR"
              onValueChange={setSelectedHR}
              options={[
                { value: "", label: "Select an option" },
                ...hrUsers.filter((user) => user.id !== appraisal.employee.id).map((user) => ({ value: user.id, label: user.name })),
              ]}
              triggerClassName="h-11 max-w-[530px] px-4 text-sm"
              value={selectedHR}
            />
          </div>

          {includeTL ? (
            <div className="space-y-2">
              <span className="flex items-center gap-2 text-sm font-medium text-on-surface">
                <span className="inline-flex h-3.5 w-3.5 rounded-full bg-emerald-400" />
                TL Reviewer
              </span>
              <DropdownSelect
                ariaLabel="Select team lead"
                onValueChange={setSelectedTL}
                options={[
                  { value: "", label: "Select an option" },
                  ...tlUsers.filter((user) => user.id !== appraisal.employee.id).map((user) => ({ value: user.id, label: user.name })),
                ]}
                triggerClassName="h-11 max-w-[530px] px-4 text-sm"
                value={selectedTL}
              />
            </div>
          ) : null}

          {includeManager ? (
            <div className="space-y-2">
              <span className="flex items-center gap-2 text-sm font-medium text-on-surface">
                <span className="inline-flex h-3.5 w-3.5 rounded-full bg-emerald-400" />
                Manager Reviewer
              </span>
              <DropdownSelect
                ariaLabel="Select manager"
                onValueChange={setSelectedManager}
                options={[
                  { value: "", label: "Select an option" },
                  ...managerUsers.filter((user) => user.id !== appraisal.employee.id).map((user) => ({ value: user.id, label: user.name })),
                ]}
                triggerClassName="h-11 max-w-[530px] px-4 text-sm"
                value={selectedManager}
              />
            </div>
          ) : null}
        </div>

        {canForceReviewer ? (
          <div className="space-y-3 rounded-2xl border border-outline-variant/35 bg-surface-container-low px-4 py-4">
            <div>
              <p className="text-sm font-medium text-on-surface">Reviewer Availability Controls</p>
              <p className="mt-1 text-xs text-on-surface-variant">Force a reviewer to available if you need to unblock the appraisal.</p>
            </div>
            <div className="space-y-3">
              {appraisal.reviewers
                .filter((reviewer) => reviewer.kind !== "MANAGEMENT")
                .map((reviewer) => {
                  const isForceEnabled = reviewer.availabilityStatus === "FORCED" || reviewer.availabilityStatus === "AVAILABLE";
                  return (
                    <div key={reviewer.id} className="flex flex-col gap-3 rounded-2xl border border-outline-variant/35 bg-surface px-4 py-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-sm font-medium text-on-surface">{reviewer.user.name}</p>
                        <p className="mt-1 text-xs text-on-surface-variant">
                          {(KIND_LABEL[reviewer.kind] ?? reviewer.kind)} - current status {reviewer.availabilityStatus}
                        </p>
                      </div>
                      <ReviewerToggleRow
                        active={isForceEnabled}
                        compact
                        label="Force available"
                        onToggle={() => onAction("availability", {
                          available: !isForceEnabled,
                          force: !isForceEnabled,
                          userId: reviewer.userId,
                        })}
                      />
                    </div>
                  );
                })}
            </div>
          </div>
        ) : null}

        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          Re-assigning will reset all reviewer availability. The original deadline is kept.
        </p>
        <div className="flex justify-start">
          <Button
            onClick={() => onAction("reviewers", { reviewers: buildReviewers() })}
            disabled={saving || !selectedHR}
            size="sm"
            className={selectedHR
              ? "rounded-2xl border-0 bg-[#00cec4] px-5 py-3 text-sm font-medium text-white hover:bg-[#00b8af]"
              : "rounded-2xl bg-outline-variant px-5 py-3 text-sm font-medium text-on-surface-variant transition disabled:cursor-not-allowed"}
          >
            Update Reviewers
          </Button>
        </div>
      </div>
    </div>
  );
}

function StageActions({
  appraisal, hrUsers, tlUsers, managerUsers, caps,
  isEmployee, isReviewer, myReviewer, isClaimant, canClaimManagement,
  onAction, saving, serverNow, selfCriteria, selfSupplementary,
  selfTemplate, reviewerCriteria, scoreData,
}: {
  appraisal: Appraisal;
  hrUsers: SlimUser[]; tlUsers: SlimUser[]; managerUsers: SlimUser[];
  caps: Record<string, boolean>;
  isEmployee: boolean;
  isReviewer: boolean;
  myReviewer: Reviewer | null;
  isClaimant: boolean;
  canClaimManagement: boolean;
  onAction: (path: string, body: object) => Promise<boolean>;
  saving: boolean;
  serverNow: string;
  selfCriteria: CriterionPoint[];
  selfSupplementary: CriterionPoint[];
  selfTemplate: AppraisalSelfFormTemplate;
  reviewerCriteria: CriterionPoint[];
  scoreData: ScoreData;
}) {
  const existingHR = appraisal.reviewers.find((reviewer) => reviewer.kind === "HR")?.userId ?? "";
  const existingTL = appraisal.reviewers.find((reviewer) => reviewer.kind === "TL")?.userId ?? "";
  const existingManager = appraisal.reviewers.find((reviewer) => reviewer.kind === "MANAGER")?.userId ?? "";
  const [selectedHR, setSelectedHR] = useState(existingHR);
  const [selectedTL, setSelectedTL] = useState(existingTL);
  const [selectedManager, setSelectedManager] = useState(existingManager);
  const [includeTL, setIncludeTL] = useState(Boolean(existingTL));
  const [includeManager, setIncludeManager] = useState(Boolean(existingManager));
  const [meetingDate, setMeetingDate] = useState("");
  const [hikePercent, setHikePercent] = useState(scoreData?.hikePercent != null ? String(scoreData.hikePercent) : "");
  const [hikeAmount, setHikeAmount] = useState("");
  const [hikeEffective, setHikeEffective] = useState("");

  const { stage } = appraisal;
  const managementClaim = appraisal.reviewers.find((r) => r.kind === "MANAGEMENT");
  const canViewEmployeeSelfAssessment =
    caps["ams.appraisal.assign_reviewers"] ||
    caps["ams.appraisal.view_all"] ||
    caps["ams.appraisal.management_review"] ||
    caps["ams.appraisal.force_reviewer"] ||
    caps["ams.meeting.confirm"] ||
    caps["ams.hike.finalise"];

  function buildReviewers() {
    const list: { userId: string; kind: string }[] = [];
    if (selectedHR) list.push({ userId: selectedHR, kind: "HR" });
    if (includeTL && selectedTL) list.push({ userId: selectedTL, kind: "TL" });
    if (includeManager && selectedManager) list.push({ userId: selectedManager, kind: "MANAGER" });
    return list;
  }

  return (
    <div className="space-y-4">

      {/* Update reviewers */}
      {false && stage === "REVIEWERS_ASSIGNED" && caps["ams.appraisal.assign_reviewers"] && (
        <div className="rounded-2xl border border-outline-variant bg-surface p-6 shadow-sm">
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="ds-h2 text-slate-900">
                Update Reviewers
              </h2>
              <p className="text-sm text-on-surface-variant">Adjust the reviewer chain after assignment if a reviewer needs to change.</p>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <span className="text-sm font-semibold text-slate-700 md:w-28">HR *</span>
              <DropdownSelect
                ariaLabel="Select HR"
                className="w-full md:flex-1"
                onValueChange={setSelectedHR}
                options={[
                  { value: "", label: "— Select HR —" },
                  ...hrUsers
                    .filter((user) => user.id !== appraisal.employee.id)
                    .map((user) => ({ value: user.id, label: user.name })),
                ]}
                triggerClassName="h-14 px-4 text-base"
                value={selectedHR}
              />
            </div>

            <div className="space-y-4">
              <ReviewerToggleRow
                active={includeTL}
                label="Include Team Lead reviewer"
                onToggle={() => {
                  setIncludeTL((current) => {
                    const next = !current;
                    if (!next) setSelectedTL("");
                    return next;
                  });
                }}
              />
              {includeTL && (
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:pl-6">
                  <span className="text-xs font-semibold text-on-surface-variant md:w-22">TL</span>
                  <DropdownSelect
                    ariaLabel="Select team lead"
                    className="w-full md:flex-1"
                    onValueChange={setSelectedTL}
                    options={[
                      { value: "", label: "— Select TL —" },
                      ...tlUsers
                        .filter((user) => user.id !== appraisal.employee.id)
                        .map((user) => ({ value: user.id, label: user.name })),
                    ]}
                    triggerClassName="h-12 px-4 text-sm"
                    value={selectedTL}
                  />
                </div>
              )}
            </div>

            <div className="space-y-4">
              <ReviewerToggleRow
                active={includeManager}
                label="Include Manager reviewer"
                onToggle={() => {
                  setIncludeManager((current) => {
                    const next = !current;
                    if (!next) setSelectedManager("");
                    return next;
                  });
                }}
              />
              {includeManager && (
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:pl-6">
                  <span className="text-xs font-semibold text-on-surface-variant md:w-22">Manager</span>
                  <DropdownSelect
                    ariaLabel="Select manager"
                    className="w-full md:flex-1"
                    onValueChange={setSelectedManager}
                    options={[
                      { value: "", label: "— Select Manager —" },
                      ...managerUsers
                        .filter((user) => user.id !== appraisal.employee.id)
                        .map((user) => ({ value: user.id, label: user.name })),
                    ]}
                    triggerClassName="h-12 px-4 text-sm"
                    value={selectedManager}
                  />
                </div>
              )}
            </div>

            {stage === "REVIEWERS_ASSIGNED" && (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                Re-assigning will reset all reviewer availability. The original deadline is kept.
              </p>
            )}

            <div className="border-t border-outline-variant pt-6">
              <div className="flex items-center justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedHR("");
                    setSelectedTL("");
                    setSelectedManager("");
                    setIncludeTL(true);
                    setIncludeManager(true);
                  }}
                  size="md"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => onAction("reviewers", { reviewers: buildReviewers() })}
                  disabled={saving || !selectedHR}
                  size="md"
                >
                  Update Reviewers
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reviewer — confirm own availability */}
      {stage === "REVIEWERS_ASSIGNED" && isReviewer && myReviewer && (
        <Card title="Confirm Your Availability">
          {myReviewer.availabilityStatus === "PENDING" ? (
            <div className="space-y-3">
              <p className="text-sm text-on-surface-variant">
                Can you attend the appraisal review for <strong>{appraisal.employee.name}</strong>?
              </p>
              <div className="flex gap-3">
                <button onClick={() => onAction("availability", { available: true })} disabled={saving}
                  className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50">
                  Yes, I&apos;m available
                </button>
                <button onClick={() => onAction("availability", { available: false })} disabled={saving}
                  className="px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 disabled:opacity-50">
                  No, unavailable
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[myReviewer.availabilityStatus] ?? ""}`}>
                {myReviewer.availabilityStatus}
              </span>
              <span className="text-sm text-on-surface-variant">Response recorded.</span>
            </div>
          )}
        </Card>
      )}

      {/* Force unavailable reviewers */}
      {stage === "REVIEWERS_ASSIGNED" && caps["ams.appraisal.force_reviewer"] &&
        appraisal.reviewers.some((r) => r.availabilityStatus === "UNAVAILABLE") && (
        <Card title="Unavailable Reviewers">
          <div className="space-y-2">
            {appraisal.reviewers.filter((r) => r.availabilityStatus === "UNAVAILABLE").map((r) => (
              <div key={r.id} className="flex items-center justify-between text-sm">
                <span>{r.user.name} <span className="text-on-surface-variant/60">({r.kind})</span></span>
                <button onClick={() => onAction("availability", { available: true, force: true, userId: r.userId })}
                  className="text-xs px-2 py-1 bg-orange-500 text-white rounded hover:bg-orange-600">
                  Force available
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {stage === "REVIEWERS_ASSIGNED" && caps["ams.appraisal.assign_reviewers"] &&
        appraisal.reviewers.every((r) => r.kind === "MANAGEMENT" ||
          r.availabilityStatus === "AVAILABLE" || r.availabilityStatus === "FORCED") &&
        appraisal.availabilityDeadline &&
        new Date(serverNow) < new Date(appraisal.availabilityDeadline) && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          All reviewers confirmed. Self-assessment will open automatically on{" "}
          <strong>{new Date(appraisal.availabilityDeadline).toLocaleDateString("en-IN")}</strong>{" "}
          (availability deadline).
        </div>
      )}

      {/* Self-assessment — employee sees link to their dedicated page */}
      {stage === "SELF_ASSESSMENT_OPEN" && isEmployee && (
        <Card title="Self Assessment">
          {appraisal.selfAssessmentDeadline && (
            <DeadlineBanner deadline={appraisal.selfAssessmentDeadline} serverNow={serverNow} label="Self-assessment deadline" />
          )}
          {appraisal.selfAssessment ? (
            <p className="text-sm text-green-700 mb-3">
              Draft saved — edited {appraisal.selfAssessment.editCount ?? 0} time{(appraisal.selfAssessment.editCount ?? 0) !== 1 ? "s" : ""}
            </p>
          ) : null}
          <Link
            href={`/ams/my-appraisal/${appraisal.id}/self-assessment`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700"
          >
            {appraisal.selfAssessment ? "Edit Self-Assessment →" : "Complete Self-Assessment →"}
          </Link>
        </Card>
      )}

      {/* Self-assessment read view (admin/reviewer during SELF_ASSESSMENT_OPEN) */}
      {stage === "SELF_ASSESSMENT_OPEN" && !isEmployee && canViewEmployeeSelfAssessment && (
        <Card title="Self Assessment (In Progress)">
          {appraisal.selfAssessment ? (
            <CriteriaPointsView
              criteria={selfCriteria}
              supplementary={selfSupplementary}
              answers={appraisal.selfAssessment.answers}
              editCount={appraisal.selfAssessment.editCount}
              selfTemplate={selfTemplate}
            />
          ) : (
            <p className="text-sm text-on-surface-variant/60 italic">Employee has not started self-assessment.</p>
          )}
        </Card>
      )}

      {/* Reviewer ratings read view (admin / management / employee can see) */}
      {(stage === "MANAGEMENT_REVIEW" || stage === "MEETING_PENDING" || stage === "MEETING_LIVE" || stage === "HIKE_FINALISATION" || stage === "CLOSED") &&
        appraisal.reviewerRatings.length > 0 && (
        <Card title="Reviewer Ratings">
          <div className="space-y-6">
            {appraisal.reviewerRatings.map((rr) => (
              <div key={rr.id} className="space-y-2">
                <p className="text-xs font-semibold text-on-surface-variant">
                  {rr.reviewer?.user?.name} ({rr.reviewer?.kind})
                </p>
                <CriteriaPointsView
                  criteria={reviewerCriteria}
                  supplementary={[]}
                  answers={rr.ratings}
                />
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Management review */}
      {stage === "MANAGEMENT_REVIEW" && (
        <>
          {canClaimManagement && (
            <Card title="Management Review">
              <p className="text-sm text-on-surface-variant mb-3">
                No management reviewer has claimed this appraisal yet.
              </p>
              <button onClick={() => onAction("claim-management", {})} disabled={saving}
                className="px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 disabled:opacity-50">
                Claim this appraisal
              </button>
            </Card>
          )}

          {managementClaim && !isClaimant && caps["ams.appraisal.management_review"] && (
            <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-700">
              Claimed by <strong>{managementClaim.user.name}</strong>.
            </div>
          )}

          {isClaimant && (
            <Card title="Management Review">
              <p className="text-sm text-on-surface-variant mb-3">
                Your management review is handled on a dedicated page so self-assessment, reviewer ratings, and management scoring stay separate.
              </p>
              <Link
                href={`/ams/appraisals/${appraisal.id}/management-review`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700"
              >
                Open Management Review →
              </Link>
            </Card>
          )}
        </>
      )}

      {/* Confirm meeting */}
      {stage === "MEETING_PENDING" && caps["ams.meeting.confirm"] && !appraisal.meeting && (
        <Card title="Confirm Meeting Date">
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-xs text-on-surface-variant">Meeting Date & Time</label>
              <Input type="datetime-local" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)}
                className="mt-1 w-full" />
            </div>
            <button onClick={() => onAction("meeting", { action: "confirm", scheduledAt: meetingDate })}
              disabled={saving || !meetingDate}
              className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg disabled:opacity-50">
              Confirm
            </button>
          </div>
          {appraisal.managementReviews.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-on-surface-variant">Proposed dates from management:</p>
              {appraisal.managementReviews.flatMap((mr) => mr.proposedDates).map((d, i) => (
                <p key={i} className="text-sm text-on-surface">{new Date(d).toLocaleString("en-IN")}</p>
              ))}
            </div>
          )}
        </Card>
      )}

      {stage === "MEETING_PENDING" && caps["ams.meeting.confirm"] && appraisal.meeting?.status === "SCHEDULED" && (
        <Card title="Meeting Scheduled">
          <p className="text-sm text-on-surface-variant">{new Date(appraisal.meeting.scheduledAt).toLocaleString("en-IN")}</p>
          <button onClick={() => onAction("meeting", { action: "start" })} disabled={saving}
            className="mt-3 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700">
            Start Meeting
          </button>
        </Card>
      )}

      {stage === "MEETING_LIVE" && caps["ams.meeting.confirm"] && (
        <button onClick={() => onAction("meeting", { action: "close" })} disabled={saving}
          className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700">
          Close Meeting
        </button>
      )}

      {/* Finalise hike */}
      {stage === "HIKE_FINALISATION" && caps["ams.hike.finalise"] && !appraisal.hikeDecision && (
        <Card title="Finalise Hike">
          {scoreData && (
            <div className="rounded-lg bg-indigo-50 border border-indigo-100 px-4 py-3 text-sm mb-4 space-y-1">
              <p className="font-semibold text-indigo-800">Computed Score</p>
              <div className="grid grid-cols-2 gap-x-6 text-xs text-indigo-700">
                {scoreData.selfNormalized !== null && <p>Self (20%): {scoreData.selfNormalized.toFixed(1)}</p>}
                {scoreData.reviewerNormalized !== null && <p>Reviewers (70%): {scoreData.reviewerNormalized.toFixed(1)}</p>}
                {scoreData.managementNormalized !== null && <p>Management (10%): {scoreData.managementNormalized.toFixed(1)}</p>}
                {scoreData.finalNormalized !== null && <p className="font-semibold">Final: {scoreData.finalNormalized.toFixed(1)}</p>}
                {scoreData.grade && <p>Grade: <strong>{scoreData.grade}</strong>{scoreData.gradeLabel ? ` — ${scoreData.gradeLabel}` : ""}</p>}
                {scoreData.hikePercent !== null && <p>Suggested hike: <strong>{scoreData.hikePercent}%</strong></p>}
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-on-surface-variant">Hike %</label>
              <Input type="number" value={hikePercent} onChange={(e) => setHikePercent(e.target.value)}
                className="mt-1 w-full" />
            </div>
            <div>
              <label className="text-xs text-on-surface-variant">Amount (₹)</label>
              <Input type="number" value={hikeAmount} onChange={(e) => setHikeAmount(e.target.value)}
                className="mt-1 w-full" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-on-surface-variant">Effective From</label>
              <Input type="date" value={hikeEffective} onChange={(e) => setHikeEffective(e.target.value)}
                className="mt-1 w-full" />
            </div>
          </div>
          <button
            onClick={() => onAction("hike", { percent: Number(hikePercent), amount: Number(hikeAmount), effectiveFrom: hikeEffective })}
            disabled={saving || !hikePercent || !hikeAmount || !hikeEffective}
            className="mt-3 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg disabled:opacity-50">
            Finalise Hike
          </button>
        </Card>
      )}
    </div>
  );
}

// ─── Deadline Banner ──────────────────────────────────────────────────────────

function DeadlineBanner({ deadline, serverNow, label }: { deadline: string; serverNow: string; label: string }) {
  const passed = new Date(serverNow) >= new Date(deadline);
  return (
    <div className={`rounded-lg px-3 py-2 text-xs mb-3 ${passed ? "bg-red-50 text-red-700 border border-red-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
      {label}: <strong>{new Date(deadline).toLocaleDateString("en-IN")}</strong>
      {passed ? " — deadline has passed" : ""}
    </div>
  );
}

// ─── Reviewers Panel ──────────────────────────────────────────────────────────

const TIMELINE_STAGES = [
  "DUE_NOTIFIED",
  "REVIEWERS_ASSIGNED",
  "SELF_ASSESSMENT_OPEN",
  "REVIEWER_RATING",
  "MANAGEMENT_REVIEW",
  "MEETING_PENDING",
  "MEETING_LIVE",
  "HIKE_FINALISATION",
  "CLOSED",
] as const;

function ProgressTimeline({ appraisal }: { appraisal: Appraisal }) {
  const activeIndex = TIMELINE_STAGES.indexOf(appraisal.stage as (typeof TIMELINE_STAGES)[number]);
  const nonManagementReviewers = appraisal.reviewers.filter((reviewer) => reviewer.kind !== "MANAGEMENT");
  const availableCount = nonManagementReviewers.filter(
    (reviewer) => reviewer.availabilityStatus === "AVAILABLE" || reviewer.availabilityStatus === "FORCED",
  ).length;
  const submittedRatings = appraisal.reviewerRatings.length;
  const totalRatings = nonManagementReviewers.length;
  const timelineItems = [
    {
      key: "REVIEWERS_ASSIGNED",
      title: "Reviewers Assigned",
      description:
        appraisal.reviewers.length > 0
          ? `HR: ${appraisal.reviewers.find((reviewer) => reviewer.kind === "HR")?.user.name ?? "-"}`
          : "Reviewer chain is waiting to be assigned",
      icon: CheckCircle2,
    },
    {
      key: "SELF_ASSESSMENT_OPEN",
      title: "Reviewer Availability Confirmed",
      description:
        nonManagementReviewers.length === 0
          ? "No reviewer confirmations yet"
          : availableCount === nonManagementReviewers.length
            ? "All reviewers confirmed available"
            : `${availableCount} / ${nonManagementReviewers.length} reviewers confirmed`,
      icon: CheckCircle2,
    },
    {
      key: "REVIEWER_RATING",
      title: "Self-Assessment",
      description: appraisal.selfAssessment?.submittedAt
        ? `Submitted ${new Date(appraisal.selfAssessment.submittedAt).toLocaleDateString("en-IN")}`
        : "Awaiting employee submission",
      icon: FileText,
    },
    {
      key: "MANAGEMENT_REVIEW",
      title: "Reviewer Ratings",
      description: `${submittedRatings} / ${Math.max(totalRatings, 1)} submitted`,
      icon: Star,
    },
    {
      key: "MEETING_PENDING",
      title: "Management Decision",
      description:
        appraisal.managementReviews.length > 0 ? "Management review submitted" : "Pending management review",
      icon: Circle,
    },
    {
      key: "MEETING_LIVE",
      title: "Meeting Scheduled",
      description:
        appraisal.meeting?.scheduledAt
          ? `Scheduled ${new Date(appraisal.meeting.scheduledAt).toLocaleDateString("en-IN")}`
          : "Tentative dates not yet proposed",
      icon: CalendarDays,
    },
    {
      key: "HIKE_FINALISATION",
      title: "MOM Recorded",
      description: appraisal.meeting?.minutes.length ? "Minutes captured for the discussion" : "Awaiting meeting",
      icon: ClipboardList,
    },
  ] as const;

  return (
    <Card title="Cycle Progress">
      <div className="space-y-0">
        {timelineItems.map((item, index) => {
          const stageIndex = TIMELINE_STAGES.indexOf(item.key);
          const isDone = activeIndex > stageIndex;
          const isCurrent = activeIndex === stageIndex;
          const Icon = item.icon;

          return (
            <div
              key={item.key}
              className="relative flex gap-4 pb-6 last:pb-0"
            >
              <div className="relative flex w-8 shrink-0 justify-center">
                {index < timelineItems.length - 1 ? (
                  <span className="absolute top-9 h-[calc(100%-0.25rem)] w-px bg-outline-variant" />
                ) : null}
                <span
                  className={`relative inline-flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                    isDone || isCurrent
                      ? "border-emerald-500 text-emerald-500"
                      : "border-slate-300 text-slate-300"
                  }`}
                >
                  <Icon className="size-5" />
                </span>
              </div>
              <div className="min-w-0 pt-0.5">
                <p className={`text-[0.95rem] font-semibold ${isDone || isCurrent ? "text-slate-900" : "text-slate-400"}`}>
                  {item.title}
                </p>
                <p className={`mt-1 text-sm ${isDone || isCurrent ? "text-on-surface-variant" : "text-slate-400"}`}>
                  {item.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function ReviewersPanel({
  reviewers, availabilityDeadline, selfAssessmentDeadline, reviewerRatingDeadline, stage, serverNow,
}: {
  reviewers: Reviewer[];
  availabilityDeadline: string | null;
  selfAssessmentDeadline: string | null;
  reviewerRatingDeadline: string | null;
  stage: string;
  serverNow: string;
}) {
  const deadlinePassed = availabilityDeadline ? new Date(serverNow) >= new Date(availabilityDeadline) : false;
  const pendingCount = reviewers.filter(
    (r) => r.kind !== "MANAGEMENT" && r.availabilityStatus === "PENDING"
  ).length;

  return (
    <Card title="Reviewers">
      {reviewers.length === 0 ? (
        <p className="text-sm text-on-surface-variant/60">Not assigned yet.</p>
      ) : (
        <div className="space-y-2">
          {reviewers.map((r) => (
            <div key={r.id} className="flex items-center justify-between text-sm">
              <div>
                <span className="font-medium text-on-surface">{r.user.name}</span>
                <span className="ml-2 text-xs text-on-surface-variant/60 uppercase">{r.kind}</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[r.availabilityStatus] ?? "bg-surface-container-high text-on-surface-variant"}`}>
                {r.availabilityStatus}
              </span>
            </div>
          ))}
        </div>
      )}

      {stage === "REVIEWERS_ASSIGNED" && availabilityDeadline && (
        <div className={`mt-3 pt-3 border-t border-outline-variant/40 text-xs ${deadlinePassed ? "text-green-700" : "text-on-surface-variant"}`}>
          {deadlinePassed ? <span>Availability deadline passed.</span> : (
            <span>Availability deadline: <strong>{new Date(availabilityDeadline).toLocaleDateString("en-IN")}</strong></span>
          )}
          {pendingCount > 0 && <span className="ml-2 text-amber-600">({pendingCount} pending)</span>}
        </div>
      )}

      {stage === "SELF_ASSESSMENT_OPEN" && selfAssessmentDeadline && (
        <div className="mt-3 pt-3 border-t border-outline-variant/40 text-xs text-purple-700">
          Self-assessment deadline: <strong>{new Date(selfAssessmentDeadline).toLocaleDateString("en-IN")}</strong>
        </div>
      )}

      {stage === "REVIEWER_RATING" && reviewerRatingDeadline && (
        <div className="mt-3 pt-3 border-t border-outline-variant/40 text-xs text-indigo-700">
          Reviewer rating deadline: <strong>{new Date(reviewerRatingDeadline).toLocaleDateString("en-IN")}</strong>
        </div>
      )}
    </Card>
  );
}

// ─── Meeting Section ──────────────────────────────────────────────────────────

function MeetingSection({ meeting, onAddMinute, caps, saving }: {
  meeting: NonNullable<Appraisal["meeting"]>;
  onAddMinute: (role: string, content: string) => void;
  caps: Record<string, boolean>;
  saving: boolean;
}) {
  const [minuteRole, setMinuteRole] = useState<"HR" | "MANAGEMENT" | "EMPLOYEE">("HR");
  const [minuteContent, setMinuteContent] = useState("");

  return (
    <Card title="Meeting Minutes">
      <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
        {meeting.minutes.length === 0 ? (
          <p className="text-sm text-on-surface-variant/60">No minutes yet.</p>
        ) : (
          meeting.minutes.map((m) => (
            <div key={m.id} className="border-l-2 border-indigo-200 pl-3">
              <p className="text-xs font-semibold text-indigo-600">{m.role} — {m.author.name}</p>
              <p className="text-sm text-on-surface">{m.content}</p>
            </div>
          ))
        )}
      </div>
      {caps["ams.meeting.minutes"] && meeting.status !== "DONE" && (
        <div className="space-y-2 pt-3 border-t border-outline-variant/40">
          <div className="flex gap-2">
            {(["HR", "MANAGEMENT", "EMPLOYEE"] as const).map((r) => (
              <button key={r} type="button" onClick={() => setMinuteRole(r)}
                className={`text-xs px-2 py-1 rounded ${minuteRole === r ? "bg-indigo-600 text-white" : "bg-surface-container-high text-on-surface"}`}>
                {r}
              </button>
            ))}
          </div>
          <textarea value={minuteContent} onChange={(e) => setMinuteContent(e.target.value)}
            placeholder="Add minute…" rows={2}
            className="w-full border border-outline rounded-lg px-3 py-2 text-sm resize-none" />
          <button
            onClick={() => { onAddMinute(minuteRole, minuteContent); setMinuteContent(""); }}
            disabled={saving || !minuteContent}
            className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg disabled:opacity-50">
            Add
          </button>
        </div>
      )}
    </Card>
  );
}

// ─── Primitives ───────────────────────────────────────────────────────────────

function ToggleCard({
  active,
  label,
  description,
  onToggle,
}: {
  active: boolean;
  label: string;
  description: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between rounded-2xl border border-outline-variant/35 bg-surface px-4 py-3 text-left transition hover:border-[#00cec4]/45"
    >
      <div>
        <p className="font-medium text-on-surface">{label}</p>
        <p className="mt-1 text-xs text-on-surface-variant">{description}</p>
      </div>
      <span className={`relative inline-flex h-7 w-12 rounded-full transition ${active ? "bg-[#55627f]" : "bg-outline-variant dark:bg-slate-600"}`}>
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-surface transition ${active ? "left-6" : "left-1"}`} />
      </span>
    </button>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card-top-accent bg-surface rounded-xl border border-outline-variant p-5 space-y-3">
      {title && <h2 className="ds-h2 text-on-surface">{title}</h2>}
      {children}
    </div>
  );
}

function ReviewerToggleRow({
  active,
  label,
  compact = false,
  onToggle,
}: {
  active: boolean;
  label: string;
  compact?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onToggle}
      className={`flex ${compact ? "w-auto min-w-[190px]" : "w-full"} items-center justify-between rounded-2xl ${compact ? "px-3 py-2.5" : "px-4 py-4"} text-left transition ${
        active
          ? "bg-surface text-on-surface"
          : "bg-surface text-on-surface-variant hover:border-[#00cec4]/35"
      } ${compact ? "border border-outline-variant/35" : "border border-outline-variant/35"}`}
    >
      <span className={`${compact ? "text-xs uppercase tracking-[0.14em]" : "text-sm"} font-medium`}>{label}</span>
      <span
        className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
          active ? "bg-[#55627f]" : "bg-outline-variant dark:bg-slate-600"
        }`}
      >
        <span
          className={`inline-block h-6 w-6 rounded-full bg-surface shadow-sm transition ${
            active ? "translate-x-5" : "translate-x-1"
          }`}
        />
      </span>
    </button>
  );
}

function Dt({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <dt className="text-on-surface-variant/60 min-w-20">{label}</dt>
      <dd className="text-on-surface">{children}</dd>
    </div>
  );
}
