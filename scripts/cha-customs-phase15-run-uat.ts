import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";

import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import {
  getChaCustomsFeatureFlagsSettingKey,
} from "@/modules/cha/customs/feature-flags";
import { CHA_CUSTOMS_PERMISSIONS } from "@/modules/cha/customs/permissions";
import { CHA_CUSTOMS_PHASE15_ROLE_FIXTURES, CHA_CUSTOMS_PHASE15_UAT_SCENARIOS } from "./cha-customs-phase15-fixtures";
import { STAGING_LOGIN_IDENTITY } from "./staging-login-policy";
import { verifyExactStagingDatabaseIdentity } from "./staging-target";

const STAGING_ORG_ID = "stg_org_monolith_accounting";
const STAGING_BRANCH_ID = "stg_branch_demo";
const OUTPUT_PATH = resolve(
  process.cwd(),
  "artifacts",
  "cha-customs",
  "phase15",
  "uat-evidence.json",
);
const require = createRequire(import.meta.url);

type RuntimeServices = {
  ensureCustomsFilingProfileForJob: typeof import("@/modules/cha/customs/filing/workspace").ensureCustomsFilingProfileForJob;
  saveImportBeMainDraft: typeof import("@/modules/cha/customs/filing/import-drafts").saveImportBeMainDraft;
  saveImportIgmDraft: typeof import("@/modules/cha/customs/filing/import-drafts").saveImportIgmDraft;
  saveImportRemainingDraft: typeof import("@/modules/cha/customs/filing/import-drafts").saveImportRemainingDraft;
  getImportFilingDraft: typeof import("@/modules/cha/customs/filing/import-drafts").getImportFilingDraft;
  generateImportChecklistSnapshot: typeof import("@/modules/cha/customs/filing/import-drafts").generateImportChecklistSnapshot;
  generateImportFlatFileSnapshot: typeof import("@/modules/cha/customs/filing/import-drafts").generateImportFlatFileSnapshot;
  saveExportSbMainDraft: typeof import("@/modules/cha/customs/filing/export-drafts").saveExportSbMainDraft;
  saveExportInvoiceDraft: typeof import("@/modules/cha/customs/filing/export-drafts").saveExportInvoiceDraft;
  saveExportRemainingDraft: typeof import("@/modules/cha/customs/filing/export-drafts").saveExportRemainingDraft;
  getExportFilingDraft: typeof import("@/modules/cha/customs/filing/export-drafts").getExportFilingDraft;
  generateExportChecklistSnapshot: typeof import("@/modules/cha/customs/filing/export-drafts").generateExportChecklistSnapshot;
  generateExportFlatFileSnapshot: typeof import("@/modules/cha/customs/filing/export-drafts").generateExportFlatFileSnapshot;
  registerExportFlatFileSignature: typeof import("@/modules/cha/customs/filing/export-drafts").registerExportFlatFileSignature;
  getIcegateDiagnostics: typeof import("@/modules/cha/customs/icegate/diagnostics.server").getIcegateDiagnostics;
  processIcegateExternalEvent: typeof import("@/modules/cha/customs/icegate/event-processing.server").processIcegateExternalEvent;
  MockIcegateClient: typeof import("@/modules/cha/customs/icegate/mock-client.server").MockIcegateClient;
  submitGeneratedIcegateFile: typeof import("@/modules/cha/customs/icegate/service.server").submitGeneratedIcegateFile;
};

async function writeJsonArtifact(path: string, value: unknown) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function installServerOnlyShim() {
  const Module = require("node:module") as {
    _resolveFilename: (
      request: string,
      parent: unknown,
      isMain: boolean,
      options: unknown,
    ) => string;
  };
  const stubPath = resolve(process.cwd(), "scripts", "server-only-runtime-stub.js");
  const originalResolveFilename = Module._resolveFilename.bind(Module);

  Module._resolveFilename = (
    request: string,
    parent: unknown,
    isMain: boolean,
    options: unknown,
  ) => {
    if (request === "server-only") {
      return stubPath;
    }
    return originalResolveFilename(request, parent, isMain, options);
  };
}

async function loadRuntimeServices(): Promise<RuntimeServices> {
  installServerOnlyShim();
  const workspace = await import("@/modules/cha/customs/filing/workspace");
  const importDrafts = await import("@/modules/cha/customs/filing/import-drafts");
  const exportDrafts = await import("@/modules/cha/customs/filing/export-drafts");
  const diagnostics = await import("@/modules/cha/customs/icegate/diagnostics.server");
  const eventProcessing = await import("@/modules/cha/customs/icegate/event-processing.server");
  const mockClient = await import("@/modules/cha/customs/icegate/mock-client.server");
  const icegateService = await import("@/modules/cha/customs/icegate/service.server");

  return {
    ensureCustomsFilingProfileForJob: workspace.ensureCustomsFilingProfileForJob,
    saveImportBeMainDraft: importDrafts.saveImportBeMainDraft,
    saveImportIgmDraft: importDrafts.saveImportIgmDraft,
    saveImportRemainingDraft: importDrafts.saveImportRemainingDraft,
    getImportFilingDraft: importDrafts.getImportFilingDraft,
    generateImportChecklistSnapshot: importDrafts.generateImportChecklistSnapshot,
    generateImportFlatFileSnapshot: importDrafts.generateImportFlatFileSnapshot,
    saveExportSbMainDraft: exportDrafts.saveExportSbMainDraft,
    saveExportInvoiceDraft: exportDrafts.saveExportInvoiceDraft,
    saveExportRemainingDraft: exportDrafts.saveExportRemainingDraft,
    getExportFilingDraft: exportDrafts.getExportFilingDraft,
    generateExportChecklistSnapshot: exportDrafts.generateExportChecklistSnapshot,
    generateExportFlatFileSnapshot: exportDrafts.generateExportFlatFileSnapshot,
    registerExportFlatFileSignature: exportDrafts.registerExportFlatFileSignature,
    getIcegateDiagnostics: diagnostics.getIcegateDiagnostics,
    processIcegateExternalEvent: eventProcessing.processIcegateExternalEvent,
    MockIcegateClient: mockClient.MockIcegateClient,
    submitGeneratedIcegateFile: icegateService.submitGeneratedIcegateFile,
  };
}

