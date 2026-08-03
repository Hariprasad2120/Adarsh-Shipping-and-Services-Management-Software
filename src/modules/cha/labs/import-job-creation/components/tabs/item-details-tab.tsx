"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { WorkspaceAction, WorkspaceAlert, WorkspaceSelect, WorkspaceTable } from "@/components/monolith";
import { createEmptyDutyRows, importDutyLabels } from "../../domain/import-job.defaults";
import { demoImportCalculationEngine, formatDecimal } from "../../domain/import-job-calculations";
import { importItemRecordSchema } from "../../domain/import-job.schemas";
import type { ImportItemRecord } from "../../domain/import-job.types";
import { getComplianceRulesForRitc } from "../../fixtures/import-compliance-rules";
import { importMasterData } from "../../fixtures/import-master-data";
import { useImportJobDraft } from "../../state/import-job-draft-context";
import { FieldGrid, type LabFieldConfig, ImportFormSection } from "../import-form-section";
import { ImportRecordTable } from "../import-record-table";
import { confirmDelete, createStableId, flattenFormErrors } from "./tab-utils";

type ItemFormValues = Omit<ImportItemRecord, "id" | "serialNo">;

const itemFields: LabFieldConfig<keyof ItemFormValues & string>[] = [
  { name: "jobNo", label: "Job No" },
  { name: "invoiceNo", label: "Invoice No", readOnly: true },
  { name: "totalNumberOfProducts", label: "Total Number of Products" },
  { name: "productSerialNo", label: "Product Serial No" },
  { name: "ritcNo", label: "RITC No", required: true },
  { name: "productDescription", label: "Product Description", type: "textarea", required: true },
  { name: "dutyRate", label: "Duty Rate", required: true },
  { name: "schemeType", label: "Scheme Type", type: "select", required: true, options: importMasterData.schemeTypes },
  { name: "quantity", label: "Quantity", required: true },
  { name: "unit", label: "Unit", type: "select", required: true, options: importMasterData.uoms },
  { name: "unitPrice", label: "Unit Price", required: true },
  { name: "endUse", label: "End Use", required: true },
  { name: "countryOfOrigin", label: "Country of Origin", type: "select", required: true, options: importMasterData.countries },
  { name: "cthNo", label: "CTH No", required: true },
  { name: "cethNo", label: "CETH No", required: true },
  { name: "schemeCode", label: "Scheme Code" },
  { name: "schemeNotification", label: "Scheme Notification" },
  { name: "notificationSerialNo", label: "Notification Serial No" },
  { name: "genericDescription", label: "Generic Description", type: "textarea", required: true },
  { name: "foc", label: "FOC", type: "checkbox" },
  { name: "squc", label: "SQUC", required: true },
  { name: "sqc", label: "SQC", required: true },
];

const otherFields: LabFieldConfig<keyof ItemFormValues & string>[] = [
  { name: "otherDuty", label: "Other Duty" },
  { name: "rsp", label: "RSP" },
  { name: "tariff", label: "Tariff" },
  { name: "antiDumping", label: "Anti-Dumping" },
  { name: "manufacturer", label: "Manufacturer" },
  { name: "reImport", label: "Re-Import" },
  { name: "licence", label: "Licence" },
  { name: "ftaDetails", label: "FTA Details" },
  { name: "singleWindow", label: "Single Window" },
  { name: "sez", label: "SEZ" },
];

function emptyItem(jobNo = ""): ItemFormValues {
  return {
    jobNo,
    invoiceId: "",
    invoiceSerialNo: "",
    invoiceNo: "",
    totalNumberOfProducts: "",
    productSerialNo: "",
    ritcNo: "",
    productDescription: "",
    dutyRate: "",
    schemeType: "",
    quantity: "",
    unit: "",
    unitPrice: "",
    endUse: "",
    countryOfOrigin: "",
    cthNo: "",
    cethNo: "",
    schemeCode: "",
    schemeNotification: "",
    notificationSerialNo: "",
    genericDescription: "",
    foc: false,
    squc: "",
    sqc: "",
    duties: createEmptyDutyRows(),
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
  };
}

