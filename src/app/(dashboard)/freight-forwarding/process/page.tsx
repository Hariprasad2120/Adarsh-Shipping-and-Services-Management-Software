import Link from "next/link";
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
import { ButtonLink } from "@/components/ui/button";
import { getSession } from "@/lib/auth";
import { listPendingFreightQuoteProcesses } from "@/modules/crm/quote-process";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Freight Forwarding Process | Adarsh Shipping",
};

export default async function FreightForwardingProcessPage() {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");
  const orgId = session.user.orgId;
  if (!orgId) redirect("/login");

  const items = await listPendingFreightQuoteProcesses(orgId);

  return (
    <WorkspacePage>
      <WorkspacePageHeader
        eyebrow="Freight forwarding"
        title="Process"
        description="Approved quotations land here first. Review the quote details, then open a record to choose transaction mode and complete the freight booking."
      />

      <OperationalDataTable>
        <OperationalDataTableHeader
          eyebrow="Quote handoff"
          title="Freight process queue"
          actions={<OperationalVisibleRecords visible={items.length} total={items.length} />}
        >
          <p>Only quotation details are shown here until the freight team starts processing.</p>
        </OperationalDataTableHeader>

        {items.length === 0 ? (
          <OperationalDataTableWrap>
            <OperationalTable>
              <tbody>
                <OperationalTableEmpty colSpan={8}>
                  <div className="flex flex-col items-center justify-center gap-4 p-14 text-center">
                    <p className="text-sm mnx-text-primary">No freight quotations are waiting for processing.</p>
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
                  <OperationalTableHead>Quotation</OperationalTableHead>
                  <OperationalTableHead>Customer</OperationalTableHead>
                  <OperationalTableHead>Reference</OperationalTableHead>
                  <OperationalTableHead>Route</OperationalTableHead>
                  <OperationalTableHead>Commodity</OperationalTableHead>
                  <OperationalTableHead>Container plan</OperationalTableHead>
                  <OperationalTableHead>Status</OperationalTableHead>
                  <OperationalTableHead className="text-right">Open</OperationalTableHead>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <OperationalPrimaryCell
                      primary={item.quoteNumber}
                      secondary={new Date(item.createdAt).toLocaleDateString("en-GB")}
                    />
                    <OperationalPrimaryCell
                      primary={item.customerName}
                      secondary={item.ownerName || "Owner not assigned"}
                    />
                    <OperationalTableCell>{item.referenceNumber}</OperationalTableCell>
                    <OperationalTableCell>
                      {[item.portOfLoading || item.location || "Origin", item.portOfDischarge || item.portOfDestinationCountry || "Destination"].join(" -> ")}
                    </OperationalTableCell>
                    <OperationalTableCell>{item.commodity || "Not captured"}</OperationalTableCell>
                    <OperationalTableCell>
                      {item.numberOfContainers
                        ? `${item.numberOfContainers} x ${item.containerType || "Container"}`
                        : item.containerType || "Not captured"}
                    </OperationalTableCell>
                    <OperationalTableCell>
                      <OperationalStatus tone="warning">Awaiting processing</OperationalStatus>
                    </OperationalTableCell>
                    <OperationalTableCell className="text-right">
                      <Link
                        href={`/freight-forwarding/process/${item.id}`}
                        className="inline-flex items-center rounded-xl bg-[var(--mnx-surface)] px-3 py-2 text-xs font-semibold text-[var(--mnx-text-strong)]"
                      >
                        Open
                      </Link>
                    </OperationalTableCell>
                  </tr>
                ))}
              </tbody>
            </OperationalTable>
          </OperationalDataTableWrap>
        )}

        <OperationalDataTableFooter
          summary={`${items.length} ${items.length === 1 ? "quotation" : "quotations"} in the freight process queue`}
        />
      </OperationalDataTable>
    </WorkspacePage>
  );
}
