import type { CSSProperties } from "react";
import Link from "next/link";
import { requirePortalSession } from "@/modules/customer-portal/auth";
import { getPortalDashboard } from "@/modules/customer-portal/service";
import { PortalShipHeroCard } from "../_components/client-actions";
import {
  CheckSquare,
  MessageSquare,
  TrendingUp,
  Package,
} from "lucide-react";

function formatPortalDate(value: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

const DEFAULT_STAGES = [
  { key: "DOCUMENT_COLLECTION", label: "Documents" },
  { key: "ADDITIONAL_DATA", label: "Verification" },
  { key: "CHECKLIST_PREPARATION", label: "Checklist Prep" },
  { key: "CHECKLIST_APPROVAL", label: "Approvals" },
  { key: "FILING", label: "Filing" },
  { key: "COMPLETED", label: "Out of Charge" },
  { key: "FILED", label: "Delivered" },
];

export default async function CustomerPortalDashboardPage() {
  const session = await requirePortalSession();
  const data = await getPortalDashboard(session.portalUserId);

  const priorityShipment = data.activeShipments[0] || null;

  // Determine timeline progress percent
  let activeStageIndex = 0;
  if (priorityShipment) {
    const internalStage = priorityShipment.status === "FILED" || priorityShipment.currentStage.toLowerCase().includes("complete") ? "FILED" : "FILING";
    const foundIndex = DEFAULT_STAGES.findIndex(s => s.key === internalStage || priorityShipment.currentStage.toLowerCase().includes(s.label.toLowerCase()));
    activeStageIndex = foundIndex !== -1 ? foundIndex : 3; // default to 3 (Approvals) if not found
  }
  const timelineProgress = `${Math.round((activeStageIndex / (DEFAULT_STAGES.length - 1)) * 100)}%`;

  return (
    <div className="space-y-6 font-sans">
      {/* Welcome row */}
      <div className="portal-welcome-row font-sans">
        <div>
          <h1>Good morning, {data.portalUserName}</h1>
          <p className="text-on-surface-variant font-medium">
            Manage your compliance files, track customs clearance, and complete checklist approvals for <span className="font-semibold text-on-surface">{data.customerName}</span>.
          </p>
        </div>
        <div className="portal-live-chip shrink-0 select-none">
          <i></i> Live CHA updates connected
        </div>
      </div>

      {/* Hero row: Priority shipment cargo 3D + Action centre */}
      <section className="portal-grid portal-hero-grid font-sans">
        <PortalShipHeroCard shipment={priorityShipment} />

        <article className="portal-card portal-actions-panel">
          <div className="portal-section-title font-sans">
            <h2>Action centre</h2>
            <span>{data.stats.shipmentsRequiringAction} item(s) need attention</span>
          </div>

          <div className="portal-action-list font-sans">
            {data.actionRequired.length === 0 ? (
              <div className="rounded-xl border border-outline-variant/40 bg-surface-container-low p-6 text-center space-y-2">
                <CheckSquare className="size-8 text-[#00cec4] mx-auto opacity-50" />
                <p className="text-xs font-semibold text-on-surface">All tasks completed!</p>
                <p className="text-[10px] text-on-surface-variant">There are no pending actions on your active shipments.</p>
              </div>
            ) : (
              data.actionRequired.map((shipment) => {
                const hasChecklist = shipment.actions.checklistPending;
                const hasQuery = shipment.actions.openQueryCount > 0;
                
                let iconClass = "portal-action-icon";
                let actionText = "Awaiting review";
                let btnLabel = "Review now";

                if (hasChecklist) {
                  iconClass = "portal-action-icon warning";
                  actionText = "Review and approve the draft customs checklist before filing.";
                  btnLabel = "Approve Draft";
                } else if (hasQuery) {
                  iconClass = "portal-action-icon danger";
                  actionText = `Customs raised query. Provide composition details to resume clearance.`;
                  btnLabel = "Resolve Query";
                }

                return (
                  <Link
                    key={shipment.id}
                    href={`/customer-portal/shipments/${shipment.id}`}
                    className="portal-action-item"
                  >
                    <div className={iconClass}>
                      <CheckSquare size={18} />
                    </div>
                    <div className="portal-action-copy">
                      <strong>{shipment.jobNumber}</strong>
                      <span>{actionText}</span>
                    </div>
                    <button className="portal-action-cta primary">{btnLabel}</button>
                  </Link>
                );
              })
            )}
          </div>
        </article>
      </section>

      {/* Metrics Row */}
      <section className="portal-grid portal-metrics font-sans">
        <article className="portal-card portal-metric-card">
          <div className="portal-metric-top">
            <div className="portal-metric-icon">
              <Package size={16} />
            </div>
            <span className="portal-metric-change">Live tracking</span>
          </div>
          <div className="portal-metric-value ds-numeric">{String(data.stats.activeShipments).padStart(2, "0")}</div>
          <div className="portal-metric-label">Active shipments</div>
        </article>

        <article className="portal-card portal-metric-card">
          <div className="portal-metric-top">
            <div className="portal-metric-icon" style={{ color: "#fb923c" }}>
              <CheckSquare size={16} />
            </div>
            <span className="portal-metric-change" style={{ color: "#fb923c" }}>
              {data.stats.checklistsAwaitingApproval} pending
            </span>
          </div>
          <div className="portal-metric-value ds-numeric">{String(data.stats.completedShipments).padStart(2, "0")}</div>
          <div className="portal-metric-label">Completed jobs</div>
        </article>

        <article className="portal-card portal-metric-card">
          <div className="portal-metric-top">
            <div className="portal-metric-icon" style={{ color: "#ef4444" }}>
              <MessageSquare size={16} />
            </div>
            <span className="portal-metric-change" style={{ color: "#ef4444" }}>
              Needs response
            </span>
          </div>
          <div className="portal-metric-value ds-numeric">{String(data.stats.openQueries).padStart(2, "0")}</div>
          <div className="portal-metric-label">Open query threads</div>
        </article>

        <article className="portal-card portal-metric-card">
          <div className="portal-metric-top">
            <div className="portal-metric-icon" style={{ color: "#22c55e" }}>
              <TrendingUp size={16} />
            </div>
            <span className="portal-metric-change" style={{ color: "#22c55e" }}>
              Active SLA
            </span>
          </div>
          <div className="portal-metric-value ds-numeric">100%</div>
          <div className="portal-metric-label">Clearance compliance</div>
        </article>
      </section>

      {/* Clearance journey + Notifications */}
      <section className="portal-grid portal-lower-grid font-sans">
        <article className="portal-card portal-timeline-card flex flex-col justify-between">
          <div className="portal-section-title font-sans">
            <h2>Live customs clearance journey</h2>
            {priorityShipment ? (
              <span>Tracking Priority {priorityShipment.jobNumber}</span>
            ) : (
              <span>No active shipments</span>
            )}
          </div>

          {priorityShipment ? (
            <div className="portal-timeline" style={{ "--portal-timeline-progress": timelineProgress } as CSSProperties}>
              {DEFAULT_STAGES.map((stage, idx) => {
                let statusClass = "";
                if (idx < activeStageIndex) statusClass = "done";
                else if (idx === activeStageIndex) statusClass = "active";

                return (
                  <div key={stage.key} className={`portal-stage ${statusClass}`}>
                    <div className="portal-stage-dot">
                      {idx < activeStageIndex ? "✓" : idx + 1}
                    </div>
                    <strong>{stage.label}</strong>
                    <span>{idx === activeStageIndex ? "Live" : idx < activeStageIndex ? "Passed" : "Upcoming"}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-portal-muted text-xs">
              Timeline will activate when a shipment is processed.
            </div>
          )}
        </article>

        <article className="portal-card portal-activity-card">
          <div className="portal-section-title font-sans">
            <h2>Live activity log</h2>
            <Link href="/customer-portal/notifications" className="text-xs text-[#00cec4] hover:underline">
              View all
            </Link>
          </div>

          <div className="portal-activity-list font-sans">
            {data.recentNotifications.length === 0 ? (
              <p className="text-xs text-on-surface-variant p-6 text-center italic">No recent activity logged.</p>
            ) : (
              data.recentNotifications.map((notification) => (
                <div key={notification.id} className="portal-activity-item">
                  <div className="portal-activity-dot">⚡</div>
                  <div>
                    <strong>{notification.title}</strong>
                    <p>{notification.body}</p>
                  </div>
                  <span className="portal-activity-time">{formatPortalDate(notification.createdAt).split(",")[1]}</span>
                </div>
              ))
            )}
          </div>
        </article>
      </section>

      {/* Expansion ecosystem card */}
      <section className="portal-card portal-expansion-row font-sans">
        <div>
          <strong>Built for the complete Monolith ecosystem</strong>
          <p>
            Customs clearance tracking is fully enabled. Additional Monolith modules will expand here without structural layout changes.
          </p>
        </div>
        <div className="portal-module-chips font-sans select-none">
          <span className="active">CHA Live</span>
          <span>Freight</span>
          <span>CRM</span>
          <span>Finance</span>
          <span>Support</span>
          <span>Analytics</span>
        </div>
      </section>
    </div>
  );
}