export function ItemDetailsTab() {
  const { dispatch, draft, isLocked } = useImportJobDraft();
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const form = useForm<ItemFormValues>({
    defaultValues: emptyItem(draft.mainDetails.jobNo),
    resolver: zodResolver(importItemRecordSchema) as never,
  });
  const values = useWatch({ control: form.control }) as ItemFormValues;
  const errors = flattenFormErrors(form.formState.errors);
  const linkedInvoice = draft.invoiceRecords.find((invoice) => invoice.id === values.invoiceId);
  const calculated = demoImportCalculationEngine.calculateItem({ ...values, id: editingId ?? "editor", serialNo: 0 }, linkedInvoice);
  const complianceRules = getComplianceRulesForRitc(values.ritcNo);

  function update(name: string, value: string | boolean) {
    form.setValue(name as never, value as never, { shouldDirty: true, shouldValidate: true });
  }

  function selectInvoice(invoiceId: string) {
    const invoice = draft.invoiceRecords.find((candidate) => candidate.id === invoiceId);
    form.setValue("invoiceId", invoiceId, { shouldDirty: true, shouldValidate: true });
    form.setValue("invoiceSerialNo", invoice?.serialNo ?? "", { shouldDirty: true });
    form.setValue("invoiceNo", invoice?.invoiceNo ?? "", { shouldDirty: true });
  }

  async function save() {
    const isValid = await form.trigger();
    if (!isValid) return;
    const existing = draft.itemRecords.find((record) => record.id === editingId);
    dispatch({
      type: "upsert-item",
      record: {
        ...form.getValues(),
        id: editingId ?? createStableId("item"),
        serialNo: existing?.serialNo ?? draft.itemRecords.length + 1,
      },
    });
    setEditingId(null);
    form.reset(emptyItem(draft.mainDetails.jobNo));
  }

  return (
    <div className="space-y-5">
      <WorkspaceAlert variant="warning">
        Test calculation - verify against statutory customs rules. Manual duty overrides are supported only for lab inspection.
      </WorkspaceAlert>
      <ImportFormSection
        title="Item Fields"
        actions={
          <>
            <WorkspaceAction disabled={isLocked} size="compact" onClick={save}>Save</WorkspaceAction>
            <WorkspaceAction disabled={isLocked} size="compact" variant="outline" onClick={() => { setEditingId(null); form.reset(emptyItem(draft.mainDetails.jobNo)); }}>Clear Current Editor</WorkspaceAction>
          </>
        }
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="mnx-field">
            <span>Invoice Serial No *</span>
            <WorkspaceSelect disabled={isLocked} value={values.invoiceId} onChange={(event) => selectInvoice(event.currentTarget.value)}>
              <option value="">Select invoice</option>
              {draft.invoiceRecords.map((invoice) => (
                <option key={invoice.id} value={invoice.id}>
                  {invoice.serialNo} - {invoice.invoiceNo}
                </option>
              ))}
            </WorkspaceSelect>
            {errors.invoiceId ? <p className="mnx-text-danger">{errors.invoiceId}</p> : null}
          </label>
        </div>
        <FieldGrid disabled={isLocked} errors={errors} fields={itemFields} values={values as unknown as Record<string, unknown>} onChange={update} />
        <div className="grid gap-3 md:grid-cols-2">
          <strong>Amount FC: {formatDecimal(calculated.amountFc)}</strong>
          <strong>Amount INR: {formatDecimal(calculated.amountInr)}</strong>
        </div>
      </ImportFormSection>
      <ImportFormSection title="Duty Rows">
        <WorkspaceTable>
          <thead>
            <tr>
              <th>Duty</th>
              <th>Notification</th>
              <th>Serial No</th>
              <th>Rate</th>
              <th>Amount</th>
              <th>UOM</th>
              <th>Flag</th>
              <th>Manual Override</th>
              <th>Duty Amount</th>
            </tr>
          </thead>
          <tbody>
            {values.duties.map((duty, index) => (
              <tr key={duty.key}>
                <td>{importDutyLabels[duty.key]}</td>
                <td><input className="mnx-field-control" disabled={isLocked} value={duty.notification} onChange={(event) => form.setValue(`duties.${index}.notification`, event.currentTarget.value, { shouldDirty: true })} /></td>
                <td><input className="mnx-field-control" disabled={isLocked} value={duty.serialNo} onChange={(event) => form.setValue(`duties.${index}.serialNo`, event.currentTarget.value, { shouldDirty: true })} /></td>
                <td><input className="mnx-field-control" disabled={isLocked} value={duty.rate} onChange={(event) => form.setValue(`duties.${index}.rate`, event.currentTarget.value, { shouldDirty: true })} /></td>
                <td><input className="mnx-field-control" disabled={isLocked} value={duty.amount} onChange={(event) => form.setValue(`duties.${index}.amount`, event.currentTarget.value, { shouldDirty: true })} /></td>
                <td><input className="mnx-field-control" disabled={isLocked} value={duty.uom} onChange={(event) => form.setValue(`duties.${index}.uom`, event.currentTarget.value, { shouldDirty: true })} /></td>
                <td><input className="mnx-field-control" disabled={isLocked} value={duty.flag} onChange={(event) => form.setValue(`duties.${index}.flag`, event.currentTarget.value, { shouldDirty: true })} /></td>
                <td><input checked={duty.manualOverride} disabled={isLocked} type="checkbox" onChange={(event) => form.setValue(`duties.${index}.manualOverride`, event.currentTarget.checked, { shouldDirty: true })} /></td>
                <td>{formatDecimal(calculated.duties[index]?.dutyAmount ?? 0)}</td>
              </tr>
            ))}
          </tbody>
        </WorkspaceTable>
        <strong>Total Duty: {formatDecimal(calculated.totalDuty)}</strong>
      </ImportFormSection>
      <ImportFormSection title="Compliance Panel">
        {complianceRules.length === 0 ? (
          <WorkspaceAlert variant="info">No local fixture compliance rule matched the selected RITC No.</WorkspaceAlert>
        ) : (
          <div className="space-y-3">
            {complianceRules.map((rule) => (
              <WorkspaceAlert key={rule.title} variant={rule.severity === "danger" ? "danger" : rule.severity === "warning" ? "warning" : "info"}>
                <strong>{rule.title}</strong> {rule.message}
              </WorkspaceAlert>
            ))}
          </div>
        )}
      </ImportFormSection>
      <ImportFormSection title="Other Details">
        <FieldGrid disabled={isLocked} errors={errors} fields={otherFields} values={values as unknown as Record<string, unknown>} onChange={update} />
      </ImportFormSection>
      <ImportFormSection title="Item Register">
        <ImportRecordTable
          disabled={isLocked}
          emptyMessage="No items saved yet."
          records={draft.itemRecords}
          columns={[
            { key: "serialNo", label: "Serial No", render: (record) => record.serialNo },
            { key: "ritcNo", label: "RITC No", render: (record) => record.ritcNo },
            { key: "description", label: "Description", render: (record) => record.productDescription },
            { key: "schemeType", label: "Scheme Type", render: (record) => record.schemeType },
            { key: "quantity", label: "Quantity", render: (record) => record.quantity },
            { key: "unit", label: "Unit", render: (record) => record.unit },
            { key: "unitPrice", label: "Unit Price", render: (record) => record.unitPrice },
            { key: "amount", label: "Amount", render: (record) => formatDecimal(demoImportCalculationEngine.calculateItem(record, draft.invoiceRecords.find((invoice) => invoice.id === record.invoiceId)).amountFc) },
            { key: "amountInr", label: "Amount INR", render: (record) => formatDecimal(demoImportCalculationEngine.calculateItem(record, draft.invoiceRecords.find((invoice) => invoice.id === record.invoiceId)).amountInr) },
          ]}
          onEdit={(record) => { setEditingId(record.id); form.reset(record); }}
          onDuplicate={(record) => dispatch({ type: "upsert-item", record: { ...record, id: createStableId("item"), serialNo: draft.itemRecords.length + 1 } })}
          onDelete={(record) => {
            const linkedChildren = draft.declarationRecords.filter((child) => child.itemId === record.id).length + draft.supportingDocumentRecords.filter((child) => child.itemId === record.id).length;
            const message = linkedChildren > 0
              ? `Delete this item? ${linkedChildren} linked declaration/document record(s) will become invalid in the lab.`
              : "Delete this item from the lab draft?";
            if (confirmDelete(message)) dispatch({ type: "delete-item", id: record.id });
          }}
        />
      </ImportFormSection>
    </div>
  );
}
