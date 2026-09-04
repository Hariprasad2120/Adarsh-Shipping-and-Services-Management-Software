"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Boxes, FileStack, Link2 } from "lucide-react";
import { toast } from "@/modules/notifications/client";
import { ButtonLink } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import {
  DashboardInsightCard,
  DashboardInsightGrid,
  DashboardMiniBarChart,
  DashboardSegmentList,
} from "@/components/data-display/dashboard-insights";
import {
  OperationalDataTable,
  OperationalDataTableFooter,
  OperationalDataTableWrap,
  OperationalPrimaryCell,
  OperationalStatus,
  OperationalTable,
  OperationalTableCell,
  OperationalTableEmpty,
  OperationalTableHead,
} from "@/components/data-display/operational-data-table";
import { OperationalLinkedRow } from "@/components/data-display/operational-linked-row";
import {
  WorkspaceAction,
  WorkspaceMetric,
  WorkspacePage,
  WorkspacePageHeader,
  WorkspacePanel,
  WorkspacePanelHeader,
  WorkspaceSectionHeading,
} from "@/components/layout/workspace";
import {
  createFreightBookingTransactionsAction,
  createStandaloneFreightTransactionAction,
  saveFreightBookingTransactionAction,
} from "@/modules/freight-forwarding/actions";
import type {
  FreightBookingCreationMode,
  FreightBookingReferenceData,
  FreightTransactionType,
} from "@/modules/freight-forwarding/booking-shared";
import { FreightForwardingBookingPage } from "@/modules/freight-forwarding/components/freight-forwarding-booking-page";
import type {
  FreightBookingGroup,
  FreightBookingTransaction,
} from "@/modules/freight-forwarding/service";

type WorkspaceSection = "HOME" | "MBL" | "HBL";

type FreightForwardingWorkspaceClientProps = {
  bookingGroups: FreightBookingGroup[];
  initialGroupId?: string | null;
  initialTransactionId?: string | null;
  initialView?: FreightTransactionType | null;
  reference: FreightBookingReferenceData;
  section: WorkspaceSection;
  transactions: FreightBookingTransaction[];
};

function formatBookingMode(mode: FreightBookingCreationMode) {
  return mode.replace(/_/g, " ");
}

