import { demoImportCalculationEngine, roundDecimal } from "./import-job-calculations";
import type { ImportJobDraft, ImportJobIntegrityWarning } from "./import-job.types";

export function buildChecklistSummary(draft: ImportJobDraft) {
  const firstIgm = draft.igmRecords[0];
  const firstInvoice = draft.invoiceRecords[0];
  const totals = demoImportCalculationEngine.aggregateDraft(draft);

  return {
    card1: {
      beType: draft.mainDetails.beType,
      filingType: draft.mainDetails.filingType,
      icegateId: draft.mainDetails.icegateId,
      transportMode: draft.mainDetails.transportMode,
      customsHouse: draft.mainDetails.customsHouse,
      shipmentCountry: `${draft.mainDetails.portOfShipment || "-"} / ${draft.mainDetails.countryOfShipment || "-"}`,
      originCountry: `${draft.mainDetails.portOfOrigin || "-"} / ${draft.mainDetails.countryOfOrigin || "-"}`,
      igm: firstIgm ? `${firstIgm.igmNo} / ${firstIgm.igmDate}` : "-",
      inwardDate: firstIgm?.inwardDate || "-",
      weight: firstIgm
        ? `${firstIgm.grossWeight || "-"} / ${firstIgm.netWeight || "-"} / ${firstIgm.uom || "-"}`
        : `${draft.mainDetails.grossWeight || "-"} / - / ${draft.mainDetails.uom || "-"}`,
      containers: draft.igmRecords.reduce(
        (count, record) => count + Number(record.twentyFtCount || 0) + Number(record.fortyFtCount || 0),
        0,
      ),
      packages: firstIgm
        ? `${firstIgm.numberOfPackages} / ${firstIgm.packageCode}`
        : `${draft.mainDetails.numberOfPackages || "-"} / ${draft.mainDetails.packageCode || "-"}`,
    },
    card2: {
      importerName: draft.mainDetails.importerName,
      iecBranch: `${draft.mainDetails.iecNo || "-"} / ${draft.mainDetails.branchSerialNo || "-"}`,
      address: draft.mainDetails.address,
      adCode: draft.mainDetails.adCode,
      stateOfOrigin: draft.mainDetails.stateOfOrigin,
      importerTypeClass: `${draft.mainDetails.importerType || "-"} / ${draft.mainDetails.importerClass || "-"}`,
      tax: `${draft.mainDetails.gstnType || "-"} / ${draft.mainDetails.taxRegistrationNo || "-"}`,
      supplierName: firstInvoice?.supplierName || "-",
      supplierCountry: firstInvoice
        ? `${firstInvoice.supplierAddress || "-"} / ${firstInvoice.supplierCountry || "-"}`
        : "-",
      totalInvoice: roundDecimal(totals.invoices.invoiceValueFc),
      currencyRate: firstInvoice ? `${firstInvoice.currency} / ${firstInvoice.exchangeRate}` : "-",
      incoterm: firstInvoice?.incoterms || "-",
    },
    card3: {
      schemeCode: draft.itemRecords[0]?.schemeCode || "-",
      totalProducts: draft.itemRecords.length,
      totalInvoiceFc: totals.invoices.invoiceValueFc,
      totalInvoiceInr: totals.invoices.invoiceValueInr,
      totalAssessableFc: totals.invoices.assessableValueFc,
      totalAssessableInr: totals.invoices.assessableValueInr,
      totalDuty: totals.items.totalDuty,
      totalBcd: totals.items.byDuty.bcd ?? 0,
      totalSws: totals.items.byDuty.sws ?? 0,
      totalIgst: totals.items.byDuty.igst ?? 0,
      totalIgstAssessableValue: totals.items.amountInr,
    },
  };
}

export function buildFlatFileSummary(draft: ImportJobDraft) {
  const totals = demoImportCalculationEngine.aggregateDraft(draft);

  return {
    draftId: draft.id,
    jobNo: draft.mainDetails.jobNo,
    movementDirection: draft.movementDirection,
    invoices: draft.invoiceRecords.length,
    items: draft.itemRecords.length,
    declarations: draft.declarationRecords.length,
    documents: draft.supportingDocumentRecords.length,
    totalInvoiceInr: totals.invoices.invoiceValueInr,
    totalDuty: totals.items.totalDuty,
  };
}

export function validateParentChildIntegrity(draft: ImportJobDraft): ImportJobIntegrityWarning[] {
  const warnings: ImportJobIntegrityWarning[] = [];
  const invoiceIds = new Set(draft.invoiceRecords.map((invoice) => invoice.id));
  const itemIds = new Set(draft.itemRecords.map((item) => item.id));

  const orphanItems = draft.itemRecords.filter((item) => item.invoiceId && !invoiceIds.has(item.invoiceId));
  if (orphanItems.length > 0) {
    warnings.push({
      parentType: "invoice",
      parentId: "missing",
      childType: "item",
      childIds: orphanItems.map((item) => item.id),
      message: "Some items reference an invoice that is no longer saved.",
    });
  }

  const orphanDeclarations = draft.declarationRecords.filter(
    (record) =>
      (record.invoiceId && !invoiceIds.has(record.invoiceId)) ||
      (record.itemId && !itemIds.has(record.itemId)),
  );
  if (orphanDeclarations.length > 0) {
    warnings.push({
      parentType: "item",
      parentId: "missing",
      childType: "declaration",
      childIds: orphanDeclarations.map((record) => record.id),
      message: "Some declarations reference removed invoice or item records.",
    });
  }

  const orphanDocuments = draft.supportingDocumentRecords.filter(
    (record) =>
      (record.invoiceId && !invoiceIds.has(record.invoiceId)) ||
      (record.itemId && !itemIds.has(record.itemId)),
  );
  if (orphanDocuments.length > 0) {
    warnings.push({
      parentType: "item",
      parentId: "missing",
      childType: "supportingDocument",
      childIds: orphanDocuments.map((record) => record.id),
      message: "Some supporting documents reference removed invoice or item records.",
    });
  }

  return warnings;
}
