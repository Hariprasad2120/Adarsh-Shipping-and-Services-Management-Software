import { db } from "@/lib/db";
import { invalidateRbacCache } from "@/lib/rbac";

const MANAGEMENT_ROLE_PERMISSION_KEYS = [
  "hrms.employee.read",
  "hrms.documents.read",
  "attendance.reports.view",
  "ams.appraisal.management_review",
  "ams.meeting.minutes",
  "ams.hike.finalise",
  "ams.appraisal.view_all",
] as const;

const CHA_ROLE_PERMISSION_DEFAULTS: Record<string, string[]> = {
  Admin: ["cha.job.delete", "cha.job.delete.approve"],
  Management: ["cha.job.delete", "cha.job.delete.approve"],
  Director: ["cha.job.delete", "cha.job.delete.approve"],
  Manager: ["cha.job.delete", "cha.job.delete.approve"],
  Employee: ["cha.job.delete"],
};

async function ensureManagementRole(orgId: string) {
  const existing = await db.role.findUnique({
    where: { orgId_name: { orgId, name: "Management" } },
    select: { id: true },
  });

  if (existing) return;

  const role = await db.role.create({
    data: { orgId, name: "Management", isSystem: true },
  });

  const permissions = await db.permission.findMany({
    where: { key: { in: [...MANAGEMENT_ROLE_PERMISSION_KEYS] } },
    select: { id: true },
  });

  if (permissions.length > 0) {
    await db.rolePermission.createMany({
      data: permissions.map((permission) => ({ roleId: role.id, permissionId: permission.id })),
    });
  }
}

export async function syncChaRolePermissions(orgId: string) {
  const permissionKeys = Array.from(
    new Set(Object.values(CHA_ROLE_PERMISSION_DEFAULTS).flat()),
  );
  const [permissions, roles] = await Promise.all([
    db.permission.findMany({
      where: { key: { in: permissionKeys } },
      select: { id: true, key: true },
    }),
    db.role.findMany({
      where: { orgId, name: { in: Object.keys(CHA_ROLE_PERMISSION_DEFAULTS) } },
      select: { id: true, name: true },
    }),
  ]);

  if (permissions.length === 0 || roles.length === 0) return;

  const permissionIdByKey = new Map(permissions.map((permission) => [permission.key, permission.id]));

  for (const role of roles) {
    const desiredPermissionIds = (CHA_ROLE_PERMISSION_DEFAULTS[role.name] ?? [])
      .map((key) => permissionIdByKey.get(key))
      .filter((value): value is string => Boolean(value));

    if (desiredPermissionIds.length === 0) continue;

    const existing = await db.rolePermission.findMany({
      where: {
        roleId: role.id,
        permissionId: { in: desiredPermissionIds },
      },
      select: { permissionId: true },
    });

    const existingIds = new Set(existing.map((entry) => entry.permissionId));
    const missingIds = desiredPermissionIds.filter((permissionId) => !existingIds.has(permissionId));

    if (missingIds.length > 0) {
      await db.rolePermission.createMany({
        data: missingIds.map((permissionId) => ({
          roleId: role.id,
          permissionId,
        })),
        skipDuplicates: true,
      });
    }
  }
}

export async function getOrg(orgId: string) {
  return db.organisation.findUnique({
    where: { id: orgId },
    include: {
      branches: { orderBy: { name: "asc" } },
      departments: { orderBy: { name: "asc" }, include: { divisions: { orderBy: { name: "asc" } } } },
    },
  });
}

/**
 * Tenant guard: throws if the row is not in the caller's org. Every by-id
 * mutation below is scoped through this so an admin in one organisation cannot
 * rename / delete another organisation's org-structure or roles (MON-S1 §10).
 */
class NotInOrgError extends Error {
  constructor() {
    super("Not found");
    this.name = "NotInOrgError";
  }
}
async function assertBranchInOrg(id: string, orgId: string) {
  if (!(await db.branch.findFirst({ where: { id, orgId }, select: { id: true } }))) throw new NotInOrgError();
}
async function assertDepartmentInOrg(id: string, orgId: string) {
  if (!(await db.department.findFirst({ where: { id, orgId }, select: { id: true } }))) throw new NotInOrgError();
}
async function assertDivisionInOrg(id: string, orgId: string) {
  if (!(await db.division.findFirst({ where: { id, orgId }, select: { id: true } }))) throw new NotInOrgError();
}
async function assertRoleInOrg(id: string, orgId: string) {
  if (!(await db.role.findFirst({ where: { id, orgId }, select: { id: true } }))) throw new NotInOrgError();
}

// Branches
export async function createBranch(orgId: string, name: string, code: string) {
  return db.branch.create({ data: { orgId, name, code: code.toUpperCase() } });
}
export async function updateBranch(id: string, orgId: string, name: string, code: string) {
  await assertBranchInOrg(id, orgId);
  return db.branch.update({ where: { id }, data: { name, code: code.toUpperCase() } });
}
export async function deleteBranch(id: string, orgId: string) {
  await assertBranchInOrg(id, orgId);
  return db.branch.delete({ where: { id } });
}

// Departments
export async function createDepartment(orgId: string, name: string, code: string) {
  return db.department.create({ data: { orgId, name, code: code.toUpperCase() } });
}
export async function updateDepartment(id: string, orgId: string, name: string, code: string) {
  await assertDepartmentInOrg(id, orgId);
  return db.department.update({ where: { id }, data: { name, code: code.toUpperCase() } });
}
export async function deleteDepartment(id: string, orgId: string) {
  await assertDepartmentInOrg(id, orgId);
  return db.department.delete({ where: { id } });
}

// Divisions
export async function createDivision(orgId: string, departmentId: string, name: string) {
  return db.division.create({ data: { orgId, departmentId, name } });
}
export async function updateDivision(id: string, orgId: string, name: string) {
  await assertDivisionInOrg(id, orgId);
  return db.division.update({ where: { id }, data: { name } });
}
export async function deleteDivision(id: string, orgId: string) {
  await assertDivisionInOrg(id, orgId);
  return db.division.delete({ where: { id } });
}

// Roles
export async function getRoles(orgId: string) {
  await ensureManagementRole(orgId);
  await syncChaRolePermissions(orgId);
  return db.role.findMany({
    where: { orgId },
    orderBy: { name: "asc" },
    include: { permissions: { include: { permission: true } } },
  });
}
export async function createRole(orgId: string, name: string) {
  const role = await db.role.create({ data: { orgId, name, isSystem: false } });
  invalidateRbacCache();
  return role;
}
export async function updateRolePermissions(roleId: string, orgId: string, permissionIds: string[]) {
  await assertRoleInOrg(roleId, orgId);
  // Permissions are a global catalogue — validate the ids exist so a caller
  // cannot smuggle in an arbitrary string.
  const valid = await db.permission.findMany({
    where: { id: { in: permissionIds } },
    select: { id: true },
  });
  const validIds = new Set(valid.map((p) => p.id));
  await db.rolePermission.deleteMany({ where: { roleId } });
  const toCreate = permissionIds.filter((id) => validIds.has(id));
  if (toCreate.length > 0) {
    await db.rolePermission.createMany({
      data: toCreate.map((permissionId) => ({ roleId, permissionId })),
    });
  }
  invalidateRbacCache();
}
export async function deleteRole(id: string, orgId: string) {
  await assertRoleInOrg(id, orgId);
  const role = await db.role.delete({ where: { id } });
  invalidateRbacCache();
  return role;
}

export async function getAllPermissions() {
  return db.permission.findMany({ orderBy: [{ group: "asc" }, { label: "asc" }] });
}
