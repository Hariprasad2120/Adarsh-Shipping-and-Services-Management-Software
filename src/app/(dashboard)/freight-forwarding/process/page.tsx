import Link from "next/link";
import { Search } from "lucide-react";
import {
  OperationalDataTable,
  OperationalDataTableFooter,
  OperationalDataTableHeader,
  OperationalDataTableWrap,
  OperationalPrimaryCell,
  OperationalStatus,
  OperationalTable,
  OperationalTableCell,
  OperationalTableEmpty,
  OperationalTableHead,
  OperationalVisibleRecords,
} from "@/components/data-display/operational-data-table";
import {
  WorkspacePage,
  WorkspacePageHeader,
} from "@/components/layout/workspace";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSession } from "@/lib/auth";
import type { QuoteProcessRecord } from "@/modules/crm/quote-process";
import { listPendingFreightQuoteProcesses } from "@/modules/crm/quote-process";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Freight Forwarding Process | Adarsh Shipping",
};

function readSnapshotValue(
  snapshot: Record<string, unknown> | null,
  ...keys: string[]
) {
  for (const key of keys) {
    const value = snapshot?.[key];
    if (typeof value === "string" && value.trim()) return value;
    if (typeof value === "number") return String(value);
  }

  return null;
}

function normalizeMode(snapshot: Record<string, unknown> | null, item: QuoteProcessRecord) {
  const rawMode = String(
    readSnapshotValue(snapshot, "type", "shipmentMode") || "",
  ).trim().toUpperCase();
  const rawLoadType = String(
    readSnapshotValue(snapshot, "seaLclFcl", "loadType", "containerLoadType") || "",
  ).trim().toUpperCase();

  if (rawMode === "AIR") return "Air";
  if (rawMode === "SEA" && rawLoadType) return `Sea ${rawLoadType}`;
  if (rawMode === "SEA") return "Sea";
  if (item.containerType || item.numberOfContainers) return "Sea";

  return "Pending";
}

function normalizeDirection(snapshot: Record<string, unknown> | null) {
  const rawDirection = String(
    readSnapshotValue(snapshot, "seaType", "airType", "direction") || "",
  ).trim().toUpperCase();

  if (rawDirection === "IMP" || rawDirection === "IMPORT") return "Import";
  if (rawDirection === "EXP" || rawDirection === "EXPORT") return "Export";

  return "Pending";
}

function normalizeRoute(item: QuoteProcessRecord) {
  const origin = item.portOfLoading || item.location || "Origin pending";
  const destination =
    item.portOfDischarge || item.portOfDestinationCountry || "Destination pending";

  return `${origin} -> ${destination}`;
}

function normalizeAssignment(item: QuoteProcessRecord) {
  return item.ownerName || "Assignment pending";
}

function normalizeStatus(item: QuoteProcessRecord) {
  const workflowStatus = item.workflowContext?.conversion?.freightStatus;
  if (workflowStatus === "PROCESSING_PENDING") return "Assignment pending";
  if (workflowStatus === "CREATED") return "Booking created";
  return "Processing pending";
}

function getStatusTone(status: string): "success" | "warning" | "info" {
  if (status === "Booking created") return "success";
  if (status === "Processing pending") return "info";
  return "warning";
}

