import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);

const DEMO_PASSWORD = "1234";
const ORG_SLUG = "adarsh-shipping";

const DEMO_USERS = [
  { email: "demouser0001@gmail.com", name: "Demo Admin", isPlatformAdmin: true, designation: "Platform Admin", roleName: "Admin" },
  { email: "demouser0002@gmail.com", name: "Demo HR", isPlatformAdmin: false, designation: "HR Manager", roleName: "HR" },
  { email: "demouser0003@gmail.com", name: "Demo Manager", isPlatformAdmin: false, designation: "Manager", roleName: "Manager" },
  { email: "demouser0004@gmail.com", name: "Demo Employee", isPlatformAdmin: false, designation: "Employee", roleName: "Employee" },
  { email: "demouser0005@gmail.com", name: "Demo Accounts", isPlatformAdmin: false, designation: "Accounts Executive", roleName: "Demo Accounts" },
];

const DEMO_ACCOUNTS_PERMISSION_GROUPS = ["Accounting", "CRM"];

async function main() {
  const org = await db.organisation.findUniqueOrThrow({
    where: { slug: ORG_SLUG },
    select: { id: true },
  });

  let demoAccountsRoleId: string | null = null;
  const accountingPerms = await db.permission.findMany({
    where: { group: { in: DEMO_ACCOUNTS_PERMISSION_GROUPS } },
    select: { id: true },
  });
  const demoAccountsRole = await db.role.upsert({
    where: { orgId_name: { orgId: org.id, name: "Demo Accounts" } },
    update: {},
    create: { orgId: org.id, name: "Demo Accounts" },
    select: { id: true },
  });
  demoAccountsRoleId = demoAccountsRole.id;
  await db.rolePermission.deleteMany({ where: { roleId: demoAccountsRoleId } });
  await db.rolePermission.createMany({
    data: accountingPerms.map((p) => ({ roleId: demoAccountsRoleId!, permissionId: p.id })),
    skipDuplicates: true,
  });

  const passwordHash = await hash(DEMO_PASSWORD, 12);
  const results: { email: string; id: string; role: string }[] = [];

  for (const u of DEMO_USERS) {
    const user = await db.user.upsert({
      where: { email: u.email },
      update: {
        orgId: org.id,
        name: u.name,
        passwordHash,
        active: true,
        isPlatformAdmin: u.isPlatformAdmin,
        designation: u.designation,
      },
      create: {
        orgId: org.id,
        email: u.email,
        name: u.name,
        passwordHash,
        active: true,
        isPlatformAdmin: u.isPlatformAdmin,
        designation: u.designation,
      },
      select: { id: true, email: true },
    });

    const role =
      u.roleName === "Demo Accounts"
        ? { id: demoAccountsRoleId! }
        : await db.role.findFirstOrThrow({
            where: { orgId: org.id, name: u.roleName },
            select: { id: true },
          });

    await db.userRole.deleteMany({ where: { userId: user.id } });
    await db.userRole.create({ data: { userId: user.id, roleId: role.id } });

    results.push({ email: user.email, id: user.id, role: u.roleName });
  }

  console.log("\nOrg ID:", org.id, `(slug: ${ORG_SLUG})`);
  console.log("\nDemo users (password for all: 1234):");
  for (const r of results) {
    console.log(`  ${r.email}  ->  ${r.id}  [${r.role}]`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
