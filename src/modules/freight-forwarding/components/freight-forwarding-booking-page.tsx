"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { ButtonLink } from "@/components/ui/button";
import { DocumentDropzoneField } from "@/components/forms/file-upload/document-dropzone-field";
import {
  WorkspaceAction,
  WorkspaceField,
  WorkspaceInput,
  WorkspacePage,
  WorkspacePageHeader,
  WorkspacePanel,
  WorkspacePanelHeader,
  WorkspaceSectionHeading,
  WorkspaceSelect,
  WorkspaceTextarea,
} from "@/components/layout/workspace";
import {
  createInitialFreightBookingPayload,
  type FreightBookingFormData,
  type FreightBookingReferenceData,
  type FreightContainerRow,
  type FreightTransactionType,
} from "@/modules/freight-forwarding/booking-shared";
import {
  freightForwardingBlTypes,
  freightForwardingCargoTypes,
  freightForwardingContainerTypes,
  freightForwardingCountries,
  freightForwardingEquipmentTypes,
  freightForwardingFreightTerms,
  freightForwardingIncoterms,
  freightForwardingLinerNames,
  freightForwardingPorts,
  freightForwardingServiceTypes,
  freightForwardingSurrenderStatuses,
  freightForwardingVoyageTypes,
} from "@/modules/freight-forwarding/booking-reference";

type LookupOption = {
  value: string;
  label: string;
};

export type FreightForwardingBookingDraft = FreightBookingFormData;
export type FreightForwardingBookingContainerRow = FreightContainerRow;

type FreightForwardingBookingPageProps = {
  closeHref?: string;
  embedded?: boolean;
  activeDocumentTab: FreightTransactionType;
  hideSectionHeading?: boolean;
  hideStandaloneHeader?: boolean;
  initialContainers?: FreightForwardingBookingContainerRow[];
  initialDraft?: FreightForwardingBookingDraft;
  initialEquipmentTypes?: string[];
  onContainersChange?: (containers: FreightForwardingBookingContainerRow[]) => void;
  onDraftChange?: (draft: FreightForwardingBookingDraft) => void;
  onEquipmentTypesChange?: (equipmentTypes: string[]) => void;
  onSave?: (input: {
    accountId: string | null;
    containers: FreightForwardingBookingContainerRow[];
    equipmentTypes: string[];
    formData: FreightForwardingBookingDraft;
  }) => Promise<{ ok: boolean; error?: string }>;
  reference: FreightBookingReferenceData;
  saveButtonLabel?: string;
  showSaveAction?: boolean;
};

function createContainerRow(): FreightForwardingBookingContainerRow {
  return createInitialFreightBookingPayload("MBL").containers[0];
}

function buildDataListId(prefix: string) {
  return `${prefix}-suggestions`;
}

