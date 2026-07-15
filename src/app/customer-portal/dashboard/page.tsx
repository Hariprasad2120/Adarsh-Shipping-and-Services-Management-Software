import Link from "next/link";
import { requirePortalSession } from "@/modules/customer-portal/auth";
import { getPortalDashboard } from "@/modules/customer-portal/service";
import { Badge } from "@/components/ui/badge";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableEmpty,
  DataTableHead,
  DataTableHeader,
  DataTablePrimaryLinkCell,
  DataTableRow,
} from "@/components/data-table";

function formatPortalDate(value: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

export default async function CustomerPortalDashboardPage() {
  const session = await requirePortalSession();
  const data = await getPortalDashboard(session.portalUserId);
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-outline-variant/60 bg-surface p-6 shadow-sm">
        <p className="ds-label">Welcome</p>
        <h2 className="ds-h2 mt-2">{data.customerName}</h2>
        <p className="mt-2 text-sm text-on-surface-variant">
          Signed in as {data.portalUserName}. Track active shipments, complete pending actions, and review recent updates.
        </p>
      </section>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Object.entries(data.stats).map(([key, value]) => (
          <div key={key} className="card-top-accent rounded-xl border border-outline-variant/60 bg-surface p-4 shadow-sm">
            <p className="ds-label">{key}</p>
            <p className="mt-2 text-3xl ds-numeric">{value}</p>
          </div>
        ))}
      </section>
      <section className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="ds-h3">Active Shipments</h3>
              <p className="mt-1 text-sm text-on-surface-variant">Live shipments currently in progress for your account.</p>
            </div>
            <Link href="/customer-portal/shipments?scope=active" className="text-sm font-medium text-[#00cec4] hover:text-[#00b8af] hover:underline">
              View all
            </Link>
          </div>
          <DataTable>
            <DataTableHeader>
              <tr>
                <DataTableHead className="w-[28%]">Job</DataTableHead>
                <DataTableHead className="w-[20%]">Stage</DataTableHead>
                <DataTableHead className="w-[18%]">Documents</DataTableHead>
                <DataTableHead className="w-[20%]">Action</DataTableHead>
                <DataTableHead className="w-[14%] whitespace-nowrap">Updated</DataTableHead>
              </tr>
            </DataTableHeader>
            <DataTableBody>
              {data.activeShipments.length === 0 ? (
                <DataTableEmpty colSpan={5} message="No active shipments are available right now." />
              ) : (
                data.activeShipments.map((shipment) => (
                  <DataTableRow key={shipment.id}>
                    <DataTablePrimaryLinkCell href={`/customer-portal/shipments/${shipment.id}`} className="align-top">
                      <div className="min-w-0">
                        <p className="font-medium text-on-surface">{shipment.jobNumber}</p>
                        <p className="truncate text-xs text-on-surface-variant">
                          {shipment.customerRef || shipment.title}
                        </p>
                      </div>
                    </DataTablePrimaryLinkCell>
                    <DataTableCell className="align-top">
                      <div className="space-y-1">
                        <p>{shipment.currentStage}</p>
                        <Badge variant={shipment.actions.hasActionRequired ? "warning" : "default"} className="w-fit">
                          {shipment.actions.hasActionRequired ? "ACTION REQUIRED" : "ACTIVE"}
                        </Badge>
                      </div>
                    </DataTableCell>
                    <DataTableCell className="align-top">
                      <div className="flex items-center gap-2 whitespace-nowrap">
                        <Badge variant={shipment.actions.pendingDocumentCount > 0 ? "warning" : "success"}>
                          {shipment.actions.pendingDocumentCount > 0 ? "PENDING" : "UP TO DATE"}
                        </Badge>
                        <span className="text-xs text-on-surface-variant">
                          {shipment.actions.pendingDocumentCount > 0
                            ? `${shipment.actions.pendingDocumentCount} pending`
                            : "No pending uploads"}
                        </span>
                      </div>
                    </DataTableCell>
                    <DataTableCell className="align-top">
                      <div className="space-y-1">
                        <p className="text-sm text-on-surface">
                          {shipment.actions.hasActionRequired ? "Action needed" : "Tracking only"}
                        </p>
                        <p className="text-xs text-on-surface-variant">
                          {shipment.actions.checklistPending
                            ? "Checklist approval pending"
                            : shipment.actions.openQueryCount > 0
                              ? `${shipment.actions.openQueryCount} open quer${shipment.actions.openQueryCount === 1 ? "y" : "ies"}`
                              : shipment.contactName ?? "Support assigned"}
                        </p>
                      </div>
                    </DataTableCell>
                    <DataTableCell className="align-top whitespace-nowrap">{formatPortalDate(shipment.lastUpdatedAt)}</DataTableCell>
                  </DataTableRow>
                ))
              )}
            </DataTableBody>
          </DataTable>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="ds-h3">Completed Shipments</h3>
              <p className="mt-1 text-sm text-on-surface-variant">Recently closed shipments retained for tracking history and ratings.</p>
            </div>
            <Link href="/customer-portal/shipments?scope=completed" className="text-sm font-medium text-[#00cec4] hover:text-[#00b8af] hover:underline">
              View all
            </Link>
          </div>
          <DataTable>
            <DataTableHeader>
              <tr>
                <DataTableHead>Job</DataTableHead>
                <DataTableHead>Final Stage</DataTableHead>
                <DataTableHead>Status</DataTableHead>
                <DataTableHead>Rating</DataTableHead>
                <DataTableHead>Contact</DataTableHead>
                <DataTableHead>Updated</DataTableHead>
              </tr>
            </DataTableHeader>
            <DataTableBody>
              {data.completedShipments.length === 0 ? (
                <DataTableEmpty colSpan={6} message="No completed shipments are available yet." />
              ) : (
                data.completedShipments.map((shipment) => (
                  <DataTableRow key={shipment.id}>
                    <DataTablePrimaryLinkCell href={`/customer-portal/shipments/${shipment.id}`}>
                      <div className="min-w-0">
                        <p className="font-medium text-on-surface">{shipment.jobNumber}</p>
                        <p className="truncate text-xs text-on-surface-variant">
                          {shipment.customerRef || shipment.title}
                        </p>
                      </div>
                    </DataTablePrimaryLinkCell>
                    <DataTableCell>{shipment.currentStage}</DataTableCell>
                    <DataTableCell>
                      <Badge variant="success">COMPLETED</Badge>
                    </DataTableCell>
                    <DataTableCell>
                      <Badge variant={shipment.actions.ratingPending ? "warning" : "secondary"}>
                        {shipment.actions.ratingPending ? "PENDING" : "SUBMITTED"}
                      </Badge>
                    </DataTableCell>
                    <DataTableCell>{shipment.contactName ?? "Customer support assigned"}</DataTableCell>
                    <DataTableCell>{formatPortalDate(shipment.lastUpdatedAt)}</DataTableCell>
                  </DataTableRow>
                ))
              )}
            </DataTableBody>
          </DataTable>
        </div>
      </section>
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-outline-variant/60 bg-surface p-5 shadow-sm">
          <h3 className="ds-h3">Action Required</h3>
          <div className="mt-4 space-y-3">
            {data.actionRequired.length === 0 ? (
              <p className="text-sm text-on-surface-variant">No customer action is pending right now.</p>
            ) : (
              data.actionRequired.map((shipment) => (
                <Link key={shipment.id} href={`/customer-portal/shipments/${shipment.id}`} className="block rounded-xl border border-outline-variant/60 p-4 hover-cyan">
                  <p className="text-sm font-medium">{shipment.jobNumber}</p>
                  <p className="mt-1 text-xs text-on-surface-variant">{shipment.currentStage}</p>
                </Link>
              ))
            )}
          </div>
        </div>
        <div className="rounded-xl border border-outline-variant/60 bg-surface p-5 shadow-sm">
          <h3 className="ds-h3">Recent Notifications</h3>
          <div className="mt-4 space-y-3">
            {data.recentNotifications.length === 0 ? (
              <p className="text-sm text-on-surface-variant">No notifications yet.</p>
            ) : (
              data.recentNotifications.map((notification) => (
                <div key={notification.id} className="rounded-xl border border-outline-variant/60 p-4">
                  <p className="text-sm font-medium">{notification.title}</p>
                  <p className="mt-1 text-xs text-on-surface-variant">{notification.body}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