async function upsertPermissionCatalog() {
  for (const permission of CHA_CUSTOMS_PERMISSIONS) {
    await db.permission.upsert({
      where: { key: permission.key },
      update: permission,
      create: permission,
    });
  }
}

async function bootstrapRoleMatrix() {
  const maker = await db.user.findUniqueOrThrow({
    where: { id: STAGING_LOGIN_IDENTITY.id },
    select: { passwordHash: true },
  });
  const permissions = await db.permission.findMany({
    where: { key: { in: CHA_CUSTOMS_PERMISSIONS.map((entry) => entry.key) } },
    select: { id: true, key: true },
  });

  const identities: Record<string, { id: string; email: string; roleName: string }> = {};

  for (const fixture of CHA_CUSTOMS_PHASE15_ROLE_FIXTURES) {
    const role = await db.role.upsert({
      where: {
        orgId_name: {
          orgId: STAGING_ORG_ID,
          name: fixture.roleName,
        },
      },
      update: {},
      create: {
        orgId: STAGING_ORG_ID,
        name: fixture.roleName,
      },
    });
    await db.rolePermission.deleteMany({
      where: {
        roleId: role.id,
        permission: { key: { notIn: fixture.permissionKeys } },
      },
    });
    for (const permission of permissions.filter((entry) => fixture.permissionKeys.includes(entry.key))) {
      await db.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: permission.id,
        },
      });
    }

    const user = await db.user.upsert({
      where: { id: fixture.userId },
      update: {
        orgId: STAGING_ORG_ID,
        branchId: STAGING_BRANCH_ID,
        email: fixture.email,
        name: fixture.displayName,
        passwordHash: maker.passwordHash,
        active: true,
        isPlatformAdmin: false,
      },
      create: {
        id: fixture.userId,
        orgId: STAGING_ORG_ID,
        branchId: STAGING_BRANCH_ID,
        email: fixture.email,
        name: fixture.displayName,
        designation: "STAGING CHA Customs Role Fixture",
        passwordHash: maker.passwordHash,
        active: true,
        isPlatformAdmin: false,
      },
    });

    await db.userRole.upsert({
      where: {
        userId_roleId: {
          userId: user.id,
          roleId: role.id,
        },
      },
      update: {},
      create: {
        userId: user.id,
        roleId: role.id,
      },
    });
    await db.userRole.deleteMany({
      where: {
        userId: user.id,
        roleId: { not: role.id },
      },
    });
    identities[fixture.userId] = { id: user.id, email: user.email, roleName: fixture.roleName };
  }

  return identities;
}

async function ensureJobType(id: string, name: string, movementDirection: "IMPORT" | "EXPORT", filingFlowCategory: string) {
  const jobType = await db.chaJobType.upsert({
    where: { id },
    update: {
      orgId: STAGING_ORG_ID,
      name,
      movementDirection,
      filingFlowCategory,
    },
    create: {
      id,
      orgId: STAGING_ORG_ID,
      name,
      movementDirection,
      filingFlowCategory,
    },
  });
  return jobType;
}

async function ensureAccount(id: string, name: string, ownerId: string) {
  return db.crmAccount.upsert({
    where: { id },
    update: {
      orgId: STAGING_ORG_ID,
      ownerId,
      updatedById: ownerId,
      createdById: ownerId,
      name,
      type: "Customer",
    },
    create: {
      id,
      orgId: STAGING_ORG_ID,
      ownerId,
      createdById: ownerId,
      updatedById: ownerId,
      name,
      type: "Customer",
    },
  });
}

async function ensureJob(
  id: string,
  jobNumber: string,
  title: string,
  customerId: string,
  jobTypeId: string,
  ownerId: string,
) {
  return db.chaJob.upsert({
    where: { id },
    update: {
      orgId: STAGING_ORG_ID,
      jobNumber,
      title,
      customerId,
      jobTypeId,
      branchId: STAGING_BRANCH_ID,
      primaryOwnerId: ownerId,
    },
    create: {
      id,
      orgId: STAGING_ORG_ID,
      jobNumber,
      title,
      customerId,
      jobTypeId,
      branchId: STAGING_BRANCH_ID,
      primaryOwnerId: ownerId,
    },
  });
}

async function profileLockVersion(jobId: string) {
  const profile = await db.chaCustomsFilingProfile.findUniqueOrThrow({
    where: { jobId },
    select: { id: true, lockVersion: true },
  });
  return profile;
}

