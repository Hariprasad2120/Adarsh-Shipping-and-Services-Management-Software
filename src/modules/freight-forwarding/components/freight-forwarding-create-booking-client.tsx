"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Layers2 } from "lucide-react";
import { toast } from "sonner";
import { ButtonLink } from "@/components/ui/button";
import {
  WorkspaceAction,
  WorkspaceField,
  WorkspaceMetric,
  WorkspacePage,
  WorkspacePageHeader,
  WorkspacePanel,
  WorkspacePanelHeader,
  WorkspaceSectionHeading,
  WorkspaceSelect,
} from "@/components/layout/workspace";
import { actionCompleteQuoteFreightProcess } from "@/modules/crm/approval-actions";
import { createFreightBookingWithDetailsAction } from "@/modules/freight-forwarding/actions";
import {
  createInitialFreightBookingPayload,
  type FreightBookingCreationMode,
  type FreightBookingReferenceData,
} from "@/modules/freight-forwarding/booking-shared";
import {
  FreightForwardingBookingPage,
  type FreightForwardingBookingContainerRow,
  type FreightForwardingBookingDraft,
} from "@/modules/freight-forwarding/components/freight-forwarding-booking-page";

type FreightForwardingCreateBookingClientProps = {
  initialMode: FreightBookingCreationMode | null;
  initialMblDraft?: ReturnType<typeof seedTransaction>;
  initialHblDraft?: ReturnType<typeof seedTransaction>;
  processQuoteId?: string;
  submitLabel?: string;
  successHref?: string;
  cancelHref?: string;
  title?: string;
  description?: string;
  reference: FreightBookingReferenceData;
};

function seedTransaction(type: "MBL" | "HBL") {
  const payload = createInitialFreightBookingPayload(type);
  return {
    containers: payload.containers,
    equipmentTypes: payload.equipmentTypes,
    formData: payload.formData,
  };
}

