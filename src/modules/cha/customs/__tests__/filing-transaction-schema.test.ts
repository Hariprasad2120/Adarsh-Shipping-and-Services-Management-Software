import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { getJobDetails } from "@/modules/cha/service";

const runId = Date.now().toString(36);

describe("CHA customs filing transaction schema", () => {
  let orgOneId: string;
  let orgTwoId: string;
  let userOneId: string;
  let managerOneId: string;
  let branchOneId: string;
  let customerOneId: string;
  let importJobTypeId: string;
  let exportJobTypeId: string;
  let importJobId: string;
  let exportJobId: string;

  async function createOrgFixture(label: string) {
    const org = await db.organisation.create({
      data: { name: `CHA Customs ${label} ${runId}`, slug: `cha-customs-${label}-${runId}` },
    });
    const branch = await db.branch.create({
      data: { orgId: org.id, name: `${label} Branch`, code: `C${label.slice(0, 3).toUpperCase()}${runId}` },
    });
    const user = await db.user.create({
      data: {
        orgId: org.id,
        email: `cha-customs-${label}-${runId}@test.local`,
        passwordHash: "test",
        name: `${label} Customs User`,
        active: true,
        isPlatformAdmin: true,
      },
    });
    const manager = await db.user.create({
      data: {
        orgId: org.id,
        email: `cha-customs-manager-${label}-${runId}@test.local`,
        passwordHash: "test",
        name: `${label} Customs Manager`,
        active: true,
      },
    });
    const customer = await db.crmAccount.create({
      data: {
        orgId: org.id,
        ownerId: user.id,
        createdById: user.id,
        updatedById: user.id,
        name: `${label} Customs Customer`,
        type: "Customer",
      },
    });
    const importJobType = await db.chaJobType.create({
      data: {
        orgId: org.id,
        name: `Import Customs ${label}`,
        movementDirection: "IMPORT",
        filingFlowCategory: "IMPORT_BE",
      },
    });
    const exportJobType = await db.chaJobType.create({
      data: {
        orgId: org.id,
        name: `Export Customs ${label}`,
        movementDirection: "EXPORT",
        filingFlowCategory: "EXPORT_SB",
      },
    });

    return { org, branch, user, manager, customer, importJobType, exportJobType };
  }

  async function createJob(params: {
    orgId: string;
    customerId: string;
    jobTypeId: string;
    branchId: string;
    ownerId: string;
    jobNumber: string;
    title: string;
  }) {
    return db.chaJob.create({
      data: {
        orgId: params.orgId,
        jobNumber: params.jobNumber,
        title: params.title,
        customerId: params.customerId,
        jobTypeId: params.jobTypeId,
        branchId: params.branchId,
        primaryOwnerId: params.ownerId,
      },
    });
  }

  beforeAll(async () => {
    const orgOne = await createOrgFixture("OrgOne");
    const orgTwo = await createOrgFixture("OrgTwo");

    orgOneId = orgOne.org.id;
    orgTwoId = orgTwo.org.id;
    userOneId = orgOne.user.id;
    managerOneId = orgOne.manager.id;
    branchOneId = orgOne.branch.id;
    customerOneId = orgOne.customer.id;
    importJobTypeId = orgOne.importJobType.id;
    exportJobTypeId = orgOne.exportJobType.id;

    const importJob = await createJob({
      orgId: orgOneId,
      customerId: customerOneId,
      jobTypeId: importJobTypeId,
      branchId: branchOneId,
      ownerId: userOneId,
      jobNumber: `IMP-${runId}`,
      title: "Import customs filing",
    });
    const exportJob = await createJob({
      orgId: orgOneId,
      customerId: customerOneId,
      jobTypeId: exportJobTypeId,
      branchId: branchOneId,
      ownerId: userOneId,
      jobNumber: `EXP-${runId}`,
      title: "Export customs filing",
    });
    await createJob({
      orgId: orgTwo.org.id,
      customerId: orgTwo.customer.id,
      jobTypeId: orgTwo.importJobType.id,
      branchId: orgTwo.branch.id,
      ownerId: orgTwo.user.id,
      jobNumber: `IMP-OTHER-${runId}`,
      title: "Other org customs filing",
    });

    importJobId = importJob.id;
    exportJobId = exportJob.id;
  });

  afterAll(async () => {
    await db.chaCustomsExternalEvent.deleteMany({
      where: { submission: { profile: { job: { orgId: { in: [orgOneId, orgTwoId] } } } } },
    });
    await db.chaCustomsExternalSubmission.deleteMany({
      where: { profile: { job: { orgId: { in: [orgOneId, orgTwoId] } } } },
    });
    await db.chaCustomsFlatFileGeneration.deleteMany({
      where: { profile: { job: { orgId: { in: [orgOneId, orgTwoId] } } } },
    });
    await db.chaCustomsChecklistGeneration.deleteMany({
      where: { profile: { job: { orgId: { in: [orgOneId, orgTwoId] } } } },
    });
    await db.chaCustomsFilingProfile.deleteMany({
      where: { job: { orgId: { in: [orgOneId, orgTwoId] } } },
    });
    await db.chaJobDeletionRequest.deleteMany({ where: { orgId: { in: [orgOneId, orgTwoId] } } });
    await db.chaAuditLog.deleteMany({ where: { orgId: { in: [orgOneId, orgTwoId] } } });
    await db.chaJob.deleteMany({ where: { orgId: { in: [orgOneId, orgTwoId] } } });
    await db.crmAccount.deleteMany({ where: { orgId: { in: [orgOneId, orgTwoId] } } });
    await db.chaJobType.deleteMany({ where: { orgId: { in: [orgOneId, orgTwoId] } } });
    await db.user.deleteMany({ where: { orgId: { in: [orgOneId, orgTwoId] } } });
    await db.branch.deleteMany({ where: { orgId: { in: [orgOneId, orgTwoId] } } });
    await db.organisation.deleteMany({ where: { id: { in: [orgOneId, orgTwoId] } } });
  });

  it("stores one ChaJob with an import profile and repeating rows", async () => {
    const profile = await db.chaCustomsFilingProfile.create({
      data: {
        jobId: importJobId,
        movementDirection: "IMPORT",
        filingType: "HOME_CONSUMPTION",
        transportMode: "SEA",
        customsHouseCode: "INMAA1",
        calculationRulesetVersion: "2026.07",
        masterDatasetVersions: { ritc: "2026-07-31", bcd: "2026-07-14" },
        importHeader: {
          create: {
            beType: "H",
            importerNameSnapshot: "Adarsh Cargo Ltd",
            importerIecSnapshot: "0300000000",
            grossWeight: new Prisma.Decimal("12345.678901"),
          },
        },
        importIgm: {
          create: {
            igmNo: "IGM-1",
            billRows: {
              create: [
                { sequenceNo: 1, mblNo: "MBL-1", packageCount: new Prisma.Decimal("10.5"), uom: "PKG" },
                { sequenceNo: 2, mblNo: "MBL-2", packageCount: new Prisma.Decimal("20.25"), uom: "PKG" },
              ],
            },
            containers: {
              create: [
                { sequenceNo: 1, containerNo: "CONT0000001", containerSize: "20FT" },
                { sequenceNo: 2, containerNo: "CONT0000002", containerSize: "40FT" },
              ],
            },
          },
        },
        importInvoices: {
          create: {
            sequenceNo: 1,
            invoiceNo: "INV-IMPORT-1",
            currency: "USD",
            exchangeRate: new Prisma.Decimal("83.123456789012"),
            invoiceValue: new Prisma.Decimal("1000.12345678"),
            charges: {
              create: [
                {
                  sequenceNo: 1,
                  chargeType: "FREIGHT",
                  currency: "USD",
                  exchangeRate: new Prisma.Decimal("83.123456789012"),
                  amount: new Prisma.Decimal("45.25"),
                  amountInr: new Prisma.Decimal("3761.34"),
                },
              ],
            },
          },
        },
        importDeclarations: {
          create: [
            {
              sequenceNo: 1,
              statementType: "DEC",
              statementCode: "B",
              statementText: "Declaration text",
              invoiceSequenceNo: 1,
              itemSequenceNo: 1,
            },
          ],
        },
      },
      include: {
        importIgm: { include: { billRows: true, containers: true } },
        importInvoices: { include: { charges: true } },
        importDeclarations: true,
      },
    });

    const item = await db.chaImportItem.create({
      data: {
        profileId: profile.id,
        invoiceId: profile.importInvoices[0].id,
        sequenceNo: 1,
        ritcNo: "01012100",
        itemDescription: "Pure-bred breeding animals",
        quantity: new Prisma.Decimal("2.000001"),
        unitPrice: new Prisma.Decimal("500.06172839"),
        itemAmount: new Prisma.Decimal("1000.12345678"),
        masterSnapshot: { sourceVersion: "2026-07-31", description: "Pure-bred breeding animals" },
      },
    });

    expect(profile.movementDirection).toBe("IMPORT");
    expect(profile.importIgm?.billRows).toHaveLength(2);
    expect(profile.importIgm?.containers).toHaveLength(2);
    expect(profile.importInvoices[0].charges).toHaveLength(1);
    expect(profile.importDeclarations).toHaveLength(1);
    expect(item.itemAmount?.toFixed(8)).toBe("1000.12345678");
  });

  it("stores one ChaJob with an export profile and calculation snapshots", async () => {
    const profile = await db.chaCustomsFilingProfile.create({
      data: {
        jobId: exportJobId,
        movementDirection: "EXPORT",
        filingType: "SHIPPING_BILL",
        transportMode: "SEA",
        customsHouseCode: "INMAA1",
        exportHeader: {
          create: {
            sbType: "NORMAL",
            exporterNameSnapshot: "Demo Exporter",
            consigneeNameSnapshot: "Demo Consignee",
            buyerNameSnapshot: "Demo Buyer",
            portOfDischarge: "Aalen - DEAAL",
          },
        },
        exportInvoices: {
          create: {
            sequenceNo: 1,
            invoiceNo: "INV-EXPORT-1",
            currency: "USD",
            exchangeRate: new Prisma.Decimal("83.123456789012"),
            productValue: new Prisma.Decimal("2100.00000000"),
            charges: {
              create: [
                {
                  sequenceNo: 1,
                  chargeType: "FOB_DISCOUNT",
                  amount: new Prisma.Decimal("100.00000000"),
                },
              ],
            },
          },
        },
        exportDocuments: {
          create: [
            {
              sequenceNo: 1,
              documentCode: "001002",
              documentNameSnapshot: "Lab analysis Report",
              issuingPartyNameSnapshot: "Issuing Party",
              beneficiaryNameSnapshot: "Beneficiary",
            },
          ],
        },
      },
      include: {
        exportInvoices: { include: { charges: true } },
        exportDocuments: true,
      },
    });

    const item = await db.chaExportItem.create({
      data: {
        profileId: profile.id,
        invoiceId: profile.exportInvoices[0].id,
        sequenceNo: 1,
        ritcNo: "03011100",
        itemDescription: "Freshwater",
        quantity: new Prisma.Decimal("3.000000"),
        unitPrice: new Prisma.Decimal("700.00000000"),
        itemAmount: new Prisma.Decimal("2100.00000000"),
        igstRate: new Prisma.Decimal("18.000000"),
        igstAmount: new Prisma.Decimal("378.00000000"),
        drawbackSnapshot: { schedule: "2026", capRate: "0.5" },
        rodtepSnapshot: { rate: "0.01", sourceVersion: "2026-07" },
        rosctlSnapshot: { schedule: "SCH1", percentage: "3.6" },
      },
    });

    expect(profile.movementDirection).toBe("EXPORT");
    expect(profile.exportInvoices[0].charges).toHaveLength(1);
    expect(item.igstRate?.toFixed(6)).toBe("18.000000");
    expect(profile.exportDocuments[0].documentCode).toBe("001002");
  });

  it("preserves organisation isolation through the existing ChaJob root", async () => {
    const orgOneProfiles = await db.chaCustomsFilingProfile.findMany({
      where: { job: { orgId: orgOneId } },
      include: { job: { select: { orgId: true } } },
    });
    const orgTwoProfiles = await db.chaCustomsFilingProfile.findMany({
      where: { job: { orgId: orgTwoId } },
    });

    expect(orgOneProfiles.every((profile) => profile.job.orgId === orgOneId)).toBe(true);
    expect(orgTwoProfiles).toHaveLength(0);
  });

  it("uses lockVersion for optimistic draft concurrency", async () => {
    const profile = await db.chaCustomsFilingProfile.findUniqueOrThrow({
      where: { jobId: importJobId },
      select: { id: true, lockVersion: true },
    });

    const firstUpdate = await db.chaCustomsFilingProfile.updateMany({
      where: { id: profile.id, lockVersion: profile.lockVersion },
      data: { lockVersion: { increment: 1 }, importItemStatus: "IN_PROGRESS" },
    });
    const staleUpdate = await db.chaCustomsFilingProfile.updateMany({
      where: { id: profile.id, lockVersion: profile.lockVersion },
      data: { lockVersion: { increment: 1 }, importItemStatus: "COMPLETE" },
    });

    expect(firstUpdate.count).toBe(1);
    expect(staleUpdate.count).toBe(0);
  });

  it("retains selected master snapshots after authoritative master changes", async () => {
    const master = await db.chaRitcTariffMaster.create({
      data: {
        orgId: orgOneId,
        sourceRunId: (
          await db.chaCustomsMasterImportRun.create({
            data: {
              orgId: orgOneId,
              masterType: "RITC_TARIFF",
              sourceType: "CONTROLLED_SEED_FIXTURE",
              sourceName: "Phase 3 snapshot fixture",
              datasetVersion: `snapshot-test-v1-${runId}`,
              status: "COMPLETED",
            },
          })
        ).id,
        tariffItem: `9988${runId.slice(-4)}`,
        description: "Original customs description",
        uom: "NOS",
        datasetVersion: "snapshot-test-v1",
        createdById: userOneId,
        updatedById: userOneId,
      },
    });
    const item = await db.chaImportItem.create({
      data: {
        profileId: (await db.chaCustomsFilingProfile.findUniqueOrThrow({ where: { jobId: importJobId } })).id,
        sequenceNo: 99,
        ritcNo: master.tariffItem,
        itemDescription: master.description,
        masterSnapshot: { tariffItem: master.tariffItem, description: master.description, datasetVersion: master.datasetVersion },
      },
    });

    await db.chaRitcTariffMaster.update({
      where: { id: master.id },
      data: { description: "Updated authoritative description", updatedById: userOneId },
    });

    const retained = await db.chaImportItem.findUniqueOrThrow({ where: { id: item.id } });
    expect(retained.itemDescription).toBe("Original customs description");
    expect(retained.masterSnapshot).toMatchObject({ description: "Original customs description" });
  });

  it("keeps deletion requests separate from customs filing data", async () => {
    await db.chaJobDeletionRequest.create({
      data: {
        orgId: orgOneId,
        jobId: importJobId,
        jobNumberSnapshot: `IMP-${runId}`,
        requestedById: userOneId,
        assignedManagerId: managerOneId,
        remarks: "Phase 3 deletion policy regression",
      },
    });

    const profile = await db.chaCustomsFilingProfile.findUnique({ where: { jobId: importJobId } });
    const job = await db.chaJob.findUnique({ where: { id: importJobId } });

    expect(profile).toBeTruthy();
    expect(job?.deletedAt).toBeNull();
  });

  it("prevents deleting external submissions after immutable events exist", async () => {
    const profile = await db.chaCustomsFilingProfile.findUniqueOrThrow({ where: { jobId: exportJobId } });
    const flatFile = await db.chaCustomsFlatFileGeneration.create({
      data: {
        profileId: profile.id,
        versionNo: 1,
        checksum: `flat-${runId}`,
        contentHash: `content-${runId}`,
        generatedById: userOneId,
      },
    });
    const submission = await db.chaCustomsExternalSubmission.create({
      data: {
        profileId: profile.id,
        flatFileGenerationId: flatFile.id,
        idempotencyKey: `icegate-${runId}`,
      },
    });
    await db.chaCustomsExternalEvent.create({
      data: {
        submissionId: submission.id,
        sequenceNo: 1,
        eventKind: "SUBMITTED",
        externalStatus: "SENT",
        safeMessage: "Submitted payload redacted",
      },
    });

    await expect(db.chaCustomsExternalSubmission.delete({ where: { id: submission.id } })).rejects.toThrow();
  });

  it("loads an existing CHA job without a customs filing profile", async () => {
    const legacyJob = await createJob({
      orgId: orgOneId,
      customerId: customerOneId,
      jobTypeId: importJobTypeId,
      branchId: branchOneId,
      ownerId: userOneId,
      jobNumber: `LEGACY-${runId}`,
      title: "Legacy CHA job without customs profile",
    });

    const details = await getJobDetails(userOneId, orgOneId, legacyJob.id);

    expect(details.id).toBe(legacyJob.id);
    expect(await db.chaCustomsFilingProfile.findUnique({ where: { jobId: legacyJob.id } })).toBeNull();
  });
});
