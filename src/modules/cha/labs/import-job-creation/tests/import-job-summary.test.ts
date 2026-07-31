import { describe, expect, it } from "vitest";
import { createBlankImportJobDraft, createSampleImportJobDraft } from "../domain/import-job.defaults";
import { buildChecklistSummary, validateParentChildIntegrity } from "../domain/import-job-summary";

describe("import checklist summary", () => {
  it("builds checklist cards from the current draft", () => {
    const summary = buildChecklistSummary(createSampleImportJobDraft());

    expect(summary.card1.beType).toBe("Home Consumption");
    expect(summary.card2.importerName).toBe("Demo Importer Private Limited");
    expect(summary.card3.totalProducts).toBe(1);
  });

  it("reports parent-child integrity warnings", () => {
    const draft = createBlankImportJobDraft();
    draft.itemRecords = [{
      id: "item-1",
      serialNo: 1,
      jobNo: "",
      invoiceId: "missing-invoice",
      invoiceSerialNo: 99,
      invoiceNo: "",
      totalNumberOfProducts: "",
      productSerialNo: "",
      ritcNo: "85044090",
      productDescription: "Test",
      dutyRate: "10",
      schemeType: "Normal",
      quantity: "1",
      unit: "NOS",
      unitPrice: "1",
      endUse: "Test",
      countryOfOrigin: "China",
      cthNo: "85044090",
      cethNo: "85044090",
      schemeCode: "",
      schemeNotification: "",
      notificationSerialNo: "",
      genericDescription: "Test",
      foc: false,
      squc: "NOS",
      sqc: "1",
      duties: [],
      otherDuty: "",
      rsp: "",
      tariff: "",
      antiDumping: "",
      manufacturer: "",
      reImport: "",
      licence: "",
      ftaDetails: "",
      singleWindow: "",
      sez: "",
    }];

    expect(validateParentChildIntegrity(draft)).toHaveLength(1);
  });
});
