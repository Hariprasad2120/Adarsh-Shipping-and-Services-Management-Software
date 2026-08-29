import { hash } from "bcryptjs";
import { db } from "@/lib/db";

const ROOT_ROLE_NAME = "Root Module Controller";
const CHA_FULL_ACCESS_ROLE_NAME = "CHA Full Access";

// Emails are environment-configured, never hardcoded (MON-S1-003). If an email
// is not set, that special account is simply not created.
const ROOT_CONTROL_EMAIL = process.env.SPECIAL_ROOT_ACCOUNT_EMAIL?.trim().toLowerCase();
const TEST_CHA_EMAIL = process.env.SPECIAL_CHA_TEST_EMAIL?.trim().toLowerCase();

export async function ensureSpecialAccounts(orgId: string, defaultPassword: string) {
  if (!ROOT_CONTROL_EMAIL && !TEST_CHA_EMAIL) {
    throw new Error(
      "ensureSpecialAccounts: set SPECIAL_ROOT_ACCOUNT_EMAIL and/or SPECIAL_CHA_TEST_EMAIL.",
    );
  }
  if (!defaultPassword || defaultPassword.length < 12) {
    throw new Error(
      "ensureSpecialAccounts: SPECIAL_ACCOUNTS_INITIAL_PASSWORD must be set (>= 12 chars).",
    );
  }
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

  async function upsertSpecialUser(email: string, name: string, roleId: string) {
    const user = await db.user.upsert({
      where: { email },
      update: { orgId, name, passwordHash, active: true },
      create: { orgId, email, name, passwordHash, active: true },
      select: { id: true, email: true },
    });
    await syncUserRole(user.id, roleId);
    return user;
  }

  const rootUser = ROOT_CONTROL_EMAIL
    ? await upsertSpecialUser(ROOT_CONTROL_EMAIL, "Root Module Controller", rootRole.id)
    : null;
  const chaUser = TEST_CHA_EMAIL
    ? await upsertSpecialUser(TEST_CHA_EMAIL, "CHA Test User", chaRole.id)
    : null;

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
