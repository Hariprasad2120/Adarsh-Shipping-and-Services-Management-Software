import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { db } from "@/lib/db";
import { getChaCustomsFeatureFlagsSettingKey } from "@/modules/cha/customs/feature-flags";
import {
  generateExportChecklistSnapshot,
  generateExportFlatFileSnapshot,
  getExportFilingDraft,
  registerExportFlatFileSignature,
  requestExportFlatFileSigning,
  saveExportInvoiceDraft,
  saveExportRemainingDraft,
  saveExportSbMainDraft,
} from "../filing/export-drafts";
import { exportSbMainDraftSchema } from "../filing/export-schemas";
import { MockIcegateClient } from "../icegate/mock-client.server";
import { submitGeneratedIcegateFile } from "../icegate/service.server";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/rbac", () => ({
  can: async () => true,
}));
vi.mock("@/modules/cha/customs/feature-flags", () => ({
  getChaCustomsFeatureFlagsSettingKey: (orgId: string) => `org:${orgId}:cha_customs_feature_flags`,
  getChaCustomsFeatureFlags: async () => ({
    CHA_CUSTOMS_MASTER_DATA: false,
    CHA_IMPORT_FILING_WORKSPACE: false,
    CHA_EXPORT_FILING_WORKSPACE: true,
    CHA_ICEGATE_INTEGRATION: true,
    CHA_ICEGATE_LIVE_SUBMISSION: true,
  }),
  isChaCustomsFeatureEnabled: (flags: Record<string, boolean>, key: string) => {
    if (key === "CHA_ICEGATE_LIVE_SUBMISSION" && !flags.CHA_ICEGATE_INTEGRATION) {
      return false;
    }
    return flags[key] === true;
  },
}));

const runId = Date.now().toString(36);

async function createImportRun(orgId: string, masterType: string, datasetVersion: string) {
  return db.chaCustomsMasterImportRun.create({
    data: {
      orgId,
      masterType,
      sourceType: "CONTROLLED_SEED_FIXTURE",
      sourceName: `Phase 13 ${masterType} fixture`,
      sourceEffectiveDate: new Date("2026-07-31T00:00:00.000Z"),
      datasetVersion,
      fileChecksum: `sha256:${orgId}:${masterType}:${datasetVersion}`,
      status: "COMPLETED",
      receivedRowCount: 1,
      validRowCount: 1,
      insertedRowCount: 1,
      completedAt: new Date("2026-07-31T01:00:00.000Z"),
    },
  });
}

