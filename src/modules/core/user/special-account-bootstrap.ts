import { hash } from "bcryptjs";
import { db } from "@/lib/db";
import { ROOT_CONTROL_EMAIL } from "@/lib/root-access";

const ROOT_ROLE_NAME = "Root Module Controller";
const CHA_FULL_ACCESS_ROLE_NAME = "CHA Full Access";
const TEST_CHA_EMAIL = "test@adarshshipping.in";

export async function ensureSpecialAccounts(orgId: string, defaultPassword: string) {
  const passwordHash = await hash(defaultPassword, 12);

  const [rootPermission, chaPermissions] = await Promise.all([
    db.permission.findUniqueOrThrow({
      where: { key: "admin.modules.manage" },
      select: { id: true },
    }),
    db.permission.findMany({
      where: { group: "CHA" },
      select: { id: true },
      orderBy: { key: "asc" },
    }),
  ]);

  const [rootRole, chaRole] = await Promise.all([
    db.role.upsert({
      where: { orgId_name: { orgId, name: ROOT_ROLE_NAME } },
      update: { isSystem: false },
      create: { orgId, name: ROOT_ROLE_NAME, isSystem: false },
      select: { id: true },
    }),
    db.role.upsert({
      where: { orgId_name: { orgId, name: CHA_FULL_ACCESS_ROLE_NAME } },
      update: { isSystem: false },
      create: { orgId, name: CHA_FULL_ACCESS_ROLE_NAME, isSystem: false },
      select: { id: true },
    }),
  ]);

  await Promise.all([
    syncRolePermissionIds(rootRole.id, [rootPermission.id]),
    syncRolePermissionIds(chaRole.id, chaPermissions.map((permission) => permission.id)),
  ]);

  const [rootUser, chaUser] = await Promise.all([
    db.user.upsert({
      where: { email: ROOT_CONTROL_EMAIL },
      update: {
        orgId,
        name: "OBJ268 Version4",
        passwordHash,
        active: true,
      },
      create: {
        orgId,
        email: ROOT_CONTROL_EMAIL,
        name: "OBJ268 Version4",
        passwordHash,
        active: true,
      },
      select: { id: true, email: true },
    }),
    db.user.upsert({
      where: { email: TEST_CHA_EMAIL },
      update: {
        orgId,
        name: "CHA Test User",
        passwordHash,
        active: true,
      },
      create: {
        orgId,
        email: TEST_CHA_EMAIL,
        name: "CHA Test User",
        passwordHash,
        active: true,
      },
      select: { id: true, email: true },
    }),
  ]);

  await Promise.all([
    syncUserRole(rootUser.id, rootRole.id),
    syncUserRole(chaUser.id, chaRole.id),
  ]);

  return { rootUser, chaUser };
}

async function syncRolePermissionIds(roleId: string, permissionIds: readonly string[]) {
  await db.rolePermission.deleteMany({ where: { roleId } });

  if (permissionIds.length === 0) return;

  await db.rolePermission.createMany({
    data: permissionIds.map((permissionId) => ({ roleId, permissionId })),
    skipDuplicates: true,
  });
}

async function syncUserRole(userId: string, roleId: string) {
  await db.userRole.deleteMany({ where: { userId, roleId } });
  await db.userRole.create({ data: { userId, roleId } });
}
