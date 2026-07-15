import Link from "next/link";
import { requirePortalSession } from "@/modules/customer-portal/auth";
import { listPortalShipments } from "@/modules/customer-portal/service";

export default async function CustomerPortalShipmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: "active" | "action" | "completed" | "all"; search?: string }>;
}) {
  const session = await requirePortalSession();
  const params = await searchParams;
  const shipments = await listPortalShipments(session.portalUserId, {
    scope: params.scope ?? "all",
    search: params.search,
  });
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-outline-variant/60 bg-surface p-5 shadow-sm">
        <h2 className="ds-h2">Shipments</h2>
        <p className="mt-2 text-sm text-on-surface-variant">
          Active, completed, and action-required CHA shipments linked to your customer account.
        </p>
      </div>
      <div className="grid gap-4">
        {shipments.map((shipment) => (
          <Link key={shipment.id} href={`/customer-portal/shipments/${shipment.id}`} className="card-left-accent rounded-xl border border-outline-variant/60 bg-surface p-5 shadow-sm hover-cyan">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="ds-label">{shipment.jobNumber}</p>
                <h3 className="mt-1 text-lg font-medium">{shipment.title}</h3>
                <p className="mt-1 text-sm text-on-surface-variant">
                  {shipment.currentStage} • {shipment.shipmentType} • {shipment.clearanceType}
                </p>
              </div>
              <div className="text-sm text-on-surface-variant">
                <p className="ds-numeric">{shipment.progressPercent}%</p>
                <p>{shipment.contactName ?? "Customer support assigned"}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