function formatStamp(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getBookingGroupTarget(group: FreightBookingGroup) {
  if (group.mblTransaction?.id) {
    return {
      href: `/freight-forwarding/mbl/${group.mblTransaction.id}`,
      nextView: "MBL" as const,
    };
  }

  if (group.hblTransaction?.id) {
    return {
      href: `/freight-forwarding/hbl/${group.hblTransaction.id}`,
      nextView: "HBL" as const,
    };
  }

  return {
    href: "/freight-forwarding",
    nextView: group.bookingMode === "HBL_ONLY" ? ("HBL" as const) : ("MBL" as const),
  };
}

export function FreightForwardingWorkspaceClient({
  bookingGroups,
  initialGroupId,
  initialTransactionId,
  initialView,
  reference,
  section,
  transactions,
}: FreightForwardingWorkspaceClientProps) {
  const router = useRouter();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(
    initialGroupId ||
      bookingGroups[0]?.bookingGroupId ||
      null,
  );
  const [selectedView, setSelectedView] = useState<FreightTransactionType>(initialView || "MBL");
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(
    initialTransactionId || null,
  );

  const selectedGroup = useMemo(
    () =>
      bookingGroups.find((group) => group.bookingGroupId === selectedGroupId) ||
      null,
    [bookingGroups, selectedGroupId],
  );

  const filteredTransactions = useMemo(() => {
    if (section === "HOME") return transactions;
    return transactions.filter((transaction) => transaction.transactionType === section);
  }, [section, transactions]);

  function openTransactionDetail(type: FreightTransactionType, transactionId: string) {
    router.push(`/freight-forwarding/${type.toLowerCase()}/${transactionId}`);
  }

  function selectBookingGroup(group: FreightBookingGroup) {
    const target = getBookingGroupTarget(group);
    setSelectedGroupId(group.bookingGroupId);
    setSelectedView(target.nextView);
    setSelectedTransactionId(null);
    router.replace(`/freight-forwarding?group=${group.bookingGroupId}&view=${target.nextView}`);
  }

  function handleCreateBooking(mode: FreightBookingCreationMode) {
    startTransition(async () => {
      const result = await createFreightBookingTransactionsAction(mode);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      const nextView =
        mode === "HBL_ONLY" ? "HBL" : "MBL";

      toast.success("Booking transaction created.");
      setIsCreateDialogOpen(false);
      setSelectedGroupId(result.data.bookingGroupId);
      setSelectedView(nextView);
      setSelectedTransactionId(null);

      if (result.data.bookingGroupId) {
        router.replace(`/freight-forwarding?group=${result.data.bookingGroupId}&view=${nextView}`);
      }
      router.refresh();
    });
  }

  function handleCreateStandaloneTransaction(transactionType: FreightTransactionType) {
    startTransition(async () => {
      const result = await createStandaloneFreightTransactionAction(transactionType);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success(`${transactionType} transaction created.`);
      router.push(`/freight-forwarding/${transactionType.toLowerCase()}/${result.data.transactionId}`);
    });
  }

  const metrics = {
    homeGroups: bookingGroups.length,
    hbl: transactions.filter((transaction) => transaction.transactionType === "HBL").length,
    mbl: transactions.filter((transaction) => transaction.transactionType === "MBL").length,
  };
  const linkedGroups = bookingGroups.filter(
    (group) => group.mblTransaction && group.hblTransaction,
  ).length;
  const mblOnlyGroups = bookingGroups.filter(
    (group) => group.mblTransaction && !group.hblTransaction,
  ).length;
  const hblOnlyGroups = bookingGroups.filter(
    (group) => !group.mblTransaction && group.hblTransaction,
  ).length;
  const draftTransactions = transactions.filter(
    (transaction) => transaction.status === "DRAFT",
  ).length;

  return (
    <WorkspacePage>
      <WorkspacePageHeader
        eyebrow="Freight forwarding"
        title={
          section === "HOME"
            ? "Freight Forwarding"
            : `${section} Transactions`
        }
        description={
          section === "HOME"
            ? "Track bookings and linked MBL and HBL work."
            : `Review and update ${section} transactions.`
        }
        actions={
          <div className="ff-booking-header-actions">
            {section === "HOME" ? (
              <WorkspaceAction
                type="button"
                variant="primary"
                onClick={() => setIsCreateDialogOpen(true)}
              >
                Create Booking
              </WorkspaceAction>
            ) : (
              <>
                <WorkspaceAction
                  type="button"
                  variant="primary"
                  disabled={isPending}
                  onClick={() => handleCreateStandaloneTransaction(section)}
                >
                  {isPending ? "Creating..." : `New ${section} Transaction`}
                </WorkspaceAction>
                <ButtonLink href="/freight-forwarding" variant="inverse">
                  Workspace Home
                </ButtonLink>
              </>
            )}
          </div>
        }
      />

      <section className="mnx-workspace-metrics" aria-label="Freight forwarding summary">
        <WorkspaceMetric label="Booking sets" value={metrics.homeGroups} detail="Linked Workspace Home groups" />
        <WorkspaceMetric label="MBL transactions" value={metrics.mbl} detail="Sidebar MBL registry" />
        <WorkspaceMetric label="HBL transactions" value={metrics.hbl} detail="Sidebar HBL registry" />
      </section>

      {section === "HOME" ? (
        <>
          <WorkspaceSectionHeading
            index="01"
            title="Workspace Home"
            description="The forwarding dashboard now shows booking health and processing posture first, then drops into the registries below."
          />
          <DashboardInsightGrid>
            <DashboardInsightCard
              eyebrow="Booking mix"
              title="Transaction coverage"
              detail="A quick read on how much of the forwarding workload is linked versus one-sided."
              chart={(
                <DashboardMiniBarChart
                  items={[
                    { label: "Booking groups", value: metrics.homeGroups, tone: "info" },
                    { label: "MBL records", value: metrics.mbl, tone: "accent" },
                    { label: "HBL records", value: metrics.hbl, tone: "success" },
                    { label: "Drafts", value: draftTransactions, tone: "warning" },
                  ]}
                />
              )}
              footer={<span>Use this to spot whether activity is stacking up in one leg of the shipment flow.</span>}
            />
            <DashboardInsightCard
              eyebrow="Operational split"
              title="Group completeness"
              detail="Forwarding home now clarifies how many booking sets are fully linked and how many still need the other side created."
              chart={(
                <DashboardSegmentList
                  items={[
                    { label: "Linked MBL + HBL", value: linkedGroups, tone: "success" },
                    { label: "MBL only", value: mblOnlyGroups, tone: "accent" },
                    { label: "HBL only", value: hblOnlyGroups, tone: "info" },
                  ]}
                />
              )}
              footer={<span>Single-sided groups are the best signal for where the team should continue processing next.</span>}
            />
          </DashboardInsightGrid>
          <WorkspacePanel>
            <WorkspacePanelHeader
              eyebrow="Booking registry"
              title="Booking groups"
              description="When both transaction types are created, this list keeps the linked MBL and HBL records together."
            />
            {bookingGroups.length === 0 ? (
              <OperationalDataTable>
                <OperationalDataTableWrap>
                  <OperationalTable>
                    <tbody>
                      <OperationalTableEmpty colSpan={6}>
                        <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
                          <div className="flex size-12 items-center justify-center rounded-full bg-mono-soft text-mono-muted">
                            <Boxes className="size-6" />
                          </div>
                          <div className="space-y-2">
                            <p className="text-sm mnx-text-primary">No booking groups yet</p>
                            <p className="mx-auto max-w-sm text-xs mnx-text-muted">
                              Use `Create Booking` to start with MBL only, HBL only, or both.
                            </p>
                          </div>
                        </div>
                      </OperationalTableEmpty>
                    </tbody>
                  </OperationalTable>
                </OperationalDataTableWrap>
              </OperationalDataTable>
            ) : (
              <OperationalDataTable>
                <OperationalDataTableWrap>
                  <OperationalTable>
                    <thead>
                      <tr>
                        <OperationalTableHead>Booking group</OperationalTableHead>
                        <OperationalTableHead>Customer</OperationalTableHead>
                        <OperationalTableHead>Mode</OperationalTableHead>
                        <OperationalTableHead>Linked records</OperationalTableHead>
                        <OperationalTableHead>Last updated</OperationalTableHead>
                        <OperationalTableHead>Next action</OperationalTableHead>
                      </tr>
                    </thead>
                    <tbody>
                      {bookingGroups.map((group) => {
                        const hasMbl = Boolean(group.mblTransaction);
                        const hasHbl = Boolean(group.hblTransaction);
                        const bookingGroupTarget = getBookingGroupTarget(group);
                        const bookingHomeHref = `/freight-forwarding?group=${group.bookingGroupId}&view=${bookingGroupTarget.nextView}`;
                        return (
                          <OperationalLinkedRow
                            key={group.bookingGroupId}
                            href={bookingHomeHref}
                            ariaLabel={`Open booking group ${group.bookingGroupId.slice(0, 8).toUpperCase()}`}
                            className={
                              group.bookingGroupId === selectedGroupId ? "bg-[var(--mnx-accent)]/6" : undefined
                            }
                            onClick={() => {
                              selectBookingGroup(group);
                            }}
                          >
                            <OperationalPrimaryCell
                              primary={group.bookingGroupId.slice(0, 8).toUpperCase()}
                              secondary={
                                hasMbl && hasHbl
                                  ? "Linked MBL and HBL set"
                                  : hasMbl
                                    ? "MBL-only record set"
                                    : "HBL-only record set"
                              }
                            />
                            <OperationalTableCell>{group.customerName}</OperationalTableCell>
                            <OperationalTableCell>
                              <OperationalStatus
                                tone={group.bookingMode === "BOTH" ? "info" : "neutral"}
                              >
                                {formatBookingMode(group.bookingMode)}
                              </OperationalStatus>
                            </OperationalTableCell>
                            <OperationalTableCell>
                              <div className="flex flex-wrap gap-2">
                                {hasMbl ? (
                                  <OperationalStatus tone="success">MBL</OperationalStatus>
                                ) : null}
                                {hasHbl ? (
                                  <OperationalStatus tone="success">HBL</OperationalStatus>
                                ) : null}
                              </div>
                            </OperationalTableCell>
                            <OperationalTableCell className="text-xs mnx-text-muted">
                              {formatStamp(group.updatedAt)}
                            </OperationalTableCell>
                            <OperationalTableCell>
                              <WorkspaceAction
                                type="button"
                                variant="secondary"
                                onClick={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  selectBookingGroup(group);
                                }}
                              >
                                Work on Home
                                <ArrowRight className="size-3.5" />
                              </WorkspaceAction>
                            </OperationalTableCell>
                          </OperationalLinkedRow>
                        );
                      })}
                    </tbody>
                  </OperationalTable>
                </OperationalDataTableWrap>
                <OperationalDataTableFooter
                  summary={`Showing ${bookingGroups.length === 0 ? "0" : `1-${bookingGroups.length}`} of ${bookingGroups.length} booking groups`}
                />
              </OperationalDataTable>
            )}
          </WorkspacePanel>

          {selectedGroup ? (
            <WorkspacePanel>
              <WorkspacePanelHeader
                eyebrow="Booking actions"
                title="Workspace Home transaction views"
                description="Edit the selected booking directly here. The MBL and HBL tabs use the same underlying transaction records."
              />
              <div className="ff-home-view-switch">
                {selectedGroup.bookingMode === "BOTH" && selectedGroup.mblTransaction ? (
                  <WorkspaceAction
                    type="button"
                    variant={selectedView === "MBL" ? "primary" : "secondary"}
                    onClick={() => {
                      setSelectedView("MBL");
                      router.replace(`/freight-forwarding?group=${selectedGroup.bookingGroupId}&view=MBL`);
                    }}
                  >
                    MBL View
                  </WorkspaceAction>
                ) : null}
                {selectedGroup.bookingMode === "BOTH" && selectedGroup.hblTransaction ? (
                  <WorkspaceAction
                    type="button"
                    variant={selectedView === "HBL" ? "primary" : "secondary"}
                    onClick={() => {
                      setSelectedView("HBL");
                      router.replace(`/freight-forwarding?group=${selectedGroup.bookingGroupId}&view=HBL`);
                    }}
                  >
                    HBL View
                  </WorkspaceAction>
                ) : null}
              </div>
            </WorkspacePanel>
          ) : null}

          {selectedGroup ? (
            <FreightForwardingHomeTransactionEditor
              key={`${selectedGroup.bookingGroupId}-${selectedView}`}
              reference={reference}
              transaction={
                selectedView === "HBL"
                  ? selectedGroup.hblTransaction || selectedGroup.mblTransaction
                  : selectedGroup.mblTransaction || selectedGroup.hblTransaction
              }
            />
          ) : null}
        </>
      ) : (
        <>
          <WorkspaceSectionHeading
            index="01"
            title={`${section} registry`}
            description={`Only ${section} transactions appear here. The dashboard summary above keeps the registry purposeful instead of acting like a plain shortcut tab.`}
          />
          <DashboardInsightGrid>
            <DashboardInsightCard
              eyebrow="Registry focus"
              title={`${section} processing posture`}
              detail={`See the current ${section} volume before you open a specific record.`}
              chart={(
                <DashboardMiniBarChart
                  items={[
                    { label: `${section} transactions`, value: filteredTransactions.length, tone: "info" },
                    { label: "Draft", value: filteredTransactions.filter((row) => row.status === "DRAFT").length, tone: "warning" },
                    { label: "Linked", value: filteredTransactions.filter((row) => row.bookingGroupId).length, tone: "success" },
                  ]}
                />
              )}
            />
          </DashboardInsightGrid>
          <WorkspacePanel>
            <WorkspacePanelHeader
              eyebrow="Transaction list"
              title={`${section} transactions`}
              description={`This tab shows only ${section} transactions. Open one from the list below to edit it in the current ${section} view.`}
            />
            {filteredTransactions.length === 0 ? (
              <OperationalDataTable>
                <OperationalDataTableWrap>
                  <OperationalTable>
                    <tbody>
                      <OperationalTableEmpty colSpan={5}>
                        <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
                          <div className="flex size-12 items-center justify-center rounded-full bg-mono-soft text-mono-muted">
                            <FileStack className="size-6" />
                          </div>
                          <div className="space-y-2">
                            <p className="text-sm mnx-text-primary">No {section} transactions yet</p>
                            <p className="mx-auto max-w-sm text-xs mnx-text-muted">
                              Create a new {section} transaction to populate this register.
                            </p>
                          </div>
                        </div>
                      </OperationalTableEmpty>
                    </tbody>
                  </OperationalTable>
                </OperationalDataTableWrap>
              </OperationalDataTable>
            ) : (
              <OperationalDataTable>
                <OperationalDataTableWrap>
                  <OperationalTable>
                    <thead>
                      <tr>
                        <OperationalTableHead>{section} number</OperationalTableHead>
                        <OperationalTableHead>Customer</OperationalTableHead>
                        <OperationalTableHead>Booking link</OperationalTableHead>
                        <OperationalTableHead>Status</OperationalTableHead>
                        <OperationalTableHead>Last updated</OperationalTableHead>
                        <OperationalTableHead>Process</OperationalTableHead>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTransactions.map((transaction) => (
                        <OperationalLinkedRow
                          key={transaction.id}
                          href={`/freight-forwarding/${section.toLowerCase()}/${transaction.id}`}
                          ariaLabel={`Open ${section} transaction ${transaction.transactionNumber}`}
                          className={
                            transaction.id === selectedTransactionId ? "bg-[var(--mnx-accent)]/6" : undefined
                          }
                          onClick={() => {
                            setSelectedTransactionId(transaction.id);
                          }}
                        >
                          <OperationalPrimaryCell
                            primary={transaction.transactionNumber}
                            secondary={transaction.transactionType}
                          />
                          <OperationalTableCell>{transaction.customerName}</OperationalTableCell>
                          <OperationalTableCell>
                            {transaction.bookingGroupId ? (
                              <span className="inline-flex items-center gap-1.5 text-xs mnx-text-muted">
                                <Link2 className="size-3.5" />
                                <span>
                                  {transaction.bookingGroupId.slice(0, 8).toUpperCase()}
                                </span>
                              </span>
                            ) : (
                              <OperationalStatus tone="neutral">Standalone</OperationalStatus>
                            )}
                          </OperationalTableCell>
                          <OperationalTableCell>
                            <OperationalStatus tone="info">{transaction.status}</OperationalStatus>
                          </OperationalTableCell>
                          <OperationalTableCell className="text-xs mnx-text-muted">
                            {formatStamp(transaction.updatedAt)}
                          </OperationalTableCell>
                          <OperationalTableCell>
                            <WorkspaceAction
                              type="button"
                              variant="secondary"
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                openTransactionDetail(
                                  transaction.transactionType,
                                  transaction.id,
                                );
                              }}
                            >
                              Process
                            </WorkspaceAction>
                          </OperationalTableCell>
                        </OperationalLinkedRow>
                      ))}
                    </tbody>
                  </OperationalTable>
                </OperationalDataTableWrap>
                <OperationalDataTableFooter
                  summary={`Showing ${filteredTransactions.length === 0 ? "0" : `1-${filteredTransactions.length}`} of ${filteredTransactions.length} ${section} transactions`}
                />
              </OperationalDataTable>
            )}
          </WorkspacePanel>

          {filteredTransactions.length > 0 ? (
            <WorkspacePanel>
              <WorkspacePanelHeader
                eyebrow="Current view"
                title={`Open an ${section} transaction`}
                description={`Select an ${section} transaction from the list to open its dedicated detail page for viewing and updates.`}
              />
            </WorkspacePanel>
          ) : null}
        </>
      )}

      <FreightForwardingCreateBookingDialog
        isPending={isPending}
        onClose={() => setIsCreateDialogOpen(false)}
        onCreate={handleCreateBooking}
        open={isCreateDialogOpen}
      />
    </WorkspacePage>
  );
}

