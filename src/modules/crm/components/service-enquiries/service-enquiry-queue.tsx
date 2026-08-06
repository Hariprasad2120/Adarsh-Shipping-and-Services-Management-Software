"use client";

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
import { OperationalLinkedRow } from "@/components/data-display/operational-linked-row";
import { ButtonLink } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CrmActionLink,
  CrmButton,
} from "@/modules/crm/components/workspace/crm-workspace";

export type ServiceEnquiryQueueItem = {
  id: string;
  enquiryRef: string | null;
  status: string;
  updatedAt: Date;
  createdAt: Date;
  lead: {
    id: string;
    firstName: string | null;
    lastName: string;
    company: string;
    isPerishable: boolean;
    isFutureFollowUp: boolean;
  };
  assignedTo: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  sourceSnapshot: Record<string, unknown> | null;
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
  return "Pending";
}

function formatLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getStatusTone(status: string): "danger" | "info" | "neutral" | "success" | "warning" {
  if (status.includes("PENDING")) return "warning";
  if (status.includes("PROGRESS")) return "info";
  if (status.includes("COMPLETED") || status.includes("QUALIFIED")) return "success";
  if (status.includes("CANCELLED") || status.includes("REJECTED")) return "danger";
  return "neutral";
}

function getCustomerName(item: ServiceEnquiryQueueItem) {
  const name = [item.lead.firstName, item.lead.lastName].filter(Boolean).join(" ").trim();
  return name || item.lead.company || "Unnamed customer";
}

export function ServiceEnquiryQueue({
  items,
  search,
  serviceLabel,
  basePath,
}: {
  items: ServiceEnquiryQueueItem[];
  search: string;
  serviceLabel: string;
  basePath: "/crm/freight-forwarding" | "/crm/customs-clearance";
}) {
  return (
    <OperationalDataTable>
      <OperationalDataTableHeader
        eyebrow="Demand intake"
        title={`${serviceLabel} queue`}
        actions={
          <>
            <form method="GET" className="contents">
              <label className="mnx-search-field">
                <Search aria-hidden="true" />
                <Input
                  aria-label={`Search ${serviceLabel.toLowerCase()} enquiries`}
                  type="search"
                  name="search"
                  defaultValue={search}
                  placeholder={`Search ${serviceLabel.toLowerCase()} enquiries`}
                />
              </label>
              <CrmButton type="submit">Apply</CrmButton>
            </form>
            <OperationalVisibleRecords visible={items.length} total={items.length} />
          </>
        }
      >
        <p>
          Qualified CRM work items routed into the {serviceLabel.toLowerCase()} workflow.
        </p>
      </OperationalDataTableHeader>

      {items.length === 0 ? (
        <OperationalDataTableWrap>
          <OperationalTable>
            <tbody>
              <OperationalTableEmpty colSpan={9}>
                <div className="flex flex-col items-center justify-center gap-4 p-14 text-center">
                  <div className="space-y-2">
                    <p className="text-sm mnx-text-primary">
                      No {serviceLabel.toLowerCase()} enquiries found
                    </p>
                    <p className="mx-auto max-w-sm text-xs mnx-text-muted">
                      Qualified records routed into {serviceLabel.toLowerCase()} will appear
                      here.
                    </p>
                  </div>
                  <CrmActionLink href="/crm/enquiries" primary>
                    Review CRM enquiries
                  </CrmActionLink>
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
              {items.map((item) => {
                const snapshot = item.sourceSnapshot;
                const mode = readSnapshotValue(snapshot, "type");
                const direction = readSnapshotValue(snapshot, "seaType");
                const origin = readSnapshotValue(snapshot, "pol", "aol");
                const destination = readSnapshotValue(snapshot, "pod", "aod");
                const customerName = getCustomerName(item);

                return (
                  <OperationalLinkedRow
                    key={item.id}
                    href={`${basePath}/${item.id}`}
                    ariaLabel={`Open ${serviceLabel.toLowerCase()} enquiry ${item.enquiryRef || item.id}`}
                  >
                    <OperationalPrimaryCell
                      primary={item.enquiryRef || "Pending reference"}
                      secondary={new Date(item.updatedAt).toLocaleDateString("en-GB")}
                    />
                    <OperationalPrimaryCell
                      primary={customerName}
                      secondary={item.lead.company || "Direct account"}
                    />
                    <OperationalTableCell>{mode}</OperationalTableCell>
                    <OperationalTableCell>{direction}</OperationalTableCell>
                    <OperationalTableCell>{`${origin} -> ${destination}`}</OperationalTableCell>
                    <OperationalTableCell>
                      {readSnapshotValue(snapshot, "commodity")}
                    </OperationalTableCell>
                    <OperationalTableCell>
                      {item.assignedTo?.name || "Assignment pending"}
                    </OperationalTableCell>
                    <OperationalTableCell>
                      <OperationalStatus tone={getStatusTone(item.status)}>
                        {formatLabel(item.status)}
                      </OperationalStatus>
                    </OperationalTableCell>
                    <OperationalTableCell className="text-right">
                      <ButtonLink
                        href={`${basePath}/${item.id}`}
                        variant="inverse"
                        size="sm"
                        data-row-interactive="true"
                      >
                        Open
                      </ButtonLink>
                    </OperationalTableCell>
                  </OperationalLinkedRow>
                );
              })}
            </tbody>
          </OperationalTable>
        </OperationalDataTableWrap>
      )}

      <OperationalDataTableFooter
        summary={`${items.length} ${items.length === 1 ? "record" : "records"} in this queue`}
      />
    </OperationalDataTable>
  );
}
