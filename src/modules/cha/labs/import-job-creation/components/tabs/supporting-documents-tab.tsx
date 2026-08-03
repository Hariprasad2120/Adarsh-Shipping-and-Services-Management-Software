"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { WorkspaceAction, WorkspaceAlert, WorkspaceInput, WorkspaceSelect } from "@/components/monolith";
import { importSupportingDocumentRecordSchema } from "../../domain/import-job.schemas";
import type { ImportSupportingDocumentRecord } from "../../domain/import-job.types";
import { importMasterData } from "../../fixtures/import-master-data";
import { useImportJobDraft } from "../../state/import-job-draft-context";
import { FieldGrid, type LabFieldConfig, ImportFormSection } from "../import-form-section";
import { ImportRecordTable } from "../import-record-table";
import { confirmDelete, createStableId, flattenFormErrors } from "./tab-utils";

type DocumentFormValues = Omit<ImportSupportingDocumentRecord, "id" | "serialNo">;

const documentFields: LabFieldConfig<keyof DocumentFormValues & string>[] = [
  { name: "documentTypeCode", label: "Document Type Code", type: "select", required: true, options: importMasterData.documentTypes },
  { name: "irnNo", label: "IRN No", required: true },
  { name: "drnNo", label: "DRN No" },
  { name: "issueDate", label: "Issue Date", type: "date", required: true },
  { name: "declarationType", label: "Declaration Type", type: "select", options: importMasterData.declarationTypes },
  { name: "fileType", label: "File Type", type: "select", required: true, options: importMasterData.fileTypes },
  { name: "placeOfIssue", label: "Place of Issue", required: true },
  { name: "expiryDate", label: "Expiry Date", type: "date" },
  { name: "invoiceNo", label: "Invoice No" },
  { name: "icegateId", label: "ICEGATE ID" },
];

const issuingFields: LabFieldConfig<keyof DocumentFormValues & string>[] = [
  { name: "partyCode", label: "Party Code" },
  { name: "partyName", label: "Party Name", required: true },
  { name: "partyAddress", label: "Address", type: "textarea", required: true },
  { name: "partyCity", label: "City" },
  { name: "partyPin", label: "PIN" },
];

const beneficiaryFields: LabFieldConfig<keyof DocumentFormValues & string>[] = [
  { name: "beneficiaryCode", label: "Beneficiary Code" },
  { name: "beneficiaryName", label: "Beneficiary Name", required: true },
  { name: "beneficiaryAddress", label: "Address", type: "textarea", required: true },
  { name: "beneficiaryCity", label: "City" },
  { name: "beneficiaryPin", label: "PIN" },
];

function emptyDocument(): DocumentFormValues {
  return {
    documentTypeCode: "",
    irnNo: "",
    drnNo: "",
    issueDate: "",
    declarationType: "",
    fileType: "",
    placeOfIssue: "",
    invoiceId: "",
    invoiceSerialNo: "",
    itemId: "",
    itemSerialNo: "",
    expiryDate: "",
    invoiceNo: "",
    icegateId: "",
    attachmentName: "",
    attachmentSize: 0,
    attachmentType: "",
    partyCode: "",
    partyName: "",
    partyAddress: "",
    partyCity: "",
    partyPin: "",
    beneficiaryCode: "",
    beneficiaryName: "",
    beneficiaryAddress: "",
    beneficiaryCity: "",
    beneficiaryPin: "",
  };
}

