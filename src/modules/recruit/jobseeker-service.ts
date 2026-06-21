import { db } from "@/lib/db";
import type { RecruitListQuery } from "./types";
import { RECRUIT_PUBLIC_STAGE_ALLOWLIST } from "./types";

// ─── Career Profile ───────────────────────────────────────────────────────────

export async function getOrCreateJobSeekerProfile(ownerId: string) {
  const existing = await db.recruitJobSeekerProfile.findUnique({ where: { ownerId } });
  if (existing) return existing;

  return db.recruitJobSeekerProfile.create({
    data: { ownerId },
  });
}

export async function updateJobSeekerProfile(
  ownerId: string,
  input: {
    preferredRoles?: string[];
    preferredIndustries?: string[];
    preferredLocations?: string[];
    workplacePreference?: string;
    employmentTypes?: string[];
    seniority?: string;
    totalExpYears?: number;
    skills?: string[];
    workAuthorization?: string;
    noticePeriodDays?: number;
    compensationMin?: number;
    compensationMax?: number;
    compensationCcy?: string;
    relocationOpen?: boolean;
    excludedCompanies?: string[];
    jobKeywords?: string[];
    alertsEnabled?: boolean;
    alertFrequency?: string;
  }
) {
  return db.recruitJobSeekerProfile.update({
    where: { ownerId },
    data: {
      ...input,
      updatedAt: new Date(),
    },
  });
}

// ─── Job Search Profiles ──────────────────────────────────────────────────────

export async function listSearchProfiles(ownerId: string) {
  const profile = await db.recruitJobSeekerProfile.findUnique({ where: { ownerId } });
  if (!profile) return [];

  return db.recruitJobSearchProfile.findMany({
    where: { profileId: profile.id },
    orderBy: { isDefault: "desc" },
  });
}

export async function createSearchProfile(
  ownerId: string,
  input: {
    name: string;
    keywords?: string[];
    locations?: string[];
    workplaceTypes?: string[];
    employmentTypes?: string[];
    minSalary?: number;
    maxSalary?: number;
    resultLimit?: number;
    minMatchScore?: number;
    isDefault?: boolean;
  }
) {
  const profile = await getOrCreateJobSeekerProfile(ownerId);

  if (input.isDefault) {
    await db.recruitJobSearchProfile.updateMany({
      where: { profileId: profile.id },
      data: { isDefault: false },
    });
  }

  return db.recruitJobSearchProfile.create({
    data: {
      profileId: profile.id,
      name: input.name,
      keywords: input.keywords ?? [],
      locations: input.locations ?? [],
      workplaceTypes: input.workplaceTypes ?? [],
      employmentTypes: input.employmentTypes ?? [],
      minSalary: input.minSalary,
      maxSalary: input.maxSalary,
      resultLimit: input.resultLimit ?? 20,
      minMatchScore: input.minMatchScore ?? 60,
      isDefault: input.isDefault ?? false,
    },
  });
}

// ─── Job Listings ─────────────────────────────────────────────────────────────