export function FreightForwardingCreateBookingClient({
  initialMode,
  initialMblDraft,
  initialHblDraft,
  processQuoteId,
  submitLabel = "Create Booking",
  successHref = "/freight-forwarding",
  cancelHref = "/freight-forwarding",
  title = "Create Booking",
  description = "Choose MBL, HBL, or both first. After that, only the matching remaining booking details will be shown.",
  reference,
}: FreightForwardingCreateBookingClientProps) {
  const router = useRouter();
  const [mode, setMode] = useState<FreightBookingCreationMode | null>(initialMode);
  const [activeBothDetail, setActiveBothDetail] = useState<"MBL" | "HBL">("MBL");
  const [mblDraft, setMblDraft] = useState(() => initialMblDraft ?? seedTransaction("MBL"));
  const [hblDraft, setHblDraft] = useState(() => initialHblDraft ?? seedTransaction("HBL"));
  const [isPending, startTransition] = useTransition();

  const visibleModes = useMemo(
    () => ({
      hbl: mode === "HBL_ONLY" || mode === "BOTH",
      mbl: mode === "MBL_ONLY" || mode === "BOTH",
    }),
    [mode],
  );

  function handleCreateBooking() {
    if (!mode) {
      toast.error("Choose the transaction mode first.");
      return;
    }

    startTransition(async () => {
      const actionResult = processQuoteId
        ? await actionCompleteQuoteFreightProcess(processQuoteId, {
            mode,
            mbl: visibleModes.mbl ? mblDraft : undefined,
            hbl: visibleModes.hbl ? hblDraft : undefined,
          })
        : await createFreightBookingWithDetailsAction({
            mode,
            mbl: visibleModes.mbl ? mblDraft : undefined,
            hbl: visibleModes.hbl ? hblDraft : undefined,
          });

      if ("ok" in actionResult && !actionResult.ok) {
        toast.error(actionResult.error);
        return;
      }

      const result =
        "ok" in actionResult ? actionResult.data : actionResult;

      toast.success(
        processQuoteId
          ? "Freight process completed successfully."
          : "Booking created successfully.",
      );

      if (processQuoteId) {
        const nextHref =
          mode === "MBL_ONLY"
            ? `/freight-forwarding/mbl/${result.mblTransactionId}`
            : `/freight-forwarding/hbl/${result.hblTransactionId || result.mblTransactionId}`;
        router.push(nextHref);
        return;
      }

      router.push(successHref);
    });
  }

  function updateDraft(
    transactionType: "MBL" | "HBL",
    value: FreightForwardingBookingDraft,
  ) {
    if (transactionType === "MBL") {
      setMblDraft((current) => ({ ...current, formData: value }));
      return;
    }

    setHblDraft((current) => ({ ...current, formData: value }));
  }

  function updateContainers(
    transactionType: "MBL" | "HBL",
    value: FreightForwardingBookingContainerRow[],
  ) {
    if (transactionType === "MBL") {
      setMblDraft((current) => ({ ...current, containers: value }));
      return;
    }

    setHblDraft((current) => ({ ...current, containers: value }));
  }

  function updateEquipmentTypes(transactionType: "MBL" | "HBL", value: string[]) {
    if (transactionType === "MBL") {
      setMblDraft((current) => ({ ...current, equipmentTypes: value }));
      return;
    }

    setHblDraft((current) => ({ ...current, equipmentTypes: value }));
  }

  function updateCustomerSelection(customerId: string) {
    if (visibleModes.mbl) {
      setMblDraft((current) => ({
        ...current,
        formData: {
          ...current.formData,
          bookingPartyId: customerId,
        },
      }));
    }

    if (visibleModes.hbl) {
      setHblDraft((current) => ({
        ...current,
        formData: {
          ...current.formData,
          bookingPartyId: customerId,
        },
      }));
    }
  }

  const showBothSwitcher = mode === "BOTH";
  const showMblDetails = visibleModes.mbl && (!showBothSwitcher || activeBothDetail === "MBL");
  const showHblDetails = visibleModes.hbl && (!showBothSwitcher || activeBothDetail === "HBL");
  const selectedCustomerId = visibleModes.hbl
    ? hblDraft.formData.bookingPartyId
    : mblDraft.formData.bookingPartyId;

  return (
    <WorkspacePage className="ff-create-booking-page">
      <WorkspacePageHeader
        eyebrow="Freight forwarding"
        title={title}
        description={description}
      />

      <section className="mnx-workspace-metrics" aria-label="Create booking summary">
        <WorkspaceMetric
          label="Mode"
          value={mode ? mode.replace("_", " ") : "Select"}
          detail="Choose the transaction structure first"
        />
        <WorkspaceMetric label="MBL form" value={visibleModes.mbl ? "Ready" : "Hidden"} detail="Master bill details" />
        <WorkspaceMetric label="HBL form" value={visibleModes.hbl ? "Ready" : "Hidden"} detail="House bill details" />
      </section>

      <WorkspaceSectionHeading
        index="01"
        title="Transaction mode"
        description="Choose whether this booking creates only MBL, only HBL, or a linked pair of MBL and HBL transactions."
      />

      <WorkspacePanel>
        <WorkspacePanelHeader
          eyebrow="Booking setup"
          title="Mode and transaction scope"
          description="Step 1 is choosing the transaction mode. Once selected, only the remaining matching detail sections are shown below."
        />
        <div className="ff-create-booking-mode-panel">
          <div className="ff-create-booking-mode-field">
            <WorkspaceSelect
              value={mode ?? ""}
              onChange={(event) =>
                {
                  const nextMode = event.currentTarget.value
                    ? (event.currentTarget.value as FreightBookingCreationMode)
                    : null;
                  setMode(nextMode);
                  setActiveBothDetail(nextMode === "BOTH" ? "MBL" : "MBL");
                }
              }
            >
              <option value="">Choose transaction mode</option>
              <option value="MBL_ONLY">MBL</option>
              <option value="HBL_ONLY">HBL</option>
              <option value="BOTH">Both MBL and HBL</option>
            </WorkspaceSelect>
          </div>
          <div className="ff-create-booking-mode-card">
            <Layers2 aria-hidden="true" className="size-5" />
            <div>
              <strong>
                {!mode
                  ? "Choose MBL or HBL to continue"
                  : mode === "BOTH"
                  ? "Linked MBL and HBL booking"
                  : mode === "MBL_ONLY"
                    ? "MBL-only booking"
                    : "HBL-only booking"}
              </strong>
              <p>
                {!mode
                  ? "No transaction details are shown until you choose the booking mode."
                  : mode === "BOTH"
                  ? "Both transaction details stay on this page and create a linked booking group together."
                  : `Only the ${mode === "MBL_ONLY" ? "MBL" : "HBL"} transaction details will be created from this page.`}
              </p>
            </div>
          </div>
        </div>
      </WorkspacePanel>

      {mode ? (
        <section className="ff-create-booking-form-stack">
          <WorkspaceSectionHeading
            index="02"
            title="Customer"
            description="Select the customer once, then continue with the remaining booking details for the chosen transaction mode."
          />
          <WorkspacePanel>
            <WorkspacePanelHeader
              eyebrow="Customer selection"
              title="Choose booking customer"
              description="This customer selection is shared into the booking details that open below."
            />
            <div className="ff-create-booking-customer-panel">
              <WorkspaceField label="Customer" htmlFor="ff-create-booking-customer">
                <WorkspaceSelect
                  id="ff-create-booking-customer"
                  value={selectedCustomerId}
                  onChange={(event) => updateCustomerSelection(event.currentTarget.value)}
                >
                  <option value="">Select customer</option>
                  {reference.bookingParties.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </WorkspaceSelect>
              </WorkspaceField>
            </div>
          </WorkspacePanel>
        </section>
      ) : null}

      {showBothSwitcher ? (
        <section className="ff-create-booking-form-stack">
          <div className="ff-create-booking-detail-switcher-wrap">
            <div className="mnx-segmented-control ff-create-booking-detail-switcher" role="tablist" aria-label="Transaction detail switcher">
              <button
                type="button"
                role="tab"
                aria-selected={activeBothDetail === "MBL"}
                className={activeBothDetail === "MBL" ? "is-active" : ""}
                onClick={() => setActiveBothDetail("MBL")}
              >
                <span>MBL Details</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeBothDetail === "HBL"}
                className={activeBothDetail === "HBL" ? "is-active" : ""}
                onClick={() => setActiveBothDetail("HBL")}
              >
                <span>HBL Details</span>
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {showMblDetails ? (
        <section className="ff-create-booking-form-stack">
          <WorkspaceSectionHeading
            index={showBothSwitcher ? "04" : "03"}
            title="MBL transaction details"
            description="Capture the master bill transaction details that should be created with this booking."
          />
          <FreightForwardingBookingPage
            key={`mbl-${mode}`}
            embedded
            activeDocumentTab="MBL"
            hideSectionHeading
            hideStandaloneHeader
            initialContainers={mblDraft.containers}
            initialDraft={mblDraft.formData}
            initialEquipmentTypes={mblDraft.equipmentTypes}
            onContainersChange={(value) => updateContainers("MBL", value)}
            onDraftChange={(value) => updateDraft("MBL", value)}
            onEquipmentTypesChange={(value) => updateEquipmentTypes("MBL", value)}
            reference={reference}
            saveButtonLabel="Create with booking"
            showSaveAction={false}
          />
        </section>
      ) : null}

      {showHblDetails ? (
        <section className="ff-create-booking-form-stack">
          <WorkspaceSectionHeading
            index={showBothSwitcher ? "04" : visibleModes.mbl ? "04" : "03"}
            title="HBL transaction details"
            description="Capture the house bill transaction details that should be created with this booking."
          />
          <FreightForwardingBookingPage
            key={`hbl-${mode}`}
            embedded
            activeDocumentTab="HBL"
            hideSectionHeading
            hideStandaloneHeader
            initialContainers={hblDraft.containers}
            initialDraft={hblDraft.formData}
            initialEquipmentTypes={hblDraft.equipmentTypes}
            onContainersChange={(value) => updateContainers("HBL", value)}
            onDraftChange={(value) => updateDraft("HBL", value)}
            onEquipmentTypesChange={(value) => updateEquipmentTypes("HBL", value)}
            reference={reference}
            saveButtonLabel="Create with booking"
            showSaveAction={false}
          />
        </section>
      ) : null}

      <section className="ff-create-booking-footer-actions">
        <ButtonLink href={cancelHref} variant="inverse">
          Cancel
        </ButtonLink>
        <WorkspaceAction
          type="button"
          className={isPending ? "ff-create-booking-submit is-pending" : "ff-create-booking-submit"}
          disabled={!mode || isPending}
          onClick={handleCreateBooking}
        >
          {isPending ? "Creating..." : submitLabel}
        </WorkspaceAction>
      </section>
    </WorkspacePage>
  );
}