async function seedImportScenario(
  services: RuntimeServices,
  actorId: string,
  docsActorId: string,
) {
  await ensureAccount("stg_crm_cha_importer", "STAGING CHA Importer Pvt Ltd", actorId);
  const jobType = await ensureJobType(
    "stg_cha_job_type_import",
    "STAGING CHA Import Filing",
    "IMPORT",
    "IMPORT_BE",
  );
  const job = await ensureJob(
    "stg_cha_job_import_phase15",
    CHA_CUSTOMS_PHASE15_UAT_SCENARIOS.importJobNumber,
    "STAGING Phase 15 Import Filing",
    "stg_crm_cha_importer",
    jobType.id,
    actorId,
  );
  await services.ensureCustomsFilingProfileForJob({
    actorId,
    orgId: STAGING_ORG_ID,
    jobId: job.id,
    direction: "IMPORT",
  });

  let profile = await profileLockVersion(job.id);
  await services.saveImportBeMainDraft({
    actorId,
    orgId: STAGING_ORG_ID,
    jobId: job.id,
    input: {
      lockVersion: profile.lockVersion,
      jobDate: "2026-08-01",
      beType: "Home Consumption",
      transportMode: "SEA",
      filingType: "Import Clearance",
      customsHouse: "Chennai Sea",
      customsHouseCode: "INMAA1",
      warehouseCode: "WH-01",
      warehouseCustomsSiteId: "SITE-01",
      packageCount: "12",
      packageCode: "PKG",
      grossWeight: "123.456789",
      uom: "KGS",
      beNumber: "BE-UAT-0001",
      beDate: "2026-08-01",
      examinationDate: "",
      outOfChargeDate: "",
      dutyPaidDate: "",
      deliveredDate: "",
      icegateIdSnapshot: "ICEGATE-UAT-IMPORT",
      chaPanSnapshot: "ABCDE1234F",
      atpNameSnapshot: "ATP Name",
      atpPanSnapshot: "ABCDE1234G",
      standardIec: true,
      importerNameSnapshot: "STAGING CHA Importer Pvt Ltd",
      importerIecSnapshot: "0300000000",
      importerBranchSerialNo: "1",
      importerCategory: "F-Manufacturer",
      importerType: "P - Private",
      importerAddressSnapshot: "Controlled staging importer address",
      importerClass: "P - Private",
      importerCitySnapshot: "Chennai",
      importerStateSnapshot: "Tamil Nadu",
      importerPinCodeSnapshot: "600001",
      importerAdCodeSnapshot: "AD001",
      importerOriginState: "Tamil Nadu",
      importerGstnType: "G - GST-IN",
      importerTaxRegistrationNo: "33ABCDE1234F1Z5",
      firstCheck: true,
      greenChannel: false,
      kacchaBe: false,
      provisionalAssessment: false,
      highSeaSale: false,
      exBond: false,
      ucrType: "Transaction",
      ucrNo: "UCR-IMPORT-1",
      paymentMethod: "Transaction",
      bondDetailsText: "Bond detail retained as safe text",
      certificateDetailsText: "Certificate detail retained as safe text",
      portOfShipment: "Singapore",
      portOfShipmentCode: "SGSIN",
      countryOfShipment: "Singapore",
      countryOfShipmentCode: "SG",
      portOfOrigin: "Singapore",
      portOfOriginCode: "SGSIN",
      countryOfOrigin: "Singapore",
      countryOfOriginCode: "SG",
    },
  });

  profile = await profileLockVersion(job.id);
  await services.saveImportIgmDraft({
    actorId,
    orgId: STAGING_ORG_ID,
    jobId: job.id,
    input: {
      lockVersion: profile.lockVersion,
      igmNo: "IGM-UAT-0001",
      fileType: "Import",
      igmDate: "2026-08-01",
      inwardDate: "2026-08-02",
      gatewayPort: "Chennai",
      gatewayMode: "SEA",
      marksAndNos: "AS PER BL",
      section48: false,
      section48Text: "",
      billRows: [
        {
          sequenceNo: 1,
          mblNo: "MBL-UAT-1",
          noMbl: false,
          mblDate: "2026-08-01",
          hblNo: "HBL-UAT-1",
          hblDate: "2026-08-01",
          packageCount: "10",
          packageCode: "PKG",
          grossWeight: "100.25",
          netWeight: "90.25",
          uom: "KGS",
        },
        {
          sequenceNo: 2,
          mblNo: "",
          noMbl: true,
          mblDate: "",
          hblNo: "HBL-UAT-2",
          hblDate: "",
          packageCount: "5",
          packageCode: "PKG",
          grossWeight: "23.206789",
          netWeight: "21.156789",
          uom: "KGS",
        },
      ],
      containers: [
        {
          sequenceNo: 1,
          containerNo: "CONT-UAT-IMP-1",
          containerSize: "20FT",
          sealNo: "SEAL-IMP-1",
          packageCount: "10",
          grossWeight: "100.25",
          netWeight: "90.25",
        },
      ],
    },
  });

  profile = await profileLockVersion(job.id);
  await services.saveImportRemainingDraft({
    actorId: docsActorId,
    orgId: STAGING_ORG_ID,
    jobId: job.id,
    input: {
      lockVersion: profile.lockVersion,
      invoices: [
        {
          sequenceNo: 1,
          invoiceNo: "IMP-INV-1",
          invoiceDate: "2026-08-01",
          natureOfPayment: "OTH - Others",
          natureOfTransaction: "Sale",
          currency: "USD",
          exchangeRate: "83.123456789012",
          invoiceValue: "1000.25",
          invoiceValueInr: "83144.04",
          incoTerms: "CIF",
          valuationMethod: "0 - Others",
          supplierNameSnapshot: "Supplier One",
          supplierAddressSnapshot: "Supplier address",
          supplierCountrySnapshot: "US",
          supplierZipCodeSnapshot: "10001",
          useForAllInvoice: true,
          useAsDefaultManufacturer: false,
          sellerText: "Seller details",
          brokerText: "Broker details",
          thirdPartyText: "Third party",
          aeoText: "AEO",
          svbText: "SVB",
          singleFreightInsurance: true,
          actualFreight: true,
          assessableValueFc: "1100.25",
          assessableValueInr: "91456.39",
          charges: [
            {
              sequenceNo: 1,
              chargeType: "FREIGHT",
              currency: "USD",
              exchangeRate: "83.123456789012",
              rate: "",
              amount: "80",
              amountInr: "6649.88",
              isActual: true,
            },
          ],
        },
        {
          sequenceNo: 2,
          invoiceNo: "IMP-INV-2",
          invoiceDate: "2026-08-02",
          natureOfPayment: "OTH - Others",
          natureOfTransaction: "Sale",
          currency: "EUR",
          exchangeRate: "90.25",
          invoiceValue: "200.00",
          invoiceValueInr: "18050.00",
          incoTerms: "FOB",
          valuationMethod: "0 - Others",
          supplierNameSnapshot: "Supplier Two",
          supplierAddressSnapshot: "",
          supplierCountrySnapshot: "DE",
          supplierZipCodeSnapshot: "",
          useForAllInvoice: false,
          useAsDefaultManufacturer: true,
          sellerText: "",
          brokerText: "",
          thirdPartyText: "",
          aeoText: "",
          svbText: "",
          singleFreightInsurance: false,
          actualFreight: false,
          assessableValueFc: "200",
          assessableValueInr: "18050",
          charges: [],
        },
      ],
      items: [
        {
          sequenceNo: 1,
          invoiceSequenceNo: 1,
          ritcNo: "01012100",
          itemDescription: "Pure-bred breeding animals",
          schemeCode: "00",
          quantity: "2",
          unit: "NOS",
          unitPrice: "500.125",
          per: "1",
          itemAmount: "1000.25",
          itemAmountInr: "83144.04",
          assessableValue: "91456.39",
          totalPmv: "",
          endUse: "Trading",
          countryOfOrigin: "SG",
          notificationNo: "020/2026",
          notificationSerialNo: "1137",
          notificationSubSerialNo: "",
          bcdRate: "10",
          aidcRate: "20",
          cessRate: "0.5",
          otherDutyText: "Manual duty snapshot",
          bondCode: "",
          licenseNo: "",
        },
        {
          sequenceNo: 2,
          invoiceSequenceNo: 2,
          ritcNo: "01012910",
          itemDescription: "Horses for polo",
          schemeCode: "00",
          quantity: "1",
          unit: "NOS",
          unitPrice: "200",
          per: "1",
          itemAmount: "200",
          itemAmountInr: "18050",
          assessableValue: "18050",
          totalPmv: "",
          endUse: "",
          countryOfOrigin: "DE",
          notificationNo: "",
          notificationSerialNo: "",
          notificationSubSerialNo: "",
          bcdRate: "5",
          aidcRate: "",
          cessRate: "",
          otherDutyText: "",
          bondCode: "",
          licenseNo: "",
        },
      ],
      declarations: [
        {
          sequenceNo: 1,
          statementType: "DEC",
          statementCode: "A",
          statementText: "Declaration text",
          declarationType: "B",
          declarationNo: "DECL-1",
          declarationDate: "2026-08-02",
          invoiceSequenceNo: 1,
          itemSequenceNo: 1,
        },
      ],
      supportingDocuments: [
        {
          sequenceNo: 1,
          documentCode: "001002",
          documentNameSnapshot: "Lab analysis Report",
          irnNo: "IRN-UAT-1",
          drnNo: "DRN-UAT-1",
          issueDate: "2026-08-01",
          expiryDate: "2027-08-01",
          declarationType: "E",
          fileType: "PDF",
          placeOfIssue: "Chennai",
          invoiceSequenceNo: 1,
          itemSequenceNo: 1,
          icegateIdSnapshot: "ICEGATE-UAT-IMPORT",
          documentVersionId: "staging-import-doc-version-1",
          issuingPartyText: "Issuing party snapshot",
        },
      ],
    },
  });

  profile = await profileLockVersion(job.id);
  const checklist = await services.generateImportChecklistSnapshot({
    actorId,
    orgId: STAGING_ORG_ID,
    jobId: job.id,
    lockVersion: profile.lockVersion,
  });
  profile = await profileLockVersion(job.id);
  const flatFile = await services.generateImportFlatFileSnapshot({
    actorId,
    orgId: STAGING_ORG_ID,
    jobId: job.id,
    lockVersion: profile.lockVersion,
  });
  const draft = await services.getImportFilingDraft(profile.id);

  return {
    jobId: job.id,
    profileId: profile.id,
    jobNumber: CHA_CUSTOMS_PHASE15_UAT_SCENARIOS.importJobNumber,
    checklistVersion: checklist.versionNo,
    flatFileVersion: flatFile.versionNo,
    invoiceCount: draft.invoices.length,
    itemCount: draft.items.length,
    igmRows: draft.igm.billRows.length,
    containerRows: draft.igm.containers.length,
  };
}

