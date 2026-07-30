import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Check,
  FolderKanban,
  MessagesSquare,
  PackageCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableEmpty,
  DataTableHead,
  DataTableHeader,
  DataTableToolbar,
} from "@/components/data-display/data-table";
import {
  getChaJobStatusBadgeVariant,
  getChaPriorityBadgeVariant,
} from "@/lib/cha-badges";
import { requirePortalSession } from "@/modules/customer-portal/auth";
import { getCustomerPortalShipmentDetailData } from "@/modules/customer-portal/shipments";
import { ChecklistDecisionsClient } from "./checklist-decisions-client";
import { CustomerShipmentUploadCard } from "./customer-shipment-upload-card";
import { DocumentsTableClient } from "./documents-table-client";

export default async function CustomerPortalShipmentDetailPage({
  params,
}: {
  params: Promise<{ shipmentId: string }>;
}) {
  const session = await requirePortalSession();
  const { shipmentId } = await params;
  const data = await getCustomerPortalShipmentDetailData(session, shipmentId);

  if (!data) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <section className="monolith-card monolith-accent rounded-xl border border-mono-border/50 bg-mono-card px-5 py-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/customer-portal/shipments">
                <Button variant="outline" size="sm" className="gap-1.5">
                  <ArrowLeft className="size-3.5" />
                  Back To Shipments
                </Button>
              </Link>
              <Badge variant="secondary">{data.shipment.stageLabel}</Badge>
              <Badge variant={getChaJobStatusBadgeVariant(data.shipment.status.replaceAll(" ", "_"))}>{data.shipment.status}</Badge>
              <Badge variant={getChaPriorityBadgeVariant(data.shipment.priority.replaceAll(" ", "_"))}>{data.shipment.priority}</Badge>
            </div>
            <div>
              <p className="monolith-label">Shipment Workspace</p>
              <h2 className="monolith-h1 text-mono-text">{data.shipment.jobNumber}</h2>
              <p className="mt-2 text-sm text-mono-muted">{data.shipment.title}</p>
              <p className="mt-2 text-sm text-mono-muted">
                Customer Ref: {data.shipment.customerRef || "—"} • Last Updated {formatDateTime(data.shipment.updatedAt)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:min-w-[460px]">
            <MetricCard label="Open Queries" value={data.overview.openQueryCount} />
            <MetricCard
              label="Shared Docs"
              value={data.overview.sharedDocumentCount}
            />
            <MetricCard
              label="Open Checklist Actions"
              value={data.overview.pendingChecklistCount}
              tone={data.overview.pendingChecklistCount > 0 ? "warning" : "primary"}
            />
            <MetricCard label="Recent Updates" value={data.recentUpdates.length} />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-7">
          <ChecklistDecisionsClient checklists={data.checklists} error={data.sectionErrors.checklists} />
          <CustomerShipmentUploadCard shipmentId={data.shipment.id} />
          <DocumentsTableClient documents={data.documents} error={data.sectionErrors.documents} />
          <QueriesTable data={data} />
        </div>

        <div className="space-y-6 xl:col-span-5">
          <ShipmentOverviewCard data={data} />
          <RecentUpdatesCard data={data} />
        </div>
      </section>
    </div>
  );
}

