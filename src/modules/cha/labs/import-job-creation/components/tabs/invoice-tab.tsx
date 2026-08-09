"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { WorkspaceAction, WorkspaceTable } from "@/components/monolith";
import { Input } from "@/components/ui/input";
import { createEmptyInvoiceCharges, importChargeLabels } from "../../domain/import-job.defaults";
import { demoImportCalculationEngine, formatDecimal } from "../../domain/import-job-calculations";
import { importInvoiceRecordSchema } from "../../domain/import-job.schemas";
import type { ImportInvoiceRecord } from "../../domain/import-job.types";
import { importMasterData } from "../../fixtures/import-master-data";
import { useImportJobDraft } from "../../state/import-job-draft-context";
import { FieldGrid, type LabFieldConfig, ImportFormSection } from "../import-form-section";
import { ImportRecordTable } from "../import-record-table";
import { confirmDelete, createStableId, flattenFormErrors } from "./tab-utils";

type InvoiceFormValues = Omit<ImportInvoiceRecord, "id" | "serialNo">;

const invoiceFields: LabFieldConfig<keyof InvoiceFormValues & string>[] = [
  { name: "jobNo", label: "Job No" },
  { name: "invoiceNo", label: "Invoice No", required: true },
  { name: "invoiceDate", label: "Invoice Date", type: "date", required: true },
  { name: "natureOfPayment", label: "Nature of Payment", type: "select", required: true, options: importMasterData.paymentNatures },
  { name: "natureOfTransaction", label: "Nature of Transaction", type: "select", required: true, options: importMasterData.transactionNatures },
  { name: "currency", label: "Currency", type: "select", required: true, options: importMasterData.currencies },
  { name: "exchangeRate", label: "Exchange Rate" },
  { name: "invoiceValue", label: "Invoice Value", required: true },
  { name: "incoterms", label: "Incoterms", type: "select", required: true, options: importMasterData.incoterms },
  { name: "valuationMethod", label: "Valuation Method", type: "select", options: importMasterData.valuationMethods },
  { name: "totalInvoice", label: "Total Invoice indicator", type: "checkbox" },
];

const supplierFields: LabFieldConfig<keyof InvoiceFormValues & string>[] = [
  { name: "useForAllInvoices", label: "Use for all invoices", type: "checkbox" },
  { name: "useAsDefaultManufacturer", label: "Use as default manufacturer", type: "checkbox" },
  { name: "supplierName", label: "Supplier Name", required: true },
  { name: "supplierAddress", label: "Supplier Address", type: "textarea" },
  { name: "supplierCountry", label: "Supplier Country", type: "select", required: true, options: importMasterData.countries },
  { name: "zipCode", label: "ZIP Code" },
  { name: "sellerDetails", label: "Seller Details", type: "textarea" },
  { name: "brokerDetails", label: "Broker Details", type: "textarea" },
  { name: "thirdParty", label: "Third Party", type: "checkbox" },
  { name: "aeo", label: "AEO", type: "checkbox" },
  { name: "svbDetails", label: "SVB Details", type: "textarea" },
];

const contractFields: LabFieldConfig<keyof InvoiceFormValues & string>[] = [
  { name: "singleFreightAndInsurance", label: "Single Freight and Insurance", type: "checkbox" },
  { name: "actualFreight", label: "Actual Freight", type: "checkbox" },
];

function emptyInvoice(jobNo = ""): InvoiceFormValues {
  return {
    jobNo,
    invoiceNo: "",
    invoiceDate: "",
    natureOfPayment: "",
    natureOfTransaction: "",
    currency: "USD",
    exchangeRate: "",
    invoiceValue: "",
    incoterms: "",
    valuationMethod: "",
    totalInvoice: false,
    useForAllInvoices: false,
    useAsDefaultManufacturer: false,
    supplierName: "",
    supplierAddress: "",
    supplierCountry: "",
    zipCode: "",
    sellerDetails: "",
    brokerDetails: "",
    thirdParty: false,
    aeo: false,
    svbDetails: "",
    singleFreightAndInsurance: false,
    actualFreight: false,
    charges: createEmptyInvoiceCharges(),
  };
}