export function FreightForwardingBookingPage({
  activeDocumentTab,
  closeHref,
  embedded = false,
  hideSectionHeading = false,
  hideStandaloneHeader = false,
  initialContainers,
  initialDraft,
  initialEquipmentTypes,
  onContainersChange,
  onDraftChange,
  onEquipmentTypesChange,
  onSave,
  reference,
  saveButtonLabel = "Save",
  showSaveAction = true,
}: FreightForwardingBookingPageProps) {
  const initialContainerSeed = useMemo(
    () =>
      initialContainers && initialContainers.length > 0
        ? initialContainers
        : [createContainerRow()],
    [initialContainers],
  );
  const initialEquipmentSeed = useMemo(
    () =>
      initialEquipmentTypes && initialEquipmentTypes.length > 0
        ? initialEquipmentTypes
        : ["FCL"],
    [initialEquipmentTypes],
  );
  const seededDraft = useMemo(
    () => ({
      ...createInitialFreightBookingPayload(activeDocumentTab).formData,
      ...(initialDraft || createInitialFreightBookingPayload(activeDocumentTab).formData),
      blType:
        initialDraft?.blType ||
        (activeDocumentTab === "MBL" ? "MASTER_BL" : "HOUSE_BL"),
    }),
    [activeDocumentTab, initialDraft],
  );
  const [draft, setDraft] = useState<FreightForwardingBookingDraft>({
    ...seededDraft,
  });
  const [equipmentTypes, setEquipmentTypes] = useState<string[]>(initialEquipmentSeed);
  const [nextEquipmentType, setNextEquipmentType] = useState("FCL");
  const [containers, setContainers] = useState<FreightForwardingBookingContainerRow[]>(
    initialContainerSeed,
  );
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();

  const portOptions = useMemo(
    () =>
      Array.from(
        new Map(
          [...reference.ports, ...freightForwardingPorts].map((option) => [
            option.value.toLowerCase(),
            option,
          ]),
        ).values(),
      ),
    [reference.ports],
  );

  const countryOptions = useMemo(
    () =>
      Array.from(
        new Map(
          [...reference.countries, ...freightForwardingCountries].map((option) => [
            option.value.toLowerCase(),
            option,
          ]),
        ).values(),
      ),
    [reference.countries],
  );

  const activeBlLabel = activeDocumentTab === "MBL" ? "Master BL Number" : "House BL Number";
  const linkedBlLabel = activeDocumentTab === "MBL" ? "Liner BL Number" : "Master BL Link";
  const initialSignature = useMemo(
    () =>
      JSON.stringify({
        containers: initialContainerSeed,
        draft: seededDraft,
        equipmentTypes: initialEquipmentSeed,
      }),
    [initialContainerSeed, initialEquipmentSeed, seededDraft],
  );
  const currentSignature = JSON.stringify({
    containers,
    draft,
    equipmentTypes,
  });
  const hasUnsavedChanges = currentSignature !== initialSignature;

  function updateDraft<K extends keyof FreightForwardingBookingDraft>(
    field: K,
    value: FreightForwardingBookingDraft[K],
  ) {
    setDraft((current) => {
      const next = { ...current, [field]: value };
      onDraftChange?.(next);
      return next;
    });
  }

  function addEquipmentType() {
    if (equipmentTypes.includes(nextEquipmentType)) return;
    setEquipmentTypes((current) => {
      const next = [...current, nextEquipmentType];
      onEquipmentTypesChange?.(next);
      return next;
    });
  }

  function addContainerRow() {
    setContainers((current) => {
      const next = [...current, createContainerRow()];
      onContainersChange?.(next);
      return next;
    });
  }

  function updateContainerRow(
    id: string,
    field: keyof FreightForwardingBookingContainerRow,
    value: string | boolean,
  ) {
    setContainers((current) => {
        const next = current.map((row) =>
          row.id === id
            ? {
                ...row,
                [field]: value,
              }
            : row,
        );
        onContainersChange?.(next);
        return next;
      });
  }

  function removeContainerRow(id: string) {
    setContainers((current) => {
      const next = current.length === 1 ? current : current.filter((row) => row.id !== id);
      onContainersChange?.(next);
      return next;
    });
  }

  function handleSave() {
    if (!onSave) return;

    startSaving(async () => {
      const result = await onSave({
        accountId: draft.bookingPartyId || null,
        containers,
        equipmentTypes,
        formData: draft,
      });

      if (result.ok) {
        setSaveMessage(`Saved ${activeDocumentTab} transaction`);
        toast.success(`${activeDocumentTab} transaction saved.`);
      } else {
        setSaveMessage(result.error || "Save failed");
        toast.error(result.error || "Failed to save transaction.");
      }
    });
  }

  const pageClassName = embedded
    ? "ff-booking-page ff-booking-page-embedded"
    : "ff-booking-page";
  const contentClassName = embedded
    ? "ff-booking-content ff-booking-content-embedded"
    : "ff-booking-content";

  return (
    <WorkspacePage className={pageClassName}>
      {embedded ? (
        <WorkspacePanel>
          <WorkspacePanelHeader
            eyebrow="Freight forwarding"
            title={`${activeDocumentTab} transaction`}
            description={
              hasUnsavedChanges
                ? "Unsaved changes are present. Save to sync this view with the shared transaction record."
                : "This form edits the shared transaction record used by Workspace Home and the sidebar transaction tab."
            }
            actions={
              showSaveAction ? (
                <div className="ff-booking-header-actions">
                  {saveMessage ? <span className="text-sm text-[var(--mn-text-muted)]">{saveMessage}</span> : null}
                  <WorkspaceAction
                    type="button"
                    variant={hasUnsavedChanges ? "primary" : "secondary"}
                    disabled={!onSave || isSaving}
                    onClick={handleSave}
                  >
                    {isSaving ? "Saving..." : saveButtonLabel}
                  </WorkspaceAction>
                </div>
              ) : undefined
            }
          />
        </WorkspacePanel>
      ) : (
        !hideStandaloneHeader ? (
          <WorkspacePageHeader
            eyebrow="Freight forwarding"
            title="Create Booking"
            description="Create an MBL or HBL booking with the same shipment, voyage, party, and container sections shown in the booking reference."
            actions={
              <div className="ff-booking-header-actions">
                {closeHref ? (
                  <ButtonLink href={closeHref} variant="inverse">
                    Close
                  </ButtonLink>
                ) : null}
                {showSaveAction ? (
                  <WorkspaceAction
                    type="button"
                    disabled={!onSave || isSaving}
                    onClick={handleSave}
                  >
                    {isSaving ? "Saving..." : saveButtonLabel}
                  </WorkspaceAction>
                ) : null}
              </div>
            }
          />
        ) : null
      )}

      <div className={contentClassName}>
        {!hideSectionHeading ? (
          <WorkspaceSectionHeading
            index="01"
            title={`${activeDocumentTab} Shipment Details`}
            description={`Use current customers, users, branches, and enquiry references from the system to seed the ${activeDocumentTab} booking form.`}
          />
        ) : null}

          <WorkspacePanel>
            <WorkspacePanelHeader
              eyebrow="Shipment details"
              title="Booking party, routing, and equipment"
              description="Capture the primary customer, operating owner, equipment mode, and opening routing information for this booking."
            />
            <div className="ff-booking-grid ff-booking-grid-top">
              <WorkspaceField label="Booking Party" htmlFor="ff-booking-party">
                <WorkspaceSelect
                  id="ff-booking-party"
                  value={draft.bookingPartyId}
                  onChange={(event) => updateDraft("bookingPartyId", event.currentTarget.value)}
                >
                  <option value="">Select booking party</option>
                  {reference.bookingParties.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </WorkspaceSelect>
              </WorkspaceField>

              <WorkspaceField label="Sales Person" htmlFor="ff-sales-person">
                <WorkspaceSelect
                  id="ff-sales-person"
                  value={draft.salespersonId}
                  onChange={(event) => updateDraft("salespersonId", event.currentTarget.value)}
                >
                  <option value="">Select salesperson</option>
                  {reference.users.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </WorkspaceSelect>
              </WorkspaceField>

              <WorkspaceField
                className="ff-booking-equipment-field"
                label="Equipment Type"
                htmlFor="ff-equipment-type"
              >
                <div className="ff-inline-action-row">
                  <WorkspaceSelect
                    id="ff-equipment-type"
                    value={nextEquipmentType}
                    onChange={(event) => setNextEquipmentType(event.currentTarget.value)}
                  >
                    {freightForwardingEquipmentTypes.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </WorkspaceSelect>
                  <WorkspaceAction type="button" variant="secondary" onClick={addEquipmentType}>
                    <Plus size={16} aria-hidden="true" />
                    Add
                  </WorkspaceAction>
                </div>
              </WorkspaceField>
            </div>

            <div className="ff-booking-route-grid">
              <SuggestionField
                id="ff-origin"
                label="Origin"
                value={draft.origin}
                options={countryOptions}
                onChange={(value) => updateDraft("origin", value)}
              />
              <SuggestionField
                id="ff-port-load"
                label="Port of Load"
                required
                value={draft.portOfLoad}
                options={portOptions}
                onChange={(value) => updateDraft("portOfLoad", value)}
              />
              <SuggestionField
                id="ff-port-discharge"
                label="Port of Discharge"
                required
                value={draft.portOfDischarge}
                options={portOptions}
                onChange={(value) => updateDraft("portOfDischarge", value)}
              />
              <SuggestionField
                id="ff-final-destination"
                label="Final Destination"
                value={draft.finalDestination}
                options={countryOptions}
                onChange={(value) => updateDraft("finalDestination", value)}
              />
            </div>
          </WorkspacePanel>

          <div className="ff-booking-two-column">
            <WorkspacePanel>
              <WorkspacePanelHeader
                eyebrow="Liner details"
                title={`${activeDocumentTab} document and carrier references`}
                description="The BL type defaults with the selected side tab and the linked bill field changes with it."
              />
              <div className="ff-booking-grid">
                <WorkspaceField label={activeBlLabel} htmlFor="ff-bl-number">
                  <WorkspaceInput
                    id="ff-bl-number"
                    value={draft.blNumber}
                    onChange={(event) => updateDraft("blNumber", event.currentTarget.value)}
                    placeholder={`Enter ${activeBlLabel.toLowerCase()}`}
                  />
                </WorkspaceField>
                <WorkspaceField label="Liner Booking" htmlFor="ff-liner-booking">
                  <WorkspaceInput
                    id="ff-liner-booking"
                    value={draft.linerBooking}
                    onChange={(event) => updateDraft("linerBooking", event.currentTarget.value)}
                  />
                </WorkspaceField>
                <WorkspaceField label={linkedBlLabel} htmlFor="ff-linked-bl">
                  <WorkspaceInput
                    id="ff-linked-bl"
                    value={draft.linerBlNumber}
                    onChange={(event) => updateDraft("linerBlNumber", event.currentTarget.value)}
                  />
                </WorkspaceField>
                <WorkspaceField label="BL Type" htmlFor="ff-bl-type">
                  <WorkspaceSelect
                    id="ff-bl-type"
                    value={draft.blType}
                    onChange={(event) => updateDraft("blType", event.currentTarget.value)}
                  >
                    {freightForwardingBlTypes.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </WorkspaceSelect>
                </WorkspaceField>
                <WorkspaceField label="Service Type" htmlFor="ff-service-type" required>
                  <WorkspaceSelect
                    id="ff-service-type"
                    value={draft.serviceType}
                    onChange={(event) => updateDraft("serviceType", event.currentTarget.value)}
                  >
                    {freightForwardingServiceTypes.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </WorkspaceSelect>
                </WorkspaceField>
                <WorkspaceField label={activeDocumentTab === "MBL" ? "Master BL Number" : "Parent MBL Number"} htmlFor="ff-master-bl">
                  <WorkspaceInput
                    id="ff-master-bl"
                    value={draft.masterBlNumber}
                    onChange={(event) => updateDraft("masterBlNumber", event.currentTarget.value)}
                  />
                </WorkspaceField>
              </div>
            </WorkspacePanel>

            <WorkspacePanel>
              <WorkspacePanelHeader
                eyebrow="Other information"
                title="Free days and operating notes"
                description="Keep destination and origin detention context next to the booking."
              />
              <div className="ff-booking-grid ff-booking-grid-narrow">
                <WorkspaceField label="Notes" htmlFor="ff-booking-notes">
                  <WorkspaceTextarea
                    id="ff-booking-notes"
                    rows={4}
                    value={draft.notes}
                    onChange={(event) => updateDraft("notes", event.currentTarget.value)}
                  />
                </WorkspaceField>
                <WorkspaceField label="Free Days at Origin" htmlFor="ff-free-days-origin">
                  <WorkspaceInput
                    id="ff-free-days-origin"
                    type="number"
                    min="0"
                    value={draft.freeDaysOrigin}
                    onChange={(event) => updateDraft("freeDaysOrigin", event.currentTarget.value)}
                  />
                </WorkspaceField>
                <WorkspaceField label="Free Days at Destination" htmlFor="ff-free-days-destination">
                  <WorkspaceInput
                    id="ff-free-days-destination"
                    type="number"
                    min="0"
                    value={draft.freeDaysDestination}
                    onChange={(event) => updateDraft("freeDaysDestination", event.currentTarget.value)}
                  />
                </WorkspaceField>
              </div>
            </WorkspacePanel>
          </div>

          <WorkspacePanel>
            <WorkspacePanelHeader
              eyebrow="Voyage details"
              title="Carrier, vessel, voyage, and freight timing"
              description="Voyage and freight term dropdowns are pre-seeded with common ocean-freight references and still allow route-specific free text where needed."
            />
            <div className="ff-booking-grid">
              <WorkspaceField label="Customs Voyage Type" htmlFor="ff-customs-voyage-type" required>
                <WorkspaceSelect
                  id="ff-customs-voyage-type"
                  value={draft.customsVoyageType}
                  onChange={(event) => updateDraft("customsVoyageType", event.currentTarget.value)}
                >
                  {freightForwardingVoyageTypes.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </WorkspaceSelect>
              </WorkspaceField>
              <WorkspaceField label="Customs Voyage" htmlFor="ff-customs-voyage" required>
                <WorkspaceInput
                  id="ff-customs-voyage"
                  value={draft.customsVoyage}
                  onChange={(event) => updateDraft("customsVoyage", event.currentTarget.value)}
                />
              </WorkspaceField>
              <WorkspaceField label="Transshipment Voyage" htmlFor="ff-transshipment-voyage">
                <WorkspaceInput
                  id="ff-transshipment-voyage"
                  value={draft.transshipmentVoyage}
                  onChange={(event) => updateDraft("transshipmentVoyage", event.currentTarget.value)}
                />
              </WorkspaceField>
              <WorkspaceField label="Transshipment Vessel" htmlFor="ff-transshipment-vessel">
                <WorkspaceInput
                  id="ff-transshipment-vessel"
                  value={draft.transshipmentVessel}
                  onChange={(event) => updateDraft("transshipmentVessel", event.currentTarget.value)}
                />
              </WorkspaceField>
              <WorkspaceField label="Liner Name" htmlFor="ff-liner-name" required>
                <WorkspaceSelect
                  id="ff-liner-name"
                  value={draft.linerName}
                  onChange={(event) => updateDraft("linerName", event.currentTarget.value)}
                >
                  <option value="">Select liner</option>
                  {freightForwardingLinerNames.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </WorkspaceSelect>
              </WorkspaceField>
              <WorkspaceField label="Liner Vessel" htmlFor="ff-liner-vessel" required>
                <WorkspaceInput
                  id="ff-liner-vessel"
                  value={draft.linerVessel}
                  onChange={(event) => updateDraft("linerVessel", event.currentTarget.value)}
                />
              </WorkspaceField>
              <WorkspaceField label="Liner Voyage" htmlFor="ff-liner-voyage" required>
                <WorkspaceInput
                  id="ff-liner-voyage"
                  value={draft.linerVoyage}
                  onChange={(event) => updateDraft("linerVoyage", event.currentTarget.value)}
                />
              </WorkspaceField>
              <WorkspaceField label="ETA" htmlFor="ff-eta" required>
                <WorkspaceInput
                  id="ff-eta"
                  type="date"
                  value={draft.eta}
                  onChange={(event) => updateDraft("eta", event.currentTarget.value)}
                />
              </WorkspaceField>
              <WorkspaceField label="ETD" htmlFor="ff-etd" required>
                <WorkspaceInput
                  id="ff-etd"
                  type="date"
                  value={draft.etd}
                  onChange={(event) => updateDraft("etd", event.currentTarget.value)}
                />
              </WorkspaceField>
              <WorkspaceField label="Import Vessel" htmlFor="ff-import-vessel">
                <WorkspaceInput
                  id="ff-import-vessel"
                  value={draft.importVessel}
                  onChange={(event) => updateDraft("importVessel", event.currentTarget.value)}
                />
              </WorkspaceField>
              <WorkspaceField label="Import Voyage" htmlFor="ff-import-voyage">
                <WorkspaceInput
                  id="ff-import-voyage"
                  value={draft.importVoyage}
                  onChange={(event) => updateDraft("importVoyage", event.currentTarget.value)}
                />
              </WorkspaceField>
              <WorkspaceField label="Freight Term" htmlFor="ff-freight-term" required>
                <WorkspaceSelect
                  id="ff-freight-term"
                  value={draft.freightTerm}
                  onChange={(event) => updateDraft("freightTerm", event.currentTarget.value)}
                >
                  {freightForwardingFreightTerms.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </WorkspaceSelect>
              </WorkspaceField>
            </div>
          </WorkspacePanel>

          <WorkspacePanel>
            <WorkspacePanelHeader
              eyebrow="Additional information"
              title="Cargo handling and internal routing"
              description="This section uses live users and enquiry references from the current organisation."
            />
            <div className="ff-booking-grid">
              <WorkspaceField label="Cargo" htmlFor="ff-cargo">
                <WorkspaceSelect id="ff-cargo" value={draft.cargo} onChange={(event) => updateDraft("cargo", event.currentTarget.value)}>
                  {freightForwardingCargoTypes.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </WorkspaceSelect>
              </WorkspaceField>
              <WorkspaceField label="Surrender Status" htmlFor="ff-surrender-status" required>
                <WorkspaceSelect
                  id="ff-surrender-status"
                  value={draft.surrenderStatus}
                  onChange={(event) => updateDraft("surrenderStatus", event.currentTarget.value)}
                >
                  {freightForwardingSurrenderStatuses.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </WorkspaceSelect>
              </WorkspaceField>
              <WorkspaceField label="Term" htmlFor="ff-term">
                <WorkspaceSelect id="ff-term" value={draft.term} onChange={(event) => updateDraft("term", event.currentTarget.value)}>
                  {freightForwardingIncoterms.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </WorkspaceSelect>
              </WorkspaceField>
              <WorkspaceField label="CS Person" htmlFor="ff-cs-person">
                <WorkspaceSelect
                  id="ff-cs-person"
                  value={draft.csPersonId}
                  onChange={(event) => updateDraft("csPersonId", event.currentTarget.value)}
                >
                  <option value="">Select customer service owner</option>
                  {reference.users.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </WorkspaceSelect>
              </WorkspaceField>
              <WorkspaceField label="Handled By" htmlFor="ff-handled-by">
                <WorkspaceSelect
                  id="ff-handled-by"
                  value={draft.handledById}
                  onChange={(event) => updateDraft("handledById", event.currentTarget.value)}
                >
                  <option value="">Select owner</option>
                  {reference.users.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </WorkspaceSelect>
              </WorkspaceField>
              <SuggestionField
                id="ff-depot"
                label="Depot"
                value={draft.depot}
                options={reference.branches}
                onChange={(value) => updateDraft("depot", value)}
              />
              <SuggestionField
                id="ff-terminal"
                label="Terminal"
                value={draft.terminal}
                options={reference.branches}
                onChange={(value) => updateDraft("terminal", value)}
              />
              <WorkspaceField label="Job Number" htmlFor="ff-job-number">
                <WorkspaceSelect
                  id="ff-job-number"
                  value={draft.jobNumber}
                  onChange={(event) => updateDraft("jobNumber", event.currentTarget.value)}
                >
                  <option value="">Select enquiry / job reference</option>
                  {reference.jobNumbers.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </WorkspaceSelect>
              </WorkspaceField>
            </div>
          </WorkspacePanel>

          <WorkspacePanel>
            <WorkspacePanelHeader
              eyebrow="Party details"
              title="Shipper, consignee, and notify party"
              description="This follows the party-layout from the reference PDF while keeping the fields editable for booking-specific wording."
            />
            <div className="ff-party-grid">
              <WorkspaceField label="Shipper" htmlFor="ff-shipper">
                <WorkspaceTextarea
                  id="ff-shipper"
                  rows={5}
                  value={draft.shipper}
                  onChange={(event) => updateDraft("shipper", event.currentTarget.value)}
                  placeholder="Add shipper name, address, contact, and GST / tax details"
                />
              </WorkspaceField>
              <WorkspaceField label="Consignee" htmlFor="ff-consignee">
                <WorkspaceTextarea
                  id="ff-consignee"
                  rows={5}
                  value={draft.consignee}
                  onChange={(event) => updateDraft("consignee", event.currentTarget.value)}
                  placeholder="Add consignee details"
                />
              </WorkspaceField>
              <WorkspaceField label="Notify 1" htmlFor="ff-notify">
                <WorkspaceTextarea
                  id="ff-notify"
                  rows={5}
                  value={draft.notifyParty}
                  onChange={(event) => updateDraft("notifyParty", event.currentTarget.value)}
                  placeholder="Add notify party details"
                />
              </WorkspaceField>
            </div>
          </WorkspacePanel>

          <WorkspacePanel>
            <WorkspacePanelHeader
              eyebrow="Agent details"
              title="Booking and destination agents"
              description="Branch-backed defaults from the organisation are available here so the booking page can reuse existing office records."
            />
            <div className="ff-booking-grid ff-booking-grid-two">
              <WorkspaceField label="Booking Agent" htmlFor="ff-booking-agent">
                <WorkspaceSelect
                  id="ff-booking-agent"
                  value={draft.bookingAgentId}
                  onChange={(event) => updateDraft("bookingAgentId", event.currentTarget.value)}
                >
                  <option value="">Select booking agent</option>
                  {reference.branches.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </WorkspaceSelect>
              </WorkspaceField>
              <WorkspaceField label="Destination Agent" htmlFor="ff-destination-agent">
                <WorkspaceSelect
                  id="ff-destination-agent"
                  value={draft.destinationAgentId}
                  onChange={(event) => updateDraft("destinationAgentId", event.currentTarget.value)}
                >
                  <option value="">Select destination agent</option>
                  {reference.branches.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </WorkspaceSelect>
              </WorkspaceField>
            </div>
          </WorkspacePanel>

          <WorkspacePanel>
            <WorkspacePanelHeader
              eyebrow="Cargo narrative"
              title="Description, marks, and comments"
              description="Long-form cargo and documentation notes stay separate from the internal notes block."
            />
            <div className="ff-party-grid">
              <WorkspaceField label="Cargo Description" htmlFor="ff-cargo-description">
                <WorkspaceTextarea
                  id="ff-cargo-description"
                  rows={5}
                  value={draft.cargoDescription}
                  onChange={(event) => updateDraft("cargoDescription", event.currentTarget.value)}
                />
              </WorkspaceField>
              <WorkspaceField label="Marks and Numbers" htmlFor="ff-marks">
                <WorkspaceTextarea
                  id="ff-marks"
                  rows={5}
                  value={draft.marksAndNumbers}
                  onChange={(event) => updateDraft("marksAndNumbers", event.currentTarget.value)}
                />
              </WorkspaceField>
              <WorkspaceField label="Comments" htmlFor="ff-comments">
                <WorkspaceTextarea
                  id="ff-comments"
                  rows={5}
                  value={draft.comments}
                  onChange={(event) => updateDraft("comments", event.currentTarget.value)}
                />
              </WorkspaceField>
            </div>
          </WorkspacePanel>

          <WorkspacePanel>
            <WorkspacePanelHeader
              eyebrow="Container and cargo information"
              title="Container planning table"
              description="Add one or more container lines for the booking. Container type values are seeded from common ocean-equipment references."
              actions={
                <WorkspaceAction type="button" variant="secondary" onClick={addContainerRow}>
                  <Plus size={16} aria-hidden="true" />
                  Add container
                </WorkspaceAction>
              }
            />
            <div className="ff-booking-table-shell">
              <table className="ff-booking-table">
                <thead>
                  <tr>
                    <th>Container No</th>
                    <th>Container Type</th>
                    <th>Harmonized Code</th>
                    <th>Hazardous</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {containers.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <WorkspaceInput
                          value={row.containerNo}
                          onChange={(event) => updateContainerRow(row.id, "containerNo", event.currentTarget.value)}
                          placeholder="MSCU1234567"
                        />
                      </td>
                      <td>
                        <WorkspaceSelect
                          value={row.containerType}
                          onChange={(event) => updateContainerRow(row.id, "containerType", event.currentTarget.value)}
                        >
                          {freightForwardingContainerTypes.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </WorkspaceSelect>
                      </td>
                      <td>
                        <WorkspaceInput
                          value={row.harmonizedCode}
                          onChange={(event) => updateContainerRow(row.id, "harmonizedCode", event.currentTarget.value)}
                          placeholder="HS / HSN code"
                        />
                      </td>
                      <td>
                        <label className="ff-hazardous-toggle">
                          <input
                            type="checkbox"
                            checked={row.hazardous}
                            onChange={(event) => updateContainerRow(row.id, "hazardous", event.currentTarget.checked)}
                          />
                          <span>{row.hazardous ? "Yes" : "No"}</span>
                        </label>
                      </td>
                      <td>
                        <WorkspaceAction type="button" variant="secondary" onClick={() => removeContainerRow(row.id)}>
                          Remove
                        </WorkspaceAction>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </WorkspacePanel>

          <div className="ff-booking-two-column">
            <WorkspacePanel>
              <WorkspacePanelHeader
                eyebrow="Attachment"
                title="Reference document"
                description="The live upload workflow is not wired yet, but the booking screen now reserves the same attachment block as the reference."
              />
              <div className="ff-booking-grid ff-booking-grid-narrow">
                <WorkspaceField label="Attachment name" htmlFor="ff-attachment-name">
                  <WorkspaceInput
                    id="ff-attachment-name"
                    value={draft.attachmentName}
                    onChange={(event) => updateDraft("attachmentName", event.currentTarget.value)}
                    placeholder="Commercial invoice, SI, packing list, etc."
                  />
                </WorkspaceField>
                <DocumentDropzoneField
                  id="ff-attachment"
                  className="ff-booking-attachment-dropzone"
                  title="Drop shipment documents"
                  description="Drag & drop, or click to browse"
                  maxFileText="PDF, DOCX, XLSX · Up to 25 MB"
                  onInputChange={(event) => {
                    setAttachmentFile(event.currentTarget.files?.[0] ?? null);
                  }}
                  onClear={() => setAttachmentFile(null)}
                  selectedFile={
                    attachmentFile
                      ? {
                          file: attachmentFile,
                          name: attachmentFile.name,
                          sizeBytes: attachmentFile.size,
                        }
                      : null
                  }
                />
              </div>
            </WorkspacePanel>

            <WorkspacePanel>
              <WorkspacePanelHeader
                eyebrow="Notes"
                title="Internal booking notes"
                description="Keep operational notes separate from customer-facing cargo comments."
              />
              <WorkspaceField label="Internal Notes" htmlFor="ff-internal-notes">
                <WorkspaceTextarea
                  id="ff-internal-notes"
                  rows={6}
                  value={draft.internalNotes}
                  onChange={(event) => updateDraft("internalNotes", event.currentTarget.value)}
                />
              </WorkspaceField>
            </WorkspacePanel>
          </div>
      </div>
    </WorkspacePage>
  );
}

function SuggestionField({
  id,
  label,
  onChange,
  options,
  required,
  value,
}: {
  id: string;
  label: string;
  onChange: (value: string) => void;
  options: LookupOption[];
  required?: boolean;
  value: string;
}) {
  const listId = buildDataListId(id);

  return (
    <WorkspaceField label={label} htmlFor={id} required={required}>
      <>
        <WorkspaceInput
          id={id}
          list={listId}
          value={value}
          onChange={(event) => onChange(event.currentTarget.value)}
        />
        <datalist id={listId}>
          {options.map((option) => (
            <option key={`${id}-${option.value}`} value={option.label} />
          ))}
        </datalist>
      </>
    </WorkspaceField>
  );
}