function FreightForwardingCreateBookingDialog({
  isPending,
  onClose,
  onCreate,
  open,
}: {
  isPending: boolean;
  onClose: () => void;
  onCreate: (mode: FreightBookingCreationMode) => void;
  open: boolean;
}) {
  return (
    <Modal
      eyebrow="Freight forwarding"
      open={open}
      onClose={onClose}
      title="Choose transaction scope"
      description="Select which transaction records should be created for this booking. Workspace Home will stay open after creation."
    >
      <div className="ff-booking-dialog-options">
        <WorkspaceAction
          type="button"
          variant="secondary"
          disabled={isPending}
          onClick={() => onCreate("MBL_ONLY")}
        >
          <strong>Create MBL Transaction Only</strong>
          <span>Create one master-bill transaction and show its form on Workspace Home.</span>
          <small>No HBL transaction will be created.</small>
        </WorkspaceAction>
        <WorkspaceAction
          type="button"
          variant="secondary"
          disabled={isPending}
          onClick={() => onCreate("HBL_ONLY")}
        >
          <strong>Create HBL Transaction Only</strong>
          <span>Create one house-bill transaction and show its form on Workspace Home.</span>
          <small>No MBL transaction will be created.</small>
        </WorkspaceAction>
        <WorkspaceAction
          type="button"
          variant="secondary"
          disabled={isPending}
          onClick={() => onCreate("BOTH")}
        >
          <strong>Create Both MBL and HBL Transactions</strong>
          <span>Create a linked booking set with separate MBL View and HBL View editors.</span>
          <small>Both records remain connected to the same booking.</small>
        </WorkspaceAction>
      </div>
    </Modal>
  );
}

function FreightForwardingHomeTransactionEditor({
  reference,
  transaction,
}: {
  reference: FreightBookingReferenceData;
  transaction: FreightBookingTransaction | null;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(transaction?.formData);
  const [containers, setContainers] = useState(transaction?.containers || []);
  const [equipmentTypes, setEquipmentTypes] = useState(transaction?.equipmentTypes || []);

  if (!transaction || !draft) {
    return null;
  }

  const transactionId = transaction.id;

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
      transactionId,
    });

    if (result.ok) {
      router.refresh();
      return { ok: true };
    }

    return { ok: false, error: result.error };
  }

  return (
    <FreightForwardingBookingPage
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
      saveButtonLabel={`Save ${transaction.transactionType}`}
    />
  );
}
