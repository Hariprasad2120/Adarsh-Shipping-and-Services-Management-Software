import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  assertExactStagingEnvironment,
  verifyExactStagingDatabaseIdentity,
} from "./staging-target";

const AUDIT_ORG_ID = "stg_org_monolith_accounting";
const AUDIT_ROLE_ID = "stg_role_final_ui_audit";
const AUDIT_USER_ID = "stg_user_final_ui_audit";
const AUDIT_EMAIL = "final-ui-audit@staging.example.com";
const AUDIT_ROLE_NAME = "STAGING Final UI Audit";

const mode = process.argv[2];
if (mode !== "prepare" && mode !== "cleanup") {
  throw new Error("Expected prepare or cleanup.");
}

const { connectionString } = assertExactStagingEnvironment("Final UI audit");
const adapter = new PrismaPg({ connectionString });
const db = new PrismaClient({
  adapter,
} as ConstructorParameters<typeof PrismaClient>[0]);

async function readProductionPermissionCatalogue() {
  const seedSource = await readFile(resolve("prisma/seed.ts"), "utf8");
  const permissionPattern =
    /\{\s*key:\s*"([^"]+)",\s*label:\s*"([^"]+)",\s*group:\s*"([^"]+)"\s*\}/g;
  const permissions = Array.from(
    seedSource.matchAll(permissionPattern),
    (match) => ({
      key: match[1],
      label: match[2],
      group: match[3],
    }),
  );

  if (permissions.length < 100) {
    throw new Error(
      `Permission catalogue parse returned only ${permissions.length} entries.`,
    );
  }

  return permissions;
}

async function prepare() {
  const password = process.env.UI_AUDIT_PASSWORD;
  if (!password) {
    throw new Error("UI_AUDIT_PASSWORD is required.");
  }

  const permissions = await readProductionPermissionCatalogue();
  const passwordHash = await hash(password, 12);

  await db.$transaction(async (tx) => {
    const org = await tx.organisation.findUnique({
      where: { id: AUDIT_ORG_ID },
      select: { id: true },
    });
    if (!org) {
      throw new Error("The staging fixture organisation is missing.");
    }

    for (const permission of permissions) {
      await tx.permission.upsert({
        where: { key: permission.key },
        update: permission,
        create: permission,
      });
    }

    const role = await tx.role.upsert({
      where: {
        orgId_name: {
          orgId: AUDIT_ORG_ID,
          name: AUDIT_ROLE_NAME,
        },
      },
      update: { isSystem: false },
      create: {
        id: AUDIT_ROLE_ID,
        orgId: AUDIT_ORG_ID,
        name: AUDIT_ROLE_NAME,
      },
      select: { id: true },
    });

    const storedPermissions = await tx.permission.findMany({
      where: { key: { in: permissions.map(({ key }) => key) } },
      select: { id: true },
    });

    await tx.rolePermission.deleteMany({ where: { roleId: role.id } });
    await tx.rolePermission.createMany({
      data: storedPermissions.map(({ id }) => ({
        roleId: role.id,
        permissionId: id,
      })),
      skipDuplicates: true,
    });

    const user = await tx.user.upsert({
      where: { email: AUDIT_EMAIL },
      update: {
        active: true,
        isPlatformAdmin: true,
        name: "STAGING Final UI Auditor",
        orgId: AUDIT_ORG_ID,
        passwordHash,
      },
      create: {
        id: AUDIT_USER_ID,
        active: true,
        activatedAt: new Date("2027-04-01T00:00:00.000Z"),
        email: AUDIT_EMAIL,
        isPlatformAdmin: true,
        name: "STAGING Final UI Auditor",
        orgId: AUDIT_ORG_ID,
        passwordHash,
      },
      select: { id: true },
    });

    await tx.userRole.deleteMany({ where: { userId: user.id } });
    await tx.userRole.create({
      data: { userId: user.id, roleId: role.id },
    });
  });

  console.log(
    `Prepared the isolated final UI audit identity with ${permissions.length} production permissions.`,
  );
}

async function cleanup() {
  await db.$transaction(async (tx) => {
    await tx.user.deleteMany({ where: { id: AUDIT_USER_ID } });
    await tx.role.deleteMany({ where: { id: AUDIT_ROLE_ID } });
  });
  console.log("Removed the isolated final UI audit identity.");
}

async function main() {
  await verifyExactStagingDatabaseIdentity("Final UI audit");
  if (mode === "prepare") {
    await prepare();
  } else {
    await cleanup();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
