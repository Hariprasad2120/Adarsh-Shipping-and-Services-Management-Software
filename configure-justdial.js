const { PrismaClient } = require('./src/generated/prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const fs = require('fs');
require('dotenv/config');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

async function run() {
  try {
    const user = await db.user.findFirst();
    if (!user) {
      console.error("No user found in the system database!");
      return;
    }
    const orgId = user.orgId;
    if (!orgId) {
      console.error(`User ${user.name} does not have an orgId!`);
      return;
    }
    console.log(`Found user: ${user.name} (${user.id}) with orgId: ${orgId}`);

    const cookiesContent = fs.readFileSync('C:/Users/Purushothaman/Downloads/Cookie.txt', 'utf8');

    // Parse it to verify JSON
    const parsed = JSON.parse(cookiesContent);
    console.log(`Loaded ${parsed.length} cookies successfully.`);

    const dashboardUrl = "https://wap.justdial.com/analytics/leaddashboard?el=0&nh=1&docid=044PXX44.XX44.101103084537.I5S5&hide_header=1&ln=en&m=1&old=1&source=77&tab=leaddashboard&wap=77&tab=leaddashboard";

    const config = await db.crmLeadSourceJustdialConfig.upsert({
      where: { orgId },
      update: {
        dashboardUrl,
        cookiesJson: cookiesContent,
        isActive: true,
        defaultOwnerId: user.id,
      },
      create: {
        orgId,
        dashboardUrl,
        cookiesJson: cookiesContent,
        isActive: true,
        defaultOwnerId: user.id,
        importMode: "MANUAL",
        maxLeads: 50,
        duplicateHandling: "UPDATE_EXISTING",
        defaultStage: "NEW"
      }
    });

    console.log("Justdial configuration updated successfully:", config);
  } catch (err) {
    console.error("Error during configuration:", err);
  } finally {
    await db.$disconnect();
  }
}

run();
