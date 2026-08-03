"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { Upload } from "lucide-react";
import { WorkspaceAction, WorkspaceAlert, WorkspaceSelect } from "@/components/monolith";
import { importDeclarationRecordSchema } from "../../domain/import-job.schemas";
import type { ImportDeclarationRecord } from "../../domain/import-job.types";
import { importMasterData } from "../../fixtures/import-master-data";
import { useImportJobDraft } from "../../state/import-job-draft-context";
import { FieldGrid, type LabFieldConfig, ImportFormSection } from "../import-form-section";
import { ImportRecordTable } from "../import-record-table";
import { confirmDelete, createStableId, flattenFormErrors } from "./tab-utils";

type DeclarationFormValues = Omit<ImportDeclarationRecord, "id" | "serialNo">;

const declarationFields: LabFieldConfig<keyof DeclarationFormValues & string>[] = [
  { name: "statementType", label: "Statement Type", type: "select", required: true, options: importMasterData.statementTypes },
  { name: "statementCode", label: "Statement Code", required: true },
  { name: "statementText", label: "Statement Text", type: "textarea" },
  { name: "declarationType", label: "Declaration Type", type: "select", required: true, options: importMasterData.declarationTypes },
  { name: "declarationNo", label: "Declaration No" },
  { name: "date", label: "Date", type: "date" },
];

function emptyDeclaration(): DeclarationFormValues {
  return {
    statementType: "",
    statementCode: "",
    statementText: "",
    declarationType: "",
    declarationNo: "",
    date: "",
    invoiceId: "",
    invoiceSerialNo: "",
    itemId: "",
    itemSerialNo: "",
  };
}

export function DeclarationTab() {
  const { dispatch, draft, isLocked } = useImportJobDraft();
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState("");
  const form = useForm<DeclarationFormValues>({
    defaultValues: emptyDeclaration(),
    resolver: zodResolver(importDeclarationRecordSchema),
  });
  const values = useWatch({ control: form.control }) as DeclarationFormValues;
  const errors = flattenFormErrors(form.formState.errors);

  function update(name: string, value: string | boolean) {
    form.setValue(name as never, value as never, { shouldDirty: true, shouldValidate: true });
  }

  function selectInvoice(invoiceId: string) {
    const invoice = draft.invoiceRecords.find((candidate) => candidate.id === invoiceId);
    form.setValue("invoiceId", invoiceId, { shouldDirty: true, shouldValidate: true });
    form.setValue("invoiceSerialNo", invoice?.serialNo ?? "", { shouldDirty: true });
  }

  function selectItem(itemId: string) {
    const item = draft.itemRecords.find((candidate) => candidate.id === itemId);
    form.setValue("itemId", itemId, { shouldDirty: true, shouldValidate: true });
    form.setValue("itemSerialNo", item?.serialNo ?? "", { shouldDirty: true });
  }

  async function save() {
    const isValid = await form.trigger();
    if (!isValid) return;
    const existing = draft.declarationRecords.find((record) => record.id === editingId);
    dispatch({
      type: "upsert-declaration",
      record: {
        ...form.getValues(),
        id: editingId ?? createStableId("declaration"),
        serialNo: existing?.serialNo ?? draft.declarationRecords.length + 1,
      },
    });
    setEditingId(null);
    form.reset(emptyDeclaration());
  }

  function addDefaultRow() {
    const fixture = importMasterData.defaultDeclarations[0];
    form.reset({
      ...emptyDeclaration(),
      ...fixture,
      date: draft.mainDetails.jobDate,
      invoiceId: draft.invoiceRecords[0]?.id ?? "",
      invoiceSerialNo: draft.invoiceRecords[0]?.serialNo ?? "",
      itemId: draft.itemRecords[0]?.id ?? "",
      itemSerialNo: draft.itemRecords[0]?.serialNo ?? "",
    });
  }

  return (
    <div className="space-y-5">
      {message ? <WorkspaceAlert variant="info">{message}</WorkspaceAlert> : null}
      <ImportFormSection
        title="Declaration Editor"
        actions={
          <>
            <WorkspaceAction disabled={isLocked} size="compact" variant="outline" onClick={() => setMessage("Test Upload captured declaration metadata only. No production upload was called.")}>
              <Upload aria-hidden="true" />
              Test Upload
            </WorkspaceAction>
            <WorkspaceAction disabled={isLocked} size="compact" variant="outline" onClick={addDefaultRow}>Add Default Row</WorkspaceAction>
            <WorkspaceAction disabled={isLocked} size="compact" variant="outline" onClick={() => { setEditingId(null); form.reset(emptyDeclaration()); }}>Clear Current Editor</WorkspaceAction>
            <WorkspaceAction disabled={isLocked} size="compact" onClick={save}>Save</WorkspaceAction>
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
        </div>
        <FieldGrid disabled={isLocked} errors={errors} fields={declarationFields} values={values as unknown as Record<string, unknown>} onChange={update} />
      </ImportFormSection>
      <ImportFormSection title="Declaration Register">
        <ImportRecordTable
          disabled={isLocked}
          emptyMessage="No declarations saved yet."
          records={draft.declarationRecords}
          columns={[
            { key: "serialNo", label: "Serial No", render: (record) => record.serialNo },
            { key: "statementType", label: "Statement Type", render: (record) => record.statementType },
            { key: "statementCode", label: "Statement Code", render: (record) => record.statementCode },
            { key: "statementText", label: "Statement Text", render: (record) => record.statementText },
            { key: "invoiceSerialNo", label: "Invoice Serial No", render: (record) => record.invoiceSerialNo },
            { key: "itemSerialNo", label: "Item Serial No", render: (record) => record.itemSerialNo },
          ]}
          onEdit={(record) => { setEditingId(record.id); form.reset(record); }}
          onDuplicate={(record) => dispatch({ type: "upsert-declaration", record: { ...record, id: createStableId("declaration"), serialNo: draft.declarationRecords.length + 1 } })}
          onDelete={(record) => {
            if (confirmDelete("Delete this declaration from the lab draft?")) dispatch({ type: "delete-declaration", id: record.id });
          }}
        />
      </ImportFormSection>
    </div>
  );
}
