"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ButtonLink } from "@/components/ui/button";
import {
  WorkspaceAction,
  WorkspaceField,
  WorkspacePage,
  WorkspacePageHeader,
  WorkspacePanel,
  WorkspacePanelHeader,
  WorkspaceSelect,
} from "@/components/layout/workspace";
import {
  connectFreightBookingTransactionAction,
  disconnectFreightBookingTransactionAction,
  saveFreightBookingTransactionAction,
} from "@/modules/freight-forwarding/actions";
import type { FreightBookingReferenceData } from "@/modules/freight-forwarding/booking-shared";
import { FreightForwardingBookingPage } from "@/modules/freight-forwarding/components/freight-forwarding-booking-page";
import type {
  FreightBookingGroup,
  FreightBookingTransaction,
} from "@/modules/freight-forwarding/service";

type FreightForwardingTransactionDetailClientProps = {
  bookingGroups: FreightBookingGroup[];
  reference: FreightBookingReferenceData;
  transaction: FreightBookingTransaction;
};

export function FreightForwardingTransactionDetailClient({
  bookingGroups,
  reference,
  transaction,
}: FreightForwardingTransactionDetailClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [draft, setDraft] = useState(transaction.formData);
  const [containers, setContainers] = useState(transaction.containers);
  const [equipmentTypes, setEquipmentTypes] = useState(transaction.equipmentTypes);
  const currentBookingGroup = useMemo(
    () =>
      transaction.bookingGroupId
        ? bookingGroups.find((group) => group.bookingGroupId === transaction.bookingGroupId) || null
        : null,
    [bookingGroups, transaction.bookingGroupId],
  );
  const canSwitchDetails =
    currentBookingGroup?.bookingMode === "BOTH" &&
    Boolean(currentBookingGroup.mblTransaction) &&
    Boolean(currentBookingGroup.hblTransaction);

  async function handleSave(input: {
    accountId: string | null;
    containers: FreightBookingTransaction["containers"];
    equipmentTypes: string[];
    formData: FreightBookingTransaction["formData"];
  }) {
    const result = await saveFreightBookingTransactionAction({
      accountId: input.accountId,
      containers: input.containers,
      equipmentTypes: input.equipmentTypes,
      formData: input.formData,
      transactionId: transaction.id,
    });

    if (result.ok) {
      router.refresh();
      return { ok: true };
    }

    return { ok: false, error: result.error };
  }

  function handleConnect(bookingGroupId: string) {
    if (!bookingGroupId) {
      toast.error("Select a booking to connect first.");
      return;
    }

    startTransition(async () => {
      const result = await connectFreightBookingTransactionAction({
        bookingGroupId,
        transactionId: transaction.id,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Transaction connected to booking.");
      router.refresh();
    });
  }

  function handleDisconnect() {
    startTransition(async () => {
      const result = await disconnectFreightBookingTransactionAction(transaction.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Transaction disconnected from booking.");
      router.refresh();
    });
  }

  function openTransactionDetail(transactionType: "MBL" | "HBL", transactionId: string) {
    router.push(`/freight-forwarding/${transactionType.toLowerCase()}/${transactionId}`);
  }

  function updateCustomerSelection(customerId: string) {
    setDraft((current) => ({
      ...current,
      bookingPartyId: customerId,
    }));
  }

  return (
    <WorkspacePage className="ff-transaction-detail-page">
      <WorkspacePageHeader
        eyebrow="Freight forwarding"
        title={`${transaction.transactionType} Transaction`}
        description="View and update this transaction on its own page while keeping the sidebar register as the operational list."
        actions={
          <div className="ff-booking-header-actions">
            {canSwitchDetails ? (
              <div className="ff-home-view-switch" aria-label="Transaction detail switch">
                <WorkspaceAction
                  type="button"
                  variant={transaction.transactionType === "MBL" ? "primary" : "secondary"}
                  onClick={() => {
                    if (currentBookingGroup?.mblTransaction?.id) {
                      openTransactionDetail("MBL", currentBookingGroup.mblTransaction.id);
                    }
                  }}
                >
                  MBL Details
                </WorkspaceAction>
                <WorkspaceAction
                  type="button"
                  variant={transaction.transactionType === "HBL" ? "primary" : "secondary"}
                  onClick={() => {
                    if (currentBookingGroup?.hblTransaction?.id) {
                      openTransactionDetail("HBL", currentBookingGroup.hblTransaction.id);
                    }
                  }}
                >
                  HBL Details
                </WorkspaceAction>
              </div>
            ) : null}
            <ButtonLink
              href={`/freight-forwarding/${transaction.transactionType.toLowerCase()}`}
              variant="inverse"
            >
              Back to {transaction.transactionType}
            </ButtonLink>
          </div>
        }
      />

      <WorkspacePanel>
        <WorkspacePanelHeader
          eyebrow="Booking connection"
          title="Connect or disconnect"
          description="Standalone transactions can be linked to an existing booking group later without creating duplicates."
        />
        <div className="ff-inline-action-row ff-inline-action-row-detail">
          <WorkspaceSelect
            key={`${transaction.id}-${transaction.bookingGroupId ?? "standalone"}`}
            defaultValue={transaction.bookingGroupId || ""}
            disabled={isPending}
            onChange={(event) => handleConnect(event.currentTarget.value)}
          >
            <option value="">Select booking group</option>
            {bookingGroups.map((group) => (
              <option key={group.bookingGroupId} value={group.bookingGroupId}>
                {group.bookingGroupId.slice(0, 8).toUpperCase()} - {group.customerName}
              </option>
            ))}
          </WorkspaceSelect>
          <WorkspaceAction
            type="button"
            variant="secondary"
            disabled={isPending || !transaction.bookingGroupId}
            onClick={handleDisconnect}
          >
            Disconnect
          </WorkspaceAction>
        </div>
      </WorkspacePanel>

      <WorkspacePanel>
        <WorkspacePanelHeader
          eyebrow="Customer selection"
          title="Choose booking customer"
          description="Select the customer here and the transaction details below will use the same booking party."
        />
        <div className="ff-create-booking-customer-panel">
          <WorkspaceField label="Customer" htmlFor={`ff-detail-customer-${transaction.id}`}>
            <WorkspaceSelect
              id={`ff-detail-customer-${transaction.id}`}
              value={draft.bookingPartyId}
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

      <FreightForwardingBookingPage
        key={`${transaction.id}-${draft.bookingPartyId}`}
        embedded
        activeDocumentTab={transaction.transactionType}
        initialContainers={containers}
        initialDraft={draft}
        initialEquipmentTypes={equipmentTypes}
        onContainersChange={setContainers}
        onDraftChange={setDraft}
        onEquipmentTypesChange={setEquipmentTypes}
        onSave={handleSave}
        reference={reference}
        saveButtonLabel={isPending ? "Saving..." : "Save Transaction"}
      />
    </WorkspacePage>
  );
}