function matchesSearch(item: QuoteProcessRecord, query: string) {
  if (!query) return true;

  const haystack = [
    item.quoteNumber,
    item.referenceNumber,
    item.customerName,
    item.ownerName,
    item.location,
    item.portOfLoading,
    item.portOfDischarge,
    item.portOfDestinationCountry,
    item.commodity,
    item.containerType,
    normalizeMode(item.sourceSnapshot, item),
    normalizeDirection(item.sourceSnapshot),
    normalizeStatus(item),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(query.toLowerCase());
}

export default async function FreightForwardingProcessPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");
  const orgId = session.user.orgId;
  if (!orgId) redirect("/login");

  const params = await searchParams;
  const search = params.search?.trim() || "";
  const items = await listPendingFreightQuoteProcesses(orgId);
  const filteredItems = items.filter((item) => matchesSearch(item, search));

  return (
    <WorkspacePage className="ff-process-page">
      <WorkspacePageHeader
        eyebrow="Demand intake"
        title="Freight forwarding"
        description="Track qualified freight forwarding work items routed from CRM leads and direct enquiries."
      />

      <OperationalDataTable className="ff-process-queue">
        <OperationalDataTableHeader
          hideIdentity
          infoAriaLabel="Show freight forwarding queue details"
          actions={
            <>
              <form method="GET" className="ff-process-toolbar">
                <label className="mnx-search-field ff-process-search">
                  <Search aria-hidden="true" />
                  <Input
                    aria-label="Search freight forwarding enquiries"
                    type="search"
                    name="search"
                    defaultValue={search}
                    placeholder="Search freight forwarding enquiries"
                  />
                </label>
                <Button type="submit" variant="inverse">
                  Apply
                </Button>
              </form>
              <OperationalVisibleRecords visible={filteredItems.length} total={items.length} />
            </>
          }
          description="Qualified CRM work items routed into the freight forwarding workflow."
        />

        {filteredItems.length === 0 ? (
          <OperationalDataTableWrap>
            <OperationalTable>
              <tbody>
                <OperationalTableEmpty colSpan={9}>
                  <div className="flex flex-col items-center justify-center gap-4 p-14 text-center">
                    <p className="text-sm mnx-text-primary">
                      No freight forwarding enquiries found
                    </p>
                    <p className="mx-auto max-w-sm text-xs mnx-text-muted">
                      Qualified work items routed into freight forwarding will appear here.
                    </p>
                    <ButtonLink href="/crm/quotes" variant="accent">
                      Review quotations
                    </ButtonLink>
                  </div>
                </OperationalTableEmpty>
              </tbody>
            </OperationalTable>
          </OperationalDataTableWrap>
        ) : (
          <OperationalDataTableWrap>
            <OperationalTable>
              <thead>
                <tr>
                  <OperationalTableHead>Reference</OperationalTableHead>
                  <OperationalTableHead>Customer</OperationalTableHead>
                  <OperationalTableHead>Mode</OperationalTableHead>
                  <OperationalTableHead>Direction</OperationalTableHead>
                  <OperationalTableHead>Route</OperationalTableHead>
                  <OperationalTableHead>Commodity</OperationalTableHead>
                  <OperationalTableHead>Assignment</OperationalTableHead>
                  <OperationalTableHead>Status</OperationalTableHead>
                  <OperationalTableHead className="text-right">Open</OperationalTableHead>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item, index) => {
                  const queueStatus = normalizeStatus(item);
                  const assignment = normalizeAssignment(item);
                  const routeLabel = normalizeRoute(item);

                  return (
                    <tr
                      key={item.id}
                      className={index === 0 ? "ff-process-row-highlight" : undefined}
                    >
                      <OperationalPrimaryCell
                        primary={item.referenceNumber}
                        secondary={new Date(item.createdAt).toLocaleDateString("en-GB")}
                      />
                      <OperationalPrimaryCell
                        primary={item.customerName}
                        secondary={item.ownerName || "Direct enquiry"}
                      />
                      <OperationalTableCell>{normalizeMode(item.sourceSnapshot, item)}</OperationalTableCell>
                      <OperationalTableCell>{normalizeDirection(item.sourceSnapshot)}</OperationalTableCell>
                      <OperationalTableCell>{routeLabel}</OperationalTableCell>
                      <OperationalTableCell>{item.commodity || "Not captured"}</OperationalTableCell>
                      <OperationalTableCell>{assignment}</OperationalTableCell>
                      <OperationalTableCell>
                        <OperationalStatus tone={getStatusTone(queueStatus)}>
                          {queueStatus}
                        </OperationalStatus>
                      </OperationalTableCell>
                      <OperationalTableCell className="text-right">
                        <Link
                          href={`/freight-forwarding/process/${item.id}`}
                          className="ff-process-open-link"
                        >
                          Open
                        </Link>
                      </OperationalTableCell>
                    </tr>
                  );
                })}
              </tbody>
            </OperationalTable>
          </OperationalDataTableWrap>
        )}

        <OperationalDataTableFooter
          summary={`${filteredItems.length} ${filteredItems.length === 1 ? "record" : "records"} in this queue`}
        />
      </OperationalDataTable>
    </WorkspacePage>
  );
}
