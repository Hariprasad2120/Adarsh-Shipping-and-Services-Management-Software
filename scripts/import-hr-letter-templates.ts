import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getBundledDocxTemplateFiles, importDocxTemplateFile } from "../src/modules/hrms/letter-template-import";

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const db = new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);

  try {
    const orgs = await db.organisation.findMany({ select: { id: true, name: true } });
    for (const org of orgs) {
      console.log(`Importing HR letter templates for ${org.name}...`);
      await db.hRLetterTemplate.deleteMany({ where: { orgId: org.id } });

      for (const file of getBundledDocxTemplateFiles()) {
        const template = await importDocxTemplateFile(file);
        await db.hRLetterTemplate.create({
          data: {
            orgId: org.id,
            name: template.name,
            type: template.type,
            content: template.content,
            variables: template.variables,
            sourceDocxPath: template.sourceDocxPath,
            previewHtml: template.previewHtml,
            fieldSchema: template.fieldSchema,
            editorDocument: template.editorDocument,
            sourceFileName: template.sourceFileName,
            isActive: true,
            isLegalReviewed: true,
            legalReviewedAt: new Date(),
            version: 1,
          },
        });
      }
    }
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
