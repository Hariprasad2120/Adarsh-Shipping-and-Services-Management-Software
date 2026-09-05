/**
 * Idempotent, additive-only grant script that gives the named accounts full
 * access to every CRM permission in the catalog. Does NOT remove any grant,
 * role, or user data. Safe to re-run against the shared dev database.
 *
 * For each target user it ensures a dedicated per-user role
 * "CRM Full Access - <email>" in that user's org, links every "crm.*"
 * Permission row to it, and attaches the role to the user.
 *
 * Run: npx tsx scripts/grant-crm-full-access.ts
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);

const TARGET_EMAILS = [
  "hr@adarshshipping.in",
  "dineshan.accounts@adarshshipping.in",
];

async function main() {
  const crmPermissions = await db.permission.findMany({
    where: { key: { startsWith: "crm." } },
    select: { id: true, key: true },
  });
  if (crmPermissions.length === 0) throw new Error("No crm.* permissions found in catalog.");
  console.log(`CRM permission catalog: ${crmPermissions.length} keys.`);

  for (const email of TARGET_EMAILS) {
    const user = await db.user.findFirst({
      where: { email },
      select: { id: true, email: true, orgId: true },
    });
    if (!user) { console.warn(`  SKIP ${email}: user not found.`); continue; }
    if (!user.orgId) { console.warn(`  SKIP ${email}: user has no orgId.`); continue; }

    const roleName = `CRM Full Access - ${email}`;
    let role = await db.role.findFirst({ where: { name: roleName, orgId: user.orgId }, select: { id: true } });
    if (!role) {
      role = await db.role.create({
        data: { name: roleName, orgId: user.orgId },
        select: { id: true },
      });
      console.log(`  Created role "${roleName}".`);
    }

    let linked = 0;
    for (const perm of crmPermissions) {
      const res = await db.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
        update: {},
        create: { roleId: role.id, permissionId: perm.id },
      });
      if (res) linked++;
    }

    await db.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: role.id } },
      update: {},
      create: { userId: user.id, roleId: role.id },
    });

    console.log(`  ${email}: role attached, ${linked} crm.* permissions linked.`);
  }

  console.log("Done.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await db.$disconnect(); });
