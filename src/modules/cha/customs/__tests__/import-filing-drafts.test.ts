import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import {
  getImportFilingDraft,
  saveImportBeMainDraft,
  generateImportChecklistSnapshot,
  generateImportFlatFileSnapshot,
  saveImportIgmDraft,
  saveImportRemainingDraft,
} from "../filing/import-drafts";
import { importIgmDraftSchema } from "../filing/import-schemas";

vi.mock("server-only", () => ({}));

const runId = Date.now().toString(36);

describe("CHA import BE Main Details and IGM drafts", () => {
  let orgId: string;
  let otherOrgId: string;
  let actorId: string;
  let branchId: string;
  let customerId: string;
  let importJobTypeId: string;
  let jobId: string;
  let profileId: string;

  beforeAll(async () => {
    const org = await db.organisation.create({
      data: { name: `Phase 10 Customs ${runId}`, slug: `phase-10-customs-${runId}` },
    });
    const otherOrg = await db.organisation.create({
      data: { name: `Phase 10 Customs Other ${runId}`, slug: `phase-10-customs-other-${runId}` },
    });
    orgId = org.id;
    otherOrgId = otherOrg.id;

    const branch = await db.branch.create({
      data: { orgId, name: "Chennai Branch", code: `P10${runId}` },
    });
    branchId = branch.id;

    const actor = await db.user.create({
      data: {
        orgId,
        email: `phase10-customs-${runId}@test.local`,
        passwordHash: "test",
        name: "Phase 10 Customs User",
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
        name: "Original Importer Pvt Ltd",
        type: "Customer",
      },
    });
    customerId = customer.id;

    const importJobType = await db.chaJobType.create({
      data: {
        orgId,
        name: `Import Filing ${runId}`,
        movementDirection: "IMPORT",
        filingFlowCategory: "IMPORT_BE",
      },
    });
    importJobTypeId = importJobType.id;

    const job = await db.chaJob.create({
      data: {
        orgId,
        jobNumber: `CHA-P10-${runId}`,
        title: "Phase 10 import filing",
        customerId,
        jobTypeId: importJobTypeId,
        branchId,
        primaryOwnerId: actorId,
      },
    });
    jobId = job.id;

    const profile = await db.chaCustomsFilingProfile.create({
      data: {
        jobId,
        movementDirection: "IMPORT",
        createdById: actorId,
        updatedById: actorId,
      },
    });
    profileId = profile.id;
  });

  afterAll(async () => {
    await db.chaCustomsFilingProfile.deleteMany({ where: { jobId } });
    await db.chaAuditLog.deleteMany({ where: { orgId } });
    await db.chaJob.deleteMany({ where: { id: jobId } });
    await db.crmAccount.deleteMany({ where: { id: customerId } });
    await db.chaJobType.deleteMany({ where: { id: importJobTypeId } });
    await db.user.deleteMany({ where: { id: actorId } });
    await db.branch.deleteMany({ where: { id: branchId } });
    await db.organisation.deleteMany({ where: { id: { in: [orgId, otherOrgId] } } });
  });

  it("persists BE Main Details as a ChaJob-linked draft and keeps importer snapshots stable", async () => {
    const first = await saveImportBeMainDraft({
      actorId,
      orgId,
      jobId,
      input: {
        lockVersion: 1,
        jobDate: "2026-07-30",
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
        beNumber: "BE-123",
        beDate: "2026-07-30",
        examinationDate: "",
        outOfChargeDate: "2026-07-31",
        dutyPaidDate: "",
        deliveredDate: "",
        icegateIdSnapshot: "ICEGATE-PROFILE",
        chaPanSnapshot: "ABCDE1234F",
        atpNameSnapshot: "ATP Name",
        atpPanSnapshot: "ABCDE1234G",
        standardIec: true,
        importerNameSnapshot: "Snapshot Importer Pvt Ltd",
        importerIecSnapshot: "0300000000",
        importerBranchSerialNo: "1",
        importerCategory: "F-Manufacturer",
        importerType: "P - Private",
        importerAddressSnapshot: "Snapshot address",
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
        ucrNo: "UCR-1",
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

    await db.crmAccount.update({ where: { id: customerId }, data: { name: "Changed Customer Master" } });
    const draft = await getImportFilingDraft(profileId);

    expect(first.beMainStatus).toBe("COMPLETE");
    expect(draft.beMain.importerNameSnapshot).toBe("Snapshot Importer Pvt Ltd");
    expect(draft.beMain.grossWeight).toBe("123.456789");
    expect(draft.beMain.beStatusSource).toBe("MANUAL");
    expect(draft.beMain.customsHouseCode).toBe("INMAA1");
  });

  it("rejects stale autosave writes with the concurrency lock", async () => {
    await expect(
      saveImportBeMainDraft({
        actorId,
        orgId,
        jobId,
        input: {
          lockVersion: 1,
          jobDate: "2026-07-30",
          beType: "Home Consumption",
          transportMode: "SEA",
          filingType: "Import Clearance",
          customsHouse: "Chennai Sea",
          customsHouseCode: "INMAA1",
          importerNameSnapshot: "Stale",
          importerIecSnapshot: "0300000000",
          portOfShipment: "Singapore",
          countryOfShipment: "Singapore",
          portOfOrigin: "Singapore",
          countryOfOrigin: "Singapore",
        },
      }),
    ).rejects.toThrow("CONCURRENCY_CONFLICT");
  });

  it("validates No-MBL and HBL combinations before persistence", () => {
    const parsed = importIgmDraftSchema.safeParse({
      lockVersion: 2,
      igmNo: "IGM-1",
      fileType: "Import",
      igmDate: "2026-07-30",
      inwardDate: "2026-07-31",
      gatewayPort: "Chennai",
      gatewayMode: "SEA",
      section48: false,
      billRows: [{ sequenceNo: 1, noMbl: true, mblNo: "MBL-1", hblDate: "2026-07-30" }],
      containers: [],
    });

    expect(parsed.success).toBe(false);
    expect(JSON.stringify(parsed.error?.issues)).toContain("MBL No must be empty");
    expect(JSON.stringify(parsed.error?.issues)).toContain("HBL No is required");
  });

  it("persists repeated IGM rows and shared container lines", async () => {
    const profile = await db.chaCustomsFilingProfile.findUniqueOrThrow({
      where: { id: profileId },
      select: { lockVersion: true },
    });

    const result = await saveImportIgmDraft({
      actorId,
      orgId,
      jobId,
      input: {
        lockVersion: profile.lockVersion,
        igmNo: "IGM-P10",
        fileType: "Import",
        igmDate: "2026-07-30",
        inwardDate: "2026-07-31",
        gatewayPort: "Chennai",
        gatewayMode: "SEA",
        marksAndNos: "AS PER BL",
        section48: true,
        section48Text: "Section 48 note",
        billRows: [
          {
            sequenceNo: 1,
            mblNo: "MBL-P10-1",
            noMbl: false,
            mblDate: "2026-07-30",
            hblNo: "HBL-P10-1",
            hblDate: "2026-07-30",
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
            hblNo: "HBL-P10-2",
            hblDate: "",
            packageCount: "5",
            packageCode: "PKG",
            grossWeight: "50",
            netWeight: "45",
            uom: "KGS",
          },
        ],
        containers: [
          { sequenceNo: 1, containerNo: "CONT-P10-1", containerSize: "20FT", sealNo: "S1", packageCount: "10", grossWeight: "100", netWeight: "90" },
          { sequenceNo: 2, containerNo: "CONT-P10-2", containerSize: "40FT", sealNo: "S2", packageCount: "5", grossWeight: "50", netWeight: "45" },
        ],
      },
    });
    const draft = await getImportFilingDraft(profileId);

    expect(result.igmStatus).toBe("COMPLETE");
    expect(draft.igm.billRows).toHaveLength(2);
    expect(draft.igm.containers).toHaveLength(2);
    expect(draft.igm.container20Count).toBe(1);
    expect(draft.igm.container40Count).toBe(1);
    expect(draft.igm.igmCapability.supported).toBe(false);
  });

  it("enforces organisation isolation on draft saves", async () => {
    const profile = await db.chaCustomsFilingProfile.findUniqueOrThrow({
      where: { id: profileId },
      select: { lockVersion: true },
    });

    await expect(
      saveImportIgmDraft({
        actorId,
        orgId: otherOrgId,
        jobId,
        input: {
          lockVersion: profile.lockVersion,
          igmNo: "IGM-WRONG-ORG",
          fileType: "Import",
          igmDate: "2026-07-30",
          inwardDate: "2026-07-31",
          gatewayPort: "Chennai",
          gatewayMode: "SEA",
          section48: false,
          billRows: [{ sequenceNo: 1, mblNo: "MBL", noMbl: false }],
          containers: [],
        },
      }),
    ).rejects.toThrow("Import customs filing profile is unavailable");
  });

  it("persists remaining import subtabs with invoice totals, item snapshots, declarations and document metadata", async () => {
    const profile = await db.chaCustomsFilingProfile.findUniqueOrThrow({
      where: { id: profileId },
      select: { lockVersion: true },
    });

    const result = await saveImportRemainingDraft({
      actorId,
      orgId,
      jobId,
      input: {
        lockVersion: profile.lockVersion,
        invoices: [
          {
            sequenceNo: 1,
            invoiceNo: "INV-P10-1",
            invoiceDate: "2026-07-30",
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
              { sequenceNo: 1, chargeType: "FREIGHT", currency: "USD", exchangeRate: "83.123456789012", rate: "", amount: "80", amountInr: "6649.88", isActual: true },
              { sequenceNo: 2, chargeType: "DISCOUNT", currency: "USD", exchangeRate: "83.123456789012", rate: "", amount: "10", amountInr: "831.23", isActual: false },
            ],
          },
          {
            sequenceNo: 2,
            invoiceNo: "INV-P10-2",
            invoiceDate: "2026-07-31",
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
            countryOfOrigin: "US",
            notificationNo: "020/2026",
            notificationSerialNo: "1137",
            notificationSubSerialNo: "",
            bcdRate: "10",
            aidcRate: "0",
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
            declarationDate: "2026-07-31",
            invoiceSequenceNo: 1,
            itemSequenceNo: 1,
          },
        ],
        supportingDocuments: [
          {
            sequenceNo: 1,
            documentCode: "001002",
            documentNameSnapshot: "Lab analysis Report",
            irnNo: "IRN-1",
            drnNo: "DRN-1",
            issueDate: "2026-07-30",
            expiryDate: "2027-07-30",
            declarationType: "E",
            fileType: "PDF",
            placeOfIssue: "Chennai",
            invoiceSequenceNo: 1,
            itemSequenceNo: 1,
            icegateIdSnapshot: "ICEGATE-PROFILE",
            documentVersionId: "existing-document-version-id",
            issuingPartyText: "Issuing party snapshot",
          },
        ],
      },
    });
    const draft = await getImportFilingDraft(profileId);

    expect(result.importInvoiceStatus).toBe("IN_PROGRESS");
    expect(result.importItemStatus).toBe("IN_PROGRESS");
    expect(draft.invoices).toHaveLength(2);
    expect(draft.invoices[0].invoiceValueInr).toBe("83144.04");
    expect(draft.items).toHaveLength(2);
    expect(draft.items[0].ritcNo).toBe("01012100");
    expect(draft.items[0].bcdRate).toBe("10");
    expect(draft.declarations[0].invoiceSequenceNo).toBe(1);
    expect(draft.supportingDocuments[0].documentVersionId).toBe("existing-document-version-id");
  });

  it("generates checklist and deterministic flat-file history without changing filing status", async () => {
    const profile = await db.chaCustomsFilingProfile.findUniqueOrThrow({
      where: { id: profileId },
      select: { lockVersion: true, status: true },
    });

    const checklist = await generateImportChecklistSnapshot({
      actorId,
      orgId,
      jobId,
      lockVersion: profile.lockVersion,
    });
    const flatFileOne = await generateImportFlatFileSnapshot({
      actorId,
      orgId,
      jobId,
      lockVersion: profile.lockVersion,
    });
    const flatFileTwo = await generateImportFlatFileSnapshot({
      actorId,
      orgId,
      jobId,
      lockVersion: profile.lockVersion,
    });
    const after = await db.chaCustomsFilingProfile.findUniqueOrThrow({
      where: { id: profileId },
      select: { status: true },
    });

    expect(checklist.versionNo).toBeGreaterThan(0);
    expect(checklist.checksum).toMatch(/^[a-f0-9]{64}$/);
    expect(flatFileOne.contentHash).toBe(flatFileTwo.contentHash);
    expect(flatFileTwo.versionNo).toBe(flatFileOne.versionNo + 1);
    expect(after.status).toBe(profile.status);
  });
});
