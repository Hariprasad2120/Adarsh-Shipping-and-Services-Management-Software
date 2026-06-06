import { db } from "@/lib/db";
import { hash } from "bcryptjs";
import { getNow } from "@/lib/clock";
import { Prisma } from "@/generated/prisma/client";

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
};

export async function listUsers(orgId: string, filters?: {
  branchId?: string;
  departmentId?: string;
  divisionId?: string;
  roleId?: string;
  search?: string;
  active?: boolean;
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

  return db.$transaction(async (tx) => {
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
      },
    });

    return user;
  });
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
}

export async function updateEmploymentRecord(userId: string, data: {
  joinDate?: Date;
  grade?: string;
  ctc?: number;
  priorExperienceYears?: number | null;
  exitDate?: Date | null;
}) {
  return db.employmentRecord.upsert({
    where: { userId },
    update: data,
    create: { userId, joinDate: await getNow(), ...data },
  });
}

export async function resetPassword(userId: string, newPassword: string) {
  const passwordHash = await hash(newPassword, 12);
  return db.user.update({ where: { id: userId }, data: { passwordHash } });
}
