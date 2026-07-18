import Link from "next/link";
import { requirePortalSession } from "@/modules/customer-portal/auth";
import { listPortalShipments } from "@/modules/customer-portal/service";
import { PortalShipmentsFilterPanel } from "../_components/client-actions";
import { Badge } from "@/components/ui/badge";
import type { PortalShipmentScope } from "@/modules/customer-portal/types";

function formatPortalDate(value: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(value);
}

export default async function CustomerPortalShipmentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    scope?: string;
    search?: string;
    mode?: string;
    trade?: string;
  }>;
}) {
  const session = await requirePortalSession();
  const params = await searchParams;

  const scope: PortalShipmentScope =
    params.scope === "active" || params.scope === "action" || params.scope === "completed" || params.scope === "all"
      ? params.scope
      : "all";
  const search = params.search ?? "";
  const mode = params.mode ?? "all";
  const trade = params.trade ?? "all";

  const shipments = await listPortalShipments(session.portalUserId, {
    scope,
    search,
  });

  const filteredShipments = shipments.filter((shipment) => {
    if (mode !== "all") {
      const modeKey = mode.toLowerCase();
      const isSea = shipment.clearanceType.toLowerCase().includes("sea") || shipment.clearanceType.toLowerCase().includes("ocean");
      const isAir = shipment.clearanceType.toLowerCase().includes("air");
      if (modeKey === "sea" && !isSea) return false;
      if (modeKey === "air" && !isAir) return false;
    }
    if (trade !== "all") {
      const tradeKey = trade.toLowerCase();
      const isImport = shipment.shipmentType.toLowerCase().includes("import");
      const isExport = shipment.shipmentType.toLowerCase().includes("export");
      if (tradeKey === "import" && !isImport) return false;
      if (tradeKey === "export" && !isExport) return false;
    }
    return true;
  });

  const actionRequiredCount = filteredShipments.filter((shipment) => shipment.actions.hasActionRequired).length;
  const averageProgress =
    filteredShipments.length > 0
      ? Math.round(filteredShipments.reduce((sum, shipment) => sum + shipment.progressPercent, 0) / filteredShipments.length)
      : 0;
  const openQueryCount = filteredShipments.reduce((sum, shipment) => sum + shipment.actions.openQueryCount, 0);

  return (
    <div className="space-y-6 font-sans">
      <section className="rounded-[28px] border border-outline-variant/60 bg-surface p-6 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.35)]">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-3">
            <p className="ds-label text-[#00cec4]">Customer shipment command view</p>
            <div>
              <h2 className="ds-h2">Shipment Logbook</h2>
              <p className="mt-2 max-w-3xl text-sm text-on-surface-variant">
                Track every clearance job from one live board with action signals, progress visibility, and a direct route into each shipment file.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="card-top-accent rounded-2xl border border-outline-variant/45 bg-surface-container-low/55 p-4">
              <p className="ds-label">Visible Shipments</p>
              <p className="mt-2 ds-numeric text-2xl text-on-surface">{filteredShipments.length}</p>
              <p className="mt-1 text-xs text-on-surface-variant">Matching current filters</p>
            </div>
            <div className="card-top-accent-orange rounded-2xl border border-outline-variant/45 bg-surface-container-low/55 p-4">
              <p className="ds-label">Action Required</p>
              <p className="mt-2 ds-numeric text-2xl text-on-surface">{actionRequiredCount}</p>
              <p className="mt-1 text-xs text-on-surface-variant">Jobs awaiting customer response</p>
            </div>
            <div className="card-top-accent rounded-2xl border border-outline-variant/45 bg-surface-container-low/55 p-4">
              <p className="ds-label">Average Progress</p>
              <p className="mt-2 ds-numeric text-2xl text-on-surface">{averageProgress}%</p>
              <p className="mt-1 text-xs text-on-surface-variant">{openQueryCount} open query threads</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-outline-variant/60 bg-surface p-5 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.3)]">
        <PortalShipmentsFilterPanel
          initialSearch={search}
          initialScope={scope}
          initialMode={mode}
          initialTrade={trade}
        />
      </section>

      <div className="overflow-hidden rounded-[28px] border border-outline-variant/60 bg-surface shadow-[0_24px_70px_-48px_rgba(15,23,42,0.28)]">
        {filteredShipments.length === 0 ? (
          <div className="space-y-2 py-16 text-center text-sm font-medium text-on-surface-variant">
            <p>No shipments match the selected filters.</p>
            <p className="text-xs opacity-60">Try adjustments or reset all parameters.</p>
          </div>
        ) : (
          <>
            <div className="hidden md:block">
              <table className="ds-table">
                <thead>
                  <tr>
                    <th>Job Number</th>
                    <th>Reference</th>
                    <th>Transit</th>
                    <th>Trade</th>
                    <th>Current Stage</th>
                    <th>Action State</th>
                    <th>Ops Pulse</th>
                    <th>Progress</th>
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredShipments.map((shipment) => (
                    <tr key={shipment.id} className="ds-row-link" style={{ cursor: "pointer" }}>
                      <td className="font-medium text-on-surface">
                        <Link href={`/customer-portal/shipments/${shipment.id}`} className="hover:underline">
                          {shipment.jobNumber}
                        </Link>
                      </td>
                      <td className="text-on-surface-variant">{shipment.customerRef || shipment.title || "—"}</td>
                      <td className="text-on-surface-variant font-medium">{shipment.clearanceType}</td>
                      <td className="text-on-surface-variant font-medium">{shipment.shipmentType}</td>
                      <td className="font-semibold text-on-surface">{shipment.currentStage}</td>
                      <td>
                        <Badge
                          variant={shipment.actions.hasActionRequired ? "warning" : "default"}
                          style={{
                            backgroundColor: shipment.actions.hasActionRequired ? "rgba(251,146,60,0.1)" : "rgba(0,206,196,0.1)",
                            color: shipment.actions.hasActionRequired ? "#fb923c" : "#00cec4",
                            border: "none",
                          }}
                        >
                          {shipment.actions.hasActionRequired ? "ACTION REQUIRED" : "ACTIVE"}
                        </Badge>
                      </td>
                      <td className="text-xs text-on-surface-variant">
                        <span className="block">
                          Docs: <span className="ds-numeric text-on-surface">{shipment.actions.pendingDocumentCount}</span>
                        </span>
                        <span className="mt-1 block">
                          Queries: <span className="ds-numeric text-on-surface">{shipment.actions.openQueryCount}</span>
                        </span>
                      </td>
                      <td>
                        <div className="min-w-[140px] space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-on-surface-variant">Completion</span>
                            <span className="ds-numeric font-semibold text-[#00cec4]">{shipment.progressPercent}%</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-surface-container">
                            <div className="h-full rounded-full bg-[#00cec4]" style={{ width: `${shipment.progressPercent}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="ds-numeric text-on-surface-variant">{formatPortalDate(shipment.lastUpdatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="block divide-y divide-outline-variant/30 md:hidden">
              {filteredShipments.map((shipment) => (
                <Link
                  key={shipment.id}
                  href={`/customer-portal/shipments/${shipment.id}`}
                  className="block bg-surface p-4 transition-colors hover:bg-surface-container-low"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#00cec4]">{shipment.jobNumber}</p>
                      <h4 className="mt-0.5 text-sm font-bold text-on-surface">
                        {shipment.customerRef || shipment.title || "No Reference"}
                      </h4>
                    </div>
                    <span className="ds-numeric text-xs font-bold text-[#00cec4]">{shipment.progressPercent}%</span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-container">
                    <div className="h-full rounded-full bg-[#00cec4]" style={{ width: `${shipment.progressPercent}%` }} />
                  </div>
                  <div className="mt-4 flex items-end justify-between">
                    <div className="space-y-1">
                      <p className="text-[11px] font-medium text-on-surface-variant">
                        {shipment.clearanceType} • {shipment.shipmentType} • {shipment.currentStage}
                      </p>
                      <p className="text-[11px] text-on-surface-variant">
                        Docs {shipment.actions.pendingDocumentCount} • Queries {shipment.actions.openQueryCount}
                      </p>
                    </div>
                    <Badge
                      variant={shipment.actions.hasActionRequired ? "warning" : "default"}
                      className="text-[10px]"
                      style={{
                        backgroundColor: shipment.actions.hasActionRequired ? "rgba(251,146,60,0.1)" : "rgba(0,206,196,0.1)",
                        color: shipment.actions.hasActionRequired ? "#fb923c" : "#00cec4",
                        border: "none",
                      }}
                    >
                      {shipment.actions.hasActionRequired ? "ACTION" : "ACTIVE"}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