function ShipmentOverviewCard({
  data,
}: {
  data: NonNullable<Awaited<ReturnType<typeof getCustomerPortalShipmentDetailData>>>;
}) {
  const shipment = data.shipment;

  return (
    <Card className="rounded-xl border border-mono-border/45">
      <CardHeader>
        <div className="flex items-center gap-3">
          <span className="monolith-icon-badge">
            <FolderKanban size={16} />
          </span>
          <div>
            <CardTitle>Shipment Overview</CardTitle>
            <p className="text-xs text-mono-muted">Customer-safe dates, workflow references, and readiness indicators.</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <OverviewRow label="Current Stage" value={shipment.stageLabel} />
        <OverviewRow label="Created" value={formatDateTime(shipment.createdAt)} />
        <OverviewRow label="Target / ETA" value={shipment.estimatedClosureDate ? formatDate(shipment.estimatedClosureDate) : "—"} />
        <OverviewRow label="Filing Status" value={shipment.filingStatus || "—"} />
        <OverviewRow label="Estimated Filing Date" value={shipment.estimatedFilingDate ? formatDate(shipment.estimatedFilingDate) : "—"} />
        <OverviewRow label="Actual Filing Date" value={shipment.actualFilingDate ? formatDate(shipment.actualFilingDate) : "—"} />
        <OverviewRow label="Filing Reference" value={shipment.filingReference || "—"} />
        <OverviewRow label="Bill Reference" value={shipment.billReference || "—"} />
        <OverviewRow label="Additional Data" value={shipment.additionalDataStatus || "—"} />
        <OverviewRow label="Vessel Inward Date" value={shipment.vesselInwardDate ? formatDate(shipment.vesselInwardDate) : "—"} />
        <OverviewRow label="IGM" value={shipment.importGeneralManifest || "—"} />
        <OverviewRow label="EGM" value={shipment.exportGeneralManifest || "—"} />
        <OverviewRow label="DO Validity" value={shipment.deliveryOrderValidity ? formatDate(shipment.deliveryOrderValidity) : "—"} />
      </CardContent>
    </Card>
  );
}

