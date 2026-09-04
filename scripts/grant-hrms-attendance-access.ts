/**
 * Idempotent, additive-only grant script for the HRMS & Attendance audit.
 * Mirrors scripts/grant-crm-full-access.ts. Does NOT remove any grant, role,
 * or user data. Safe to re-run against the shared dev database.
 *
 * What it does:
 *  1. Ensures the "hrms.settings.manage" Permission row exists in the catalog
 *     (it is referenced by the settings page + 6 API routes + the HR system
 *     role, but was missing from prisma/seed.ts's PERMISSIONS array, so the
 *     whole HRMS Settings surface 403'd for every user, platform admins
 *     included). prisma/seed.ts is also patched so fresh seeds get it.
 *  2. Grants hrms.settings.manage to the Admin / HR / "Monolith Full Access"
 *     roles (parity with the other hrms.*.manage keys).
 *  3. For dineshan.accounts@adarshshipping.in, ensures a dedicated per-user
 *     role "HRMS + Attendance Full Access - <email>" carrying every hrms.* and
 *     attendance.* permission, and attaches it — so the account can drive
 *     maker-checker and admin HRMS/Attendance testing.
 *  hr@adarshshipping.in already holds "Monolith Full Access" + "Admin" +
 *  "All Permissions - hr@adarshshipping.in" and needs no per-user role.
 *
 * Run: npx tsx scripts/grant-hrms-attendance-access.ts
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);

const SETTINGS_PERM = {
  key: "hrms.settings.manage",
  label: "Manage HRMS settings and configuration",
  group: "HRMS",
};
const SETTINGS_PERM_ROLE_NAMES = ["Admin", "HR", "Monolith Full Access"];
const PER_USER_ROLE_EMAILS = ["dineshan.accounts@adarshshipping.in"];

async function main() {
  // ── 1. ensure hrms.settings.manage exists ──────────────────────────────────
  const settingsPerm = await db.permission.upsert({
    where: { key: SETTINGS_PERM.key },
    update: { label: SETTINGS_PERM.label, group: SETTINGS_PERM.group },
    create: SETTINGS_PERM,
    select: { id: true, key: true },
  });
  console.log(`Permission ${settingsPerm.key} present (id=${settingsPerm.id}).`);

  // ── 2. grant it to the standard admin roles ────────────────────────────────
  const adminRoles = await db.role.findMany({
    where: { name: { in: SETTINGS_PERM_ROLE_NAMES } },
    select: { id: true, name: true },
  });
  for (const role of adminRoles) {
    await db.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: role.id, permissionId: settingsPerm.id } },
      update: {},
      create: { roleId: role.id, permissionId: settingsPerm.id },
    });
    console.log(`  granted ${settingsPerm.key} -> role "${role.name}"`);
  }

  // ── 3. per-user HRMS + Attendance full-access role ─────────────────────────
  const modulePerms = await db.permission.findMany({
    where: { OR: [{ key: { startsWith: "hrms." } }, { key: { startsWith: "attendance." } }] },
    select: { id: true, key: true },
  });
  console.log(`HRMS/Attendance catalog: ${modulePerms.length} keys.`);

  for (const email of PER_USER_ROLE_EMAILS) {
    const user = await db.user.findFirst({
      where: { email },
      select: { id: true, email: true, orgId: true },
    });
    if (!user?.orgId) { console.warn(`  SKIP ${email}: user/org not found.`); continue; }

    const roleName = `HRMS + Attendance Full Access - ${email}`;
    let role = await db.role.findFirst({ where: { name: roleName, orgId: user.orgId }, select: { id: true } });
    if (!role) {
      role = await db.role.create({ data: { name: roleName, orgId: user.orgId }, select: { id: true } });
      console.log(`  created role "${roleName}"`);
    }
    for (const perm of modulePerms) {
      await db.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
        update: {},
        create: { roleId: role.id, permissionId: perm.id },
      });
    }
    await db.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: role.id } },
      update: {},
      create: { userId: user.id, roleId: role.id },
    });
    console.log(`  ${email}: ${modulePerms.length} perms via "${roleName}"`);
  }

  console.log("\nDone. Restart the dev server (npm run dev:restart) and clear");
  console.log(".next/cache so the RBAC unstable_cache layer refetches.");
}

main().finally(() => db.$disconnect());
