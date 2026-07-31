import "server-only";

import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

export type ChaJobListFilters = {
  search?: string;
  stage?: string;
  status?: string;
  priority?: string;
  branchId?: string;
  jobTypeId?: string;
  movementDirection?: "IMPORT" | "EXPORT" | "BOTH" | "OTHER";
  assignedToMe?: boolean;
  jobGroup?: "ACTIVE" | "COMPLETED";
  page?: number;
  pageSize?: number;
};

export async function listJobs(userId: string, orgId: string, filters: ChaJobListFilters) {
  const page = Math.max(1, Number.isFinite(filters.page) ? Math.trunc(filters.page!) : 1);
  const pageSize = Math.min(100, Math.max(1, Number.isFinite(filters.pageSize) ? Math.trunc(filters.pageSize!) : 10));
  const and: Prisma.ChaJobWhereInput[] = [];
  const where: Prisma.ChaJobWhereInput = { orgId, deletedAt: null, AND: and };

  if (filters.search?.trim()) {
    const search = filters.search.trim();
    and.push({
      OR: [
        { jobNumber: { contains: search, mode: "insensitive" } },
        { title: { contains: search, mode: "insensitive" } },
        { customer: { name: { contains: search, mode: "insensitive" } } },
      ],
    });
  }
  if (filters.stage) where.stage = filters.stage;
  if (filters.status) where.status = filters.status;
  if (filters.priority) where.priority = filters.priority;
  if (filters.branchId) where.branchId = filters.branchId;
  if (filters.jobTypeId) where.jobTypeId = filters.jobTypeId;
  if (filters.movementDirection) {
    where.jobType = { movementDirection: filters.movementDirection };
  }
  if (filters.assignedToMe) where.assignments = { some: { userId } };

  const completed = {
    OR: [
      { stage: "FILED" },
      { status: "COMPLETED" },
      { filing: { is: { status: "FILED" } } },
    ],
  } satisfies Prisma.ChaJobWhereInput;
  if (filters.jobGroup === "ACTIVE") and.push({ NOT: completed });
  if (filters.jobGroup === "COMPLETED") and.push(completed);
  if (and.length === 0) delete where.AND;

  const [total, items] = await Promise.all([
    db.chaJob.count({ where }),
    db.chaJob.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        jobNumber: true,
        title: true,
        stage: true,
        status: true,
        priority: true,
        createdAt: true,
        customer: { select: { name: true } },
        jobType: { select: { name: true, movementDirection: true } },
        branch: { select: { name: true } },
        filing: { select: { billOfEntryNumber: true, shippingBillNumber: true } },
        primaryOwner: { select: { id: true, name: true } },
        assignments: { select: { userId: true } },
        deletionRequests: {
          where: { status: { in: ["PENDING", "APPROVED"] } },
          select: { id: true },
          take: 1,
        },
      },
    }),
  ]);

  return { total, items, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function getJobFilterOptions(orgId: string) {
  const [branches, jobTypes] = await Promise.all([
    db.branch.findMany({
      where: { orgId },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    }),
    db.chaJobType.findMany({
      where: { orgId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  return { branches, jobTypes };
}

export async function getCreateJobOptions(orgId: string) {
  const managerWhere: Prisma.UserWhereInput = {
    orgId,
    active: true,
    OR: [
      { email: "hr@adarshshipping.in" },
      { department: { name: "Executive Team" } },
      {
        roles: {
          some: {
            role: {
              OR: [
                { name: { in: ["Admin", "Management", "Manager", "Director", "Executive Team"] } },
                {
                  permissions: {
                    some: { permission: { key: "cha.checklist.internal_approve" } },
                  },
                },
              ],
            },
          },
        },
      },
    ],
  };

  const [branches, customers, jobTypes, shipmentTypes, users, managers, teamGroups, branchNumberingRules] =
    await Promise.all([
      db.branch.findMany({ where: { orgId }, select: { id: true, name: true, code: true }, orderBy: { name: "asc" } }),
      db.crmAccount.findMany({ where: { orgId, type: "Customer" }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
      db.chaJobType.findMany({
        where: { orgId, isActive: true },
        select: { id: true, name: true, movementDirection: true },
        orderBy: { name: "asc" },
      }),
      db.chaShipmentType.findMany({ where: { orgId, isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
      db.user.findMany({ where: { orgId, active: true }, select: { id: true, name: true, email: true }, orderBy: { name: "asc" } }),
      db.user.findMany({ where: managerWhere, select: { id: true, name: true, email: true, branchId: true }, orderBy: { name: "asc" } }),
      db.chaTeamGroup.findMany({ where: { orgId }, select: { id: true, name: true, memberIds: true }, orderBy: { name: "asc" } }),
      db.chaBranchNumberingRule.findMany({
        where: { orgId },
        select: {
          branchId: true,
          prefix: true,
          suffix: true,
          startingSequence: true,
          currentSequence: true,
          numberPadding: true,
          useFinancialYear: true,
          financialYearFormat: true,
          isActive: true,
        },
      }),
    ]);

  return {
    branches,
    customers,
    jobTypes,
    shipmentTypes,
    users,
    managers: managers.length > 0 ? managers : users.map((user) => ({ ...user, branchId: null })),
    teamGroups,
    branchNumberingRules,
  };
}
