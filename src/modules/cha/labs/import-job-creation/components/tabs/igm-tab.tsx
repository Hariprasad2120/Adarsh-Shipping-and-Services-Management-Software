"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { Search } from "lucide-react";
import { WorkspaceAction, WorkspaceAlert } from "@/components/monolith";
import { importIgmRecordSchema } from "../../domain/import-job.schemas";
import type { ImportIgmRecord } from "../../domain/import-job.types";
import { importMasterData } from "../../fixtures/import-master-data";
import { useImportJobDraft } from "../../state/import-job-draft-context";
import { FieldGrid, type LabFieldConfig, ImportFormSection } from "../import-form-section";
import { ImportRecordTable } from "../import-record-table";
import { confirmDelete, createStableId, flattenFormErrors } from "./tab-utils";

const igmFields: LabFieldConfig<keyof Omit<ImportIgmRecord, "id" | "serialNo"> & string>[] = [
  { name: "igmNo", label: "IGM No", required: true },
  { name: "igmDate", label: "IGM Date", type: "date", required: true },
  { name: "inwardDate", label: "Inward Date", type: "date" },
  { name: "gatewayPort", label: "Gateway Port", type: "select", options: importMasterData.ports },
  { name: "gatewayMode", label: "Gateway Mode", type: "select", options: importMasterData.transportModes },
  { name: "mblNo", label: "MBL No", required: true },
  { name: "noMbl", label: "No MBL", type: "checkbox" },
  { name: "mblDate", label: "MBL Date", type: "date", required: true },
  { name: "numberOfPackages", label: "Number of Packages", required: true },
  { name: "packageCode", label: "Package Code", type: "select", required: true, options: importMasterData.packageCodes },
  { name: "twentyFtCount", label: "20 FT count" },
  { name: "fortyFtCount", label: "40 FT count" },
  { name: "hblNo", label: "HBL No" },
  { name: "hblDate", label: "HBL Date", type: "date" },
  { name: "grossWeight", label: "Gross Weight", required: true },
  { name: "netWeight", label: "Net Weight" },
  { name: "uom", label: "UOM", type: "select", required: true, options: importMasterData.uoms },
  { name: "marksAndNumbers", label: "Marks and Numbers", type: "textarea", required: true },
  { name: "section48", label: "Section 48", type: "checkbox" },
  { name: "section48Details", label: "Section 48 details", type: "textarea" },
  { name: "containerDetails", label: "Container Details", type: "textarea" },
];

function emptyIgm(): Omit<ImportIgmRecord, "id" | "serialNo"> {
  return {
    igmNo: "",
    igmDate: "",
    inwardDate: "",
    gatewayPort: "",
    gatewayMode: "",
    mblNo: "",
    noMbl: false,
    mblDate: "",
    numberOfPackages: "",
    packageCode: "",
    twentyFtCount: "",
    fortyFtCount: "",
    hblNo: "",
    hblDate: "",
    grossWeight: "",
    netWeight: "",
    uom: "",
    marksAndNumbers: "",
    section48: false,
    section48Details: "",
    containerDetails: "",
  };
}

export function IgmTab() {
  const { dispatch, draft, isLocked } = useImportJobDraft();
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [lookupMessage, setLookupMessage] = React.useState("");
  const form = useForm<Omit<ImportIgmRecord, "id" | "serialNo">>({
    defaultValues: emptyIgm(),
    resolver: zodResolver(importIgmRecordSchema),
  });
  const values = useWatch({ control: form.control }) as Omit<ImportIgmRecord, "id" | "serialNo">;
  const errors = flattenFormErrors(form.formState.errors);

  function update(name: string, value: string | boolean) {
    form.setValue(name as never, value as never, { shouldDirty: true, shouldValidate: true });
  }

  async function save() {
    const isValid = await form.trigger();
    if (!isValid) return;
    const existing = draft.igmRecords.find((record) => record.id === editingId);
    dispatch({
      type: "upsert-igm",
      record: {
        ...form.getValues(),
        id: editingId ?? createStableId("igm"),
        serialNo: existing?.serialNo ?? draft.igmRecords.length + 1,
      },
    });
    setEditingId(null);
    form.reset(emptyIgm());
  }

  function loadLookup() {
    const fixture = importMasterData.igmLookup[0];
    form.reset({ ...emptyIgm(), ...fixture });
    setLookupMessage("Test lookup loaded local fixture data. ICEGATE was not contacted.");
  }

  return (
    <div className="space-y-5">
      {lookupMessage ? <WorkspaceAlert variant="info">{lookupMessage}</WorkspaceAlert> : null}
      <ImportFormSection
        title="IGM Record Editor"
        actions={
          <>
            <WorkspaceAction disabled={isLocked} size="compact" variant="outline" onClick={loadLookup}>
              <Search aria-hidden="true" />
              Test lookup
            </WorkspaceAction>
            <WorkspaceAction disabled={isLocked} size="compact" onClick={save}>Save</WorkspaceAction>
            <WorkspaceAction disabled={isLocked} size="compact" variant="outline" onClick={() => { setEditingId(null); form.reset(emptyIgm()); }}>Clear Current Editor</WorkspaceAction>
          </>
        }
      >
        <FieldGrid disabled={isLocked} errors={errors} fields={igmFields} values={values} onChange={update} />
      </ImportFormSection>
      <ImportFormSection title="Saved IGM Records">
        <ImportRecordTable
          disabled={isLocked}
          emptyMessage="No IGM records saved yet."
          records={draft.igmRecords}
          columns={[
            { key: "serialNo", label: "Serial No", render: (record) => record.serialNo },
            { key: "igmNo", label: "IGM No", render: (record) => record.igmNo },
            { key: "igmDate", label: "IGM Date", render: (record) => record.igmDate },
            { key: "inwardDate", label: "Inward Date", render: (record) => record.inwardDate },
            { key: "mblNo", label: "MBL No", render: (record) => record.mblNo },
            { key: "mblDate", label: "MBL Date", render: (record) => record.mblDate },
            { key: "hblNo", label: "HBL No", render: (record) => record.hblNo },
            { key: "hblDate", label: "HBL Date", render: (record) => record.hblDate },
            { key: "packages", label: "Number of Packages", render: (record) => record.numberOfPackages },
            { key: "packageCode", label: "Package Code", render: (record) => record.packageCode },
            { key: "grossWeight", label: "Gross Weight", render: (record) => record.grossWeight },
            { key: "netWeight", label: "Net Weight", render: (record) => record.netWeight },
            { key: "uom", label: "UOM", render: (record) => record.uom },
          ]}
          onEdit={(record) => { setEditingId(record.id); form.reset(record); }}
          onDuplicate={(record) => dispatch({ type: "upsert-igm", record: { ...record, id: createStableId("igm"), serialNo: draft.igmRecords.length + 1 } })}
          onDelete={(record) => {
            if (confirmDelete("Delete this IGM record from the lab draft?")) {
              dispatch({ type: "delete-igm", id: record.id });
            }
          }}
        />
      </ImportFormSection>
    </div>
  );
}
