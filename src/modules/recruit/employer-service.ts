import { db } from "@/lib/db";
import { auditRecruit } from "./audit";
import type { RecruitJobStatus, RecruitAppStage, RecruitListQuery } from "./types";
import { RECRUIT_APP_STAGES_TERMINAL } from "./types";

// ─── Job Openings ─────────────────────────────────────────────────────────────

export async function listJobOpenings(orgId: string, query: RecruitListQuery = {}) {
  const page = query.page ?? 1;
  const pageSize = Math.min(query.pageSize ?? 25, 100);
  const skip = (page - 1) * pageSize;

  const where = {
    orgId,
    deletedAt: null,
    ...(query.status ? { status: query.status } : {}),
    ...(query.search
      ? {
          OR: [
            { title: { contains: query.search, mode: "insensitive" as const } },
            { internalCode: { contains: query.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [items, total] = await db.$transaction([
    db.recruitJobOpening.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      select: {
        id: true,
        internalCode: true,
        title: true,
        status: true,
        employmentType: true,
        workplaceType: true,
        location: true,
        openings: true,
        priority: true,
        closingDate: true,
        publishedAt: true,
        createdAt: true,
        departmentId: true,
        branchId: true,
        _count: { select: { applications: true } },
      },
    }),
    db.recruitJobOpening.count({ where }),
  ]);

  return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function getJobOpening(orgId: string, id: string) {
  return db.recruitJobOpening.findFirst({
    where: { id, orgId, deletedAt: null },
    include: {
      versions: { orderBy: { version: "desc" }, take: 10 },
      _count: { select: { applications: true } },
    },
  });
}

export interface CreateJobOpeningInput {
  title: string;
  internalCode?: string;
  departmentId?: string;
  designationText?: string;
  branchId?: string;
  location?: string;
  employmentType?: string;
  workplaceType?: string;
  openings?: number;
  priority?: string;
  targetJoiningDate?: Date;
  hiringManagerId?: string;
  experienceMin?: number;
  experienceMax?: number;
  educationRequired?: string;
  mandatorySkills?: string[];
  preferredSkills?: string[];
  responsibilities?: string;
  compensationMin?: number;
  compensationMax?: number;
  compensationCcy?: string;
  sourcingChannels?: string[];
  closingDate?: Date;
  jobDescriptionHtml?: string;
  requirementsJson?: unknown;
  screeningQuestions?: unknown;
  interviewPlanJson?: unknown;
}

export async function createJobOpening(
  orgId: string,
  actorId: string,
  input: CreateJobOpeningInput
) {
  const job = await db.recruitJobOpening.create({
    data: {
      orgId,
      title: input.title,
      internalCode: input.internalCode,
      departmentId: input.departmentId,
      designationText: input.designationText,
      branchId: input.branchId,
      location: input.location,
      employmentType: input.employmentType ?? "FULL_TIME",
      workplaceType: input.workplaceType ?? "ONSITE",
      openings: input.openings ?? 1,
      priority: input.priority ?? "MEDIUM",
      targetJoiningDate: input.targetJoiningDate,
      hiringManagerId: input.hiringManagerId,
      experienceMin: input.experienceMin,
      experienceMax: input.experienceMax,
      educationRequired: input.educationRequired,
      mandatorySkills: input.mandatorySkills ?? [],
      preferredSkills: input.preferredSkills ?? [],
      responsibilities: input.responsibilities,
      compensationMin: input.compensationMin,
      compensationMax: input.compensationMax,
      compensationCcy: input.compensationCcy ?? "INR",
      sourcingChannels: input.sourcingChannels ?? [],
      closingDate: input.closingDate,
      jobDescriptionHtml: input.jobDescriptionHtml,
      requirementsJson: input.requirementsJson ?? undefined,
      screeningQuestions: input.screeningQuestions ?? undefined,
      interviewPlanJson: input.interviewPlanJson ?? undefined,
      status: "DRAFT",
      createdById: actorId,
      updatedById: actorId,
    },
  });

  await db.recruitJobVersion.create({
    data: {
      jobOpeningId: job.id,
      version: 1,
      changeType: "JD_EDIT",
      snapshotJson: job as unknown as import("@/generated/prisma/client").Prisma.InputJsonValue,
      changedById: actorId,
    },
  });

  await auditRecruit({
    orgId,
    actorId,
    action: "recruit.job.created",
    entityType: "RecruitJobOpening",
    entityId: job.id,
    source: "UI",
  });

  return job;
}

export async function updateJobStatus(
  orgId: string,
  jobId: string,
  actorId: string,
  newStatus: RecruitJobStatus,
  reason?: string
) {
  const job = await db.recruitJobOpening.findFirstOrThrow({ where: { id: jobId, orgId } });

  const updated = await db.recruitJobOpening.update({
    where: { id: jobId },
    data: {
      status: newStatus,
      publishedAt: newStatus === "PUBLISHED" ? new Date() : job.publishedAt,
      closedAt: newStatus === "CLOSED" ? new Date() : job.closedAt,
      updatedById: actorId,
    },
  });

  await auditRecruit({
    orgId,
    actorId,
    action: "recruit.job.status_changed",
    entityType: "RecruitJobOpening",
    entityId: jobId,
    changedFields: { from: job.status, to: newStatus },
    reason,
    source: "UI",
  });

  return updated;
}

// ─── Candidates ───────────────────────────────────────────────────────────────

export async function listCandidates(orgId: string, query: RecruitListQuery = {}) {
  const page = query.page ?? 1;
  const pageSize = Math.min(query.pageSize ?? 25, 100);
  const skip = (page - 1) * pageSize;

  const where = {
    orgId,
    deletedAt: null,
    anonymizedAt: null,
    ...(query.search
      ? {
          OR: [
            { firstName: { contains: query.search, mode: "insensitive" as const } },
            { lastName: { contains: query.search, mode: "insensitive" as const } },
            { email: { contains: query.search, mode: "insensitive" as const } },
            { currentCompany: { contains: query.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [items, total] = await db.$transaction([
    db.recruitCandidate.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      select: {
        id: true,
        candidateNumber: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        currentCompany: true,
        currentTitle: true,
        totalExperienceYears: true,
        source: true,
        consentStatus: true,
        createdAt: true,
        _count: { select: { applications: true } },
      },
    }),
    db.recruitCandidate.count({ where }),
  ]);

  return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function getCandidate(orgId: string, id: string) {
  return db.recruitCandidate.findFirst({
    where: { id, orgId, deletedAt: null },
    include: {
      resumes: { orderBy: { uploadedAt: "desc" } },
      education: true,
      experience: { orderBy: { startDate: "desc" } },
      skills_rel: true,
      consents: { orderBy: { recordedAt: "desc" }, take: 5 },
      notes: { orderBy: { createdAt: "desc" } },
      applications: {
        include: { jobOpening: { select: { id: true, title: true, status: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export async function generateCandidateNumber(orgId: string): Promise<string> {
  const year = new Date().getFullYear();
  const count = await db.recruitCandidate.count({ where: { orgId } });
  return `RC-${year}-${String(count + 1).padStart(4, "0")}`;
}

export interface CreateCandidateInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  currentLocation?: string;
  preferredLocation?: string;
  currentCompany?: string;
  currentTitle?: string;
  totalExperienceYears?: number;
  relevantExpYears?: number;
  noticePeriodDays?: number;
  currentCompensation?: number;
  expectedCompensation?: number;
  skills?: string[];
  workAuthorization?: string;
  source?: string;
  sourceDetail?: string;
  consentStatus?: string;
}

export async function checkDuplicates(
  orgId: string,
  input: { email?: string; phone?: string; resumeHash?: string; profileUrlHash?: string }
) {
  const conditions: import("@/generated/prisma/client").Prisma.RecruitCandidateWhereInput[] = [];
  if (input.email) conditions.push({ orgId, email: input.email, deletedAt: null });
  if (input.phone) conditions.push({ orgId, phone: input.phone, deletedAt: null });
  if (input.resumeHash) conditions.push({ orgId, resumeHash: input.resumeHash, deletedAt: null });
  if (input.profileUrlHash) conditions.push({ orgId, profileUrlHash: input.profileUrlHash, deletedAt: null });

  if (!conditions.length) return [];

  return db.recruitCandidate.findMany({
    where: { OR: conditions },
    select: {
      id: true,
      candidateNumber: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      currentCompany: true,
    },
  });
}

export async function createCandidate(
  orgId: string,
  actorId: string,
  input: CreateCandidateInput
) {
  const candidateNumber = await generateCandidateNumber(orgId);

  const candidate = await db.$transaction(async (tx) => {
    const c = await tx.recruitCandidate.create({
      data: {
        orgId,
        candidateNumber,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
        currentLocation: input.currentLocation,
        preferredLocation: input.preferredLocation,
        currentCompany: input.currentCompany,
        currentTitle: input.currentTitle,
        totalExperienceYears: input.totalExperienceYears,
        relevantExpYears: input.relevantExpYears,
        noticePeriodDays: input.noticePeriodDays,
        currentCompensation: input.currentCompensation,
        expectedCompensation: input.expectedCompensation,
        skills: input.skills ?? [],
        workAuthorization: input.workAuthorization,
        source: input.source ?? "MANUAL",
        sourceDetail: input.sourceDetail,
        consentStatus: input.consentStatus ?? "PENDING",
        createdById: actorId,
        updatedById: actorId,
      },
    });

    if (input.skills?.length) {
      await tx.recruitCandidateSkill.createMany({
        data: input.skills.map((skill) => ({ candidateId: c.id, skill })),
        skipDuplicates: true,
      });
    }

    return c;
  });

  await auditRecruit({
    orgId,
    actorId,
    action: "recruit.candidate.created",
    entityType: "RecruitCandidate",
    entityId: candidate.id,
    source: "UI",
  });

  return candidate;
}

// ─── Applications ─────────────────────────────────────────────────────────────

export async function listApplications(
  orgId: string,
  query: RecruitListQuery & { jobOpeningId?: string; candidateId?: string } = {}
) {
  const page = query.page ?? 1;
  const pageSize = Math.min(query.pageSize ?? 25, 100);
  const skip = (page - 1) * pageSize;

  const where = {
    orgId,
    deletedAt: null,
    ...(query.stage ? { stage: query.stage } : {}),
    ...(query.jobOpeningId ? { jobOpeningId: query.jobOpeningId } : {}),
    ...(query.candidateId ? { candidateId: query.candidateId } : {}),
    ...(query.search
      ? {
          OR: [
            { applicationNumber: { contains: query.search, mode: "insensitive" as const } },
            { candidate: { firstName: { contains: query.search, mode: "insensitive" as const } } },
            { candidate: { lastName: { contains: query.search, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const [items, total] = await db.$transaction([
    db.recruitApplication.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      include: {
        candidate: {
          select: { id: true, firstName: true, lastName: true, email: true, currentTitle: true },
        },
        jobOpening: { select: { id: true, title: true, status: true } },
        _count: { select: { screeningRuns: true, interviews: true, offers: true } },
      },
    }),
    db.recruitApplication.count({ where }),
  ]);

  return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function getApplication(orgId: string, id: string) {
  return db.recruitApplication.findFirst({
    where: { id, orgId, deletedAt: null },
    include: {
      candidate: { include: { resumes: { where: { isActive: true } } } },
      jobOpening: true,
      stageHistory: { orderBy: { movedAt: "desc" } },
      screeningRuns: {
        include: { result: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
      interviews: {
        include: { panel: true, feedback: true },
        orderBy: { scheduledAt: "desc" },
      },
      assessments: { include: { attempts: { orderBy: { createdAt: "desc" } } } },
      offers: { orderBy: { createdAt: "desc" } },
      notes: { orderBy: { createdAt: "desc" } },
    },
  });
}

export async function generateApplicationNumber(orgId: string): Promise<string> {
  const year = new Date().getFullYear();
  const count = await db.recruitApplication.count({ where: { orgId } });
  return `APP-${year}-${String(count + 1).padStart(5, "0")}`;
}

export async function createApplication(
  orgId: string,
  actorId: string,
  input: { jobOpeningId: string; candidateId: string; source?: string; resumeVersionId?: string }
) {
  const existing = await db.recruitApplication.findFirst({
    where: { orgId, jobOpeningId: input.jobOpeningId, candidateId: input.candidateId, deletedAt: null },
  });
  if (existing) throw new Error("Application already exists for this candidate and job opening");

  const applicationNumber = await generateApplicationNumber(orgId);

  const application = await db.recruitApplication.create({
    data: {
      orgId,
      applicationNumber,
      jobOpeningId: input.jobOpeningId,
      candidateId: input.candidateId,
      source: input.source,
      resumeVersionId: input.resumeVersionId,
      stage: "NEW",
      createdById: actorId,
      updatedById: actorId,
    },
  });

  await db.recruitApplicationStageHistory.create({
    data: {
      applicationId: application.id,
      fromStage: null,
      toStage: "NEW",
      actorId,
    },
  });

  await auditRecruit({
    orgId,
    actorId,
    action: "recruit.application.created",
    entityType: "RecruitApplication",
    entityId: application.id,
    source: "UI",
  });

  return application;
}

export async function moveApplicationStage(
  orgId: string,
  applicationId: string,
  actorId: string,
  newStage: RecruitAppStage,
  reason?: string
) {
  const app = await db.recruitApplication.findFirstOrThrow({
    where: { id: applicationId, orgId, deletedAt: null },
  });

  if (app.stage === newStage) throw new Error("Application is already in this stage");
  if (RECRUIT_APP_STAGES_TERMINAL.includes(app.stage as RecruitAppStage)) {
    throw new Error(`Cannot move application from terminal stage ${app.stage}`);
  }

  // Use optimistic concurrency
  const updated = await db.recruitApplication.updateMany({
    where: { id: applicationId, concurrencyVersion: app.concurrencyVersion },
    data: {
      stage: newStage,
      concurrencyVersion: app.concurrencyVersion + 1,
      updatedById: actorId,
    },
  });

  if (updated.count === 0) {
    throw new Error("Concurrent update detected — please reload and try again");
  }

  await db.recruitApplicationStageHistory.create({
    data: {
      applicationId,
      fromStage: app.stage,
      toStage: newStage,
      actorId,
      reason,
    },
  });

  await auditRecruit({
    orgId,
    actorId,
    action: "recruit.application.stage_changed",
    entityType: "RecruitApplication",
    entityId: applicationId,
    changedFields: { from: app.stage, to: newStage },
    reason,
    source: "UI",
  });

  return { ...app, stage: newStage };
}

// ─── Dashboard Counts ─────────────────────────────────────────────────────────

export async function getEmployerDashboardCounts(orgId: string) {
  const [
    openRequisitions,
    activeOpenings,
    newCandidates,
    applicationsByStage,
    offersAwaitingApproval,
    automationFailures,
  ] = await db.$transaction([
    db.recruitJobOpening.count({ where: { orgId, status: "DRAFT", deletedAt: null } }),
    db.recruitJobOpening.count({ where: { orgId, status: "PUBLISHED", deletedAt: null } }),
    db.recruitCandidate.count({
      where: {
        orgId,
        deletedAt: null,
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    }),
    db.recruitApplication.groupBy({
      by: ["stage"],
      where: { orgId, deletedAt: null },
      _count: { id: true },
      orderBy: { stage: "asc" },
    }),
    db.recruitOffer.count({ where: { orgId: orgId as string, status: "PENDING_APPROVAL" } }),
    db.recruitAutomationRun.count({
      where: { orgId, status: { in: ["FAILED", "TIMED_OUT"] } },
    }),
  ]);

  return {
    openRequisitions,
    activeOpenings,
    newCandidates,
    applicationsByStage: applicationsByStage.reduce(
      (acc, row) => { acc[row.stage] = (row._count as { id: number }).id; return acc; },
      {} as Record<string, number>
    ),
    offersAwaitingApproval,
    automationFailures,
  };
}

// ─── Screening ────────────────────────────────────────────────────────────────

export async function getScreeningResults(orgId: string, applicationId: string) {
  return db.recruitScreeningRun.findMany({
    where: { applicationId, orgId: orgId as string },
    include: { result: true },
    orderBy: { createdAt: "desc" },
  });
}

// ─── Offers ───────────────────────────────────────────────────────────────────

export async function listOffers(orgId: string, query: RecruitListQuery = {}) {
  const page = query.page ?? 1;
  const pageSize = Math.min(query.pageSize ?? 25, 100);

  const where = {
    orgId,
    ...(query.status ? { status: query.status } : {}),
  };

  const [items, total] = await db.$transaction([
    db.recruitOffer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        application: {
          include: {
            candidate: { select: { firstName: true, lastName: true, email: true } },
            jobOpening: { select: { title: true } },
          },
        },
      },
    }),
    db.recruitOffer.count({ where }),
  ]);

  return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

// ─── Interviews ───────────────────────────────────────────────────────────────

export async function listInterviews(orgId: string, query: RecruitListQuery = {}) {
  const page = query.page ?? 1;
  const pageSize = Math.min(query.pageSize ?? 25, 100);

  const [items, total] = await db.$transaction([
    db.recruitInterview.findMany({
      where: { orgId },
      orderBy: { scheduledAt: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        application: {
          include: {
            candidate: { select: { firstName: true, lastName: true } },
            jobOpening: { select: { title: true } },
          },
        },
        panel: true,
        feedback: { select: { userId: true, recommendation: true, submittedAt: true } },
      },
    }),
    db.recruitInterview.count({ where: { orgId } }),
  ]);

  return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}