export async function listJobListings(
  ownerId: string,
  query: RecruitListQuery & { source?: string; minScore?: number } = {}
) {
  const page = query.page ?? 1;
  const pageSize = Math.min(query.pageSize ?? 25, 100);
  const skip = (page - 1) * pageSize;

  const where = {
    ownerId,
    isDismissed: false,
    isExpired: false,
    ...(query.source ? { source: query.source } : {}),
    ...(query.search
      ? {
          OR: [
            { title: { contains: query.search, mode: "insensitive" as const } },
            { company: { contains: query.search, mode: "insensitive" as const } },
            { location: { contains: query.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [items, total] = await db.$transaction([
    db.recruitJobListing.findMany({
      where,
      orderBy: { fetchedAt: "desc" },
      skip,
      take: pageSize,
    }),
    db.recruitJobListing.count({ where }),
  ]);

  return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function addManualJobListing(
  ownerId: string,
  input: {
    title: string;
    company: string;
    location?: string;
    workplaceType?: string;
    employmentType?: string;
    description?: string;
    canonicalUrl?: string;
    salaryMin?: number;
    salaryMax?: number;
    postedAt?: Date;
  }
) {
  return db.recruitJobListing.create({
    data: {
      ownerId,
      source: "MANUAL",
      title: input.title,
      company: input.company,
      location: input.location,
      workplaceType: input.workplaceType,
      employmentType: input.employmentType,
      description: input.description,
      canonicalUrl: input.canonicalUrl,
      salaryMin: input.salaryMin,
      salaryMax: input.salaryMax,
      postedAt: input.postedAt,
    },
  });
}

export async function dismissJobListing(ownerId: string, listingId: string) {
  return db.recruitJobListing.updateMany({
    where: { id: listingId, ownerId },
    data: { isDismissed: true },
  });
}

export async function saveJob(ownerId: string, listingId: string, notes?: string) {
  const profile = await getOrCreateJobSeekerProfile(ownerId);
  return db.recruitSavedJob.upsert({
    where: { profileId_listingId: { profileId: profile.id, listingId } },
    create: { profileId: profile.id, listingId, notes },
    update: { notes },
  });
}

// ─── Resumes ──────────────────────────────────────────────────────────────────

export async function listJobSeekerResumes(ownerId: string) {
  const profile = await db.recruitJobSeekerProfile.findUnique({ where: { ownerId } });
  if (!profile) return [];

  return db.recruitJobSeekerResume.findMany({
    where: { profileId: profile.id, ownerId },
    orderBy: [{ isBase: "desc" }, { createdAt: "desc" }],
  });
}

export async function getJobSeekerResume(ownerId: string, resumeId: string) {
  return db.recruitJobSeekerResume.findFirst({
    where: { id: resumeId, ownerId },
    include: { tailored: { orderBy: { generatedAt: "desc" }, take: 10 } },
  });
}

// ─── Applications (Job Seeker side) ──────────────────────────────────────────

export async function listJsApplications(ownerId: string, query: RecruitListQuery = {}) {
  const page = query.page ?? 1;
  const pageSize = Math.min(query.pageSize ?? 25, 100);
  const profile = await db.recruitJobSeekerProfile.findUnique({ where: { ownerId } });
  if (!profile) return { items: [], total: 0, page, pageSize, totalPages: 0 };

  const where = {
    ownerId,
    profileId: profile.id,
    ...(query.status ? { privateStatus: query.status } : {}),
    ...(query.search
      ? {
          OR: [
            { jobTitle: { contains: query.search, mode: "insensitive" as const } },
            { company: { contains: query.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [items, total] = await db.$transaction([
    db.recruitJobSeekerApplication.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.recruitJobSeekerApplication.count({ where }),
  ]);

  return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function createJsApplication(
  ownerId: string,
  input: {
    jobTitle: string;
    company: string;
    listingId?: string;
    internalJobId?: string;
    source?: string;
    applicationUrl?: string;
    resumeVersionId?: string;
    privateStatus?: string;
  }
) {
  const profile = await getOrCreateJobSeekerProfile(ownerId);

  return db.recruitJobSeekerApplication.create({
    data: {
      ownerId,
      profileId: profile.id,
      jobTitle: input.jobTitle,
      company: input.company,
      listingId: input.listingId,
      internalJobId: input.internalJobId,
      source: input.source,
      applicationUrl: input.applicationUrl,
      resumeVersionId: input.resumeVersionId,
      privateStatus: input.privateStatus ?? "INTERESTED",
    },
  });
}

// When applying to an internal job: get only allow-listed status from employer records
export async function getInternalApplicationPublicStatus(
  orgId: string,
  internalApplicationId: string
): Promise<string | null> {
  const app = await db.recruitApplication.findFirst({
    where: { id: internalApplicationId, orgId },
    select: { stage: true },
  });
  if (!app) return null;
  if (RECRUIT_PUBLIC_STAGE_ALLOWLIST.includes(app.stage as never)) return app.stage;
  return "UNDER_REVIEW"; // generic fallback for non-public stages
}

// ─── Career Assistant Conversations ──────────────────────────────────────────

export async function listCareerConversations(ownerId: string) {
  const profile = await db.recruitJobSeekerProfile.findUnique({ where: { ownerId } });
  if (!profile) return [];

  return db.recruitCareerConversation.findMany({
    where: { profileId: profile.id, ownerId, deletedAt: null },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, createdAt: true, updatedAt: true },
  });
}

export async function getConversation(ownerId: string, conversationId: string) {
  return db.recruitCareerConversation.findFirst({
    where: { id: conversationId, ownerId, deletedAt: null },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
}

export async function addCareerMessage(
  ownerId: string,
  conversationId: string,
  role: "USER" | "ASSISTANT",
  content: string
) {
  // Verify ownership
  const convo = await db.recruitCareerConversation.findFirst({
    where: { id: conversationId, ownerId },
  });
  if (!convo) throw new Error("Conversation not found");

  const msg = await db.recruitCareerMessage.create({
    data: { conversationId, role, content },
  });

  // Update conversation updatedAt
  await db.recruitCareerConversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  return msg;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export async function getJobSeekerDashboardCounts(ownerId: string) {
  const profile = await db.recruitJobSeekerProfile.findUnique({ where: { ownerId } });
  if (!profile) {
    return {
      newMatchingJobs: 0,
      savedJobs: 0,
      applicationsByStatus: {},
      activeAlerts: 0,
      recentTailoredResumes: 0,
      automationFailures: 0,
    };
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [newJobs, savedJobs, appsByStatus, activeAlerts, recentTailored] =
    await db.$transaction([
      db.recruitJobListing.count({
        where: { ownerId, isDismissed: false, isExpired: false, createdAt: { gte: sevenDaysAgo } },
      }),
      db.recruitSavedJob.count({ where: { profileId: profile.id } }),
      db.recruitJobSeekerApplication.groupBy({
        by: ["privateStatus"],
        where: { ownerId, profileId: profile.id },
        _count: { id: true },
        orderBy: { privateStatus: "asc" },
      }),
      db.recruitJobAlert.count({ where: { ownerId, profileId: profile.id, isActive: true } }),
      db.recruitTailoredResume.count({
        where: { ownerId, generatedAt: { gte: sevenDaysAgo } },
      }),
    ]);

  return {
    newMatchingJobs: newJobs,
    savedJobs,
    applicationsByStatus: appsByStatus.reduce(
      (acc, row) => { acc[row.privateStatus] = (row._count as { id: number }).id; return acc; },
      {} as Record<string, number>
    ),
    activeAlerts,
    recentTailoredResumes: recentTailored,
    automationFailures: 0,
  };
}

// ─── Alerts ───────────────────────────────────────────────────────────────────

export async function listJobAlerts(ownerId: string) {
  const profile = await db.recruitJobSeekerProfile.findUnique({ where: { ownerId } });
  if (!profile) return [];

  return db.recruitJobAlert.findMany({
    where: { ownerId, profileId: profile.id },
    orderBy: { createdAt: "desc" },
  });
}

// ─── Private Shares ───────────────────────────────────────────────────────────

import { randomBytes } from "crypto";

export async function createPrivateShare(
  ownerId: string,
  input: {
    artifactType: string;
    artifactId: string;
    recipientNote?: string;
    purpose?: string;
    expiryDays: number;
  }
) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + input.expiryDays * 24 * 60 * 60 * 1000);

  return db.recruitPrivateShare.create({
    data: {
      ownerId,
      artifactType: input.artifactType,
      artifactId: input.artifactId,
      recipientNote: input.recipientNote,
      purpose: input.purpose,
      token,
      expiresAt,
    },
  });
}

export async function resolvePrivateShare(token: string) {
  const share = await db.recruitPrivateShare.findFirst({
    where: { token, revokedAt: null, expiresAt: { gt: new Date() } },
  });
  if (!share) return null;

  await db.recruitPrivateShare.update({
    where: { id: share.id },
    data: { accessCount: { increment: 1 } },
  });

  return share;
}
