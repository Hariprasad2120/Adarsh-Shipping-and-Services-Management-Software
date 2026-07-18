import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const email = "no-reply@adarshshipping.in";
  const plainPassword = "Password@123";

  console.log("🚀 Provisioning test customer portal user...");

  // 1. Find or create an active CRM account to link the portal user to
  let customerAccount = await prisma.crmAccount.findFirst({
    where: { isPortalEnabled: true },
  });

  if (!customerAccount) {
    customerAccount = await prisma.crmAccount.findFirst();
    if (!customerAccount) {
      throw new Error("No CRM accounts found in database. Create a customer account first.");
    }
    // Enable portal access
    customerAccount = await prisma.crmAccount.update({
      where: { id: customerAccount.id },
      data: { isPortalEnabled: true },
    });
    console.log(`✓ Enabled customer portal access on account: ${customerAccount.name}`);
  } else {
    console.log(`✓ Using active customer portal account: ${customerAccount.name}`);
  }

  // 2. Hash the password with bcrypt (rounds = 10)
  const passwordHash = await bcrypt.hash(plainPassword, 10);

  // 3. Create or update the portal user
  const portalUser = await prisma.customerPortalUser.upsert({
    where: { email },
    update: {
      passwordHash,
      status: "ACTIVE",
      activationToken: null,
      activatedAt: new Date(),
    },
    create: {
      email,
      name: "Adarsh Shipping Test Contact",
      passwordHash,
      status: "ACTIVE",
      activatedAt: new Date(),
      crmAccount: {
        connect: { id: customerAccount.id },
      },
    },
  });

  console.log(`✅ Success! Customer Portal User provisioned.`);
  console.log(`📧 Email: ${portalUser.email}`);
  console.log(`🔑 Password: ${plainPassword}`);
  console.log(`🔗 Account Linked: ${customerAccount.name}`);
}

main()
  .catch((e) => {
    console.error("❌ Failed to provision portal user:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
