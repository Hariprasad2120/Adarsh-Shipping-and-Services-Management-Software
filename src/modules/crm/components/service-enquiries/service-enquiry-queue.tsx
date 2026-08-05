"use client";

import { Search } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import {
  CrmButton,
  CrmEmptyState,
  CrmInput,
  CrmPanel,
  CrmSection,
  CrmTable,
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
  return "—";
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
    <div className="space-y-6">
      <CrmSection
        title={`${serviceLabel} queue`}
        description={`Qualified CRM work items routed into the ${serviceLabel.toLowerCase()} workflow.`}
      >
        <form method="GET" className="flex gap-3">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-2.5 size-4 text-mono-muted" />
            <CrmInput
              type="text"
              name="search"
              defaultValue={search}
              placeholder={`Search ${serviceLabel.toLowerCase()} enquiries`}
              className="w-full pl-9"
            />
          </div>
          <CrmButton type="submit">Apply</CrmButton>
        </form>
      </CrmSection>

      <CrmPanel>
        {items.length === 0 ? (
          <CrmEmptyState
            title={`No ${serviceLabel.toLowerCase()} enquiries`}
            description={`Qualified records routed into ${serviceLabel.toLowerCase()} will appear here.`}
          />
        ) : (
          <div className="overflow-x-auto">
            <CrmTable>
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left">Reference</th>
                  <th className="px-4 py-3 text-left">Customer</th>
                  <th className="px-4 py-3 text-left">Mode</th>
                  <th className="px-4 py-3 text-left">Direction</th>
                  <th className="px-4 py-3 text-left">Route</th>
                  <th className="px-4 py-3 text-left">Commodity</th>
                  <th className="px-4 py-3 text-left">Assignment</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Open</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const snapshot = item.sourceSnapshot;
                  const mode =
                    serviceLabel === "Freight Forwarding"
                      ? readSnapshotValue(snapshot, "type")
                      : readSnapshotValue(snapshot, "type");
                  const direction =
                    serviceLabel === "Freight Forwarding"
                      ? readSnapshotValue(snapshot, "seaType")
                      : readSnapshotValue(snapshot, "seaType");
                  const route =
                    serviceLabel === "Freight Forwarding"
                      ? `${readSnapshotValue(snapshot, "pol", "aol")} → ${readSnapshotValue(snapshot, "pod", "aod")}`
                      : `${readSnapshotValue(snapshot, "pol", "aol")} → ${readSnapshotValue(snapshot, "pod", "aod")}`;

                  return (
                    <tr key={item.id}>
                      <td className="px-4 py-3 font-medium">
                        {item.enquiryRef || "Pending reference"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">
                          {[item.lead.firstName, item.lead.lastName].filter(Boolean).join(" ")}
                        </div>
                        <div className="text-xs text-mono-muted">{item.lead.company}</div>
                      </td>
                      <td className="px-4 py-3">{mode}</td>
                      <td className="px-4 py-3">{direction}</td>
                      <td className="px-4 py-3">{route}</td>
                      <td className="px-4 py-3">{readSnapshotValue(snapshot, "commodity")}</td>
                      <td className="px-4 py-3">
                        {item.assignedTo?.name || "Assignment pending"}
                      </td>
                      <td className="px-4 py-3">{item.status.replaceAll("_", " ")}</td>
                      <td className="px-4 py-3 text-right">
                        <ButtonLink href={`${basePath}/${item.id}`} variant="inverse">
                          Open
                        </ButtonLink>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </CrmTable>
          </div>
        )}
      </CrmPanel>
    </div>
  );
}
