"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  Coins,
  FileSearch,
  MapPinned,
  RefreshCw,
  Route,
  ShieldAlert,
  Wallet,
  Waypoints,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  PeopleErrorState,
  PeopleField,
  PeopleInput,
  PeopleLoadingState,
  PeoplePerson,
  PeopleSection,
  PeopleSectionHeader,
  PeopleSummary,
  PeopleSummaryGrid,
  PeopleTable,
  PeopleTableBody,
  PeopleTableCell,
  PeopleTableEmpty,
  PeopleTableHead,
  PeopleTableHeader,
  PeopleTableRow,
  PeopleTextarea,
} from "@/modules/people/components";
import {
  WorkspaceAction,
  WorkspaceAlert,
  WorkspaceBadge,
  WorkspaceSectionHeading,
  WorkspaceSelect,
} from "@/components/layout/workspace";
import { Modal } from "@/components/ui/modal";

type PersonSummary = {
  id: string;
  name: string;
  email: string;
  designation?: string | null;
};

type TrackingPoint = {
  latitude: number;
  longitude: number;
  timestamp: string;
};

type TrackingSession = {
  id: string;
  locationPoints: TrackingPoint[];
};

type OnDutyRequestRow = {
  id: string;
  fromDate: string;
  toDate: string;
  startTime?: string | null;
  endTime?: string | null;
  reason: string;
  purpose?: string | null;
  clientReference?: string | null;
  visitLocation?: string | null;
  visitAddress?: string | null;
  status: string;
  startedAt?: string | null;
  completedAt?: string | null;
  totalDistanceKm?: number | null;
  createdAt: string;
  approvedAt?: string | null;
  user: PersonSummary;
  trackingSessions: TrackingSession[];
};

type TrackingAlertRow = {
  id: string;
  alertType: string;
  message: string;
  createdAt: string;
  lastKnownLat?: number | null;
  lastKnownLng?: number | null;
  user: PersonSummary;
};

type ReimbursementClaimRow = {
  id: string;
  amount: number;
  ratePerKm: number;
  distanceKm: number;
  status: string;
  createdAt: string;
  approvedAt?: string | null;
  paidAt?: string | null;
  rejectedReason?: string | null;
  user: PersonSummary;
  onDutyRequest: {
    id: string;
    fromDate: string;
    toDate: string;
    purpose?: string | null;
    reason: string;
    totalDistanceKm?: number | null;
    status: string;
  };
};

type OnDutyDashboardData = {
  summary: {
    directReports: number;
    totalRequests: number;
    pendingApprovals: number;
    approvedAwaitingStart: number;
    activeTrips: number;
    openAlerts: number;
    claimsInFlight: number;
    settlementExposure: number;
    completedThisMonth: number;
    averageDistanceKm: number;
  };
  pendingApprovals: OnDutyRequestRow[];
  activeTrips: OnDutyRequestRow[];
  recentRequests: OnDutyRequestRow[];
  trackingAlerts: TrackingAlertRow[];
  reimbursementClaims: ReimbursementClaimRow[];
};

type RouteReviewData = OnDutyRequestRow & {
  routeSummary?: Array<{ lat: number; lng: number; time: string }>;
  trackingSessions: Array<{
    id: string;
    locationPoints: Array<{
      latitude: number;
      longitude: number;
      timestamp: string;
    }>;
  }>;
};

type HistoryStatusFilter =
  | "all"
  | "PENDING"
  | "APPROVED"
  | "ACTIVE"
  | "COMPLETED"
  | "REJECTED"
  | "CANCELLED";