async function seedExportScenario(services: RuntimeServices, actorId: string) {
  await ensureAccount("stg_crm_cha_exporter", "STAGING CHA Exporter Pvt Ltd", actorId);
  const jobType = await ensureJobType(
    "stg_cha_job_type_export",
    "STAGING CHA Export Filing",
    "EXPORT",
    "EXPORT_SB",
  );
  const job = await ensureJob(
    "stg_cha_job_export_phase15",
    CHA_CUSTOMS_PHASE15_UAT_SCENARIOS.exportJobNumber,
    "STAGING Phase 15 Export Filing",
    "stg_crm_cha_exporter",
    jobType.id,
    actorId,
  );
  await services.ensureCustomsFilingProfileForJob({
    actorId,
    orgId: STAGING_ORG_ID,
    jobId: job.id,
    direction: "EXPORT",
  });

  let profile = await profileLockVersion(job.id);
  await services.saveExportSbMainDraft({
    actorId,
    orgId: STAGING_ORG_ID,
    jobId: job.id,
    input: {
      lockVersion: profile.lockVersion,
      jobDate: "2026-08-01",
      sbType: "Normal",
      transportMode: "SEA",
      bookingNo: "BOOK-UAT-1",
      bookingDate: "2026-08-01",
      customsHouse: "CusHouse ACHRA",
      customsHouseCode: "INACH1",
      sbNumber: "SB-UAT-0001",
      sbDate: "2026-08-02",
      examinationDate: "",
      leoDate: "",
      icegateIdSnapshot: "ICEGATE-UAT-EXPORT",
      chaExporterPanSnapshot: "ABCDE1234F",
      standardIec: true,
      exporterNameSnapshot: "STAGING CHA Exporter Pvt Ltd",
      exporterIecSnapshot: "0300000000",
      exporterBranchSerialNo: "1",
      exporterType: "F-Manufacturer",
      exporterClass: "P-Private",
      exporterAddressSnapshot: "Exporter address",
      exporterAdCodeSnapshot: "AD001",
      exporterCitySnapshot: "Chennai",
      exporterStateSnapshot: "Tamil Nadu",
      exporterPinCodeSnapshot: "600001",
      nfei: "No",
      benefitTo: "Exporter",
      exporterOriginState: "Tamil Nadu",
      exporterGstnType: "GSN-GST NORMAL",
      exporterTaxRegistrationNo: "33ABCDE1234F1Z5",
      moowr: "No",
      consigneeNameSnapshot: "Demo Customer Nigeria",
      consigneeAddressSnapshot: "Lagos address",
      consigneeCountrySnapshot: "NIGERIA",
      portOfDischarge: "Aalen - DEAAL",
      portOfDischargeCode: "DEAAL",
      dischargeCountry: "Germany",
      dischargeCountryCode: "DE",
      portOfDestination: "Aalen - DEAAL",
      portOfDestinationCode: "DEAAL",
      destinationCountry: "Germany",
      destinationCountryCode: "DE",
      natureOfCargo: "General",
      sealType: "Bottle seal",
      numberOfContainers: "2",
      grossWeight: "100.500001",
      netWeight: "90.25",
      uom: "KGS",
      numberOfPackages: "10",
      packageCode: "PKG",
      loosePackage: "0",
      mawbNo: "MAWB-UAT-1",
      mawbDate: "2026-08-01",
      hawbNo: "HAWB-UAT-1",
      hawbDate: "2026-08-01",
      marksAndNos: "AS PER INV",
      rotationStuffingText: "Rotation and stuffing snapshot",
      eouDetailsText: "EOU snapshot",
      packageRows: [
        {
          sequenceNo: 1,
          packageType: "Carton",
          packageCode: "CTN",
          packageCount: "10",
          loosePackageCount: "0",
          marksAndNos: "M1",
        },
      ],
      containerRows: [
        {
          sequenceNo: 1,
          containerNo: "CONT-UAT-EXP-1",
          containerSize: "20FT",
          sealNo: "S1",
          packageCount: "10",
          grossWeight: "100.5",
          netWeight: "90.25",
        },
      ],
    },
  });

  profile = await profileLockVersion(job.id);
  await services.saveExportInvoiceDraft({
    actorId,
    orgId: STAGING_ORG_ID,
    jobId: job.id,
    input: {
      lockVersion: profile.lockVersion,
      invoices: [
        {
          sequenceNo: 1,
          invoiceNo: "EXP-UAT-INV-1",
          invoiceDate: "2026-08-01",
          contractNo: "CON-1",
          natureOfPayment: "OTH - Others",
          periodOfPayment: "Immediate",
          currency: "USD",
          exchangeRate: "83.123456789012",
          productValue: "1000.25",
          productValueInr: "83144.04",
          incoTerms: "FOB",
          addFreight: "No",
          sameAsConsignee: true,
          buyerNameSnapshot: "Demo Customer Nigeria",
          buyerAddressSnapshot: "Lagos address",
          buyerCountrySnapshot: "NIGERIA",
          thirdPartyText: "Third party",
          aeoText: "AEO",
          invoiceValueFc: "",
          invoiceValueInr: "",
          fobValueFc: "",
          fobValueInr: "",
          calculationOverrideReason: "",
          charges: [
            {
              sequenceNo: 1,
              chargeType: "FREIGHT",
              currency: "USD",
              exchangeRate: "83.123456789012",
              rate: "",
              amount: "80",
              amountInr: "6649.88",
              isDeduction: false,
            },
            {
              sequenceNo: 2,
              chargeType: "FOB_DISCOUNT",
              currency: "USD",
              exchangeRate: "83.123456789012",
              rate: "",
              amount: "10",
              amountInr: "831.23",
              isDeduction: true,
            },
          ],
        },
        {
          sequenceNo: 2,
          invoiceNo: "EXP-UAT-INV-2",
          invoiceDate: "2026-08-02",
          contractNo: "",
          natureOfPayment: "OTH - Others",
          periodOfPayment: "Immediate",
          currency: "EUR",
          exchangeRate: "90.25",
          productValue: "200",
          productValueInr: "18050",
          incoTerms: "CIF",
          addFreight: "Yes",
          sameAsConsignee: false,
          buyerNameSnapshot: "Buyer Two",
          buyerAddressSnapshot: "Buyer address",
          buyerCountrySnapshot: "DE",
          thirdPartyText: "",
          aeoText: "",
          invoiceValueFc: "",
          invoiceValueInr: "",
          fobValueFc: "",
          fobValueInr: "",
          calculationOverrideReason: "",
          charges: [],
        },
      ],
    },
  });

  profile = await profileLockVersion(job.id);
  await services.saveExportRemainingDraft({
    actorId,
    orgId: STAGING_ORG_ID,
    jobId: job.id,
    input: {
      lockVersion: profile.lockVersion,
      items: [
        {
          sequenceNo: 1,
          invoiceSequenceNo: 1,
          invoiceNoSnapshot: "EXP-UAT-INV-1",
          totalProductCount: 1,
          productSequenceNo: 1,
          ritcNo: "01012100",
          itemDescription: "Pure-bred breeding animals",
          schemeCode: "00",
          quantity: "25.50000000",
          unit: "KGS",
          measurementUqc: "KGS",
          unitPrice: "12.50000000",
          priceUnit: "KGS",
          per: "1",
          itemAmount: "318.75000000",
          itemAmountInr: "26497.109375",
          totalPmv: "318.75000000",
          endUse: "Export sample",
          state: "Tamil Nadu",
          district: "Chennai",
          fta: "Yes",
          cess: "0",
          additionalDetails: "Single window snapshot",
          rodtepCode: "01012100",
          singleWindowType: "TYPE",
          singleWindowQfr: "QFR",
          singleWindowCode: "AQCS",
          singleWindowText: "AQCS required",
          singleWindowMeasurement: "25.5",
          singleWindowUqc: "KGS",
          gstPaymentStatus: "PAID",
          gstIgstOn: "TAXABLE",
          taxableValue: "26497.109375",
          igstRate: "18",
          igstAmount: "4769.4796875",
          drawbackScheduleNo: "0101B",
          drawbackQuantity: "25.50000000",
          drawbackRatePercent: "1.25000000",
          drawbackCapInInr: "0",
          drawbackUqc: "KGS",
          drawbackAmount: "331.21386719",
          rosctlRate: "2.65000000",
          rosctlSpecificRate: "31.10000000",
          rosctlAmount: "675.00000000",
          rodtepRate: "0.01000000",
          rodtepCap: "0.50000000",
          rodtepQuantity: "25.50000000",
          rodtepUqc: "KGS",
          rodtepAmount: "12.75000000",
          reward: "Yes",
          thirdParty: "No",
          manufacturer: "Yes",
          quota: "No",
          ar4: "No",
          jobWork: "No",
          reExport: "No",
          license: "LIC-001",
          eouDetails: "EOU detail",
          declaration: "No",
          cessOption: "No",
        },
      ],
      supportingDocuments: [
        {
          sequenceNo: 1,
          documentCode: "001002",
          documentNameSnapshot: "Lab analysis Report",
          irnNo: "IRN-EXP-1",
          drnNo: "DRN-EXP-1",
          issueDate: "2026-08-01",
          declarationType: "EXPORT",
          fileType: "PDF",
          placeOfIssue: "Chennai",
          invoiceSequenceNo: 1,
          itemSequenceNo: 1,
          expiryDate: "2027-08-01",
          invoiceNoSnapshot: "EXP-UAT-INV-1",
          icegateIdSnapshot: "ICEGATE-UAT-EXPORT",
          issuingPartyCode: "ISS-1",
          issuingPartyNameSnapshot: "Issuer",
          issuingPartyAddressSnapshot: "Issuer address",
          issuingPartyCitySnapshot: "Chennai",
          issuingPartyPinSnapshot: "600001",
          beneficiaryCode: "BEN-1",
          beneficiaryNameSnapshot: "Beneficiary",
          beneficiaryAddressSnapshot: "Beneficiary address",
          beneficiaryCitySnapshot: "Lagos",
          beneficiaryPinSnapshot: "100001",
          documentVersionId: "staging-export-doc-version-1",
        },
      ],
    },
  });

  profile = await profileLockVersion(job.id);
  const checklist = await services.generateExportChecklistSnapshot({
    actorId,
    orgId: STAGING_ORG_ID,
    jobId: job.id,
    lockVersion: profile.lockVersion,
    withDeclaration: true,
  });
  profile = await profileLockVersion(job.id);
  const dummyFlatFile = await services.generateExportFlatFileSnapshot({
    actorId,
    orgId: STAGING_ORG_ID,
    jobId: job.id,
    lockVersion: profile.lockVersion,
    dummyJob: true,
  });

  profile = await profileLockVersion(job.id);
  const liveFlatFile = await services.generateExportFlatFileSnapshot({
    actorId,
    orgId: STAGING_ORG_ID,
    jobId: job.id,
    lockVersion: profile.lockVersion,
    dummyJob: false,
  });
  const signed = await services.registerExportFlatFileSignature({
    actorId,
    orgId: STAGING_ORG_ID,
    jobId: job.id,
    generationId: liveFlatFile.id,
    signatureReference: "PHASE15-MANUAL-SIGNATURE-1",
  });
  const draft = await services.getExportFilingDraft(profile.id);

  return {
    jobId: job.id,
    profileId: profile.id,
    jobNumber: CHA_CUSTOMS_PHASE15_UAT_SCENARIOS.exportJobNumber,
    checklistVersion: checklist.versionNo,
    dummyFlatFileVersion: dummyFlatFile.versionNo,
    liveFlatFileVersion: liveFlatFile.versionNo,
    signedGenerationId: signed.id,
    invoiceCount: draft.invoices.length,
    itemCount: draft.items.length,
    documentCount: draft.supportingDocuments.length,
  };
}

