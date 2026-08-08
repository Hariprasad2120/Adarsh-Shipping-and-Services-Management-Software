"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Boxes, FileStack, Link2 } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
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
import type {
  FreightBookingCreationMode,
  FreightTransactionType,
} from "@/modules/freight-forwarding/booking-shared";
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
  section,
  transactions,
}: FreightForwardingWorkspaceClientProps) {
  const router = useRouter();
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
            ? "Open the dedicated create-booking page to capture one-sided or linked MBL and HBL transaction sets."
            : `Review, create, and update ${section} transactions from the dedicated sidebar tab.`
        }
        actions={
          <div className="ff-booking-header-actions">
            {section === "HOME" ? (
              <ButtonLink href="/freight-forwarding/create-booking" variant="accent">
                Create Booking
              </ButtonLink>
            ) : (
              <>
                <ButtonLink
                  href={`/freight-forwarding/create-booking?mode=${section === "MBL" ? "MBL_ONLY" : "HBL_ONLY"}`}
                  variant="accent"
                >
                  New {section} Transaction
                </ButtonLink>
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
                        return (
                          <OperationalLinkedRow
                            key={group.bookingGroupId}
                            href={bookingGroupTarget.href}
                            ariaLabel={`Open booking group ${group.bookingGroupId.slice(0, 8).toUpperCase()}`}
                            className={
                              group.bookingGroupId === selectedGroupId ? "bg-[var(--mnx-accent)]/6" : undefined
                            }
                            onClick={() => {
                              setSelectedGroupId(group.bookingGroupId);
                              setSelectedView(bookingGroupTarget.nextView);
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
                                  router.push(bookingGroupTarget.href);
                                }}
                              >
                                Process
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
                title="Open transaction tabs"
                description="Workspace Home stays as the dashboard. Use the dedicated MBL and HBL tabs to create or edit transaction details."
              />
              <div className="ff-home-view-switch">
                {selectedGroup.mblTransaction ? (
                  <WorkspaceAction
                    type="button"
                    variant={selectedView === "MBL" ? "primary" : "secondary"}
                    onClick={() => {
                      setSelectedView("MBL");
                      if (selectedGroup.mblTransaction?.id) {
                        openTransactionDetail("MBL", selectedGroup.mblTransaction.id);
                      }
                    }}
                  >
                    Open MBL
                  </WorkspaceAction>
                ) : null}
                {selectedGroup.hblTransaction ? (
                  <WorkspaceAction
                    type="button"
                    variant={selectedView === "HBL" ? "primary" : "secondary"}
                    onClick={() => {
                      setSelectedView("HBL");
                      if (selectedGroup.hblTransaction?.id) {
                        openTransactionDetail("HBL", selectedGroup.hblTransaction.id);
                      }
                    }}
                  >
                    Open HBL
                  </WorkspaceAction>
                ) : null}
              </div>
            </WorkspacePanel>
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
    </WorkspacePage>
  );
}
