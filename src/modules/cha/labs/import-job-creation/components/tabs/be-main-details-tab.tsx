"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { WorkspaceAction } from "@/components/monolith";
import { importMainDetailsSchema } from "../../domain/import-job.schemas";
import type { ImportJobMainDetails } from "../../domain/import-job.types";
import { importMasterData } from "../../fixtures/import-master-data";
import { useImportJobDraft } from "../../state/import-job-draft-context";
import { FieldGrid, type LabFieldConfig, ImportFormSection } from "../import-form-section";
import { flattenFormErrors } from "./tab-utils";

const jobFields: LabFieldConfig<keyof ImportJobMainDetails & string>[] = [
  { name: "jobNo", label: "Job No" },
  { name: "jobDate", label: "Job Date", type: "date" },
  { name: "beType", label: "BE Type", type: "select", required: true, options: importMasterData.beTypes },
  { name: "transportMode", label: "Transport Mode", type: "select", required: true, options: importMasterData.transportModes },
  { name: "filingType", label: "Filing Type", type: "select", required: true, options: importMasterData.filingTypes },
  { name: "customsHouse", label: "Customs House", type: "select", required: true, options: importMasterData.customsHouses },
  { name: "customsHouseCode", label: "Customs House Code", required: true },
  { name: "warehouseCode", label: "Warehouse Code" },
  { name: "warehouseCustomsSiteId", label: "Warehouse Customs Site ID" },
  { name: "numberOfPackages", label: "Number of Packages" },
  { name: "packageCode", label: "Package Code", type: "select", options: importMasterData.packageCodes },
  { name: "grossWeight", label: "Gross Weight" },
  { name: "uom", label: "UOM", type: "select", options: importMasterData.uoms },
];

const beFields: LabFieldConfig<keyof ImportJobMainDetails & string>[] = [
  { name: "beNo", label: "BE No" },
  { name: "beDate", label: "BE Date", type: "date" },
  { name: "examinationDate", label: "Examination Date", type: "date" },
  { name: "oocDate", label: "OOC Date", type: "date" },
  { name: "dutyPaidDate", label: "Duty Paid Date", type: "date" },
  { name: "deliveredDate", label: "Delivered Date", type: "date" },
];

const chaFields: LabFieldConfig<keyof ImportJobMainDetails & string>[] = [
  { name: "icegateId", label: "ICEGATE ID", required: true },
  { name: "chaPanNo", label: "CHA PAN No" },
  { name: "atpName", label: "ATP Name" },
  { name: "atpPanNo", label: "ATP PAN No" },
];

const importerFields: LabFieldConfig<keyof ImportJobMainDetails & string>[] = [
  { name: "standardIec", label: "Standard IEC", required: true },
  { name: "importerName", label: "Importer Name", required: true },
  { name: "iecNo", label: "IEC No", required: true },
  { name: "branchSerialNo", label: "Branch Serial No", required: true },
  { name: "importerCategory", label: "Importer Category", type: "select", required: true, options: importMasterData.importerCategories },
  { name: "importerType", label: "Importer Type", type: "select", required: true, options: importMasterData.importerTypes },
  { name: "importerClass", label: "Importer Class", type: "select", required: true, options: importMasterData.importerClasses },
  { name: "address", label: "Address", type: "textarea" },
  { name: "city", label: "City" },
  { name: "state", label: "State" },
  { name: "pinCode", label: "PIN Code" },
  { name: "adCode", label: "AD Code", required: true },
  { name: "stateOfOrigin", label: "State of Origin", required: true },
  { name: "gstnType", label: "GSTN Type", type: "select", required: true, options: importMasterData.gstnTypes },
  { name: "taxRegistrationNo", label: "Tax Registration No" },
];

