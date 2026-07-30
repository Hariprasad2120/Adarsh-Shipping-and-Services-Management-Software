import { db } from "../src/lib/db";
import { verifyExactStagingDatabaseIdentity } from "./staging-target";

const permissionKeys = [
  "cha.access",
  "cha.dashboard.view",
  "cha.job.read",
  "cha.job.create",
  "cha.job.update",
  "cha.job.assign",
  "cha.job.view_all",
  "cha.document.read",
  "cha.checklist.prepare",
  "cha.filing.manage",
  "cha.expense.manage",
  "cha.audit.view",
  "cha.settings.manage",
];

async function main() {
  await verifyExactStagingDatabaseIdentity("Performance fixture access");
  const user = await db.user.findUniqueOrThrow({
  where: { email: "accounting-maker@staging.example.com" },
  select: { id: true, orgId: true },
});
  const role = await db.role.upsert({
  where: { orgId_name: { orgId: user.orgId!, name: "STAGING Performance Reader" } },
  update: {},
  create: { orgId: user.orgId!, name: "STAGING Performance Reader" },
});
  for (const key of permissionKeys) {
    const permission = await db.permission.upsert({
    where: { key },
    update: {},
    create: { key, label: key, group: "CHA" },
  });
    await db.rolePermission.upsert({
    where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
    update: {},
    create: { roleId: role.id, permissionId: permission.id },
    });
  }
  await db.userRole.upsert({
  where: { userId_roleId: { userId: user.id, roleId: role.id } },
  update: {},
  create: { userId: user.id, roleId: role.id },
  });
  console.log("Staging performance access is ready.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