export function InvoiceTab() {
  const { dispatch, draft, isLocked } = useImportJobDraft();
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const form = useForm<InvoiceFormValues>({
    defaultValues: emptyInvoice(draft.mainDetails.jobNo),
    resolver: zodResolver(importInvoiceRecordSchema) as never,
  });
  const values = useWatch({ control: form.control }) as InvoiceFormValues;
  const errors = flattenFormErrors(form.formState.errors);
  const calculated = demoImportCalculationEngine.calculateInvoice({ ...values, id: editingId ?? "editor", serialNo: 0 });
  const aggregate = demoImportCalculationEngine.aggregateInvoices(draft.invoiceRecords);

  function update(name: string, value: string | boolean) {
    form.setValue(name as never, value as never, { shouldDirty: true, shouldValidate: true });
  }

  async function save() {
    const isValid = await form.trigger();
    if (!isValid) return;
    const existing = draft.invoiceRecords.find((record) => record.id === editingId);
    dispatch({
      type: "upsert-invoice",
      record: {
        ...form.getValues(),
        id: editingId ?? createStableId("invoice"),
        serialNo: existing?.serialNo ?? draft.invoiceRecords.length + 1,
      },
    });
    setEditingId(null);
    form.reset(emptyInvoice(draft.mainDetails.jobNo));
  }

  return (
    <div className="space-y-5">
      <ImportFormSection
        title="Invoice Details"
        actions={<WorkspaceAction disabled={isLocked} size="compact" onClick={save}>Save</WorkspaceAction>}
      >
        <FieldGrid disabled={isLocked} errors={errors} fields={invoiceFields} values={values as unknown as Record<string, unknown>} onChange={update} />
        <p className="mnx-text-muted">Invoice Value INR: {formatDecimal(calculated.invoiceValueInr)}</p>
      </ImportFormSection>
      <ImportFormSection title="Supplier Details">
        <FieldGrid disabled={isLocked} errors={errors} fields={supplierFields} values={values as unknown as Record<string, unknown>} onChange={update} />
      </ImportFormSection>
      <ImportFormSection title="Contract Details">
        <FieldGrid disabled={isLocked} errors={errors} fields={contractFields} values={values as unknown as Record<string, unknown>} onChange={update} />
        <WorkspaceTable>
          <thead>
            <tr>
              <th>Charge</th>
              <th>Apply</th>
              <th>Currency</th>
              <th>Exchange Rate</th>
              <th>Rate</th>
              <th>Amount</th>
              <th>INR</th>
            </tr>
          </thead>
          <tbody>
            {values.charges.map((charge, index) => (
              <tr key={charge.key}>
                <td>{importChargeLabels[charge.key]}</td>
                <td><Input checked={charge.apply} disabled={isLocked} type="checkbox" onChange={(event) => form.setValue(`charges.${index}.apply`, event.currentTarget.checked, { shouldDirty: true })} /></td>
                <td><Input disabled={isLocked} value={charge.currency} onChange={(event) => form.setValue(`charges.${index}.currency`, event.currentTarget.value, { shouldDirty: true })} /></td>
                <td><Input disabled={isLocked} value={charge.exchangeRate} onChange={(event) => form.setValue(`charges.${index}.exchangeRate`, event.currentTarget.value, { shouldDirty: true })} /></td>
                <td><Input disabled={isLocked} value={charge.rate} onChange={(event) => form.setValue(`charges.${index}.rate`, event.currentTarget.value, { shouldDirty: true })} /></td>
                <td><Input disabled={isLocked} value={charge.amount} onChange={(event) => form.setValue(`charges.${index}.amount`, event.currentTarget.value, { shouldDirty: true })} /></td>
                <td>{formatDecimal(charge.apply ? Number(charge.amount || 0) * Number(charge.exchangeRate || 0) : 0)}</td>
              </tr>
            ))}
          </tbody>
        </WorkspaceTable>
        <div className="grid gap-3 md:grid-cols-2">
          <strong>Assessable Value FC: {formatDecimal(calculated.assessableValueFc)}</strong>
          <strong>Assessable Value INR: {formatDecimal(calculated.assessableValueInr)}</strong>
        </div>
      </ImportFormSection>
      <ImportFormSection title="Invoice Register">
        <ImportRecordTable
          disabled={isLocked}
          emptyMessage="No invoices saved yet."
          records={draft.invoiceRecords}
          columns={[
            { key: "serialNo", label: "Serial No", render: (record) => record.serialNo },
            { key: "invoiceNo", label: "Invoice No", render: (record) => record.invoiceNo },
            { key: "date", label: "Date", render: (record) => record.invoiceDate },
            { key: "incoterm", label: "Incoterm", render: (record) => record.incoterms },
            { key: "currency", label: "Currency", render: (record) => record.currency },
            { key: "exchangeRate", label: "Exchange Rate", render: (record) => record.exchangeRate },
            { key: "payment", label: "Payment", render: (record) => record.natureOfPayment },
            { key: "transaction", label: "Transaction", render: (record) => record.natureOfTransaction },
            { key: "amountFc", label: "Amount FC", render: (record) => record.invoiceValue },
            { key: "amountInr", label: "Amount INR", render: (record) => formatDecimal(demoImportCalculationEngine.calculateInvoice(record).invoiceValueInr) },
          ]}
          onEdit={(record) => { setEditingId(record.id); form.reset(record); }}
          onDuplicate={(record) => dispatch({ type: "upsert-invoice", record: { ...record, id: createStableId("invoice"), serialNo: draft.invoiceRecords.length + 1 } })}
          onDelete={(record) => {
            const linkedItems = draft.itemRecords.filter((item) => item.invoiceId === record.id).length;
            const message = linkedItems > 0
              ? `Delete this invoice? ${linkedItems} linked item record(s) will become invalid in the lab.`
              : "Delete this invoice from the lab draft?";
            if (confirmDelete(message)) dispatch({ type: "delete-invoice", id: record.id });
          }}
        />
        <p className="mnx-text-muted">Aggregate totals: FC {formatDecimal(aggregate.invoiceValueFc)} | INR {formatDecimal(aggregate.invoiceValueInr)} | Assessable INR {formatDecimal(aggregate.assessableValueInr)}</p>
      </ImportFormSection>
    </div>
  );
}
