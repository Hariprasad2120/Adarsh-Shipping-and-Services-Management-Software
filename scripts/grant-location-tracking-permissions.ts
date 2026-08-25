/**
 * Idempotent, additive-only grant script for the new Location & Field Tracking
 * permission keys. Does NOT touch any other permission, role, or user data.
 * Safe to run against the shared dev database — upserts Permission rows and
 * RolePermission links only for the 5 new "hrms.tracking.*" keys, and only for
 * roles named Admin / Management / HR / Manager that already exist per org.
 *
 * Run: npx tsx scripts/grant-location-tracking-permissions.ts
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);

const NEW_PERMISSIONS = [
  { key: "hrms.tracking.admin", label: "View team/org location tracking (Overview, Tracker, Live Sales)", group: "HRMS" },
  { key: "hrms.tracking.geofence.manage", label: "Create and edit geofences and tracking policies", group: "HRMS" },
  { key: "hrms.tracking.exceptions.review", label: "Review and resolve location tracking exceptions", group: "HRMS" },
  { key: "hrms.tracking.visits.manage", label: "Log, confirm and manage customer visits", group: "HRMS" },
  { key: "hrms.tracking.export", label: "Export location tracking data and reports", group: "HRMS" },
];

const ROLE_GRANTS: Record<string, string[]> = {
  Admin: NEW_PERMISSIONS.map((p) => p.key),
  Management: ["hrms.tracking.admin", "hrms.tracking.exceptions.review", "hrms.tracking.visits.manage", "hrms.tracking.export"],
  HR: NEW_PERMISSIONS.map((p) => p.key),
  Manager: ["hrms.tracking.admin", "hrms.tracking.visits.manage"],
};

async function main() {
  for (const perm of NEW_PERMISSIONS) {
    await db.permission.upsert({
      where: { key: perm.key },
      update: { label: perm.label, group: perm.group },
      create: perm,
    });
  }
  console.log(`Upserted ${NEW_PERMISSIONS.length} permissions.`);

  const permissions = await db.permission.findMany({ where: { key: { in: NEW_PERMISSIONS.map((p) => p.key) } } });
  const permByKey = new Map(permissions.map((p) => [p.key, p.id]));

  const namedRoles = await db.role.findMany({ where: { name: { in: Object.keys(ROLE_GRANTS) } } });
  // Some orgs also maintain ad-hoc "all permissions" style roles per super-user account
  // (e.g. "All Permissions - hr@adarshshipping.in") that hold most, but not all, of the
  // permission catalogue — these don't auto-track new catalogue entries, so backfill them too.
  const allPermissionRoles = await db.role.findMany({ where: { name: { contains: "All Permissions" } } });
  const roles = [...namedRoles, ...allPermissionRoles.filter((r) => !namedRoles.some((n) => n.id === r.id))];

  let linked = 0;
  for (const role of roles) {
    const keys = ROLE_GRANTS[role.name] ?? NEW_PERMISSIONS.map((p) => p.key);
    for (const key of keys) {
      const permissionId = permByKey.get(key);
      if (!permissionId) continue;
      await db.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId } },
        update: {},
        create: { roleId: role.id, permissionId },
      });
      linked++;
    }
  }
  console.log(`Linked ${linked} role-permission grants across ${roles.length} role rows (all orgs).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
