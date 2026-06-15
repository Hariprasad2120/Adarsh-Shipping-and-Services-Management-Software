import { db } from "@/lib/db";
import { notify, notifyMany } from "@/lib/notify";
import { assertTransition, type Stage, type ReviewerKind } from "./workflow";
import { computeSchedule, dueInMonth, addBusinessDays, type AppraisalKind } from "./due-dates";
import { getAppraisalSettings } from "./settings";
import { getNow, setFrozenDate } from "@/lib/clock";
import {
  buildDefaultSelfFormTemplate,
  normalizeScore,
  getGrade,
  getHikePercent,
  isSubmittedStatus,
  type AppraisalSelfFormTemplate,
  type EvaluatorRole,
  type SubmissionStatus,
  type SelfAssessmentAnswers,
  type ReviewerRatingAnswers,
  type ManagementReviewAnswers,
} from "./criteria-config";
import {
  filterCriteriaPointsByRole,
  mapCriterionRowToPoint,
  sanitizeReviewerRatings,
  sanitizeSelfRatings,
} from "./form-template";
import { normalizeSelfFormTemplate } from "./self-form-template";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function loadHolidaySet(orgId: string, branchId?: string | null): Promise<Set<string>> {
  const holidays = await db.holiday.findMany({
    where: {
      orgId,
      OR: [{ branchId: null }, ...(branchId ? [{ branchId }] : [])],
    },
    select: { date: true },
  });
  return new Set(holidays.map((h) => h.date.toISOString().split("T")[0]));
}

async function computeAvailabilityDeadline(orgId: string, branchId?: string | null): Promise<Date> {
  const settings = await getAppraisalSettings(orgId);
  const holidaySet = await loadHolidaySet(orgId, branchId);
  return addBusinessDays(await getNow(), settings.availabilityDeadlineDays, holidaySet);
}

async function logTransition(appraisalId: string, from: Stage, to: Stage, actorId?: string, note?: string) {
  await db.appraisalAuditLog.create({
    data: { appraisalId, fromStage: from, toStage: to, actorId, note },
  });
}

const APPRAISAL_SCHEDULE_HORIZON_YEARS = 10;

function normalizeDateOnly(value: Date) {
  const result = new Date(value);
  result.setHours(0, 0, 0, 0);
  return result;
}

function buildRatingChangeMetadata(
  previous: ReviewerRatingAnswers | ManagementReviewAnswers | null | undefined,
  current: ReviewerRatingAnswers | ManagementReviewAnswers,
  allowedCriterionIds: Set<string>,
) {
  if (!previous) return {};

  const previousCategoryPoints: Record<string, number> = {};
  const previousSubItemRatings: Record<string, Record<string, number>> = {};
  const changeReasons: Record<string, string> = {};

  for (const criterionId of allowedCriterionIds) {
    const previousScore = previous.categoryPoints?.[criterionId];
    const currentScore = current.categoryPoints?.[criterionId];
    const previousSubRatings = previous.subItemRatings?.[criterionId] ?? {};
    const currentSubRatings = current.subItemRatings?.[criterionId] ?? {};
    const changed =
      previousScore !== currentScore ||
      JSON.stringify(previousSubRatings) !== JSON.stringify(currentSubRatings);

    if (!changed) continue;

    if (typeof previousScore === "number") {
      previousCategoryPoints[criterionId] = previousScore;
    }
    if (Object.keys(previousSubRatings).length > 0) {
      previousSubItemRatings[criterionId] = previousSubRatings;
    }

    const reason = current.changeReasons?.[criterionId]?.trim();
    if (reason) {
      changeReasons[criterionId] = reason;
    }
  }

  return {
    previousCategoryPoints: Object.keys(previousCategoryPoints).length > 0 ? previousCategoryPoints : undefined,
    previousSubItemRatings: Object.keys(previousSubItemRatings).length > 0 ? previousSubItemRatings : undefined,
    changeReasons: Object.keys(changeReasons).length > 0 ? changeReasons : undefined,
  };
}

function scheduleKey(dueDate: Date, kind: AppraisalKind) {
  return `${normalizeDateOnly(dueDate).toISOString().slice(0, 10)}:${kind}`;
}