const assessmentFields: LabFieldConfig<keyof ImportJobMainDetails & string>[] = [
  { name: "firstCheck", label: "First Check", type: "checkbox" },
  { name: "greenChannel", label: "Green Channel", type: "checkbox" },
  { name: "kacchaBe", label: "Kaccha BE", type: "checkbox" },
  { name: "provisionalAssessment", label: "Provisional Assessment", type: "checkbox" },
  { name: "highSeaSale", label: "High Sea Sale", type: "checkbox" },
  { name: "exBond", label: "Ex-Bond", type: "checkbox" },
  { name: "ucrType", label: "UCR Type" },
  { name: "ucrNo", label: "UCR No" },
  { name: "paymentMethod", label: "Payment Method", type: "select", required: true, options: importMasterData.paymentMethods },
  { name: "bondDetails", label: "Bond Details", type: "textarea" },
  { name: "certificateDetails", label: "Certificate Details", type: "textarea" },
];

const shipmentFields: LabFieldConfig<keyof ImportJobMainDetails & string>[] = [
  { name: "portOfShipment", label: "Port of Shipment", type: "select", required: true, options: importMasterData.ports },
  { name: "portOfShipmentCode", label: "Port of Shipment Code" },
  { name: "countryOfShipment", label: "Country of Shipment", type: "select", required: true, options: importMasterData.countries },
  { name: "countryOfShipmentCode", label: "Country of Shipment Code" },
  { name: "portOfOrigin", label: "Port of Origin", type: "select", required: true, options: importMasterData.ports },
  { name: "portOfOriginCode", label: "Port of Origin Code" },
  { name: "countryOfOrigin", label: "Country of Origin", type: "select", required: true, options: importMasterData.countries },
  { name: "countryOfOriginCode", label: "Country of Origin Code" },
  { name: "otherDetails", label: "Other Details", type: "textarea" },
];

export function BeMainDetailsTab() {
  const { dispatch, draft, isLocked } = useImportJobDraft();
  const form = useForm<ImportJobMainDetails>({
    defaultValues: draft.mainDetails,
    resolver: zodResolver(importMainDetailsSchema),
  });
  const values = useWatch({ control: form.control }) as ImportJobMainDetails;
  const errors = flattenFormErrors(form.formState.errors);

  React.useEffect(() => {
    form.reset(draft.mainDetails);
  }, [draft.mainDetails, form]);

  function update(name: string, value: string | boolean) {
    form.setValue(name as never, value as never, { shouldDirty: true, shouldValidate: true });
  }

  async function save() {
    const isValid = await form.trigger();
    if (!isValid) return;
    dispatch({ type: "update-main-details", value: form.getValues() });
  }

  return (
    <div className="space-y-5">
      <ImportFormSection
        title="Job Details"
        actions={<WorkspaceAction disabled={isLocked} size="compact" onClick={save}>Save BE details</WorkspaceAction>}
      >
        <FieldGrid disabled={isLocked} errors={errors} fields={jobFields} values={values as unknown as Record<string, unknown>} onChange={update} />
      </ImportFormSection>
      <ImportFormSection title="BE Details">
        <FieldGrid disabled={isLocked} errors={errors} fields={beFields} values={values as unknown as Record<string, unknown>} onChange={update} />
      </ImportFormSection>
      <ImportFormSection title="CHA Details">
        <FieldGrid disabled={isLocked} errors={errors} fields={chaFields} values={values as unknown as Record<string, unknown>} onChange={update} />
      </ImportFormSection>
      <ImportFormSection title="Importer Details">
        <FieldGrid disabled={isLocked} errors={errors} fields={importerFields} values={values as unknown as Record<string, unknown>} onChange={update} />
      </ImportFormSection>
      <ImportFormSection title="Assessment and Process Options">
        <FieldGrid disabled={isLocked} errors={errors} fields={assessmentFields} values={values as unknown as Record<string, unknown>} onChange={update} />
      </ImportFormSection>
      <ImportFormSection title="Shipment Details">
        <FieldGrid disabled={isLocked} errors={errors} fields={shipmentFields} values={values as unknown as Record<string, unknown>} onChange={update} />
      </ImportFormSection>
    </div>
  );
}
