import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
} as any);

const DEFAULT_PASSWORD = "Adarsh@2026";

async function main() {
  const org = await db.organisation.findFirstOrThrow();
  console.log(`Org: ${org.name} (${org.id})`);

  // ── Departments ──────────────────────────────────────────────────────────────

  const deptAccounts = await db.department.upsert({
    where: { orgId_code: { orgId: org.id, code: "ACCTS" } },
    update: {},
    create: { orgId: org.id, name: "Accounts", code: "ACCTS" },
  });

  const deptFF = await db.department.upsert({
    where: { orgId_code: { orgId: org.id, code: "FF" } },
    update: {},
    create: { orgId: org.id, name: "Freight Forwarding", code: "FF" },
  });

  console.log(`Departments: Accounts (${deptAccounts.id}), Freight Forwarding (${deptFF.id})`);

  // ── Roles ────────────────────────────────────────────────────────────────────

  const roleManager = await db.role.findFirstOrThrow({ where: { orgId: org.id, name: "Manager" } });
  const roleDirector = await db.role.findFirstOrThrow({ where: { orgId: org.id, name: "Director" } });
  const roleEmployee = await db.role.findFirstOrThrow({ where: { orgId: org.id, name: "Employee" } });

  const pw = await hash(DEFAULT_PASSWORD, 12);

  // ── Users ────────────────────────────────────────────────────────────────────

  // 1. Dineshan — Accounts Manager
  const dineshan = await db.user.upsert({
    where: { email: "dineshan.accounts@adarshshipping.in" },
    update: {},
    create: {
      orgId: org.id,
      email: "dineshan.accounts@adarshshipping.in",
      name: "Dineshan",
      passwordHash: pw,
      designation: "Accounts Manager",
      departmentId: deptAccounts.id,
    },
  });
  await db.userRole.upsert({
    where: { userId_roleId: { userId: dineshan.id, roleId: roleManager.id } },
    update: {},
    create: { userId: dineshan.id, roleId: roleManager.id },
  });
  console.log(`Created: ${dineshan.email}`);

  // 2. Abhilash — Freight Forwarding Manager
  const abhilash = await db.user.upsert({
    where: { email: "abhilash@adarshshipping.in" },
    update: {},
    create: {
      orgId: org.id,
      email: "abhilash@adarshshipping.in",
      name: "Abhilash",
      passwordHash: pw,
      designation: "Freight Forwarding Manager",
      departmentId: deptFF.id,
    },
  });
  await db.userRole.upsert({
    where: { userId_roleId: { userId: abhilash.id, roleId: roleManager.id } },
    update: {},
    create: { userId: abhilash.id, roleId: roleManager.id },
  });
  console.log(`Created: ${abhilash.email}`);

  // 3. Akshaya Blessey — Management (Director)
  const akshaya = await db.user.upsert({
    where: { email: "akshaya.blessey@adarshshipping.in" },
    update: {},
    create: {
      orgId: org.id,
      email: "akshaya.blessey@adarshshipping.in",
      name: "Akshaya Blessey",
      passwordHash: pw,
      designation: "Management",
    },
  });
  await db.userRole.upsert({
    where: { userId_roleId: { userId: akshaya.id, roleId: roleDirector.id } },
    update: {},
    create: { userId: akshaya.id, roleId: roleDirector.id },
  });
  console.log(`Created: ${akshaya.email}`);

  // 4. Poornima V — FF Customer Support Employee, manager = Abhilash
  const poornima = await db.user.upsert({
    where: { email: "poornima.v@adarshshipping.in" },
    update: {},
    create: {
      orgId: org.id,
      email: "poornima.v@adarshshipping.in",
      name: "Poornima V",
      passwordHash: pw,
      designation: "Customer Support",
      departmentId: deptFF.id,
      managerId: abhilash.id,
    },
  });
  await db.userRole.upsert({
    where: { userId_roleId: { userId: poornima.id, roleId: roleEmployee.id } },
    update: {},
    create: { userId: poornima.id, roleId: roleEmployee.id },
  });
  console.log(`Created: ${poornima.email}`);

  console.log(`\nDone. Default password: ${DEFAULT_PASSWORD}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => (db as any).$disconnect());