function QueriesTable({
  data,
}: {
  data: NonNullable<Awaited<ReturnType<typeof getCustomerPortalShipmentDetailData>>>;
}) {
  const error = data.sectionErrors.queries;

  return (
    <DataTable className="border border-mono-border/45">
      <DataTableToolbar className="bg-mono-card">
        <div className="flex items-center gap-3">
          <span className="monolith-icon-badge">
            <MessagesSquare size={16} />
          </span>
          <div>
            <h2 className="monolith-h2 text-mono-text">Outstanding Queries</h2>
            <p className="text-xs text-mono-muted">Open customer-visible threads and the latest visible message activity.</p>
          </div>
        </div>
      </DataTableToolbar>
      {error ? (
        <SectionErrorRow colSpan={5} message={error} />
      ) : (
        <>
          <DataTableHeader>
            <tr>
              <DataTableHead>Query</DataTableHead>
              <DataTableHead>Priority</DataTableHead>
              <DataTableHead>Status</DataTableHead>
              <DataTableHead>Due Date</DataTableHead>
              <DataTableHead>Latest Visible Messages</DataTableHead>
            </tr>
          </DataTableHeader>
          <DataTableBody>
            {data.queries.length === 0 ? (
              <DataTableEmpty colSpan={5} message="No customer-visible open queries are pending for this shipment." />
            ) : (
              data.queries.map((query) => (
                <tr key={query.id}>
                  <DataTableCell>
                    <div className="font-medium text-mono-text">{query.title}</div>
                    <div className="mt-1 text-xs text-mono-muted">{query.detail}</div>
                  </DataTableCell>
                  <DataTableCell>
                    <Badge variant={query.priority === "URGENT" || query.priority === "HIGH" ? "destructive" : "warning"}>
                      {query.priority}
                    </Badge>
                  </DataTableCell>
                  <DataTableCell>
                    <div className="space-y-2">
                      <Badge variant={query.requiresCustomerAction ? "warning" : "secondary"}>{query.status}</Badge>
                      {query.requiresCustomerAction ? (
                        <div className="text-xs text-[#D88700]">Customer response required</div>
                      ) : null}
                    </div>
                  </DataTableCell>
                  <DataTableCell className="text-mono-muted">
                    {query.requiredResponseBy ? formatDate(query.requiredResponseBy) : "—"}
                  </DataTableCell>
                  <DataTableCell className="text-mono-muted">
                    {query.recentMessages.length === 0 ? (
                      "No customer-visible messages yet"
                    ) : (
                      <div className="space-y-2">
                        {query.recentMessages.map((message, index) => (
                          <div key={`${query.id}-${index}`} className="rounded-lg border border-mono-border/40 bg-mono-soft/30 px-3 py-2">
                            <div className="text-xs">{truncate(message.body, 120)}</div>
                            <div className="mt-1 text-[11px] uppercase tracking-[0.16em]">{formatDateTime(message.createdAt)}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </DataTableCell>
                </tr>
              ))
            )}
          </DataTableBody>
        </>
      )}
    </DataTable>
  );
}

function RecentUpdatesCard({
  data,
}: {
  data: NonNullable<Awaited<ReturnType<typeof getCustomerPortalShipmentDetailData>>>;
}) {
  const error = data.sectionErrors.recentUpdates;

  return (
    <Card className="rounded-xl border border-mono-border/45">
      <CardHeader>
        <div className="flex items-center gap-3">
          <span className="monolith-icon-badge">
            <PackageCheck size={16} />
          </span>
          <div>
            <CardTitle>Recent Shipment Updates</CardTitle>
            <p className="text-xs text-mono-muted">Customer-safe timeline events only.</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {error ? (
          <SectionFallback message={error} />
        ) : data.recentUpdates.length === 0 ? (
          <SectionFallback message="No recent customer-facing updates are available for this shipment yet." />
        ) : (
          <div className="space-y-0">
            {data.recentUpdates.map((update, index) => {
              const isLast = index === data.recentUpdates.length - 1;
              const isActive = index === 0;
              return (
                <div key={update.id} className="relative flex gap-4 pb-6 last:pb-0">
                  <div className="relative flex w-12 shrink-0 justify-center">
                    {!isLast ? (
                      <span className="absolute bottom-[-1.5rem] left-1/2 top-11 w-px -translate-x-1/2 bg-[#F9D972]/20" />
                    ) : null}
                    <div
                      className={`relative mt-1 flex h-11 w-11 items-center justify-center rounded-full border ${
                        isActive
                          ? "border-[#F9D972]/40 bg-[#F9D972]/10"
                          : "border-[#F9D972]/30 bg-[#F9D972]/[0.06]"
                      }`}
                    >
                      <div className="flex h-6.5 w-6.5 items-center justify-center rounded-full border border-[#F9D972]/45 bg-mono-card">
                        <Check className="size-3.5 text-[#0e8795]" />
                      </div>
                    </div>
                  </div>
                  <div className="min-w-0 flex-1 pt-1">
                    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_132px] sm:items-start sm:gap-4">
                      <div className="min-w-0 space-y-1">
                        <p className="text-base font-medium text-mono-text">{update.title}</p>
                        <p className="text-sm text-mono-muted">{update.detail}</p>
                      </div>
                      <span className="shrink-0 text-[11px] uppercase tracking-[0.16em] text-mono-muted sm:pt-1 sm:text-right">
                        {formatDateTime(update.occurredAt)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MetricCard({
  label,
  value,
  tone = "primary",
}: {
  label: string;
  value: number;
  tone?: "primary" | "warning";
}) {
  return (
    <div className={`rounded-xl border px-4 py-4 ${tone === "warning" ? "border-[#D88700]/35 bg-[#D88700]/[0.06]" : "border-mono-border/45 bg-mono-soft/30"}`}>
      <p className="monolith-label">{label}</p>
      <p className={`mt-2 text-2xl monolith-numeric ${tone === "warning" ? "text-[#D88700]" : "text-mono-text"}`}>{value}</p>
    </div>
  );
}

function OverviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-mono-border/35 pb-3 last:border-b-0 last:pb-0">
      <p className="monolith-label mt-1">{label}</p>
      <p className="text-right text-sm text-mono-text">{value}</p>
    </div>
  );
}

function SectionFallback({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-mono-border/60 bg-mono-soft/20 px-4 py-6 text-sm text-mono-muted">
      {message}
    </div>
  );
}

function SectionErrorRow({ colSpan, message }: { colSpan: number; message: string }) {
  return (
    <>
      <DataTableHeader>
        <tr>
          <DataTableHead>Section Status</DataTableHead>
        </tr>
      </DataTableHeader>
      <DataTableBody>
        <DataTableEmpty colSpan={colSpan} message={message} />
      </DataTableBody>
    </>
  );
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function truncate(value: string, limit: number) {
  return value.length > limit ? `${value.slice(0, limit - 1)}…` : value;
}