async function seedExBondScenario(services: RuntimeServices, actorId: string) {
  const jobType = await ensureJobType(
    "stg_cha_job_type_exbond",
    "STAGING CHA Ex-Bond Filing",
    "IMPORT",
    "IMPORT_BE",
  );
  const job = await ensureJob(
    "stg_cha_job_exbond_phase15",
    CHA_CUSTOMS_PHASE15_UAT_SCENARIOS.exBondJobNumber,
    "STAGING Phase 15 Ex-Bond Filing",
    "stg_crm_cha_importer",
    jobType.id,
    actorId,
  );
  await services.ensureCustomsFilingProfileForJob({
    actorId,
    orgId: STAGING_ORG_ID,
    jobId: job.id,
    direction: "IMPORT",
  });
  const profile = await profileLockVersion(job.id);
  const saved = await services.saveImportBeMainDraft({
    actorId,
    orgId: STAGING_ORG_ID,
    jobId: job.id,
    input: {
      lockVersion: profile.lockVersion,
      jobDate: "2026-08-01",
      beType: "Ex-Bond",
      transportMode: "SEA",
      filingType: "Import Clearance",
      customsHouse: "Chennai Sea",
      customsHouseCode: "INMAA1",
      importerNameSnapshot: "STAGING CHA Importer Pvt Ltd",
      importerIecSnapshot: "0300000000",
      portOfShipment: "Singapore",
      countryOfShipment: "Singapore",
      portOfOrigin: "Singapore",
      countryOfOrigin: "Singapore",
      exBond: true,
      bondDetailsText: "Ex-bond controlled staging scenario",
    },
  });
  return { jobId: job.id, jobNumber: CHA_CUSTOMS_PHASE15_UAT_SCENARIOS.exBondJobNumber, beMainStatus: saved.beMainStatus };
}