export function SupportingDocumentsTab() {
  const { dispatch, draft, isLocked } = useImportJobDraft();
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState("");
  const form = useForm<DocumentFormValues>({
    defaultValues: emptyDocument(),
    resolver: zodResolver(importSupportingDocumentRecordSchema),
  });
  const values = useWatch({ control: form.control }) as DocumentFormValues;
  const errors = flattenFormErrors(form.formState.errors);

  function update(name: string, value: string | boolean) {
    form.setValue(name as never, value as never, { shouldDirty: true, shouldValidate: true });
  }

  function selectInvoice(invoiceId: string) {
    const invoice = draft.invoiceRecords.find((candidate) => candidate.id === invoiceId);
    form.setValue("invoiceId", invoiceId, { shouldDirty: true, shouldValidate: true });
    form.setValue("invoiceSerialNo", invoice?.serialNo ?? "", { shouldDirty: true });
    form.setValue("invoiceNo", invoice?.invoiceNo ?? "", { shouldDirty: true });
  }

  function selectItem(itemId: string) {
    const item = draft.itemRecords.find((candidate) => candidate.id === itemId);
    form.setValue("itemId", itemId, { shouldDirty: true, shouldValidate: true });
    form.setValue("itemSerialNo", item?.serialNo ?? "", { shouldDirty: true });
  }

  async function save() {
    const isValid = await form.trigger();
    if (!isValid) return;
    const existing = draft.supportingDocumentRecords.find((record) => record.id === editingId);
    dispatch({
      type: "upsert-document",
      record: {
        ...form.getValues(),
        id: editingId ?? createStableId("document"),
        serialNo: existing?.serialNo ?? draft.supportingDocumentRecords.length + 1,
      },
    });
    setEditingId(null);
    form.reset(emptyDocument());
  }

  return (
    <div className="space-y-5">
      {message ? <WorkspaceAlert variant="info">{message}</WorkspaceAlert> : null}
      <ImportFormSection
        title="Document Details"
        actions={
          <>
            <WorkspaceAction disabled={isLocked} size="compact" onClick={save}>Save</WorkspaceAction>
            <WorkspaceAction disabled={isLocked} size="compact" variant="outline" onClick={() => { setEditingId(null); form.reset(emptyDocument()); }}>Clear Current Editor</WorkspaceAction>
          </>
        }
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="mnx-field">
            <span>Invoice Serial No *</span>
            <WorkspaceSelect disabled={isLocked} value={values.invoiceId} onChange={(event) => selectInvoice(event.currentTarget.value)}>
              <option value="">Select invoice</option>
              {draft.invoiceRecords.map((invoice) => <option key={invoice.id} value={invoice.id}>{invoice.serialNo} - {invoice.invoiceNo}</option>)}
            </WorkspaceSelect>
            {errors.invoiceId ? <p className="mnx-text-danger">{errors.invoiceId}</p> : null}
          </label>
          <label className="mnx-field">
            <span>Item Serial No *</span>
            <WorkspaceSelect disabled={isLocked} value={values.itemId} onChange={(event) => selectItem(event.currentTarget.value)}>
              <option value="">Select item</option>
              {draft.itemRecords.map((item) => <option key={item.id} value={item.id}>{item.serialNo} - {item.ritcNo}</option>)}
            </WorkspaceSelect>
            {errors.itemId ? <p className="mnx-text-danger">{errors.itemId}</p> : null}
          </label>
          <label className="mnx-field">
            <span>Test file attachment</span>
            <WorkspaceInput
              disabled={isLocked}
              type="file"
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                if (!file) return;
                form.setValue("attachmentName", file.name, { shouldDirty: true });
                form.setValue("attachmentSize", file.size, { shouldDirty: true });
                form.setValue("attachmentType", file.type, { shouldDirty: true });
                setMessage("Attachment metadata stored locally for the lab. No CHA document upload was called.");
              }}
            />
          </label>
        </div>
        <FieldGrid disabled={isLocked} errors={errors} fields={documentFields} values={values as unknown as Record<string, unknown>} onChange={update} />
      </ImportFormSection>
      <ImportFormSection title="Issuing Party">
        <FieldGrid disabled={isLocked} errors={errors} fields={issuingFields} values={values as unknown as Record<string, unknown>} onChange={update} />
      </ImportFormSection>
      <ImportFormSection title="Beneficiary">
        <FieldGrid disabled={isLocked} errors={errors} fields={beneficiaryFields} values={values as unknown as Record<string, unknown>} onChange={update} />
      </ImportFormSection>
      <ImportFormSection title="Supporting Document Register">
        <ImportRecordTable
          disabled={isLocked}
          emptyMessage="No supporting documents saved yet."
          records={draft.supportingDocumentRecords}
          columns={[
            { key: "serialNo", label: "Serial No", render: (record) => record.serialNo },
            { key: "documentCode", label: "Document Code", render: (record) => record.documentTypeCode },
            { key: "irnNo", label: "IRN No", render: (record) => record.irnNo },
            { key: "drnNo", label: "DRN No", render: (record) => record.drnNo },
            { key: "issueDate", label: "Issue Date", render: (record) => record.issueDate },
            { key: "invoiceSerialNo", label: "Invoice Serial No", render: (record) => record.invoiceSerialNo },
            { key: "itemSerialNo", label: "Item Serial No", render: (record) => record.itemSerialNo },
            { key: "partyName", label: "Party Name", render: (record) => record.partyName },
            { key: "beneficiaryName", label: "Beneficiary Name", render: (record) => record.beneficiaryName },
            { key: "icegateId", label: "ICEGATE ID", render: (record) => record.icegateId },
          ]}
          onEdit={(record) => { setEditingId(record.id); form.reset(record); }}
          onDuplicate={(record) => dispatch({ type: "upsert-document", record: { ...record, id: createStableId("document"), serialNo: draft.supportingDocumentRecords.length + 1 } })}
          onDelete={(record) => {
            if (confirmDelete("Delete this supporting document from the lab draft?")) dispatch({ type: "delete-document", id: record.id });
          }}
        />
      </ImportFormSection>
    </div>
  );
}
