import Link from "next/link";
import { requirePortalSession } from "@/modules/customer-portal/auth";
import { listPortalShipments } from "@/modules/customer-portal/service";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, ArrowRight } from "lucide-react";

export default async function CustomerPortalApprovalsPage() {
  const session = await requirePortalSession();
  const shipments = await listPortalShipments(session.portalUserId, { scope: "active" });

  // Filter shipments that need checklist approvals
  const pendingApprovals = shipments.filter((s) => s.actions.checklistPending);

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="rounded-xl border border-outline-variant/60 bg-surface p-5 shadow-sm">
        <h2 className="ds-h2">Actionable Approvals</h2>
        <p className="mt-2 text-sm text-on-surface-variant">
          Review and approve draft customs checklists before filing submissions are sent to customs house agents.
        </p>
      </div>

      {/* Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {pendingApprovals.length === 0 ? (
          <div className="col-span-2 rounded-xl border border-outline-variant/40 bg-surface p-12 text-center space-y-3">
            <CheckSquare className="size-10 text-[#00cec4] mx-auto opacity-50" />
            <h3 className="ds-h3 text-on-surface">
              No Pending Approvals
            </h3>
            <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
              You are all caught up! There are no draft checklists awaiting your confirmation right now.
            </p>
          </div>
        ) : (
          pendingApprovals.map((shipment) => (
            <div
              key={shipment.id}
              className="card-top-accent-orange flex flex-col justify-between rounded-xl border border-outline-variant/60 bg-surface p-5 shadow-sm relative overflow-hidden"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="ds-label text-xs tracking-wider">{shipment.jobNumber}</span>
                  <Badge
                    variant="warning"
                    style={{
                      backgroundColor: "rgba(251,146,60,0.1)",
                      color: "#fb923c",
                      border: "none",
                      fontSize: "10px",
                    }}
                  >
                    Checklist Pending
                  </Badge>
                </div>

                <h3 className="ds-h3 text-on-surface">
                  {shipment.customerRef || shipment.title || "Customs Checklist"}
                </h3>
                <p className="text-xs text-on-surface-variant font-medium">
                  Stage: {shipment.currentStage} · Updated: {new Date(shipment.lastUpdatedAt).toLocaleDateString()}
                </p>
              </div>

              <div className="border-t border-outline-variant/20 mt-4 pt-4 flex justify-end">
                <Link
                  href={`/customer-portal/shipments/${shipment.id}?tab=approvals`}
                  className="ds-button"
                >
                  <span>Review & Approve</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