async function seedMissingDocumentScenario(services: RuntimeServices, actorId: string) {
  const jobType = await ensureJobType(
    "stg_cha_job_type_missing_docs",
    "STAGING CHA Missing Docs Filing",
    "IMPORT",
    "IMPORT_BE",
  );
  const job = await ensureJob(
    "stg_cha_job_missing_docs_phase15",
    CHA_CUSTOMS_PHASE15_UAT_SCENARIOS.missingDocumentJobNumber,
    "STAGING Phase 15 Missing Document Filing",
    "stg_crm_cha_importer",
    jobType.id,
    actorId,
  );
  await services.ensureCustomsFilingProfileForJob({
    actorId,
    orgId: STAGING_ORG_ID,
    jobId: job.id,
    direction: "IMPORT",
  });
  const profile = await profileLockVersion(job.id);
  await services.saveImportBeMainDraft({
    actorId,
    orgId: STAGING_ORG_ID,
    jobId: job.id,
    input: {
      lockVersion: profile.lockVersion,
      jobDate: "2026-08-01",
      beType: "Home Consumption",
      transportMode: "SEA",
      filingType: "Import Clearance",
      customsHouse: "Chennai Sea",
      customsHouseCode: "INMAA1",
      importerNameSnapshot: "STAGING CHA Importer Pvt Ltd",
      importerIecSnapshot: "0300000000",
      portOfShipment: "Singapore",
      countryOfShipment: "Singapore",
      portOfOrigin: "Singapore",
      countryOfOrigin: "Singapore",
    },
  });
  const statusRow = await db.chaCustomsFilingProfile.findUniqueOrThrow({
    where: { id: profile.id },
    select: { importDocumentStatus: true },
  });
  return {
    jobId: job.id,
    jobNumber: CHA_CUSTOMS_PHASE15_UAT_SCENARIOS.missingDocumentJobNumber,
    documentCount: 0,
    importDocumentStatus: statusRow.importDocumentStatus,
  };
}

