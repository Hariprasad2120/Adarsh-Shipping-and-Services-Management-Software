import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
} as ConstructorParameters<typeof PrismaClient>[0]);

async function main() {
  console.log("\n=======================================================");
  console.log("   MONOLITH BULK MAILBOX INTEGRATION PROCESSOR");
  console.log("=======================================================\n");
  
  // 1. Fetch organization
  const org = await db.organisation.findFirst();
  if (!org) {
    console.error("Error: No organisation found. Run db seed first.");
    process.exit(1);
  }
  
  console.log(`Target Organisation : ${org.name} (${org.id})`);
  
  // 2. Fetch active users who do not have a personal mail account registered
  const users = await db.user.findMany({
    where: {
      orgId: org.id,
      active: true,
      mailAccounts: {
        none: {
          isShared: false,
        }
      }
    }
  });
  
  console.log(`Active Members Found: ${users.length}\n`);
  
  if (users.length === 0) {
    console.log("✓ All active organization members already have personal mailboxes configured. Nothing to do.");
    return;
  }
  
  // 3. Read SMTP & IMAP provider variables from environment if set, otherwise default to Internal Mail routing
  const smtpHost = process.env.BULK_SMTP_HOST || "";
  const smtpPort = process.env.BULK_SMTP_PORT ? Number(process.env.BULK_SMTP_PORT) : 587;
  const smtpPassword = process.env.BULK_SMTP_PASSWORD || "";
  
  const imapHost = process.env.BULK_IMAP_HOST || "";
  const imapPort = process.env.BULK_IMAP_PORT ? Number(process.env.BULK_IMAP_PORT) : 993;
  const imapPassword = process.env.BULK_IMAP_PASSWORD || "";

  console.log("Mail Provider Node Configuration:");
  console.log(`- Outgoing SMTP Host : ${smtpHost || "INTERNAL ROUTING ONLY"}`);
  if (smtpHost) {
    console.log(`- SMTP Port          : ${smtpPort}`);
    console.log(`- SMTP Password      : [Placeholder configured]`);
  }
  console.log(`- Incoming IMAP Host : ${imapHost || "INTERNAL ROUTING ONLY"}`);
  if (imapHost) {
    console.log(`- IMAP Port          : ${imapPort}`);
    console.log(`- IMAP Password      : [Placeholder configured]`);
  }
  console.log("\nStarting bulk mailbox creation...\n");
  
  let createdCount = 0;
  for (const user of users) {
    const smtpPasswordHash = smtpPassword
      ? Buffer.from(smtpPassword).toString("base64")
      : null;
    const imapPasswordHash = imapPassword
      ? Buffer.from(imapPassword).toString("base64")
      : null;

    // Use transaction for individual user setup to guarantee consistency
    await db.$transaction(async (tx) => {
      // Create MailAccount
      await tx.mailAccount.create({
        data: {
          orgId: org.id,
          userId: user.id,
          name: user.name,
          email: user.email,
          smtpHost: smtpHost || null,
          smtpPort: smtpHost ? smtpPort : null,
          smtpUser: smtpHost ? user.email : null,
          smtpPasswordHash,
          imapHost: imapHost || null,
          imapPort: imapHost ? imapPort : null,
          imapUser: imapHost ? user.email : null,
          imapPasswordHash,
          isShared: false,
          isActive: true,
          isDefault: true,
        }
      });

      // Register core system labels/folders
      const folderLabels = ["INBOX", "SENT", "STARRED", "TRASH", "ARCHIVE", "DRAFT"];
      for (const labelName of folderLabels) {
        const labelExists = await tx.mailLabel.findFirst({
          where: { orgId: org.id, userId: user.id, name: labelName }
        });
        if (!labelExists) {
          await tx.mailLabel.create({
            data: {
              orgId: org.id,
              userId: user.id,
              name: labelName,
            }
          });
        }
      }
    });

    console.log(`[+] Created mailbox & folder system for: ${user.name} (${user.email})`);
    createdCount++;
  }
  
  console.log(`\n=======================================================`);
  console.log(`✓ Bulk Integration Completed successfully!`);
  console.log(`Total Personal Mailboxes Registered: ${createdCount}`);
  console.log(`=======================================================\n`);
}

main()
  .catch((err) => {
    console.error("\n❌ Bulk Integration Processor Failed:", err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
