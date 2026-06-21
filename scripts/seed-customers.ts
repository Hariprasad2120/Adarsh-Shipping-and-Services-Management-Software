import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
} as any);

async function main() {
  const org = await db.organisation.findFirstOrThrow();
  const user = await db.user.findFirstOrThrow({
    where: { orgId: org.id },
  });

  console.log(`Using Org: ${org.name} (${org.id}) and Owner: ${user.name} (${user.id})`);

  const customersToSeed = [
    {
      name: "Adarsh Cargo Ltd",
      companyName: "Adarsh Cargo Ltd",
      email: "logistics@adarshcargo.com",
      phone: "+91 44 4211 3344",
      website: "https://www.adarshcargo.com",
      industry: "Logistics & Maritime Freight",
    },
    {
      name: "Madras Steel Works",
      companyName: "Madras Steel Works",
      email: "procurement@madrassteel.in",
      phone: "+91 44 2622 5566",
      website: "https://www.madrassteel.in",
      industry: "Manufacturing & Metallurgy",
    },
    {
      name: "Apex Auto Spares",
      companyName: "Apex Auto Spares",
      email: "import@apexautospares.com",
      phone: "+91 22 2844 7788",
      website: "https://www.apexautospares.com",
      industry: "Automotive Components",
    },
    {
      name: "Triton Chemical Group",
      companyName: "Triton Chemical Group",
      email: "imports@tritonchems.com",
      phone: "+91 33 2455 9900",
      website: "https://www.tritonchems.com",
      industry: "Chemicals & Plastics",
    }
  ];

  for (const c of customersToSeed) {
    const existing = await db.crmAccount.findFirst({
      where: { orgId: org.id, name: c.name },
    });

    if (!existing) {
      const created = await db.crmAccount.create({
        data: {
          orgId: org.id,
          ownerId: user.id,
          name: c.name,
          companyName: c.companyName,
          type: "Customer",
          customerSubType: "Business",
          email: c.email,
          phone: c.phone,
          website: c.website,
          industry: c.industry,
          status: "ACTIVE",
          createdById: user.id,
          updatedById: user.id,
        },
      });
      console.log(`Seeded Customer: ${created.name}`);
    } else {
      console.log(`Customer already exists: ${existing.name}`);
    }
  }

  console.log("Customer accounts seeding completed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => (db as any).$disconnect());