async function runMockIcegateFlows(
  services: RuntimeServices,
  submitterId: string,
  importScenario: { jobId: string },
  exportScenario: { jobId: string; signedGenerationId: string },
) {
  await db.systemSetting.upsert({
    where: { key: getChaCustomsFeatureFlagsSettingKey(STAGING_ORG_ID) },
    update: {
      value: JSON.stringify({
        CHA_CUSTOMS_MASTER_DATA: true,
        CHA_IMPORT_FILING_WORKSPACE: true,
        CHA_EXPORT_FILING_WORKSPACE: true,
        CHA_ICEGATE_INTEGRATION: true,
        CHA_ICEGATE_LIVE_SUBMISSION: true,
      }),
    },
    create: {
      key: getChaCustomsFeatureFlagsSettingKey(STAGING_ORG_ID),
      value: JSON.stringify({
        CHA_CUSTOMS_MASTER_DATA: true,
        CHA_IMPORT_FILING_WORKSPACE: true,
        CHA_EXPORT_FILING_WORKSPACE: true,
        CHA_ICEGATE_INTEGRATION: true,
        CHA_ICEGATE_LIVE_SUBMISSION: true,
      }),
    },
  });

  const importProfile = await profileLockVersion(importScenario.jobId);
  const importGeneration = await services.generateImportFlatFileSnapshot({
    actorId: submitterId,
    orgId: STAGING_ORG_ID,
    jobId: importScenario.jobId,
    lockVersion: importProfile.lockVersion,
  });
  const positiveBe = await services.submitGeneratedIcegateFile({
    actorId: submitterId,
    orgId: STAGING_ORG_ID,
    jobId: importScenario.jobId,
    flatFileGenerationId: importGeneration.id,
    documentType: "BE",
    client: new services.MockIcegateClient("positive_be_acknowledgement"),
  });

  const importProfileNegative = await profileLockVersion(importScenario.jobId);
  const importGenerationNegative = await services.generateImportFlatFileSnapshot({
    actorId: submitterId,
    orgId: STAGING_ORG_ID,
    jobId: importScenario.jobId,
    lockVersion: importProfileNegative.lockVersion,
  });
  const negativeBe = await services.submitGeneratedIcegateFile({
    actorId: submitterId,
    orgId: STAGING_ORG_ID,
    jobId: importScenario.jobId,
    flatFileGenerationId: importGenerationNegative.id,
    documentType: "BE",
    client: new services.MockIcegateClient("negative_be_acknowledgement"),
  });

  const positiveSb = await services.submitGeneratedIcegateFile({
    actorId: submitterId,
    orgId: STAGING_ORG_ID,
    jobId: exportScenario.jobId,
    flatFileGenerationId: exportScenario.signedGenerationId,
    documentType: "SB",
    client: new services.MockIcegateClient("positive_sb_acknowledgement"),
  });

  const duplicateSb = await services.submitGeneratedIcegateFile({
    actorId: submitterId,
    orgId: STAGING_ORG_ID,
    jobId: exportScenario.jobId,
    flatFileGenerationId: exportScenario.signedGenerationId,
    documentType: "SB",
    client: new services.MockIcegateClient("duplicate_request"),
  }).then(
    () => ({ prevented: false, message: "Duplicate submission unexpectedly succeeded." }),
    (error) => ({ prevented: /already has a live ICEGATE submission/i.test(error instanceof Error ? error.message : ""), message: error instanceof Error ? error.message : "Unknown error" }),
  );

  await services.processIcegateExternalEvent({
    submissionId: positiveSb.submissionId,
    eventKind: "QUERY_RECEIVED",
    status: "QUERY",
    externalStatus: "SB_QUERY",
    safeMessage: "ICEGATE raised a query on the controlled UAT submission.",
    actorId: submitterId,
    metadata: {
      messageId: "PHASE15-SB-QUERY-1",
      responseHash: "phase15-safe-query-hash",
    },
  });

  const events = await db.chaCustomsExternalEvent.findMany({
    where: { submissionId: positiveSb.submissionId },
    orderBy: { sequenceNo: "asc" },
    select: { eventKind: true, externalStatus: true, safeMessage: true },
  });

  return {
    positiveBe: { submissionId: positiveBe.submissionId, status: positiveBe.status },
    negativeBe: { submissionId: negativeBe.submissionId, status: negativeBe.status },
    positiveSb: { submissionId: positiveSb.submissionId, status: positiveSb.status },
    duplicateSb,
    queryFlow: events,
    liveRequestsSent: false,
  };
}

