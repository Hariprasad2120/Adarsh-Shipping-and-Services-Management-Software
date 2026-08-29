/**
 * MON-S1-014 migration bridge.
 *
 * The old RBAC behaviour auto-granted accounting permissions to any user whose
 * free-text department name looked like "accounts"/"accounting", keyed off their
 * role *name*. That implicit path is now OFF by default
 * (`RBAC_LEGACY_DEPARTMENT_GRANTS`).
 *
 * This script materialises every currently-implied grant into explicit
 * `RolePermission` rows on a dedicated per-org role
 * ("Accounting Department (migrated)"), and assigns the affected users to it via
 * `UserRole`. After running it, the legacy flag can stay OFF with no user losing
 * access — but every grant is now visible in the permissions UI and audit.
 *
 * Usage:
 *   npx tsx scripts/backfill-department-permission-grants.ts            # dry run
 *   npx tsx scripts/backfill-department-permission-grants.ts --apply    # write
 *
 * Rollback:
 *   Delete the "Accounting Department (migrated)" role in each org (its
 *   RolePermission + UserRole rows cascade). No other data is touched.
 */
import { db } from "@/lib/db";
import { getDepartmentScopedPermissionKeys } from "@/lib/rbac";

const APPLY = process.argv.includes("--apply");
const MIGRATED_ROLE_NAME = "Accounting Department (migrated)";

async function main() {
  const users = await db.user.findMany({
    where: { active: true, orgId: { not: null } },
    select: {
      id: true,
      email: true,
      orgId: true,
      department: { select: { code: true, name: true } },
      roles: { select: { role: { select: { name: true } } } },
    },
  });

  // org -> Set<permissionKey> that must exist as explicit grants
  const perOrg = new Map<string, { userIds: Set<string>; keys: Set<string> }>();

  for (const u of users) {
    if (!u.orgId) continue;
    const derived = getDepartmentScopedPermissionKeys({
      departmentCode: u.department?.code ?? null,
      departmentName: u.department?.name ?? null,
      roleNames: u.roles.map((r) => r.role.name),
    });
    if (derived.size === 0) continue;
    const bucket =
      perOrg.get(u.orgId) ?? { userIds: new Set<string>(), keys: new Set<string>() };
    bucket.userIds.add(u.id);
    for (const k of derived) bucket.keys.add(k);
    perOrg.set(u.orgId, bucket);
  }

  if (perOrg.size === 0) {
    console.log("No users currently receive implicit department grants. Nothing to do.");
    return;
  }

  for (const [orgId, { userIds, keys }] of perOrg) {
    console.log(
      `\norg ${orgId}: ${userIds.size} user(s), ${keys.size} permission key(s)`,
    );
    if (!APPLY) {
      console.log("  (dry run — pass --apply to write)");
      continue;
    }

    const permissions = await db.permission.findMany({
      where: { key: { in: [...keys] } },
      select: { id: true, key: true },
    });
    const missing = [...keys].filter((k) => !permissions.some((p) => p.key === k));
    if (missing.length) {
      console.warn(`  skipping unknown permission keys: ${missing.join(", ")}`);
    }

    const role = await db.role.upsert({
      where: { orgId_name: { orgId, name: MIGRATED_ROLE_NAME } },
      update: {},
      create: { orgId, name: MIGRATED_ROLE_NAME, isSystem: false },
      select: { id: true },
    });

    await db.rolePermission.createMany({
      data: permissions.map((p) => ({ roleId: role.id, permissionId: p.id })),
      skipDuplicates: true,
    });

    await db.userRole.createMany({
      data: [...userIds].map((userId) => ({ userId, roleId: role.id })),
      skipDuplicates: true,
    });

    console.log(
      `  wrote role ${role.id} with ${permissions.length} permission(s), assigned ${userIds.size} user(s)`,
    );
  }

  console.log(
    APPLY
      ? "\nDone. You can keep RBAC_LEGACY_DEPARTMENT_GRANTS unset/false."
      : "\nDry run complete.",
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