const HIGH_RISK_ALERTS = new Set([
  "MOCK_DETECTED",
  "APP_KILLED",
  "PERMISSION_DENIED",
]);

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDateRange(request: Pick<OnDutyRequestRow, "fromDate" | "toDate" | "startTime" | "endTime">) {
  const sameDay =
    new Date(request.fromDate).toDateString() ===
    new Date(request.toDate).toDateString();

  const dateLabel = sameDay
    ? formatDate(request.fromDate)
    : `${formatDate(request.fromDate)} to ${formatDate(request.toDate)}`;
  const timeParts = [request.startTime, request.endTime].filter(Boolean);

  return timeParts.length > 0 ? `${dateLabel} • ${timeParts.join(" - ")}` : dateLabel;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDistance(value?: number | null) {
  if (value == null || value <= 0) return "No route distance yet";
  return `${value.toFixed(1)} km tracked`;
}

function formatCoordinates(lat?: number | null, lng?: number | null) {
  if (lat == null || lng == null) return "No coordinate recorded";
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

function getMinutesSince(value?: string | null) {
  if (!value) return null;
  const ageMs = Date.now() - new Date(value).getTime();
  return Math.max(0, Math.round(ageMs / 60000));
}

function formatMinutesSince(value?: string | null) {
  const minutes = getMinutesSince(value);
  if (minutes == null) return "No heartbeat";
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder === 0 ? `${hours} hr ago` : `${hours} hr ${remainder} min ago`;
}

function getRequestBadgeVariant(status: string) {
  switch (status) {
    case "PENDING":
      return "warning";
    case "APPROVED":
      return "accent";
    case "ACTIVE":
      return "success";
    case "COMPLETED":
      return "success";
    case "REJECTED":
      return "danger";
    default:
      return "neutral";
  }
}

function getClaimBadgeVariant(status: string) {
  switch (status) {
    case "PENDING":
      return "warning";
    case "APPROVED":
      return "accent";
    case "PAID":
      return "success";
    case "REJECTED":
      return "danger";
    default:
      return "neutral";
  }
}

function getHeartbeatVariant(lastPoint?: TrackingPoint) {
  const minutes = getMinutesSince(lastPoint?.timestamp);
  if (minutes == null) return "neutral";
  if (minutes <= 15) return "success";
  if (minutes <= 30) return "warning";
  return "danger";
}

export function OnDutyAdminView() {
  const [data, setData] = useState<OnDutyDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittingAction, setSubmittingAction] = useState<string | null>(null);
  const [rejectModalRequest, setRejectModalRequest] = useState<OnDutyRequestRow | null>(
    null,
  );
  const [rejectReason, setRejectReason] = useState("");
  const [historyQuery, setHistoryQuery] = useState("");
  const [historyStatus, setHistoryStatus] =
    useState<HistoryStatusFilter>("all");
  const [routeRequestId, setRouteRequestId] = useState<string | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeReview, setRouteReview] = useState<RouteReviewData | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/hrms/on-duty");
      const json = await response.json();
      if (!response.ok || !json.ok) {
        throw new Error(json.error || "Failed to load on-duty administration data");
      }
      setData(json.data);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to load on-duty administration data";
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(fetchData, 0);
    return () => window.clearTimeout(timeout);
  }, [fetchData]);

  const handleAction = async (
    requestId: string,
    action: "approve" | "reject",
    reason?: string,
  ) => {
    setSubmittingAction(`${action}:${requestId}`);
    try {
      const response = await fetch("/api/hrms/on-duty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, requestId, reason }),
      });
      const json = await response.json();
      if (!response.ok || !json.ok) {
        throw new Error(json.error || "Action failed");
      }

      toast.success(
        action === "approve"
          ? "On-duty request approved."
          : "On-duty request rejected.",
      );
      setRejectModalRequest(null);
      setRejectReason("");
      await fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action failed");
    } finally {
      setSubmittingAction(null);
    }
  };

  const openRouteReview = async (requestId: string) => {
    setRouteRequestId(requestId);
    setRouteReview(null);
    setRouteLoading(true);
    try {
      const response = await fetch(
        `/api/hrms/on-duty?type=route&requestId=${encodeURIComponent(requestId)}`,
      );
      const json = await response.json();
      if (!response.ok || !json.ok) {
        throw new Error(json.error || "Failed to load route audit");
      }
      setRouteReview(json.data);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load route audit",
      );
      setRouteRequestId(null);
    } finally {
      setRouteLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <PeopleLoadingState description="Loading approvals, field trips, reimbursement exposure, and route evidence." />
    );
  }

  if (!data) {
    return (
      <PeopleErrorState
        description={
          errorMessage || "On-duty administration is unavailable right now."
        }
        onRetry={fetchData}
      />
    );
  }

  const historySearch = historyQuery.trim().toLowerCase();
  const filteredHistory = data.recentRequests.filter((request) => {
    const matchesStatus =
      historyStatus === "all" || request.status === historyStatus;
    const matchesSearch =
      historySearch.length === 0 ||
      request.user.name.toLowerCase().includes(historySearch) ||
      (request.user.designation ?? "").toLowerCase().includes(historySearch) ||
      (request.purpose ?? "").toLowerCase().includes(historySearch) ||
      request.reason.toLowerCase().includes(historySearch) ||
      (request.visitLocation ?? "").toLowerCase().includes(historySearch);

    return matchesStatus && matchesSearch;
  });

  const activeTripsWithFreshness = data.activeTrips.map((trip) => {
    const lastPoint = trip.trackingSessions[0]?.locationPoints[0];
    return {
      ...trip,
      lastPoint,
      heartbeatLabel: formatMinutesSince(lastPoint?.timestamp),
    };
  });

  return (
    <div className="mnx-on-duty-workspace">
      <PeopleSummaryGrid>
        <PeopleSummary
          icon={<CheckCircle2 aria-hidden="true" />}
          label="Pending approvals"
          value={data.summary.pendingApprovals}
          detail={`${data.summary.approvedAwaitingStart} already approved and waiting to start`}
        />
        <PeopleSummary
          icon={<Route aria-hidden="true" />}
          label="Live field trips"
          value={data.summary.activeTrips}
          detail={`${data.summary.openAlerts} GPS or policy exceptions need review`}
        />
        <PeopleSummary
          icon={<Wallet aria-hidden="true" />}
          label="Claims in flight"
          value={data.summary.claimsInFlight}
          detail={`${formatCurrency(data.summary.settlementExposure)} reimbursement exposure`}
        />
        <PeopleSummary
          icon={<Waypoints aria-hidden="true" />}
          label="Completed this month"
          value={data.summary.completedThisMonth}
          detail={`${data.summary.averageDistanceKm} km average completed route`}
        />
      </PeopleSummaryGrid>

      <WorkspaceAlert
        variant={
          data.summary.pendingApprovals > 0 || data.summary.openAlerts > 0
            ? "warning"
            : "success"
        }
      >
        {data.summary.pendingApprovals > 0 || data.summary.openAlerts > 0
          ? `The on-duty desk needs action. ${data.summary.pendingApprovals} request${data.summary.pendingApprovals === 1 ? "" : "s"} are pending approval and ${data.summary.openAlerts} field exception${data.summary.openAlerts === 1 ? "" : "s"} remain unresolved.`
          : "The on-duty desk is stable right now. No pending approvals or unresolved trip exceptions are open in your reporting scope."}
      </WorkspaceAlert>

      <WorkspaceSectionHeading
        index="01"
        title="On-duty command center"
        description="Reframed as an advanced attendance-operations workspace: approve requests, supervise live travel, preserve route evidence, and keep settlement exposure visible from one connected ERP-style surface."
        actions={
          <WorkspaceAction
            variant="outline"
            size="compact"
            onClick={fetchData}
            disabled={loading}
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            Refresh desk
          </WorkspaceAction>
        }
      />

      <div className="mnx-on-duty-shell">
        <div className="mnx-on-duty-primary">
          <PeopleSection>
            <PeopleSectionHeader
              eyebrow="Control lanes"
              title="Operational framing"
              description="These are the core lanes mature attendance and field-workforce systems keep connected: approval velocity, live mission control, audit fidelity, and reimbursement closure."
            />
            <div className="mnx-on-duty-lane-grid">
              <article className="mnx-on-duty-lane-card">
                <span className="mnx-on-duty-lane-icon">
                  <CheckCircle2 aria-hidden="true" />
                </span>
                <div>
                  <strong>Approval desk</strong>
                  <p>
                    Validate purpose, dates, locations, and employee intent before
                    a field trip touches attendance.
                  </p>
                </div>
                <WorkspaceBadge variant="warning">
                  {data.summary.pendingApprovals} pending
                </WorkspaceBadge>
              </article>
              <article className="mnx-on-duty-lane-card">
                <span className="mnx-on-duty-lane-icon">
                  <Route aria-hidden="true" />
                </span>
                <div>
                  <strong>Live mission control</strong>
                  <p>
                    Keep current trips, latest heartbeat posture, and destination
                    context visible while employees are in the field.
                  </p>
                </div>
                <WorkspaceBadge
                  variant={data.summary.activeTrips > 0 ? "accent" : "neutral"}
                >
                  {data.summary.activeTrips} active
                </WorkspaceBadge>
              </article>
              <article className="mnx-on-duty-lane-card">
                <span className="mnx-on-duty-lane-icon">
                  <ShieldAlert aria-hidden="true" />
                </span>
                <div>
                  <strong>Audit and exceptions</strong>
                  <p>
                    Catch offline, permission, or route-integrity exceptions before
                    they compromise payroll evidence.
                  </p>
                </div>
                <WorkspaceBadge
                  variant={data.summary.openAlerts > 0 ? "danger" : "success"}
                >
                  {data.summary.openAlerts} open alerts
                </WorkspaceBadge>
              </article>
              <article className="mnx-on-duty-lane-card">
                <span className="mnx-on-duty-lane-icon">
                  <Coins aria-hidden="true" />
                </span>
                <div>
                  <strong>Settlement desk</strong>
                  <p>
                    Carry approved distance into reimbursement visibility so finance
                    follow-through stays attached to the trip trail.
                  </p>
                </div>
                <WorkspaceBadge
                  variant={
                    data.summary.claimsInFlight > 0 ? "warning" : "success"
                  }
                >
                  {data.summary.claimsInFlight} claims in flight
                </WorkspaceBadge>
              </article>
            </div>
          </PeopleSection>

          <div className="mnx-on-duty-split">
            <PeopleSection>
              <PeopleSectionHeader
                eyebrow="Approval queue"
                title="Requests awaiting manager action"
                description="Review each request with enough operational context to approve confidently, not just mark attendance blindly."
              />
              <div className="mnx-on-duty-approval-stack">
                {data.pendingApprovals.length === 0 ? (
                  <div className="mnx-on-duty-empty">
                    <CheckCircle2 aria-hidden="true" />
                    <div>
                      <strong>No requests are waiting for approval</strong>
                      <p>
                        The approval desk is clear. New on-duty requests will appear
                        here with visit context and trip window details.
                      </p>
                    </div>
                  </div>
                ) : (
                  data.pendingApprovals.map((request) => (
                    <article key={request.id} className="mnx-on-duty-approval-card">
                      <div className="mnx-on-duty-card-top">
                        <PeoplePerson
                          name={request.user.name}
                          secondary={request.user.designation || request.user.email}
                        />
                        <WorkspaceBadge variant="warning">Pending</WorkspaceBadge>
                      </div>

                      <div className="mnx-on-duty-card-copy">
                        <strong>{request.purpose || request.reason}</strong>
                        <p>{formatDateRange(request)}</p>
                        <p>
                          {request.visitLocation || "Destination not provided"}
                          {request.clientReference
                            ? ` • Ref ${request.clientReference}`
                            : ""}
                        </p>
                        <p>
                          Requested on {formatDateTime(request.createdAt)} as part
                          of the attendance trail.
                        </p>
                      </div>

                      <div className="mnx-on-duty-card-actions">
                        <WorkspaceAction
                          onClick={() => handleAction(request.id, "approve")}
                          disabled={submittingAction != null}
                        >
                          <Check className="size-4" aria-hidden="true" />
                          Approve request
                        </WorkspaceAction>
                        <WorkspaceAction
                          variant="outline"
                          onClick={() => setRejectModalRequest(request)}
                          disabled={submittingAction != null}
                        >
                          <X className="size-4" aria-hidden="true" />
                          Reject
                        </WorkspaceAction>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </PeopleSection>

            <PeopleSection>
              <PeopleSectionHeader
                eyebrow="Live trip board"
                title="Field movement in progress"
                description="Surface trip purpose, last heartbeat, route freshness, and audit posture while active work is underway."
              />
              <div className="mnx-on-duty-trip-stack">
                {activeTripsWithFreshness.length === 0 ? (
                  <div className="mnx-on-duty-empty">
                    <MapPinned aria-hidden="true" />
                    <div>
                      <strong>No active field trips</strong>
                      <p>
                        Once an approved request is started, it will move here with
                        live route and GPS heartbeat context.
                      </p>
                    </div>
                  </div>
                ) : (
                  activeTripsWithFreshness.map((trip) => (
                    <article key={trip.id} className="mnx-on-duty-trip-card">
                      <div className="mnx-on-duty-card-top">
                        <PeoplePerson
                          name={trip.user.name}
                          secondary={trip.user.designation || "Field assignment"}
                        />
                        <WorkspaceBadge variant={getHeartbeatVariant(trip.lastPoint)}>
                          {trip.heartbeatLabel}
                        </WorkspaceBadge>
                      </div>

                      <div className="mnx-on-duty-trip-meta">
                        <div>
                          <span>Mission</span>
                          <strong>{trip.purpose || trip.reason}</strong>
                        </div>
                        <div>
                          <span>Started</span>
                          <strong>{formatDateTime(trip.startedAt)}</strong>
                        </div>
                        <div>
                          <span>Latest point</span>
                          <strong>
                            {formatCoordinates(
                              trip.lastPoint?.latitude,
                              trip.lastPoint?.longitude,
                            )}
                          </strong>
                        </div>
                      </div>

                      <div className="mnx-on-duty-card-footer">
                        <p>{formatDistance(trip.totalDistanceKm)}</p>
                        <WorkspaceAction
                          variant="outline"
                          size="compact"
                          onClick={() => openRouteReview(trip.id)}
                        >
                          Review route
                          <ArrowRight className="size-4" aria-hidden="true" />
                        </WorkspaceAction>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </PeopleSection>
          </div>

          <div className="mnx-on-duty-split">
            <PeopleSection>
              <PeopleSectionHeader
                eyebrow="Exception desk"
                title="On-duty tracking exceptions"
                description="Separate policy and telemetry issues from healthy trips so managers can intervene before attendance evidence degrades."
              />
              <div className="mnx-on-duty-alert-stack">
                {data.trackingAlerts.length === 0 ? (
                  <div className="mnx-on-duty-empty">
                    <ShieldAlert aria-hidden="true" />
                    <div>
                      <strong>No open field exceptions</strong>
                      <p>
                        GPS-linked on-duty work is currently stable for the people
                        in your reporting scope.
                      </p>
                    </div>
                  </div>
                ) : (
                  data.trackingAlerts.map((alert) => (
                    <article key={alert.id} className="mnx-on-duty-alert-card">
                      <div className="mnx-on-duty-card-top">
                        <div className="mnx-on-duty-card-copy">
                          <strong>{alert.user.name}</strong>
                          <p>{alert.message}</p>
                        </div>
                        <WorkspaceBadge
                          variant={
                            HIGH_RISK_ALERTS.has(alert.alertType)
                              ? "danger"
                              : "warning"
                          }
                        >
                          {HIGH_RISK_ALERTS.has(alert.alertType)
                            ? "High risk"
                            : "Needs action"}
                        </WorkspaceBadge>
                      </div>

                      <div className="mnx-on-duty-alert-meta">
                        <div>
                          <span>Alert type</span>
                          <strong>{alert.alertType.replace(/_/g, " ")}</strong>
                        </div>
                        <div>
                          <span>Raised</span>
                          <strong>{formatDateTime(alert.createdAt)}</strong>
                        </div>
                        <div>
                          <span>Last known point</span>
                          <strong>
                            {formatCoordinates(
                              alert.lastKnownLat,
                              alert.lastKnownLng,
                            )}
                          </strong>
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </PeopleSection>

            <PeopleSection>
              <PeopleSectionHeader
                eyebrow="Settlement visibility"
                title="Reimbursement and closure"
                description="Keep fuel and trip-closure follow-through attached to the same operational desk instead of losing it after travel completes."
              />
              <div className="mnx-on-duty-claim-stack">
                {data.reimbursementClaims.length === 0 ? (
                  <div className="mnx-on-duty-empty">
                    <Wallet aria-hidden="true" />
                    <div>
                      <strong>No reimbursement claims yet</strong>
                      <p>
                        Completed and claimable trips will appear here once fuel
                        reimbursement is raised from the field workflow.
                      </p>
                    </div>
                  </div>
                ) : (
                  data.reimbursementClaims.map((claim) => (
                    <article key={claim.id} className="mnx-on-duty-claim-card">
                      <div className="mnx-on-duty-card-top">
                        <div className="mnx-on-duty-card-copy">
                          <strong>{claim.user.name}</strong>
                          <p>
                            {claim.onDutyRequest.purpose ||
                              claim.onDutyRequest.reason}
                          </p>
                        </div>
                        <WorkspaceBadge variant={getClaimBadgeVariant(claim.status)}>
                          {claim.status.replace(/_/g, " ")}
                        </WorkspaceBadge>
                      </div>

                      <div className="mnx-on-duty-claim-metrics">
                        <div>
                          <span>Amount</span>
                          <strong>{formatCurrency(claim.amount)}</strong>
                        </div>
                        <div>
                          <span>Distance</span>
                          <strong>{claim.distanceKm.toFixed(1)} km</strong>
                        </div>
                        <div>
                          <span>Raised</span>
                          <strong>{formatDate(claim.createdAt)}</strong>
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </PeopleSection>
          </div>
        </div>

        <aside className="mnx-on-duty-aside">
          <PeopleSection>
            <PeopleSectionHeader
              eyebrow="Manager scope"
              title="Desk posture"
              description="A compact watchlist for the reporting span you currently supervise."
            />
            <div className="mnx-on-duty-watch-list">
              <div className="mnx-on-duty-watch-item">
                <span>01</span>
                <div>
                  <strong>{data.summary.directReports} direct reports</strong>
                  <p>Employees currently inside your on-duty approval scope.</p>
                </div>
              </div>
              <div className="mnx-on-duty-watch-item">
                <span>02</span>
                <div>
                  <strong>{data.summary.totalRequests} tracked requests</strong>
                  <p>Recent attendance-linked on-duty trail visible on this desk.</p>
                </div>
              </div>
              <div className="mnx-on-duty-watch-item">
                <span>03</span>
                <div>
                  <strong>{formatCurrency(data.summary.settlementExposure)}</strong>
                  <p>Current reimbursement exposure waiting for settlement flow.</p>
                </div>
              </div>
            </div>
          </PeopleSection>

          <PeopleSection>
            <PeopleSectionHeader
              eyebrow="Governance"
              title="Advanced control model"
              description="Borrowed from current ERP attendance and workforce patterns without changing your existing backend contracts."
            />
            <div className="mnx-on-duty-governance-list">
              <article className="mnx-on-duty-governance-card">
                <Clock3 aria-hidden="true" />
                <div>
                  <strong>Approval before attendance effect</strong>
                  <p>
                    Requests, approvals, and start events remain distinct so the
                    attendance trail stays auditable.
                  </p>
                </div>
              </article>
              <article className="mnx-on-duty-governance-card">
                <Route aria-hidden="true" />
                <div>
                  <strong>Route evidence during travel</strong>
                  <p>
                    Active trips are monitored with location heartbeat freshness,
                    latest waypoint posture, and route review on demand.
                  </p>
                </div>
              </article>
              <article className="mnx-on-duty-governance-card">
                <Coins aria-hidden="true" />
                <div>
                  <strong>Trip-to-claim continuity</strong>
                  <p>
                    Completed distance flows into reimbursement visibility so HRMS
                    and finance do not break the trip chain.
                  </p>
                </div>
              </article>
            </div>
          </PeopleSection>
        </aside>
      </div>

      <PeopleSection>
        <PeopleSectionHeader
          eyebrow="Audit history"
          title="Recent on-duty trail"
          description="Search and filter the recent attendance-linked history, then open route evidence when a trip needs deeper review."
        />

        <div className="mnx-on-duty-history-toolbar">
          <PeopleField className="mnx-on-duty-history-search" label="Search history">
            <PeopleInput
              value={historyQuery}
              onChange={(event) => setHistoryQuery(event.target.value)}
              placeholder="Search employee, purpose, location, or reason"
            />
          </PeopleField>
          <PeopleField className="mnx-on-duty-history-filter" label="Status">
            <WorkspaceSelect
              value={historyStatus}
              onChange={(event) =>
                setHistoryStatus(event.target.value as HistoryStatusFilter)
              }
            >
              <option value="all">All statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="ACTIVE">Active</option>
              <option value="COMPLETED">Completed</option>
              <option value="REJECTED">Rejected</option>
              <option value="CANCELLED">Cancelled</option>
            </WorkspaceSelect>
          </PeopleField>
        </div>

        <PeopleTable>
          <PeopleTableHeader>
            <PeopleTableRow>
              <PeopleTableHead>Employee</PeopleTableHead>
              <PeopleTableHead>Mission</PeopleTableHead>
              <PeopleTableHead>Window</PeopleTableHead>
              <PeopleTableHead>Status</PeopleTableHead>
              <PeopleTableHead>Distance</PeopleTableHead>
              <PeopleTableHead>Evidence</PeopleTableHead>
            </PeopleTableRow>
          </PeopleTableHeader>
          <PeopleTableBody>
            {filteredHistory.length === 0 ? (
              <PeopleTableEmpty
                colSpan={6}
                message="No on-duty records match the current filter."
              />
            ) : (
              filteredHistory.map((request) => (
                <PeopleTableRow key={request.id}>
                  <PeopleTableCell>
                    <PeoplePerson
                      name={request.user.name}
                      secondary={request.user.designation || request.user.email}
                    />
                  </PeopleTableCell>
                  <PeopleTableCell>
                    <div className="mnx-on-duty-table-copy">
                      <strong>{request.purpose || request.reason}</strong>
                      <small>
                        {request.visitLocation || "Location not specified"}
                      </small>
                    </div>
                  </PeopleTableCell>
                  <PeopleTableCell>
                    <div className="mnx-on-duty-table-copy">
                      <strong>{formatDateRange(request)}</strong>
                      <small>Raised {formatDateTime(request.createdAt)}</small>
                    </div>
                  </PeopleTableCell>
                  <PeopleTableCell>
                    <WorkspaceBadge variant={getRequestBadgeVariant(request.status)}>
                      {request.status.replace(/_/g, " ")}
                    </WorkspaceBadge>
                  </PeopleTableCell>
                  <PeopleTableCell>{formatDistance(request.totalDistanceKm)}</PeopleTableCell>
                  <PeopleTableCell>
                    <WorkspaceAction
                      variant="outline"
                      size="compact"
                      onClick={() => openRouteReview(request.id)}
                    >
                      <FileSearch className="size-4" aria-hidden="true" />
                      Review
                    </WorkspaceAction>
                  </PeopleTableCell>
                </PeopleTableRow>
              ))
            )}
          </PeopleTableBody>
        </PeopleTable>
      </PeopleSection>

      <Modal
        open={rejectModalRequest != null}
        eyebrow="Approval action"
        title="Reject on-duty request"
        description="Capture the rejection reason so the employee receives a clear attendance-workflow response."
        onClose={() => {
          setRejectModalRequest(null);
          setRejectReason("");
        }}
        size="wide"
      >
        <div className="mnx-on-duty-modal-stack">
          {rejectModalRequest ? (
            <div className="mnx-on-duty-modal-note">
              <strong>{rejectModalRequest.user.name}</strong>
              <p>
                {rejectModalRequest.purpose || rejectModalRequest.reason} •{" "}
                {formatDateRange(rejectModalRequest)}
              </p>
            </div>
          ) : null}

          <PeopleField label="Rejection reason">
            <PeopleTextarea
              rows={4}
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              placeholder="Explain why this field-duty request cannot be approved."
            />
          </PeopleField>

          <div className="mnx-on-duty-modal-actions">
            <WorkspaceAction
              variant="outline"
              onClick={() => {
                setRejectModalRequest(null);
                setRejectReason("");
              }}
            >
              Cancel
            </WorkspaceAction>
            <WorkspaceAction
              variant="destructive"
              onClick={() => {
                if (rejectModalRequest) {
                  handleAction(rejectModalRequest.id, "reject", rejectReason);
                }
              }}
              disabled={submittingAction != null}
            >
              Reject request
            </WorkspaceAction>
          </div>
        </div>
      </Modal>

      <Modal
        open={routeRequestId != null}
        eyebrow="Trip audit"
        title="Route and attendance evidence"
        description="Inspect the travel record, latest points, and route-linked closure evidence for this on-duty request."
        onClose={() => {
          setRouteRequestId(null);
          setRouteReview(null);
        }}
        size="workspace"
      >
        {routeLoading || !routeReview ? (
          <div className="mnx-on-duty-modal-stack">
            <div className="mnx-on-duty-empty">
              <RefreshCw className="size-4 animate-spin" aria-hidden="true" />
              <div>
                <strong>Loading route audit</strong>
                <p>Fetching points, timings, and attendance evidence.</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="mnx-on-duty-modal-stack">
            <div className="mnx-on-duty-route-hero">
              <div>
                <span>Employee</span>
                <strong>{routeReview.user.name}</strong>
                <p>{routeReview.user.designation || routeReview.user.email}</p>
              </div>
              <div>
                <span>Status</span>
                <strong>{routeReview.status.replace(/_/g, " ")}</strong>
                <p>{routeReview.purpose || routeReview.reason}</p>
              </div>
              <div>
                <span>Distance</span>
                <strong>{formatDistance(routeReview.totalDistanceKm)}</strong>
                <p>
                  Started {formatDateTime(routeReview.startedAt)} • Completed{" "}
                  {formatDateTime(routeReview.completedAt)}
                </p>
              </div>
            </div>

            <div className="mnx-on-duty-route-grid">
              <div className="mnx-on-duty-route-panel">
                <strong>Trip envelope</strong>
                <p>{formatDateRange(routeReview)}</p>
                <p>
                  Destination: {routeReview.visitLocation || "Destination not provided"}
                </p>
                <p>
                  Client reference: {routeReview.clientReference || "No client reference"}
                </p>
              </div>

              <div className="mnx-on-duty-route-panel">
                <strong>Route evidence</strong>
                <p>
                  {routeReview.trackingSessions[0]?.locationPoints.length ?? 0} captured
                  point{routeReview.trackingSessions[0]?.locationPoints.length === 1 ? "" : "s"}
                </p>
                <p>
                  Last coordinate:{" "}
                  {formatCoordinates(
                    routeReview.trackingSessions[0]?.locationPoints[0]?.latitude,
                    routeReview.trackingSessions[0]?.locationPoints[0]?.longitude,
                  )}
                </p>
              </div>
            </div>

            <div className="mnx-on-duty-route-timeline">
              {(routeReview.trackingSessions[0]?.locationPoints ?? []).length === 0 ? (
                <div className="mnx-on-duty-empty">
                  <AlertTriangle aria-hidden="true" />
                  <div>
                    <strong>No route points were captured</strong>
                    <p>
                      This request currently has no recorded waypoints to show in the route audit.
                    </p>
                  </div>
                </div>
              ) : (
                routeReview.trackingSessions[0].locationPoints.map((point, index) => (
                  <div key={`${point.timestamp}-${index}`} className="mnx-on-duty-route-point">
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <div>
                      <strong>{formatCoordinates(point.latitude, point.longitude)}</strong>
                      <p>{formatDateTime(point.timestamp)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