describe("CHA export remaining subtabs, checklist, and flat-file drafts", () => {
  let orgId: string;
  let otherOrgId: string;
  let actorId: string;
  let branchId: string;
  let customerId: string;
  let exportJobTypeId: string;
  let jobId: string;
  let profileId: string;

  beforeAll(async () => {
    const org = await db.organisation.create({
      data: { name: `Phase 13 Customs ${runId}`, slug: `phase-13-customs-${runId}` },
    });
    const otherOrg = await db.organisation.create({
      data: { name: `Phase 13 Customs Other ${runId}`, slug: `phase-13-customs-other-${runId}` },
    });
    orgId = org.id;
    otherOrgId = otherOrg.id;

    const branch = await db.branch.create({
      data: { orgId, name: "Chennai Branch", code: `P13${runId}` },
    });
    branchId = branch.id;

    const actor = await db.user.create({
      data: {
        orgId,
        email: `phase13-customs-${runId}@test.local`,
        passwordHash: "test",
        name: "Phase 13 Customs User",
        active: true,
        isPlatformAdmin: true,
      },
    });
    actorId = actor.id;

    const customer = await db.crmAccount.create({
      data: {
        orgId,
        ownerId: actorId,
        createdById: actorId,
        updatedById: actorId,
        name: "Original Exporter Pvt Ltd",
        type: "Customer",
      },
    });
    customerId = customer.id;

    const exportJobType = await db.chaJobType.create({
      data: {
        orgId,
        name: `Export Filing ${runId}`,
        movementDirection: "EXPORT",
        filingFlowCategory: "EXPORT_SB",
      },
    });
    exportJobTypeId = exportJobType.id;

    const job = await db.chaJob.create({
      data: {
        orgId,
        jobNumber: `CHA-P13-${runId}`,
        title: "Phase 13 export filing",
        customerId,
        jobTypeId: exportJobTypeId,
        branchId,
        primaryOwnerId: actorId,
      },
    });
    jobId = job.id;

    const profile = await db.chaCustomsFilingProfile.create({
      data: {
        jobId,
        movementDirection: "EXPORT",
        createdById: actorId,
        updatedById: actorId,
      },
    });
    profileId = profile.id;

    const ritcRun = await createImportRun(orgId, "RITC_TARIFF", "ritc-p13-v1");
    const schemeRun = await createImportRun(orgId, "SCHEME_CODE", "scheme-p13-v1");
    const drawbackRun = await createImportRun(orgId, "DRAWBACK", "drawback-p13-v1");
    const rodtepRun = await createImportRun(orgId, "RODTEP", "rodtep-p13-v1");
    const rosctlRun = await createImportRun(orgId, "ROSCTL", "rosctl-p13-v1");
    const swRun = await createImportRun(orgId, "SINGLE_WINDOW_CTH", "sw-p13-v1");
    const docRun = await createImportRun(orgId, "SUPPORTING_DOCUMENT", "doc-p13-v1");
    const uomRun = await createImportRun(orgId, "UOM", "uom-p13-v1");

    await db.chaRitcTariffMaster.create({
      data: {
        orgId,
        sourceRunId: ritcRun.id,
        datasetVersion: "ritc-p13-v1",
        tariffItem: "01012100",
        description: "Pure-bred breeding animals",
        uom: "KGS",
      },
    });
    await db.chaSchemeCodeMaster.create({
      data: {
        orgId,
        sourceRunId: schemeRun.id,
        datasetVersion: "scheme-p13-v1",
        eximCode: "00",
        schemeType: "GENERAL",
        exportSchemeName: "Free Shipping Bill",
      },
    });
    await db.chaDrawbackRateMaster.create({
      data: {
        orgId,
        sourceRunId: drawbackRun.id,
        datasetVersion: "drawback-p13-v1",
        dbkSerialNo: "0101B",
        dbkHeader: "0101",
        description: "Drawback sample",
        rateAdvance: "1.25000000",
      },
    });
    await db.chaRodtepRateMaster.create({
      data: {
        orgId,
        sourceRunId: rodtepRun.id,
        datasetVersion: "rodtep-p13-v1",
        ritcNo: "01012100",
        description: "RoDTEP sample",
        rate: "0.01000000",
        capRate: "0.50000000",
        uqc: "KGS",
      },
    });
    await db.chaRosctlRateMaster.create({
      data: {
        orgId,
        sourceRunId: rosctlRun.id,
        datasetVersion: "rosctl-p13-v1",
        rosctlCode: "0101B",
        schedule: "SCH1",
        description: "RoSCTL sample",
        percentage: "2.65000000",
        rateAmount: "31.10000000",
      },
    });
    await db.chaSingleWindowCthMaster.create({
      data: {
        orgId,
        sourceRunId: swRun.id,
        datasetVersion: "sw-p13-v1",
        fromCth: "01012100",
        agencyCode: "AQCS",
        agencyName: "AQCS",
      },
    });
    await db.chaSupportingDocumentMaster.create({
      data: {
        orgId,
        sourceRunId: docRun.id,
        datasetVersion: "doc-p13-v1",
        documentCode: "001002",
        documentName: "Lab analysis Report",
      },
    });
    await db.chaUomMaster.create({
      data: {
        orgId,
        sourceRunId: uomRun.id,
        datasetVersion: "uom-p13-v1",
        quantityCode: "KGS",
        quantityDescription: "Kilograms",
      },
    });
  });

  afterAll(async () => {
    delete process.env.CHA_CUSTOMS_SIGNING_CONNECTOR_MODE;
    await db.systemSetting.deleteMany({ where: { key: getChaCustomsFeatureFlagsSettingKey(orgId) } });
    await db.chaCustomsExternalEvent.deleteMany({
      where: { submission: { profileId } },
    });
    await db.chaCustomsExternalSubmission.deleteMany({
      where: { profileId },
    });
    await db.chaCustomsFilingProfile.deleteMany({ where: { jobId } });
    await db.chaAuditLog.deleteMany({ where: { orgId } });
    await db.chaJob.deleteMany({ where: { id: jobId } });
    await db.crmAccount.deleteMany({ where: { id: customerId } });
    await db.chaJobType.deleteMany({ where: { id: exportJobTypeId } });
    await db.user.deleteMany({ where: { id: actorId } });
    await db.branch.deleteMany({ where: { id: branchId } });
    await db.organisation.deleteMany({ where: { id: { in: [orgId, otherOrgId] } } });
  });

  it("persists SB Main Details with exporter, consignee, airway bill, package and container draft rows", async () => {
    const result = await saveExportSbMainDraft({
      actorId,
      orgId,
      jobId,
      input: {
        lockVersion: 1,
        jobDate: "2026-07-31",
        sbType: "Normal",
        transportMode: "SEA",
        bookingNo: "BOOK-1",
        bookingDate: "2026-07-31",
        customsHouse: "CusHouse ACHRA",
        customsHouseCode: "INACH1",
        sbNumber: "SB-1",
        sbDate: "2026-08-01",
        examinationDate: "",
        leoDate: "",
        icegateIdSnapshot: "ICEGATE-SB",
        chaExporterPanSnapshot: "ABCDE1234F",
        standardIec: true,
        exporterNameSnapshot: "Snapshot Exporter Pvt Ltd",
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
        mawbNo: "MAWB-1",
        mawbDate: "2026-07-31",
        hawbNo: "HAWB-1",
        hawbDate: "2026-07-31",
        marksAndNos: "AS PER INV",
        rotationStuffingText: "Rotation and stuffing snapshot",
        eouDetailsText: "EOU snapshot",
        packageRows: [{ sequenceNo: 1, packageType: "Carton", packageCode: "CTN", packageCount: "10", loosePackageCount: "0", marksAndNos: "M1" }],
        containerRows: [{ sequenceNo: 1, containerNo: "CONT-P13-1", containerSize: "20FT", sealNo: "S1", packageCount: "10", grossWeight: "100.5", netWeight: "90.25" }],
      },
    });

    await db.crmAccount.update({ where: { id: customerId }, data: { name: "Changed Customer Master" } });
    const draft = await getExportFilingDraft(profileId);

    expect(result.sbMainStatus).toBe("COMPLETE");
    expect(draft.sbMain.exporterNameSnapshot).toBe("Snapshot Exporter Pvt Ltd");
    expect(draft.sbMain.consigneeNameSnapshot).toBe("Demo Customer Nigeria");
    expect(draft.sbMain.mawbNo).toBe("MAWB-1");
    expect(draft.sbMain.packageRows).toHaveLength(1);
    expect(draft.sbMain.containerRows[0].containerNo).toBe("CONT-P13-1");
    expect(draft.sbMain.sbStatusSource).toBe("MANUAL");
  });

  it("validates decimal and date shape before persistence", () => {
    const parsed = exportSbMainDraftSchema.safeParse({
      lockVersion: 2,
      jobDate: "31/07/2026",
      numberOfContainers: "1.1234567890123",
    });

    expect(parsed.success).toBe(false);
    expect(JSON.stringify(parsed.error?.issues)).toContain("Use YYYY-MM-DD");
    expect(JSON.stringify(parsed.error?.issues)).toContain("Use a positive decimal");
  });

  it("persists multi-invoice details, same-as-consignee snapshots and server Decimal totals", async () => {
    const profile = await db.chaCustomsFilingProfile.findUniqueOrThrow({
      where: { id: profileId },
      select: { lockVersion: true },
    });

    const result = await saveExportInvoiceDraft({
      actorId,
      orgId,
      jobId,
      input: {
        lockVersion: profile.lockVersion,
        invoices: [
          {
            sequenceNo: 1,
            invoiceNo: "EXP-INV-1",
            invoiceDate: "2026-07-31",
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
              { sequenceNo: 1, chargeType: "FREIGHT", currency: "USD", exchangeRate: "83.123456789012", rate: "", amount: "80", amountInr: "6649.88", isDeduction: false },
              { sequenceNo: 2, chargeType: "FOB_DISCOUNT", currency: "USD", exchangeRate: "83.123456789012", rate: "", amount: "10", amountInr: "831.23", isDeduction: true },
            ],
          },
          {
            sequenceNo: 2,
            invoiceNo: "EXP-INV-2",
            invoiceDate: "2026-08-01",
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
            calculationOverrideReason: "Manual override to be reviewed",
            charges: [],
          },
        ],
      },
    });
    const draft = await getExportFilingDraft(profileId);

    expect(result.exportInvoiceStatus).toBe("IN_PROGRESS");
    expect(draft.invoices).toHaveLength(2);
    expect(draft.invoices[0].sameAsConsignee).toBe(true);
    expect(draft.invoices[0].invoiceValueFc).toBe("1070.25");
    expect(draft.invoices[0].invoiceValueInr).toBe("88962.69");
    expect(draft.invoices[0].fobValueFc).toBe("1060.25");
    expect(draft.invoices[1].buyerNameSnapshot).toBe("Buyer Two");
  });

  it("persists export item and supporting-document rows with master source snapshots", async () => {
    const profile = await db.chaCustomsFilingProfile.findUniqueOrThrow({
      where: { id: profileId },
      select: { lockVersion: true },
    });

    const result = await saveExportRemainingDraft({
      actorId,
      orgId,
      jobId,
      input: {
        lockVersion: profile.lockVersion,
        items: [
          {
            sequenceNo: 1,
            invoiceSequenceNo: 1,
            invoiceNoSnapshot: "EXP-INV-1",
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
            fta: "No",
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
            documentNameSnapshot: "",
            irnNo: "IRN-13",
            drnNo: "DRN-13",
            issueDate: "2026-07-31",
            declarationType: "EXPORT",
            fileType: "PDF",
            placeOfIssue: "Chennai",
            invoiceSequenceNo: 1,
            itemSequenceNo: 1,
            expiryDate: "2027-07-31",
            invoiceNoSnapshot: "EXP-INV-1",
            icegateIdSnapshot: "ICEGATE-SB",
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
            documentVersionId: "doc-version-1",
          },
        ],
      },
    });

    const draft = await getExportFilingDraft(profileId);

    expect(result.exportItemStatus).toBe("IN_PROGRESS");
    expect(result.exportDocumentStatus).toBe("IN_PROGRESS");
    expect(draft.items[0].ritcNo).toBe("01012100");
    expect(draft.items[0].schemeCode).toBe("00");
    expect(draft.supportingDocuments[0].documentCode).toBe("001002");

    const savedItem = await db.chaExportItem.findFirstOrThrow({
      where: { profileId },
      select: { masterSnapshot: true, rodtepSnapshot: true, rosctlSnapshot: true, drawbackSnapshot: true, singleWindowSnapshot: true },
    });
    const savedDocument = await db.chaExportSupportingDocument.findFirstOrThrow({
      where: { profileId },
      select: { documentVersionId: true, rawSnapshot: true },
    });

    expect(savedItem.masterSnapshot).toMatchObject({
      ritc: { source: { datasetVersion: "ritc-p13-v1" } },
      scheme: { source: { datasetVersion: "scheme-p13-v1" } },
      uom: { source: { datasetVersion: "uom-p13-v1" } },
    });
    expect(savedItem.drawbackSnapshot).toMatchObject({ source: { datasetVersion: "drawback-p13-v1" } });
    expect(savedItem.rodtepSnapshot).toMatchObject({ source: { datasetVersion: "rodtep-p13-v1" } });
    expect(savedItem.rosctlSnapshot).toMatchObject({ source: { datasetVersion: "rosctl-p13-v1" } });
    expect(savedItem.singleWindowSnapshot).toMatchObject({
      lookupResults: [expect.objectContaining({ source: expect.objectContaining({ datasetVersion: "sw-p13-v1" }) })],
    });
    expect(savedDocument.documentVersionId).toBe("doc-version-1");
    expect(savedDocument.rawSnapshot).toMatchObject({ source: { datasetVersion: "doc-p13-v1" } });
  });

  it("generates checklist versions from saved job data and increments after material changes", async () => {
    const profile = await db.chaCustomsFilingProfile.findUniqueOrThrow({
      where: { id: profileId },
      select: { lockVersion: true },
    });

    const first = await generateExportChecklistSnapshot({
      actorId,
      orgId,
      jobId,
      lockVersion: profile.lockVersion,
      withDeclaration: true,
    });

    await saveExportInvoiceDraft({
      actorId,
      orgId,
      jobId,
      input: {
        lockVersion: profile.lockVersion + 1,
        invoices: [
          {
            sequenceNo: 1,
            invoiceNo: "EXP-INV-1A",
            invoiceDate: "2026-07-31",
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
            calculationOverrideReason: "",
            charges: [],
          },
        ],
      },
    });

    const second = await generateExportChecklistSnapshot({
      actorId,
      orgId,
      jobId,
      lockVersion: profile.lockVersion + 2,
      withDeclaration: false,
    });
    const draft = await getExportFilingDraft(profileId);

    expect(first.versionNo).toBe(1);
    expect(second.versionNo).toBe(2);
    expect(draft.checklist.summary.jobNumber).toBe(`CHA-P13-${runId}`);
    expect(draft.checklist.summary.totalInvoices).toBe("1");
  });

  it("generates deterministic flat-file fixtures and separates dummy from signed-live intent", async () => {
    const profile = await db.chaCustomsFilingProfile.findUniqueOrThrow({
      where: { id: profileId },
      select: { lockVersion: true },
    });

    const first = await generateExportFlatFileSnapshot({
      actorId,
      orgId,
      jobId,
      lockVersion: profile.lockVersion,
      dummyJob: true,
    });
    const second = await generateExportFlatFileSnapshot({
      actorId,
      orgId,
      jobId,
      lockVersion: profile.lockVersion + 1,
      dummyJob: true,
    });
    const third = await generateExportFlatFileSnapshot({
      actorId,
      orgId,
      jobId,
      lockVersion: profile.lockVersion + 2,
      dummyJob: false,
    });

    expect(first.contentHash).toBe(second.contentHash);
    expect(third.contentHash).not.toBe(first.contentHash);
    expect(first.fileName).toContain("-dummy");
    expect(third.fileName).not.toContain("-dummy");
  });

  it("records signing unavailable and register-only connector states safely", async () => {
    const latestGeneration = await db.chaCustomsFlatFileGeneration.findFirstOrThrow({
      where: { profileId },
      orderBy: { versionNo: "desc" },
      select: { id: true },
    });

    delete process.env.CHA_CUSTOMS_SIGNING_CONNECTOR_MODE;
    const unavailable = await requestExportFlatFileSigning({
      actorId,
      orgId,
      jobId,
      generationId: latestGeneration.id,
    });
    expect(unavailable).toEqual({
      status: "UNAVAILABLE",
      reason: "SIGNING_CONNECTOR_UNAVAILABLE",
    });

    process.env.CHA_CUSTOMS_SIGNING_CONNECTOR_MODE = "REGISTER_ONLY";
    const available = await requestExportFlatFileSigning({
      actorId,
      orgId,
      jobId,
      generationId: latestGeneration.id,
    });
    expect(available).toEqual({
      status: "AVAILABLE",
      mode: "REGISTER_ONLY",
    });

    const signed = await registerExportFlatFileSignature({
      actorId,
      orgId,
      jobId,
      generationId: latestGeneration.id,
      signatureReference: "MANUAL-SIGN-REF-1",
    });
    expect(signed.signingStatus).toBe("SIGNED");
    expect(signed.signatureReference).toBe("MANUAL-SIGN-REF-1");
  });

  it("prevents duplicate live submission and appends mock ICEGATE events without sending a real request", async () => {
    await db.systemSetting.upsert({
      where: { key: getChaCustomsFeatureFlagsSettingKey(orgId) },
      create: {
        key: getChaCustomsFeatureFlagsSettingKey(orgId),
        value: JSON.stringify({
          CHA_CUSTOMS_MASTER_DATA: false,
          CHA_IMPORT_FILING_WORKSPACE: false,
          CHA_EXPORT_FILING_WORKSPACE: true,
          CHA_ICEGATE_INTEGRATION: true,
          CHA_ICEGATE_LIVE_SUBMISSION: true,
        }),
      },
      update: {
        value: JSON.stringify({
          CHA_CUSTOMS_MASTER_DATA: false,
          CHA_IMPORT_FILING_WORKSPACE: false,
          CHA_EXPORT_FILING_WORKSPACE: true,
          CHA_ICEGATE_INTEGRATION: true,
          CHA_ICEGATE_LIVE_SUBMISSION: true,
        }),
      },
    });

    const generation = await db.chaCustomsFlatFileGeneration.findFirstOrThrow({
      where: { profileId, signingStatus: "SIGNED" },
      orderBy: { versionNo: "desc" },
      select: { id: true },
    });

    const submission = await submitGeneratedIcegateFile({
      actorId,
      orgId,
      jobId,
      flatFileGenerationId: generation.id,
      documentType: "SB",
      client: new MockIcegateClient("positive_sb_acknowledgement"),
    });

    expect(submission.status).toBe("ACKNOWLEDGED");

    const events = await db.chaCustomsExternalEvent.findMany({
      where: {
        submission: { flatFileGenerationId: generation.id },
      },
      orderBy: { sequenceNo: "asc" },
      select: { eventKind: true, externalStatus: true },
    });
    expect(events.map((event) => event.eventKind)).toEqual(["REQUEST_PREPARED", "ACKNOWLEDGED"]);
    expect(events[1]?.externalStatus).toBe("positive_sb_acknowledgement");

    await expect(
      submitGeneratedIcegateFile({
        actorId,
        orgId,
        jobId,
        flatFileGenerationId: generation.id,
        documentType: "SB",
        client: new MockIcegateClient("duplicate_request"),
      }),
    ).rejects.toThrow("already has a live ICEGATE submission");
  });

  it("rejects stale autosave writes with the concurrency lock", async () => {
    await expect(
      saveExportInvoiceDraft({
        actorId,
        orgId,
        jobId,
        input: {
          lockVersion: 1,
          invoices: [{ sequenceNo: 1, invoiceNo: "STALE" }],
        },
      }),
    ).rejects.toThrow("CONCURRENCY_CONFLICT");
  });

  it("enforces organisation isolation on export draft saves", async () => {
    const profile = await db.chaCustomsFilingProfile.findUniqueOrThrow({
      where: { id: profileId },
      select: { lockVersion: true },
    });

    await expect(
      saveExportSbMainDraft({
        actorId,
        orgId: otherOrgId,
        jobId,
        input: {
          lockVersion: profile.lockVersion,
          sbType: "Normal",
        },
      }),
    ).rejects.toThrow("Export customs filing profile is unavailable");
  });
});