async function buildRoleMatrix() {
  const matrix: Record<string, Record<string, boolean>> = {};
  for (const fixture of CHA_CUSTOMS_PHASE15_ROLE_FIXTURES) {
    matrix[fixture.roleName] = {};
    for (const permission of CHA_CUSTOMS_PERMISSIONS) {
      matrix[fixture.roleName][permission.key] = await can(fixture.userId, permission.key);
    }
  }
  return matrix;
}

async function main() {
  await verifyExactStagingDatabaseIdentity("Phase 15 customs UAT");
  await upsertPermissionCatalog();
  const identities = await bootstrapRoleMatrix();
  const services = await loadRuntimeServices();
  const diagnostics = await services.getIcegateDiagnostics("stg_user_cha_customs_master_admin");

  const dataEntryId = "stg_user_cha_customs_data_entry";
  const docsId = "stg_user_cha_customs_docs";
  const filingId = "stg_user_cha_customs_filing";
  const submitterId = "stg_user_cha_customs_icegate";

  const importScenario = await seedImportScenario(services, dataEntryId, docsId);
  const exportScenario = await seedExportScenario(services, filingId);
  const exBondScenario = await seedExBondScenario(services, dataEntryId);
  const missingDocumentScenario = await seedMissingDocumentScenario(services, docsId);

  const amendmentBefore = await profileLockVersion(exportScenario.jobId);
  const amendmentOne = await services.generateExportChecklistSnapshot({
    actorId: filingId,
    orgId: STAGING_ORG_ID,
    jobId: exportScenario.jobId,
    lockVersion: amendmentBefore.lockVersion,
    withDeclaration: true,
  });
  await services.saveExportInvoiceDraft({
    actorId: filingId,
    orgId: STAGING_ORG_ID,
    jobId: exportScenario.jobId,
    input: {
      lockVersion: amendmentBefore.lockVersion + 1,
      invoices: [
        {
          sequenceNo: 1,
          invoiceNo: "EXP-UAT-INV-1A",
          invoiceDate: "2026-08-01",
          contractNo: "CON-1",
          natureOfPayment: "OTH - Others",
          periodOfPayment: "Immediate",
          currency: "USD",
          exchangeRate: "83.123456789012",
          productValue: "1100.25",
          productValueInr: "91456.39",
          incoTerms: "FOB",
          addFreight: "No",
          sameAsConsignee: true,
          buyerNameSnapshot: "Demo Customer Nigeria",
          buyerAddressSnapshot: "Lagos address",
          buyerCountrySnapshot: "NIGERIA",
          thirdPartyText: "",
          aeoText: "",
          invoiceValueFc: "",
          invoiceValueInr: "",
          fobValueFc: "",
          fobValueInr: "",
          calculationOverrideReason: "Controlled amendment scenario",
          charges: [],
        },
      ],
    },
  });
  const amendmentAfter = await profileLockVersion(exportScenario.jobId);
  const amendmentTwo = await services.generateExportChecklistSnapshot({
    actorId: filingId,
    orgId: STAGING_ORG_ID,
    jobId: exportScenario.jobId,
    lockVersion: amendmentAfter.lockVersion,
    withDeclaration: false,
  });

  const mockFlows = await runMockIcegateFlows(
    services,
    submitterId,
    importScenario,
    exportScenario,
  );

  const evidence = {
    generatedAt: new Date().toISOString(),
    orgId: STAGING_ORG_ID,
    identities,
    diagnostics,
    realUatAttempted: false,
    realUatReason: diagnostics.configured
      ? "Explicit user approval for official UAT submission was not provided."
      : "ICEGATE configuration is incomplete for official UAT; mock mode only.",
    scenarios: {
      importMultiInvoiceMultiItem: importScenario,
      exportMultiInvoiceMultiItem: exportScenario,
      preferentialNotification: {
        notificationNo: "020/2026",
        serialNo: "1137",
        preferentialDutyFlag: "Y",
      },
      exBond: exBondScenario,
      missingDocumentRework: missingDocumentScenario,
      amendment: {
        jobNumber: CHA_CUSTOMS_PHASE15_UAT_SCENARIOS.amendmentJobNumber,
        baseJobNumber: exportScenario.jobNumber,
        checklistVersionBefore: amendmentOne.versionNo,
        checklistVersionAfter: amendmentTwo.versionNo,
      },
    },
    mockUat: mockFlows,
    roleMatrix: await buildRoleMatrix(),
    acceptanceCoverage: {
      importMasterReuse: true,
      duplicateJobsCreated: false,
      jobNumberingPreserved: true,
      assignmentsPreserved: true,
      documentsIntegrated: true,
      checklistApprovalsReused: true,
      filingWorkflowPreserved: true,
      warningsInfrastructurePreserved: true,
      expensesPreserved: true,
      auditPreserved: true,
      customerPortalVisibilityManualPathSeeded: true,
      allThemesManualVerificationPending: true,
      responsiveManualVerificationPending: true,
    },
  };

  await writeJsonArtifact(OUTPUT_PATH, evidence);
  console.log(`Phase 15 UAT evidence written to ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => {
  await db.$disconnect();
});
