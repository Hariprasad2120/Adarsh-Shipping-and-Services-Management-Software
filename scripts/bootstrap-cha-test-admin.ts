import "dotenv/config";
import { hash } from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required.");
}

const adapter = new PrismaPg({ connectionString });
const db = new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);

const enabled = process.env.TEST_ADMIN_BOOTSTRAP_ENABLED === "true";
const rawEmail = process.env.TEST_ADMIN_EMAIL ?? "test@adarshipping.in";
const email = rawEmail.trim().toLowerCase();
const password = process.env.TEST_ADMIN_INITIAL_PASSWORD;
const orgSlug = process.env.TEST_ADMIN_ORG_SLUG ?? "adarsh-shipping";

const REQUIRED_PERMISSION_KEYS = [
  "admin.org.manage",
  "admin.users.manage",
  "admin.roles.manage",
  "cha.access",
  "cha.dashboard.view",
  "cha.job.read",
  "cha.job.create",
  "cha.job.update",
  "cha.job.assign",
  "cha.job.delete",
  "cha.job.delete.approve",
  "cha.job.view_all",
  "cha.document.read",
  "cha.document.upload",
  "cha.document.exception",
  "cha.checklist.prepare",
  "cha.checklist.submit",
  "cha.checklist.self_approve",
  "cha.checklist.manager_approve",
  "cha.filing.manage",
  "cha.advance.manage",
  "cha.expense.request",
  "cha.expense.manage",
  "cha.expense.pay",
  "cha.audit.view",
  "cha.settings.manage",
];

async function main() {
  if (!enabled) {
    console.log("Skipping bootstrap because TEST_ADMIN_BOOTSTRAP_ENABLED is not true.");
    return;
  }

  if (!password) {
    throw new Error("TEST_ADMIN_INITIAL_PASSWORD is required when TEST_ADMIN_BOOTSTRAP_ENABLED=true.");
  }

  const org = await db.organisation.findFirst({
    where: { slug: orgSlug },
    select: { id: true, name: true },
  });

  if (!org) {
    throw new Error(`Organisation '${orgSlug}' was not found.`);
  }

  const permissions = await db.permission.findMany({
    where: { key: { in: REQUIRED_PERMISSION_KEYS } },
    select: { id: true, key: true },
  });

  const missingKeys = REQUIRED_PERMISSION_KEYS.filter(
    (key) => !permissions.some((permission) => permission.key === key),
  );

  if (missingKeys.length > 0) {
    throw new Error(`Missing permissions: ${missingKeys.join(", ")}`);
  }

  const roleName = "CHA System Administrator";
  const role = await db.role.upsert({
    where: { orgId_name: { orgId: org.id, name: roleName } },
    update: {},
    create: {
      orgId: org.id,
      name: roleName,
      isSystem: false,
    },
    select: { id: true },
  });

  await db.rolePermission.deleteMany({ where: { roleId: role.id } });
  await db.rolePermission.createMany({
    data: permissions.map((permission) => ({
      roleId: role.id,
      permissionId: permission.id,
    })),
    skipDuplicates: true,
  });

  const passwordHash = await hash(password, 12);

  const user = await db.user.upsert({
    where: { email },
    update: {
      orgId: org.id,
      name: "CHA Test Administrator",
      passwordHash,
      active: true,
    },
    create: {
      orgId: org.id,
      email,
      name: "CHA Test Administrator",
      passwordHash,
      active: true,
    },
    select: { id: true, email: true },
  });

  await db.userRole.deleteMany({
    where: {
      userId: user.id,
      role: { orgId: org.id, name: roleName },
    },
  });
  await db.userRole.create({
    data: {
      userId: user.id,
      roleId: role.id,
    },
  });

  console.log(`Bootstrapped ${user.email} in organisation ${org.name}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