function monthBounds(year: number, month: number) {
  const start = new Date(year, month, 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(year, month + 1, 0);
  end.setHours(0, 0, 0, 0);
  return { start, end };
}

// Shared helper: open self-assessment if all non-MANAGEMENT reviewers are ready AND deadline passed
async function maybeOpenSelfAssessment(appraisalId: string): Promise<boolean> {
  const appraisal = await db.appraisal.findUniqueOrThrow({
    where: { id: appraisalId },
    include: { reviewers: true, employee: { select: { branchId: true } }, cycle: true },
  });

  if (appraisal.stage !== "REVIEWERS_ASSIGNED") return false;

  const nonMgmt = appraisal.reviewers.filter((r) => r.kind !== "MANAGEMENT");
  const allReady = nonMgmt.length > 0 && nonMgmt.every(
    (r) => r.availabilityStatus === "AVAILABLE" || r.availabilityStatus === "FORCED"
  );

  if (!allReady) return false;

  const deadline = appraisal.availabilityDeadline;
  const deadlinePassed = !deadline || (await getNow()) >= deadline;

  if (!deadlinePassed) return false;

  const holidaySet = await loadHolidaySet(appraisal.cycle.orgId, appraisal.employee.branchId);
  const selfDeadline = addBusinessDays(await getNow(), 3, holidaySet);

  await db.appraisal.update({
    where: { id: appraisalId },
    data: { stage: "SELF_ASSESSMENT_OPEN", selfAssessmentDeadline: selfDeadline },
  });
  await logTransition(appraisalId, "REVIEWERS_ASSIGNED", "SELF_ASSESSMENT_OPEN");

  await notify({
    userId: appraisal.employeeId,
    orgId: appraisal.cycle.orgId,
    kind: "SELF_ASSESSMENT_OPEN",
    title: "Your self-assessment is open",
    body: "Please complete your self-assessment form.",
    link: `/ams/my-appraisal/${appraisalId}/self-assessment`,
    email: true,
    payload: { appraisalId, employeeId: appraisal.employeeId },
  });

  return true;
}

// ─── Cycles ───────────────────────────────────────────────────────────────────

export async function listCycles(orgId: string) {
  return db.appraisalCycle.findMany({
    where: { orgId },
    orderBy: { year: "desc" },
    include: { _count: { select: { appraisals: true } } },
  });
}

export async function createCycle(orgId: string, name: string, year: number) {
  return db.appraisalCycle.create({ data: { orgId, name, year, status: "DRAFT" } });
}

export async function activateCycle(cycleId: string) {
  return db.appraisalCycle.update({ where: { id: cycleId }, data: { status: "ACTIVE" } });
}

export async function closeCycle(cycleId: string) {
  return db.appraisalCycle.update({ where: { id: cycleId }, data: { status: "CLOSED" } });
}

// ─── Criteria ─────────────────────────────────────────────────────────────────

export async function listCriteria(orgId: string) {
  return db.appraisalCriterion.findMany({
    where: { orgId },
    orderBy: [{ group: "asc" }, { label: "asc" }],
    include: { role: true },
  });
}

export async function getSelfFormTemplate(orgId: string): Promise<AppraisalSelfFormTemplate> {
  const delegate = (db as typeof db & {
    appraisalSelfTemplate?: {
      findUnique: (args: { where: { orgId: string }; select: { content: true } }) => Promise<{ content: unknown } | null>;
    };
  }).appraisalSelfTemplate;

  if (!delegate) return buildDefaultSelfFormTemplate();

  const row = await delegate.findUnique({
    where: { orgId },
    select: { content: true },
  });

  if (!row) return buildDefaultSelfFormTemplate();
  return normalizeSelfFormTemplate(row.content);
}

export async function saveSelfFormTemplate(orgId: string, template: AppraisalSelfFormTemplate) {
  const delegate = (db as typeof db & {
    appraisalSelfTemplate?: {
      upsert: (args: {
        where: { orgId: string };
        update: { content: AppraisalSelfFormTemplate };
        create: { orgId: string; content: AppraisalSelfFormTemplate };
      }) => Promise<unknown>;
    };
  }).appraisalSelfTemplate;

  if (!delegate) {
    throw new Error("Self-assessment template storage is unavailable. Restart the server after updating Prisma.");
  }

  return delegate.upsert({
    where: { orgId },
    update: { content: template },
    create: { orgId, content: template },
  });
}

export type CriterionSubtopic = { id: string; label: string; weight: number; order: number };
export type CriterionTopic = {
  id: string;
  label: string;
  order: number;
  maxPoints: number;
  kind: string;
  questions: string[];
  reviewerOnly: boolean;
  meta: Record<string, unknown> | null;
  subtopics: CriterionSubtopic[];
};

export async function getCriteriaTree(
  orgId: string,
  phase: string,
  role?: string,
): Promise<CriterionTopic[]> {
  const topics = await db.appraisalCriterion.findMany({
    where: { orgId, phase, parentId: null },
    orderBy: { order: "asc" },
    include: { children: { orderBy: { order: "asc" } } },
  });

  let result = topics.map((t) => ({
    id: t.id,
    label: t.label,
    order: t.order,
    maxPoints: t.maxPoints,
    kind: t.kind,
    questions: Array.isArray(t.questions) ? t.questions.filter((value): value is string => typeof value === "string") : [],
    reviewerOnly: t.reviewerOnly,
    meta: (t.meta as Record<string, unknown> | null) ?? null,
    subtopics: t.children.map((s) => ({
      id: s.id,
      label: s.label,
      weight: s.weight,
      order: s.order,
    })),
  }));

  if (role && phase !== "SELF") {
    const visible = filterCriteriaPointsByRole(role as EvaluatorRole, topics);
    const visibleIds = new Set(visible.map((criterion) => criterion.id));
    result = result.filter((topic) => visibleIds.has(topic.id));
  }

  return result;
}

export async function createCriterion(orgId: string, data: {
  code?: string; label: string; description?: string; weight?: number; group?: string; roleId?: string;
  phase?: string; parentId?: string; order?: number;
  maxPoints?: number; kind?: string; questions?: string[];
  reviewerOnly?: boolean; meta?: Record<string, unknown>;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return db.appraisalCriterion.create({ data: { orgId, ...(data as any) } });
}

export async function deleteCriterion(orgId: string, id: string) {
  const criterion = await db.appraisalCriterion.findFirstOrThrow({
    where: { id, orgId },
    select: { id: true },
  });
  return db.appraisalCriterion.delete({ where: { id: criterion.id } });
}

// ─── Due-date driven appraisal generation ────────────────────────────────────

export async function findOrCreateCycle(orgId: string, year: number, kind: AppraisalKind) {
  const name = kind === "ANNUAL" ? `Annual ${year}` : `Intermediate ${year}`;
  const existing = await db.appraisalCycle.findFirst({ where: { orgId, name } });
  if (existing) return existing;
  return db.appraisalCycle.create({ data: { orgId, name, year, status: "ACTIVE" } });
}

export async function syncEmployeeAppraisalSchedule({
  orgId,
  employeeId,
  joinDate,
  priorExperienceYears,
}: {
  orgId: string;
  employeeId: string;
  joinDate: Date;
  priorExperienceYears: number;
}) {
  const normalizedJoinDate = normalizeDateOnly(joinDate);
  const slots = computeSchedule(normalizedJoinDate, priorExperienceYears, APPRAISAL_SCHEDULE_HORIZON_YEARS).map((slot) => ({
    dueDate: normalizeDateOnly(slot.dueDate),
    kind: slot.kind,
    cycleIndex: slot.cycleIndex,
  }));
  const desiredKeys = new Set(slots.map((slot) => scheduleKey(slot.dueDate, slot.kind)));
  const existing = await db.appraisalSchedule.findMany({
    where: { employeeId },
    select: {
      id: true,
      dueDate: true,
      kind: true,
      status: true,
    },
  });

  const scheduledToDelete = existing
    .filter((entry) => entry.status === "SCHEDULED" && !desiredKeys.has(scheduleKey(entry.dueDate, entry.kind as AppraisalKind)))
    .map((entry) => entry.id);

  if (scheduledToDelete.length > 0) {
    await db.appraisalSchedule.deleteMany({
      where: { id: { in: scheduledToDelete } },
    });
  }

  const generatedKeys = new Set(
    existing
      .filter((entry) => entry.status === "GENERATED")
      .map((entry) => scheduleKey(entry.dueDate, entry.kind as AppraisalKind)),
  );

  for (const slot of slots) {
    if (generatedKeys.has(scheduleKey(slot.dueDate, slot.kind))) continue;

    await db.appraisalSchedule.upsert({
      where: {
        employeeId_dueDate_kind: {
          employeeId,
          dueDate: slot.dueDate,
          kind: slot.kind,
        },
      },
      update: {
        orgId,
        cycleIndex: slot.cycleIndex,
        status: "SCHEDULED",
        appraisalId: null,
      },
      create: {
        orgId,
        employeeId,
        dueDate: slot.dueDate,
        kind: slot.kind,
        cycleIndex: slot.cycleIndex,
        status: "SCHEDULED",
      },
    });
  }
}

export async function syncOrgAppraisalSchedules(orgId: string) {
  const employees = await db.user.findMany({
    where: { orgId },
    select: {
      id: true,
      employmentRecord: {
        select: {
          joinDate: true,
          exitDate: true,
          priorExperienceYears: true,
        },
      },
    },
  });

  for (const employee of employees) {
    const employmentRecord = employee.employmentRecord;
    if (!employmentRecord || employmentRecord.exitDate) continue;

    await syncEmployeeAppraisalSchedule({
      orgId,
      employeeId: employee.id,
      joinDate: employmentRecord.joinDate,
      priorExperienceYears: employmentRecord.priorExperienceYears ?? 0,
    });
  }
}

async function listDueAppraisalsFromComputedSchedule(
  orgId: string,
  year: number,
  month: number
): Promise<DueAppraisalRow[]> {
  const [users, exemptRows] = await Promise.all([
    db.user.findMany({
      where: { orgId, active: true },
      select: {
        id: true,
        name: true,
        designation: true,
        department: { select: { name: true } },
        employmentRecord: {
          select: { joinDate: true, exitDate: true, priorExperienceYears: true },
        },
      },
    }),
    db.userRole.findMany({
      where: {
        user: { orgId },
        role: { permissions: { some: { permission: { key: { in: EXEMPT_PERMISSIONS } } } } },
      },
      select: { userId: true },
    }),
  ]);
  const exemptUserIds = new Set(exemptRows.map((r) => r.userId));

  type Eligible = { user: typeof users[0]; slot: NonNullable<ReturnType<typeof dueInMonth>>; cycleName: string };
  const eligible: Eligible[] = [];

  for (const user of users) {
    if (exemptUserIds.has(user.id)) continue;
    const record = user.employmentRecord;
    if (!record || record.exitDate) continue;

    const slot = dueInMonth(record.joinDate, record.priorExperienceYears ?? 0, year, month);
    if (!slot) continue;

    const cycleYear = slot.dueDate.getFullYear();
    const cycleName = slot.kind === "ANNUAL" ? `Annual ${cycleYear}` : `Intermediate ${cycleYear}`;
    eligible.push({ user, slot, cycleName });
  }

  if (eligible.length === 0) return [];

  const uniqueCycleNames = [...new Set(eligible.map((entry) => entry.cycleName))];
  const cycles = await db.appraisalCycle.findMany({
    where: { orgId, name: { in: uniqueCycleNames } },
    select: { id: true, name: true },
  });
  const cycleByName = new Map(cycles.map((cycle) => [cycle.name, cycle.id]));

  const relevantCycleIds = cycles.map((cycle) => cycle.id);
  const eligibleEmployeeIds = eligible.map((entry) => entry.user.id);
  const existingAppraisals = relevantCycleIds.length > 0
    ? await db.appraisal.findMany({
        where: { cycleId: { in: relevantCycleIds }, employeeId: { in: eligibleEmployeeIds } },
        select: { id: true, cycleId: true, employeeId: true },
      })
    : [];
  const appraisalByKey = new Map(existingAppraisals.map((appraisal) => [`${appraisal.cycleId}:${appraisal.employeeId}`, appraisal.id]));

  return eligible.map(({ user, slot, cycleName }) => {
    const cycleId = cycleByName.get(cycleName);
    const appraisalId = cycleId ? (appraisalByKey.get(`${cycleId}:${user.id}`) ?? null) : null;
    return {
      employeeId: user.id,
      employeeName: user.name,
      designation: user.designation,
      department: user.department?.name ?? null,
      dueDate: slot.dueDate,
      kind: slot.kind,
      appraisalId,
    };
  });
}

export type DueAppraisalRow = {
  employeeId: string;
  employeeName: string;
  designation: string | null;
  department: string | null;
  dueDate: Date;
  kind: AppraisalKind;
  appraisalId: string | null;
};

// Permission keys held by management/admin — excluded from being appraised
const EXEMPT_PERMISSIONS = ["ams.appraisal.management_review", "admin.org.manage"];

export async function listAppraisalEligibleUsers(orgId: string) {
  const [users, exemptRows] = await Promise.all([
    db.user.findMany({
      where: {
        orgId,
        active: true,
        employmentRecord: {
          is: {
            exitDate: null,
          },
        },
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        designation: true,
        department: { select: { name: true } },
      },
    }),
    db.userRole.findMany({
      where: {
        user: { orgId },
        role: { permissions: { some: { permission: { key: { in: EXEMPT_PERMISSIONS } } } } },
      },
      select: { userId: true },
    }),
  ]);

  const exemptUserIds = new Set(exemptRows.map((row) => row.userId));
  return users.filter((user) => !exemptUserIds.has(user.id));
}

export async function listDueAppraisals(
  orgId: string,
  year: number,
  month: number
): Promise<DueAppraisalRow[]> {
  try {
    const { start, end } = monthBounds(year, month);

    const [schedules, exemptRows] = await Promise.all([
      db.appraisalSchedule.findMany({
        where: {
          orgId,
          status: { in: ["SCHEDULED", "GENERATED"] },
          dueDate: { gte: start, lte: end },
          employee: {
            active: true,
            employmentRecord: {
              is: {
                exitDate: null,
              },
            },
          },
        },
        orderBy: [{ dueDate: "asc" }, { employee: { name: "asc" } }],
        select: {
          dueDate: true,
          kind: true,
          employeeId: true,
          appraisalId: true,
          employee: {
            select: {
              name: true,
              designation: true,
              department: { select: { name: true } },
            },
          },
        },
      }),
      db.userRole.findMany({
        where: {
          user: { orgId },
          role: { permissions: { some: { permission: { key: { in: EXEMPT_PERMISSIONS } } } } },
        },
        select: { userId: true },
      }),
    ]);

    const exemptUserIds = new Set(exemptRows.map((r) => r.userId));

    return schedules
      .filter((schedule) => !exemptUserIds.has(schedule.employeeId))
      .map((schedule) => ({
        employeeId: schedule.employeeId,
        employeeName: schedule.employee.name,
        designation: schedule.employee.designation,
        department: schedule.employee.department?.name ?? null,
        dueDate: schedule.dueDate,
        kind: schedule.kind as AppraisalKind,
        appraisalId: schedule.appraisalId,
      }));
  } catch {
    if (process.env.NODE_ENV === "development") {
      console.warn("AMS due-list fallback activated.");
    }
    return listDueAppraisalsFromComputedSchedule(orgId, year, month);
  }
}

export async function createAppraisalForEmployee(
  orgId: string,
  employeeId: string,
  dueDate: Date,
  kind: AppraisalKind
) {
  const normalizedDueDate = normalizeDateOnly(dueDate);
  const year = normalizedDueDate.getFullYear();
  const cycle = await findOrCreateCycle(orgId, year, kind);

  const appraisal = await db.appraisal.upsert({
    where: { cycleId_employeeId: { cycleId: cycle.id, employeeId } },
    update: {
      dueDate: normalizedDueDate,
    },
    create: {
      cycleId: cycle.id,
      employeeId,
      dueDate: normalizedDueDate,
      stage: "DUE_NOTIFIED",
    },
  });

  await db.appraisalSchedule.updateMany({
    where: {
      employeeId,
      dueDate: normalizedDueDate,
      kind,
    },
    data: {
      status: "GENERATED",
      appraisalId: appraisal.id,
    },
  });

  return appraisal;
}

// ─── Appraisals ───────────────────────────────────────────────────────────────

export async function listAppraisals(orgId: string, filters?: {
  cycleId?: string; stage?: string; employeeId?: string;
}) {
  return db.appraisal.findMany({
    where: {
      cycle: { orgId },
      ...(filters?.cycleId && { cycleId: filters.cycleId }),
      ...(filters?.stage && { stage: filters.stage }),
      ...(filters?.employeeId && { employeeId: filters.employeeId }),
    },
    orderBy: { createdAt: "desc" },
    include: {
      employee: { select: { id: true, name: true, designation: true } },
      cycle: { select: { name: true, year: true } },
      reviewers: { include: { user: { select: { id: true, name: true } } } },
    },
  });
}

export async function getAppraisal(id: string) {
  return db.appraisal.findUnique({
    where: { id },
    include: {
      employee: {
        select: {
          id: true,
          name: true,
          designation: true,
          department: true,
          employmentRecord: {
            select: { joinDate: true },
          },
        },
      },
      cycle: true,
      reviewers: { include: { user: { select: { id: true, name: true } }, ratings: true } },
      selfAssessment: true,
      reviewerRatings: { include: { reviewer: { include: { user: { select: { id: true, name: true } } } } } },
      managementReviews: { include: { reviewer: { select: { id: true, name: true } } } },
      meeting: { include: { minutes: { include: { author: { select: { id: true, name: true } } } } } },
      hikeDecision: { include: { decidedBy: { select: { id: true, name: true } } } },
      auditLog: { orderBy: { createdAt: "asc" } },
    },
  });
}

// Minimal query for the reviewer's own review page — fetches only the fields the page needs.
export async function getMyReviewView(appraisalId: string, userId: string) {
  const result = await db.appraisal.findUnique({
    where: { id: appraisalId },
    select: {
      id: true,
      stage: true,
      availabilityDeadline: true,
      reviewerRatingDeadline: true,
      selfAssessment: {
        select: {
          answers: true,
          editCount: true,
        },
      },
      employee: { select: { name: true, designation: true } },
      cycle: { select: { name: true, year: true } },
      reviewers: {
        select: {
          id: true,
          userId: true,
          kind: true,
          availabilityStatus: true,
          user: {
            select: {
              name: true,
              designation: true,
            },
          },
          ratings: {
            orderBy: { submittedAt: "desc" },
            take: 1,
            select: { ratings: true, submittedAt: true, status: true },
          },
        },
      },
    },
  });
  if (!result) return null;

  return {
    ...result,
    reviewers: result.reviewers.filter((reviewer) => reviewer.kind !== "MANAGEMENT"),
    myReviewer: result.reviewers.find((reviewer) => reviewer.userId === userId && reviewer.kind !== "MANAGEMENT") ?? null,
  };
}

// ─── Stage transitions ────────────────────────────────────────────────────────

export async function assignReviewers(
  appraisalId: string,
  reviewers: { userId: string; kind: Exclude<ReviewerKind, "MANAGEMENT"> }[],
  actorId: string
) {
  const appraisal = await db.appraisal.findUniqueOrThrow({
    where: { id: appraisalId },
    include: { cycle: true, employee: { select: { branchId: true } } },
  });

  // Allow from DUE_NOTIFIED or REVIEWERS_ASSIGNED (re-assignment)
  if (appraisal.stage !== "DUE_NOTIFIED" && appraisal.stage !== "REVIEWERS_ASSIGNED") {
    assertTransition(appraisal.stage as Stage, "REVIEWERS_ASSIGNED");
  }

  const now = await getNow();

  // Compute deadline before transaction (async, can't run inside Prisma tx)
  const deadline = appraisal.availabilityDeadline == null
    ? await computeAvailabilityDeadline(appraisal.cycle.orgId, appraisal.employee.branchId)
    : null;

  await db.$transaction(async (tx) => {
    await tx.appraisalReviewer.deleteMany({ where: { appraisalId } });
    await tx.appraisalReviewer.createMany({
      data: reviewers.map((r) => ({
        appraisalId,
        ...r,
        availabilityStatus: "PENDING",
        assignedAt: now,
      })),
    });

    await tx.appraisal.update({
      where: { id: appraisalId },
      data: {
        stage: "REVIEWERS_ASSIGNED",
        ...(deadline != null && { availabilityDeadline: deadline }),
      },
    });
  });

  await logTransition(appraisalId, appraisal.stage as Stage, "REVIEWERS_ASSIGNED", actorId);

  await notifyMany(
    reviewers.map((r) => r.userId),
    {
      orgId: appraisal.cycle.orgId,
      kind: "REVIEWER_ASSIGNED",
      title: "You've been assigned as reviewer",
      body: "Please confirm your availability for an appraisal review.",
      link: `/ams/my-reviews/${appraisalId}`,
      payload: { appraisalId },
    }
  );
}

export async function setReviewerAvailability(
  appraisalId: string,
  userId: string,
  available: boolean,
  force = false
) {
  const status = force ? "FORCED" : available ? "AVAILABLE" : "UNAVAILABLE";

  await db.appraisalReviewer.update({
    where: { appraisalId_userId: { appraisalId, userId } },
    data: { availabilityStatus: status, decidedAt: await getNow() },
  });

  const appraisal = await db.appraisal.findUniqueOrThrow({
    where: { id: appraisalId },
    include: { reviewers: true, cycle: true },
  });

  // Notify admin/HR if someone is unavailable (and not forced)
  if (status === "UNAVAILABLE") {
    const admins = await db.userRole.findMany({
      where: { role: { orgId: appraisal.cycle.orgId, name: { in: ["Admin", "HR"] } } },
      select: { userId: true },
    });
    await notifyMany(
      admins.map((a) => a.userId),
      {
        orgId: appraisal.cycle.orgId,
        kind: "REVIEWER_UNAVAILABLE",
        title: "Reviewer unavailable for appraisal",
        body: "A reviewer is unavailable. Please re-assign or force.",
        link: `/ams/appraisals/${appraisalId}`,
        payload: { appraisalId, unavailableUserId: userId },
      }
    );
  }

  // Try to open self-assessment (checks all conditions internally)
  await maybeOpenSelfAssessment(appraisalId);
}

// Called by the daily cron to open self-assessments whose deadline has passed
export async function openPastDeadlineAssessments(): Promise<number> {
  const now = await getNow();
  const pending = await db.appraisal.findMany({
    where: {
      stage: "REVIEWERS_ASSIGNED",
      availabilityDeadline: { lte: now },
    },
    include: { reviewers: true },
  });

  let opened = 0;
  for (const a of pending) {
    const opened_ = await maybeOpenSelfAssessment(a.id);
    if (opened_) opened++;
  }
  return opened;
}

// Called by the daily cron to force-advance stages past their deadlines
export async function advancePastDeadlineStages(): Promise<{ selfAdvanced: number; reviewerAdvanced: number }> {
  const now = await getNow();
  let selfAdvanced = 0;
  let reviewerAdvanced = 0;

  // Self-assessment deadline passed → force to REVIEWER_RATING
  const selfDue = await db.appraisal.findMany({
    where: { stage: "SELF_ASSESSMENT_OPEN", selfAssessmentDeadline: { lte: now } },
    include: { cycle: true, employee: { select: { branchId: true } }, reviewers: { where: { kind: { in: ["HR", "TL", "MANAGER"] } } } },
  });
  for (const a of selfDue) {
    const holidaySet = await loadHolidaySet(a.cycle.orgId, a.employee.branchId);
    const reviewerDeadline = addBusinessDays(now, 3, holidaySet);
    await db.appraisal.update({
      where: { id: a.id },
      data: { stage: "REVIEWER_RATING", reviewerRatingDeadline: reviewerDeadline },
    });
    await logTransition(a.id, "SELF_ASSESSMENT_OPEN", "REVIEWER_RATING", undefined, "Self-assessment deadline passed");
    await notifyMany(a.reviewers.map((r) => r.userId), {
      orgId: a.cycle.orgId,
      kind: "REVIEW_OPEN",
      title: "Reviewer rating window is open",
      link: `/ams/my-reviews/${a.id}`,
      payload: { appraisalId: a.id },
    });
    selfAdvanced++;
  }

  // Reviewer rating deadline passed → force to MANAGEMENT_REVIEW
  const reviewerDue = await db.appraisal.findMany({
    where: { stage: "REVIEWER_RATING", reviewerRatingDeadline: { lte: now } },
    include: { cycle: true },
  });
  for (const a of reviewerDue) {
    await db.appraisal.update({ where: { id: a.id }, data: { stage: "MANAGEMENT_REVIEW" } });
    await logTransition(a.id, "REVIEWER_RATING", "MANAGEMENT_REVIEW", undefined, "Deadline passed");
    const mgmtUsers = await db.userRole.findMany({
      where: {
        role: {
          orgId: a.cycle.orgId,
          permissions: { some: { permission: { key: "ams.appraisal.management_review" } } },
        },
      },
      select: { userId: true },
    });
    await notifyMany(
      [...new Set(mgmtUsers.map((m) => m.userId))],
      { kind: "MANAGEMENT_REVIEW_OPEN", title: "Appraisal ready for management review — claim it", link: `/ams/appraisals/${a.id}` }
    );
    reviewerAdvanced++;
  }

  return { selfAdvanced, reviewerAdvanced };
}

export async function claimManagementReview(appraisalId: string, userId: string) {
  const appraisal = await db.appraisal.findUniqueOrThrow({
    where: { id: appraisalId },
    include: { reviewers: { where: { kind: "MANAGEMENT" } } },
  });

  if (appraisal.stage !== "MANAGEMENT_REVIEW") {
    throw new Error("Appraisal is not in MANAGEMENT_REVIEW stage.");
  }
  if (appraisal.reviewers.length > 0) {
    throw new Error("This appraisal has already been claimed.");
  }

  await db.appraisalReviewer.create({
    data: { appraisalId, userId, kind: "MANAGEMENT", availabilityStatus: "AVAILABLE" },
  });

  await logTransition(appraisalId, "MANAGEMENT_REVIEW", "MANAGEMENT_REVIEW", userId, `Claimed by user ${userId}`);
}

async function loadCriteriaPointsForPhase(
  orgId: string,
  phase: "SELF" | "REVIEWER" | "MANAGEMENT",
  role?: EvaluatorRole,
) {
  const rows = await db.appraisalCriterion.findMany({
    where: { orgId, phase, parentId: null },
    orderBy: { order: "asc" },
    include: { children: { orderBy: { order: "asc" } } },
  });

  if (role) return filterCriteriaPointsByRole(role, rows);
  return rows.map(mapCriterionRowToPoint);
}

async function notifyManagementReviewOpen(appraisalId: string, orgId: string) {
  const mgmtUsers = await db.userRole.findMany({
    where: {
      role: {
        orgId,
        permissions: { some: { permission: { key: "ams.appraisal.management_review" } } },
      },
    },
    select: { userId: true },
  });

  await notifyMany(
    [...new Set(mgmtUsers.map((row) => row.userId))],
    {
      kind: "MANAGEMENT_REVIEW_OPEN",
      title: "Appraisal ready for management review - claim it",
      link: `/ams/appraisals/${appraisalId}`,
    }
  );
}

async function openManagementReviewStage(appraisalId: string, reason?: string) {
  const appraisal = await db.appraisal.findUniqueOrThrow({
    where: { id: appraisalId },
    include: { cycle: true },
  });

  if (appraisal.stage !== "REVIEWER_RATING") return;

  await db.appraisal.update({
    where: { id: appraisalId },
    data: { stage: "MANAGEMENT_REVIEW" },
  });
  await logTransition(appraisalId, "REVIEWER_RATING", "MANAGEMENT_REVIEW", undefined, reason);
  await notifyManagementReviewOpen(appraisalId, appraisal.cycle.orgId);
}

export async function submitSelfAssessment(
  appraisalId: string,
  employeeId: string,
  answers: SelfAssessmentAnswers,
  action: SubmissionStatus,
): Promise<{ editCount: number; status: SubmissionStatus }> {
  const now = await getNow();
  const appraisal = await db.appraisal.findUniqueOrThrow({
    where: { id: appraisalId },
    select: {
      stage: true,
      employeeId: true,
      selfAssessmentDeadline: true,
      cycle: { select: { orgId: true } },
    },
  });

  if (appraisal.stage !== "SELF_ASSESSMENT_OPEN") {
    throw new Error("Self-assessment is not currently open.");
  }
  if (appraisal.employeeId !== employeeId) {
    throw new Error("Not authorized.");
  }
  if (appraisal.selfAssessmentDeadline && now >= appraisal.selfAssessmentDeadline) {
    throw new Error("Self-assessment deadline has passed.");
  }

  const criteria = await loadCriteriaPointsForPhase(appraisal.cycle.orgId, "SELF");
  const sanitizedAnswers: SelfAssessmentAnswers = {
    version: "v2",
    employeeInfo: Object.fromEntries(
      Object.entries(answers.employeeInfo ?? {}).map(([key, value]) => [key, String(value)])
    ),
    responses: Object.fromEntries(
      Object.entries(answers.responses ?? {}).map(([key, value]) => [
        key,
        {
          value: value?.value ? String(value.value) : undefined,
          option: value?.option ? String(value.option) : undefined,
          explanation: value?.explanation ? String(value.explanation) : undefined,
        },
      ])
    ),
    categoryPoints: sanitizeSelfRatings(criteria, answers.categoryPoints ?? {}),
    feedback: answers.feedback ? String(answers.feedback) : "",
  };

  const record = await db.selfAssessment.upsert({
    where: { appraisalId },
    update: {
      answers: sanitizedAnswers,
      status: action,
      editCount: { increment: 1 },
      submittedAt: action === "SUBMITTED" ? now : null,
    },
    create: {
      appraisalId,
      answers: sanitizedAnswers,
      status: action,
      editCount: 0,
      submittedAt: action === "SUBMITTED" ? now : null,
    },
    select: { editCount: true, status: true },
  });

  return { editCount: record.editCount, status: record.status as SubmissionStatus };
}

export async function submitReviewerRating(
  appraisalId: string,
  reviewerUserId: string,
  ratings: ReviewerRatingAnswers,
  action: SubmissionStatus,
  overallComments?: string
) {
  const now = await getNow();
  const reviewer = await db.appraisalReviewer.findFirstOrThrow({
    where: { appraisalId, userId: reviewerUserId },
    include: { appraisal: { include: { cycle: true } } },
  });

  if (!["HR", "TL", "MANAGER"].includes(reviewer.kind)) {
    throw new Error("Only assigned HR, TL, or Manager reviewers can rate here.");
  }
  if (reviewer.appraisal.stage !== "REVIEWER_RATING") {
    throw new Error("Reviewer rating is not currently open.");
  }
  if (!["AVAILABLE", "FORCED"].includes(reviewer.availabilityStatus)) {
    throw new Error("You are not authorized to rate this appraisal right now.");
  }
  if (reviewer.appraisal.reviewerRatingDeadline && now >= reviewer.appraisal.reviewerRatingDeadline) {
    await openManagementReviewStage(appraisalId, "Reviewer rating deadline passed");
    throw new Error("Reviewer rating deadline has passed.");
  }

  const criteria = await loadCriteriaPointsForPhase(
    reviewer.appraisal.cycle.orgId,
    "REVIEWER",
    reviewer.kind as EvaluatorRole,
  );
  const sanitized = sanitizeReviewerRatings(
    criteria,
    ratings.subItemRatings ?? {},
    ratings.responses ?? {},
    ratings.comments ?? {},
  );
  const nextRatings: ReviewerRatingAnswers = {
    version: "v2",
    ...sanitized,
  };
  const existingRating = await db.reviewerRating.findUnique({
    where: { appraisalId_reviewerId: { appraisalId, reviewerId: reviewer.id } },
    select: { ratings: true, status: true },
  });
  const previousSubmittedBase =
    existingRating && isSubmittedStatus(existingRating.status)
      ? (existingRating.ratings as ReviewerRatingAnswers)
      : null;
  const previousSubmitted = previousSubmittedBase ?? (
    ratings.previousCategoryPoints || ratings.previousSubItemRatings
      ? {
          version: "v2",
          categoryPoints: ratings.previousCategoryPoints ?? {},
          subItemRatings: ratings.previousSubItemRatings ?? {},
          comments: {},
          changeReasons: ratings.changeReasons ?? {},
        }
      : null
  );
  const changeMeta = buildRatingChangeMetadata(
    previousSubmitted,
    { ...nextRatings, changeReasons: ratings.changeReasons ?? {} },
    new Set(criteria.map((criterion) => criterion.id)),
  );
  const persistedRatings: ReviewerRatingAnswers = {
    ...nextRatings,
    ...changeMeta,
  };

  await db.reviewerRating.upsert({
    where: { appraisalId_reviewerId: { appraisalId, reviewerId: reviewer.id } },
    update: {
      ratings: persistedRatings,
      comments: overallComments?.trim() || null,
      status: action,
      submittedAt: action === "SUBMITTED" ? now : null,
    },
    create: {
      appraisalId,
      reviewerId: reviewer.id,
      ratings: persistedRatings,
      comments: overallComments?.trim() || null,
      status: action,
      submittedAt: action === "SUBMITTED" ? now : null,
    },
  });

  if (action !== "SUBMITTED") return;

  const allReviewers = await db.appraisalReviewer.findMany({
    where: { appraisalId, kind: { in: ["HR", "TL", "MANAGER"] } },
    include: { ratings: true },
  });

  const allRated = allReviewers.every((row) => row.ratings.some((rating) => isSubmittedStatus(rating.status)));
  if (!allRated) return;

  await openManagementReviewStage(appraisalId);
}

export async function submitManagementReview(
  appraisalId: string,
  reviewerUserId: string,
  ratings: ManagementReviewAnswers,
  proposedDates: Date[],
  action: SubmissionStatus,
) {
  const reviewer = await db.appraisalReviewer.findFirst({
    where: { appraisalId, userId: reviewerUserId, kind: "MANAGEMENT" },
    include: { appraisal: { include: { cycle: true } } },
  });
  if (!reviewer) throw new Error("You have not claimed this appraisal.");

  if (reviewer.appraisal.stage !== "MANAGEMENT_REVIEW") {
    throw new Error("Management review is not currently open.");
  }

  const criteria = await loadCriteriaPointsForPhase(
    reviewer.appraisal.cycle.orgId,
    "MANAGEMENT",
    "MANAGEMENT",
  );
  const sanitized = sanitizeReviewerRatings(
    criteria,
    ratings.subItemRatings ?? {},
    ratings.responses ?? {},
    ratings.comments ?? {},
  );
  const nextRatings: ManagementReviewAnswers = {
    version: "v2",
    ...sanitized,
  };
  const existingReview = await db.managementReview.findUnique({
    where: { appraisalId_reviewerId: { appraisalId, reviewerId: reviewerUserId } },
    select: { ratings: true, status: true },
  });
  const previousSubmittedBase =
    existingReview && isSubmittedStatus(existingReview.status)
      ? (existingReview.ratings as ManagementReviewAnswers)
      : null;
  const previousSubmitted = previousSubmittedBase ?? (
    ratings.previousCategoryPoints || ratings.previousSubItemRatings
      ? {
          version: "v2",
          categoryPoints: ratings.previousCategoryPoints ?? {},
          subItemRatings: ratings.previousSubItemRatings ?? {},
          comments: {},
          changeReasons: ratings.changeReasons ?? {},
        }
      : null
  );
  const changeMeta = buildRatingChangeMetadata(
    previousSubmitted,
    { ...nextRatings, changeReasons: ratings.changeReasons ?? {} },
    new Set(criteria.map((criterion) => criterion.id)),
  );
  const persistedRatings: ManagementReviewAnswers = {
    ...nextRatings,
    ...changeMeta,
  };

  await db.managementReview.upsert({
    where: { appraisalId_reviewerId: { appraisalId, reviewerId: reviewerUserId } },
    update: {
      ratings: persistedRatings,
      proposedDates,
      status: action,
      submittedAt: action === "SUBMITTED" ? await getNow() : null,
    },
    create: {
      appraisalId,
      reviewerId: reviewerUserId,
      ratings: persistedRatings,
      proposedDates,
      status: action,
      submittedAt: action === "SUBMITTED" ? await getNow() : null,
    },
  });

  if (action !== "SUBMITTED") return;

  await db.appraisal.update({ where: { id: appraisalId }, data: { stage: "MEETING_PENDING" } });
  await logTransition(appraisalId, "MANAGEMENT_REVIEW", "MEETING_PENDING");

  const hrReviewers = await db.appraisalReviewer.findMany({
    where: { appraisalId, kind: "HR" },
  });
  await notifyMany(
    hrReviewers.map((r) => r.userId),
    {
      kind: "MEETING_PENDING",
      title: "Confirm appraisal meeting date",
      link: `/ams/appraisals/${appraisalId}`,
      email: true,
    }
  );
}

export async function confirmMeeting(appraisalId: string, hrUserId: string, scheduledAt: Date) {
  await db.appraisalMeeting.upsert({
    where: { appraisalId },
    update: { scheduledAt, confirmedById: hrUserId, status: "SCHEDULED" },
    create: { appraisalId, scheduledAt, confirmedById: hrUserId, status: "SCHEDULED" },
  });

  await db.appraisal.update({ where: { id: appraisalId }, data: { stage: "MEETING_PENDING" } });

  const appraisal = await db.appraisal.findUniqueOrThrow({
    where: { id: appraisalId },
    include: { reviewers: true },
  });

  const participants = [appraisal.employeeId, ...appraisal.reviewers.map((r) => r.userId)];
  await notifyMany([...new Set(participants)], {
    kind: "MEETING_CONFIRMED",
    title: `Appraisal meeting confirmed: ${scheduledAt.toDateString()}`,
    link: `/ams/appraisals/${appraisalId}`,
    email: true,
  });
}

export async function startMeeting(appraisalId: string) {
  await db.appraisalMeeting.update({ where: { appraisalId }, data: { status: "LIVE" } });
  await db.appraisal.update({ where: { id: appraisalId }, data: { stage: "MEETING_LIVE" } });
  await logTransition(appraisalId, "MEETING_PENDING", "MEETING_LIVE");
}

export async function addMeetingMinute(
  appraisalId: string,
  authorId: string,
  role: string,
  content: string
) {
  const meeting = await db.appraisalMeeting.findUniqueOrThrow({ where: { appraisalId } });
  return db.meetingMinute.create({ data: { meetingId: meeting.id, authorId, role, content } });
}

export async function closeMeeting(appraisalId: string) {
  await db.appraisalMeeting.update({ where: { appraisalId }, data: { status: "DONE" } });
  await db.appraisal.update({ where: { id: appraisalId }, data: { stage: "HIKE_FINALISATION" } });
  await logTransition(appraisalId, "MEETING_LIVE", "HIKE_FINALISATION");
}

export async function finaliseHike(
  appraisalId: string,
  decidedById: string,
  percent: number,
  amount: number,
  effectiveFrom: Date,
  notes?: string
) {
  const appraisal = await db.appraisal.findUniqueOrThrow({
    where: { id: appraisalId },
    include: { employee: { include: { employmentRecord: true } } },
  });

  await db.hikeDecision.upsert({
    where: { appraisalId },
    update: { decidedById, percent, amount, effectiveFrom, notes },
    create: { appraisalId, decidedById, percent, amount, effectiveFrom, notes },
  });

  if (appraisal.employee.employmentRecord) {
    const newCtc = (appraisal.employee.employmentRecord.ctc ?? 0) + amount;
    await db.employmentRecord.update({
      where: { userId: appraisal.employeeId },
      data: { ctc: newCtc },
    });
  }

  await db.appraisal.update({
    where: { id: appraisalId },
    data: {
      stage: "CLOSED",
      hikeFinal: { percent, amount, effectiveFrom: effectiveFrom.toISOString() },
    },
  });

  await logTransition(appraisalId, "HIKE_FINALISATION", "CLOSED", decidedById);

  await notify({
    userId: appraisal.employeeId,
    kind: "HIKE_FINALISED",
    title: "Appraisal complete — hike finalised",
    body: `Your hike of ${percent}% has been finalised.`,
    link: `/ams/appraisals/${appraisalId}`,
    email: true,
  });
}

export type AppraisalScoreResult = {
  selfNormalized: number | null;
  reviewerNormalized: number | null;
  managementNormalized: number | null;
  finalNormalized: number | null;
  grade: string | null;
  gradeLabel: string | null;
  hikePercent: number | null;
};

export async function computeAppraisalScore(appraisalId: string): Promise<AppraisalScoreResult> {
  const appraisal = await db.appraisal.findUniqueOrThrow({
    where: { id: appraisalId },
    include: {
      selfAssessment: { select: { answers: true } },
      reviewerRatings: { include: { reviewer: { select: { kind: true } } } },
      managementReviews: { select: { ratings: true } },
      cycle: { select: { orgId: true } },
      employee: { include: { employmentRecord: { select: { payrollMeta: true } } } },
    },
  });

  const orgId = appraisal.cycle.orgId;
  const allCriteria = await db.appraisalCriterion.findMany({
    where: { orgId, parentId: null, maxPoints: { gt: 0 } },
  });

  const settings = await getAppraisalSettings(orgId);
  const weights = settings.reviewerRoleWeights;

  function sumPoints(answers: Record<string, unknown>, criteriaRows: typeof allCriteria): { raw: number; max: number } {
    const points = (answers.categoryPoints ?? {}) as Record<string, number>;
    let raw = 0;
    let max = 0;
    for (const c of criteriaRows) {
      raw += points[c.id] ?? 0;
      max += c.maxPoints;
    }
    return { raw, max };
  }

  function criteriaForPhaseRole(phase: string, role?: string): typeof allCriteria {
    const phased = allCriteria.filter((c) => c.phase === phase);
    if (!role) return phased;
    return phased.filter((criterion) => {
      const allowed = ((criterion.meta as { allowedEvaluatorRoles?: string[] } | null)?.allowedEvaluatorRoles ?? []);
      if (!Array.isArray(allowed) || allowed.length === 0) return phase === "SELF";
      return allowed.includes(role);
    });
  }

  const selfScore = (() => {
    if (!appraisal.selfAssessment?.answers) return null;
    const { raw, max } = sumPoints(
      appraisal.selfAssessment.answers as Record<string, unknown>,
      criteriaForPhaseRole("SELF"),
    );
    return max > 0 ? normalizeScore(raw, max) : null;
  })();

  const reviewerScores: { kind: string; normalized: number }[] = [];
  for (const rr of appraisal.reviewerRatings) {
    const kind = rr.reviewer?.kind ?? "HR";
    const { raw, max } = sumPoints(
      rr.ratings as Record<string, unknown>,
      criteriaForPhaseRole("REVIEWER", kind),
    );
    if (max > 0) reviewerScores.push({ kind, normalized: normalizeScore(raw, max) });
  }

  const reviewerNormalized = (() => {
    if (reviewerScores.length === 0) return null;
    const totalWeight = reviewerScores.reduce((s, r) => s + (weights[r.kind as keyof typeof weights] ?? 1), 0);
    const weighted = reviewerScores.reduce(
      (s, r) => s + r.normalized * (weights[r.kind as keyof typeof weights] ?? 1),
      0,
    );
    return totalWeight > 0 ? weighted / totalWeight : null;
  })();

  const managementNormalized = (() => {
    if (appraisal.managementReviews.length === 0) return null;
    const scores = appraisal.managementReviews.map((mr) => {
      const { raw, max } = sumPoints(
        mr.ratings as Record<string, unknown>,
        criteriaForPhaseRole("MANAGEMENT", "MANAGEMENT"),
      );
      return max > 0 ? normalizeScore(raw, max) : null;
    }).filter((s): s is number => s !== null);
    return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
  })();

  if (selfScore === null && reviewerNormalized === null && managementNormalized === null) {
    return { selfNormalized: null, reviewerNormalized: null, managementNormalized: null, finalNormalized: null, grade: null, gradeLabel: null, hikePercent: null };
  }

  const finalNormalized = 0.2 * (selfScore ?? 0) + 0.7 * (reviewerNormalized ?? 0) + 0.1 * (managementNormalized ?? 0);
  const gradeInfo = getGrade(finalNormalized);
  const payrollMeta = appraisal.employee.employmentRecord?.payrollMeta as { monthlyGross?: number } | null;
  const monthlyGross = payrollMeta?.monthlyGross ?? 0;
  const hikePercent = getHikePercent(gradeInfo.grade, monthlyGross);

  return {
    selfNormalized: selfScore,
    reviewerNormalized,
    managementNormalized,
    finalNormalized,
    grade: gradeInfo.grade,
    gradeLabel: gradeInfo.label,
    hikePercent,
  };
}

export async function listMyAppraisals(employeeId: string) {
  return db.appraisal.findMany({
    where: { employeeId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      stage: true,
      dueDate: true,
      availabilityDeadline: true,
      selfAssessmentDeadline: true,
      cycle: { select: { name: true, year: true } },
      reviewers: {
        select: {
          id: true,
          kind: true,
          availabilityStatus: true,
          user: { select: { name: true } },
        },
      },
      selfAssessment: { select: { id: true, editCount: true } },
    },
  });
}

export async function notifyStalePendingReviewers(): Promise<number> {
  const now = await getNow();
  const stale = await db.appraisal.findMany({
    where: {
      stage: "REVIEWERS_ASSIGNED",
      availabilityDeadline: { lte: now },
      reviewers: { some: { kind: { not: "MANAGEMENT" }, availabilityStatus: { in: ["PENDING", "UNAVAILABLE"] } } },
    },
    include: { reviewers: true, cycle: true },
  });

  for (const a of stale) {
    const admins = await db.userRole.findMany({
      where: { role: { orgId: a.cycle.orgId, name: { in: ["Admin", "HR"] } } },
      select: { userId: true },
    });
    await notifyMany(
      admins.map((x) => x.userId),
      {
        kind: "REVIEWERS_PENDING_PAST_DEADLINE",
        title: "Reviewers unconfirmed past deadline — reassign or force",
        body: "The availability deadline has passed but some reviewers have not responded. Reassign or force to unblock self-assessment.",
        link: `/ams/appraisals/${a.id}`,
      }
    );
  }

  return stale.length;
}

export async function resetAmsData(orgId: string): Promise<void> {
  // Appraisal children cascade from Appraisal, but Appraisal has no cascade from AppraisalCycle
  await db.appraisal.deleteMany({ where: { cycle: { orgId } } });
  await db.appraisalCycle.deleteMany({ where: { orgId } });
  await setFrozenDate(null);
}

export async function listMyReviewAppraisals(userId: string) {
  return db.appraisal.findMany({
    where: {
      reviewers: { some: { userId, kind: { not: "MANAGEMENT" } } },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      stage: true,
      dueDate: true,
      availabilityDeadline: true,
      reviewerRatingDeadline: true,
      employee: { select: { id: true, name: true, designation: true } },
      cycle: { select: { name: true, year: true } },
      reviewers: {
        where: { userId },
        select: { kind: true, availabilityStatus: true },
      },
    },
  });
}
