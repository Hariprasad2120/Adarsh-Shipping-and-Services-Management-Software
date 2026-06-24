import { db } from "@/lib/db";
import { hash } from "bcryptjs";
import { getNow } from "@/lib/clock";
import { invalidateRbacCache } from "@/lib/rbac";
import { Prisma } from "@/generated/prisma/client";
import { syncEmployeeAppraisalSchedule } from "@/modules/ams/service";

export type CreateUserInput = {
  orgId: string;
  email: string;
  password: string;
  name: string;
  designation?: string;
  branchId?: string;
  departmentId?: string;
  divisionId?: string;
  managerId?: string;
  tlId?: string;
  roleIds: string[];
  joinDate: Date;
  grade?: string;
  ctc?: number;
  priorExperienceYears?: number;
  payrollMeta?: Prisma.InputJsonValue;
};

export async function listUsers(orgId: string, filters?: {
  branchId?: string;
  departmentId?: string;
  divisionId?: string;
  roleId?: string;
  search?: string;
  active?: boolean;
  take?: number;
  skip?: number;
}) {
  const where: Prisma.UserWhereInput = { orgId };
  if (filters?.active !== undefined) where.active = filters.active;
  if (filters?.branchId) where.branchId = filters.branchId;
  if (filters?.departmentId) where.departmentId = filters.departmentId;
  if (filters?.divisionId) where.divisionId = filters.divisionId;
  if (filters?.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { email: { contains: filters.search, mode: "insensitive" } },
      { designation: { contains: filters.search, mode: "insensitive" } },
    ];
  }
  if (filters?.roleId) {
    where.roles = { some: { roleId: filters.roleId } };
  }

  return db.user.findMany({
    where,
    orderBy: { name: "asc" },
    ...(filters?.take !== undefined ? { take: filters.take } : {}),
    ...(filters?.skip !== undefined ? { skip: filters.skip } : {}),
    include: {
      branch: true,
      department: true,
      division: true,
      roles: { include: { role: true } },
      manager: { select: { id: true, name: true } },
      tl: { select: { id: true, name: true } },
      employmentRecord: true,
    },
  });
}

// Lean list for dashboards/stats that only need id, name, email, employeeNumber,
// department.name, and branch.name. Skips employmentRecord, roles, division, etc.
export async function listUsersForDashboard(orgId: string, filters?: {
  active?: boolean;
  take?: number;
}) {
  const where: Prisma.UserWhereInput = { orgId };
  if (filters?.active !== undefined) where.active = filters.active;

  return db.user.findMany({
    where,
    orderBy: { name: "asc" },
    ...(filters?.take !== undefined ? { take: filters.take } : {}),
    select: {
      id: true,
      name: true,
      email: true,
      employeeNumber: true,
      designation: true,
      department: { select: { id: true, name: true } },
      branch: { select: { id: true, name: true } },
    },
  });
}

// Minimal user list for dropdowns — only id and name. Use instead of listUsers when full relations are not needed.
export async function listUsersSlim(
  orgId: string,
  filters?: { roleId?: string; active?: boolean }
) {
  const where: Record<string, unknown> = { orgId };
  if (filters?.active !== undefined) where.active = filters.active;
  if (filters?.roleId) where.roles = { some: { roleId: filters.roleId } };
  return db.user.findMany({
    where,
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export async function getUser(id: string) {
  return db.user.findUnique({
    where: { id },
    include: {
      branch: true,
      department: true,
      division: true,
      roles: { include: { role: true } },
      manager: { select: { id: true, name: true, email: true } },
      tl: { select: { id: true, name: true, email: true } },
      reports: { select: { id: true, name: true, designation: true } },
      tlReports: { select: { id: true, name: true, designation: true } },
      employmentRecord: true,
      documents: { orderBy: { uploadedAt: "desc" } },
    },
  });
}

export async function createUser(input: CreateUserInput) {
  const passwordHash = await hash(input.password, 12);

  const user = await db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        orgId: input.orgId,
        email: input.email,
        passwordHash,
        name: input.name,
        designation: input.designation,
        branchId: input.branchId,
        departmentId: input.departmentId,
        divisionId: input.divisionId,
        managerId: input.managerId,
        tlId: input.tlId,
        active: true,
      },
    });

    if (input.roleIds.length > 0) {
      await tx.userRole.createMany({
        data: input.roleIds.map((roleId) => ({ userId: user.id, roleId })),
      });
    }

    await tx.employmentRecord.create({
      data: {
        userId: user.id,
        joinDate: input.joinDate,
        grade: input.grade,
        ctc: input.ctc,
        priorExperienceYears: input.priorExperienceYears ?? 0,
        payrollMeta: input.payrollMeta,
      },
    });

    return user;
  });

  await syncEmployeeAppraisalSchedule({
    orgId: input.orgId,
    employeeId: user.id,
    joinDate: input.joinDate,
    priorExperienceYears: input.priorExperienceYears ?? 0,
  });

  invalidateRbacCache();
  return user;
}

export async function updateUser(id: string, data: {
  name?: string;
  designation?: string;
  branchId?: string | null;
  departmentId?: string | null;
  divisionId?: string | null;
  managerId?: string | null;
  tlId?: string | null;
  active?: boolean;
}) {
  return db.user.update({ where: { id }, data });
}

export async function updateUserRoles(userId: string, roleIds: string[]) {
  await db.userRole.deleteMany({ where: { userId } });
  if (roleIds.length > 0) {
    await db.userRole.createMany({
      data: roleIds.map((roleId) => ({ userId, roleId })),
    });
  }
  invalidateRbacCache();
}

export async function updateEmploymentRecord(userId: string, data: {
  joinDate?: Date;
  grade?: string;
  ctc?: number;
  priorExperienceYears?: number | null;
  exitDate?: Date | null;
}) {
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { orgId: true },
  });

  const record = await db.employmentRecord.upsert({
    where: { userId },
    update: data,
    create: { userId, joinDate: await getNow(), ...data },
  });

  if (user.orgId && !record.exitDate) {
    await syncEmployeeAppraisalSchedule({
      orgId: user.orgId,
      employeeId: userId,
      joinDate: record.joinDate,
      priorExperienceYears: record.priorExperienceYears ?? 0,
    });
  }

  return record;
}

export async function resetPassword(userId: string, newPassword: string) {
  const passwordHash = await hash(newPassword, 12);
  return db.user.update({ where: { id: userId }, data: { passwordHash } });
}
