import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
} as ConstructorParameters<typeof PrismaClient>[0]);

type NormalizedOrgAssignment = {
  departmentName: string;
  divisionName: string | null;
};

const NORMALIZATION_MAP = new Map<string, NormalizedOrgAssignment>([
  ["Accounts Payable", { departmentName: "Accounts", divisionName: "Payable" }],
  ["Accounts Receivable", { departmentName: "Accounts", divisionName: "Receivable" }],
  ["Custom Broker Documentation", { departmentName: "Custom broker", divisionName: "Documentation" }],
  ["Custom Broker Operations", { departmentName: "Custom broker", divisionName: "Operations" }],
  ["Customs Broker Delivery Order", { departmentName: "Custom broker", divisionName: "Delivery Order" }],
  ["Customer Support", { departmentName: "Freight Forwarding", divisionName: "Customer Support" }],
  ["Delivery Order Documentation", { departmentName: "Delivery Order", divisionName: "Documentation" }],
  ["Delivery Order Operations", { departmentName: "Delivery Order", divisionName: "Operations" }],
  ["Freight Forwarding Business Development", { departmentName: "Freight Forwarding", divisionName: "Business Development" }],
  ["Freight Forwarding Customer Support", { departmentName: "Freight Forwarding", divisionName: "Customer Support" }],
  ["Freight Forwarding Sales", { departmentName: "Freight Forwarding", divisionName: "Sales" }],
  ["Human Resource Operation", { departmentName: "Human Resource", divisionName: "Operation" }],
  ["Head of Accounts", { departmentName: "Accounts", divisionName: null }],
  ["Head of Custom Broker's", { departmentName: "Custom broker", divisionName: null }],
  ["Head of Freight Forwarding", { departmentName: "Freight Forwarding", divisionName: null }],
  ["Head of HR", { departmentName: "Human Resource", divisionName: null }],
]);

async function main() {
  const org = await db.organisation.findFirstOrThrow();
  const departments = await db.department.findMany({
    where: { orgId: org.id },
    include: {
      divisions: true,
      users: { select: { id: true, name: true, departmentId: true, divisionId: true } },
    },
  });

  const departmentByName = new Map(
    departments.map((department) => [department.name.toLowerCase(), department]),
  );
  const divisionByDepartmentAndName = new Map(
    departments.flatMap((department) =>
      department.divisions.map((division) => [`${department.id}:${division.name.toLowerCase()}`, division] as const),
    ),
  );

  const movedUsers: Array<{ user: string; fromDepartment: string; toDepartment: string; toDivision: string | null }> = [];
  const removedDepartments: string[] = [];

  await db.$transaction(async (tx) => {
    for (const department of departments) {
      const normalized = NORMALIZATION_MAP.get(department.name);
      if (!normalized) continue;

      const targetDepartment = departmentByName.get(normalized.departmentName.toLowerCase()) ?? null;
      if (!targetDepartment) {
        throw new Error(`Missing target department: ${normalized.departmentName}`);
      }

      let targetDivision = normalized.divisionName
        ? divisionByDepartmentAndName.get(`${targetDepartment.id}:${normalized.divisionName.toLowerCase()}`) ?? null
        : null;

      if (!targetDivision && normalized.divisionName) {
        targetDivision = await tx.division.create({
          data: {
            orgId: org.id,
            departmentId: targetDepartment.id,
            name: normalized.divisionName,
          },
        });
        divisionByDepartmentAndName.set(`${targetDepartment.id}:${normalized.divisionName.toLowerCase()}`, targetDivision);
      }

      if (department.users.length > 0) {
        await tx.user.updateMany({
          where: { departmentId: department.id },
          data: {
            departmentId: targetDepartment.id,
            divisionId: targetDivision?.id ?? null,
          },
        });

        for (const user of department.users) {
          movedUsers.push({
            user: user.name,
            fromDepartment: department.name,
            toDepartment: targetDepartment.name,
            toDivision: targetDivision?.name ?? null,
          });
        }
      }

      await tx.division.deleteMany({ where: { departmentId: department.id } });
      await tx.department.delete({ where: { id: department.id } });
      removedDepartments.push(department.name);
    }
  });

  console.log(JSON.stringify({
    org: { id: org.id, name: org.name },
    movedUsersCount: movedUsers.length,
    movedUsers,
    removedDepartments,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
