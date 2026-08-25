"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Fingerprint,
  LocateFixed,
  MapPinned,
  Radio,
  RefreshCw,
  Route,
  Shield,
  Smartphone,
  UserRound,
  Waypoints,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  WorkspaceAction,
  WorkspaceAlert,
  WorkspaceBadge,
  WorkspaceMetric,
  WorkspaceSectionHeading,
} from "@/components/layout/workspace";
import {
  PeopleAction,
  PeopleErrorState,
  PeopleField,
  PeopleInput,
  PeopleLoadingState,
  PeoplePerson,
  PeopleSection,
  PeopleSectionHeader,
  PeopleSelect,
  PeopleTable,
  PeopleTableBody,
  PeopleTableCell,
  PeopleTableEmpty,
  PeopleTableHead,
  PeopleTableHeader,
  PeopleTableRow,
} from "@/modules/people/components";

type TrackingDashboardData = {
  checkedInEmployees: Array<{
    id: string;
    checkInAt: string;
    user: { id: string; name: string; designation?: string };
  }>;
  activeTrackingSessions: Array<{
    id: string;
    intervalMinutes: number;
    startedAt: string;
    user: { id: string; name: string };
    locationPoints: Array<{
      latitude: number;
      longitude: number;
      timestamp: string;
    }>;
  }>;
  unresolvedAlerts: Array<{
    id: string;
    alertType: string;
    message: string;
    createdAt: string;
    lastKnownLat?: number;
    lastKnownLng?: number;
    user: { id: string; name: string; email: string };
  }>;
  activeOnDutyTrips: Array<{
    id: string;
    purpose?: string;
    reason: string;
    startedAt: string;
    user: { id: string; name: string; designation?: string };
    trackingSessions: Array<{
      locationPoints: Array<{
        latitude: number;
        longitude: number;
        timestamp: string;
      }>;
    }>;
  }>;
  faceEnrollmentCount: number;
};

type TrackingStatus = "live" | "stale" | "offline" | "checked-in";
type FilterStatus = "all" | TrackingStatus | "alert" | "on-duty";

const ALERT_ICON_MAP = {
  OFFLINE: Radio,
  GPS_DISABLED: MapPinned,
  MOCK_DETECTED: Shield,
  LOW_BATTERY: Smartphone,
  APP_KILLED: XCircle,
  PERMISSION_DENIED: Shield,
} as const;

const ALERT_LABEL_MAP: Record<string, string> = {
  OFFLINE: "Offline session",
  GPS_DISABLED: "GPS disabled",
  MOCK_DETECTED: "Mock location",
  LOW_BATTERY: "Low battery",
  APP_KILLED: "App closed",
  PERMISSION_DENIED: "Permission denied",
};

const HIGH_RISK_ALERTS = new Set([
  "MOCK_DETECTED",
  "APP_KILLED",
  "PERMISSION_DENIED",
]);

function formatCoordinates(
  point?:
    | {
        latitude: number;
        longitude: number;
      }
    | null,
) {
  if (!point) return "No live coordinate";
  return `${point.latitude.toFixed(4)}, ${point.longitude.toFixed(4)}`;
}

function getMinutesAgo(isoDate?: string | null) {
  if (!isoDate) return null;
  const ageMs = Date.now() - new Date(isoDate).getTime();
  return Math.max(0, Math.round(ageMs / 60000));
}

function formatMinutesAgo(minutes: number | null) {
  if (minutes == null) return "No heartbeat";
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder === 0 ? `${hours} hr ago` : `${hours} hr ${remainder} min ago`;
}

function resolveTrackingStatus(
  session?: TrackingDashboardData["activeTrackingSessions"][number],
): TrackingStatus {
  if (!session) return "checked-in";
  const lastPoint = session.locationPoints[0];
  const minutesAgo = getMinutesAgo(lastPoint?.timestamp) ?? Number.POSITIVE_INFINITY;
  const liveThreshold = Math.max(session.intervalMinutes * 2, 10);
  const staleThreshold = Math.max(session.intervalMinutes * 4, 20);

  if (minutesAgo <= liveThreshold) return "live";
  if (minutesAgo <= staleThreshold) return "stale";
  return "offline";
}

function getStatusLabel(status: TrackingStatus) {
  switch (status) {
    case "live":
      return "Live tracking";
    case "stale":
      return "Needs follow-up";
    case "offline":
      return "Signal lost";
    default:
      return "Checked in only";
  }
}

export function TrackingDashboardView() {
  const [data, setData] = useState<TrackingDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/hrms/tracking");
      const json = await response.json();
      if (!json.ok) {
        throw new Error(json.error || "Failed to load tracking data");
      }
      setData(json.data);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to load tracking dashboard";
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(fetchData, 0);
    const interval = window.setInterval(fetchData, 60000);
    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, [fetchData]);

  if (loading && !data) {
    return (
      <PeopleLoadingState description="Loading GPS sessions, on-duty movement, and live workforce telemetry." />
    );
  }

  if (!data) {
    return (
      <PeopleErrorState
        description={errorMessage || "Tracking data is unavailable right now."}
        onRetry={fetchData}
      />
    );
  }

  const trackingByUserId = new Map(
    data.activeTrackingSessions.map((session) => [session.user.id, session]),
  );
  const alertsByUserId = new Map<string, TrackingDashboardData["unresolvedAlerts"]>();
  const onDutyByUserId = new Map(
    data.activeOnDutyTrips.map((trip) => [trip.user.id, trip]),
  );

  data.unresolvedAlerts.forEach((alert) => {
    const existing = alertsByUserId.get(alert.user.id);
    if (existing) {
      existing.push(alert);
      return;
    }
    alertsByUserId.set(alert.user.id, [alert]);
  });

  const workforceRows = [
    ...data.checkedInEmployees.map((session) => {
      const trackingSession = trackingByUserId.get(session.user.id);
      const alerts = alertsByUserId.get(session.user.id) ?? [];
      const onDutyTrip = onDutyByUserId.get(session.user.id);
      const lastPoint = trackingSession?.locationPoints[0];
      const status = resolveTrackingStatus(trackingSession);
      const lastUpdateMinutes = getMinutesAgo(lastPoint?.timestamp);

      return {
        id: session.user.id,
        name: session.user.name,
        designation: session.user.designation || "No designation",
        checkInAt: session.checkInAt,
        trackingSession,
        alerts,
        onDutyTrip,
        lastPoint,
        lastUpdateMinutes,
        status,
        sessionAgeMinutes: getMinutesAgo(trackingSession?.startedAt),
      };
    }),
    ...data.activeTrackingSessions
      .filter((session) => {
        return !data.checkedInEmployees.some(
          (checkedIn) => checkedIn.user.id === session.user.id,
        );
      })
      .map((session) => {
        const alerts = alertsByUserId.get(session.user.id) ?? [];
        const onDutyTrip = onDutyByUserId.get(session.user.id);
        const lastPoint = session.locationPoints[0];
        return {
          id: session.user.id,
          name: session.user.name,
          designation: "Tracking session",
          checkInAt: session.startedAt,
          trackingSession: session,
          alerts,
          onDutyTrip,
          lastPoint,
          lastUpdateMinutes: getMinutesAgo(lastPoint?.timestamp),
          status: resolveTrackingStatus(session),
          sessionAgeMinutes: getMinutesAgo(session.startedAt),
        };
      }),
  ];

  const liveCount = workforceRows.filter((row) => row.status === "live").length;
  const staleCount = workforceRows.filter((row) => row.status === "stale").length;
  const offlineCount = workforceRows.filter((row) => row.status === "offline").length;
  const alertImpactedCount = workforceRows.filter((row) => row.alerts.length > 0).length;
  const highRiskAlertCount = data.unresolvedAlerts.filter((alert) =>
    HIGH_RISK_ALERTS.has(alert.alertType),
  ).length;
  const trackedCoverage =
    data.checkedInEmployees.length > 0
      ? Math.round(
          (data.activeTrackingSessions.length / data.checkedInEmployees.length) * 100,
        )
      : 0;
  const averageCadence =
    data.activeTrackingSessions.length > 0
      ? Math.round(
          data.activeTrackingSessions.reduce(
            (sum, session) => sum + session.intervalMinutes,
            0,
          ) / data.activeTrackingSessions.length,
        )
      : 0;

  const alertTypeBreakdown = [
    {
      label: "Signal loss",
      value: data.unresolvedAlerts.filter((alert) => alert.alertType === "OFFLINE")
        .length,
    },
    {
      label: "GPS blocked",
      value: data.unresolvedAlerts.filter((alert) => alert.alertType === "GPS_DISABLED")
        .length,
    },
    {
      label: "Integrity risks",
      value: highRiskAlertCount,
    },
  ];

  const filteredRows = workforceRows.filter((row) => {
    const matchesQuery =
      query.trim().length === 0 ||
      row.name.toLowerCase().includes(query.trim().toLowerCase()) ||
      row.designation.toLowerCase().includes(query.trim().toLowerCase());

    const matchesFilter =
      filterStatus === "all" ||
      row.status === filterStatus ||
      (filterStatus === "alert" && row.alerts.length > 0) ||
      (filterStatus === "on-duty" && Boolean(row.onDutyTrip));

    return matchesQuery && matchesFilter;
  });

  return (
    <div className="mnx-tracking-shell">
      <section className="mnx-workspace-metrics" aria-label="Tracking metrics">
        <WorkspaceMetric
          icon={<UserRound aria-hidden="true" />}
          label="Checked in"
          value={data.checkedInEmployees.length}
          detail={`${trackedCoverage}% with location telemetry`}
        />
        <WorkspaceMetric
          icon={<LocateFixed aria-hidden="true" />}
          label="Live streams"
          value={liveCount}
          detail={
            averageCadence > 0
              ? `Average cadence ${averageCadence} min`
              : "No active ping cadence yet"
          }
        />
        <WorkspaceMetric
          icon={<AlertTriangle aria-hidden="true" />}
          label="Open exceptions"
          value={data.unresolvedAlerts.length}
          detail={`${highRiskAlertCount} high-risk integrity issues`}
        />
        <WorkspaceMetric
          icon={<Route aria-hidden="true" />}
          label="On-duty missions"
          value={data.activeOnDutyTrips.length}
          detail={`${alertImpactedCount} people need manager review`}
        />
        <WorkspaceMetric
          icon={<Fingerprint aria-hidden="true" />}
          label="Face enrolled"
          value={data.faceEnrollmentCount}
          detail="Identity verification layer"
        />
      </section>

      <PeopleSection className="mnx-tracking-command">
        <div className="mnx-tracking-command-grid">
          <div className="mnx-tracking-command-copy">
            <WorkspaceSectionHeading
              index="01"
              title="Tracking control tower"
              description="Monitor live workforce movement, stale sessions, policy deviations, and field-duty execution from one operational surface."
              className="mnx-tracking-heading"
              actions={
                <WorkspaceAction
                  variant="outline"
                  size="compact"
                  onClick={fetchData}
                  disabled={loading}
                >
                  <RefreshCw className="size-4" aria-hidden="true" />
                  Refresh live feed
                </WorkspaceAction>
              }
            />

            <div className="mnx-tracking-kpi-list">
              <article className="mnx-tracking-kpi">
                <span className="mnx-tracking-kpi-icon">
                  <Radio aria-hidden="true" />
                </span>
                <div className="mnx-tracking-kpi-copy">
                  <strong>{liveCount}</strong>
                  <p>Employees streaming within policy cadence.</p>
                </div>
              </article>
              <article className="mnx-tracking-kpi">
                <span className="mnx-tracking-kpi-icon">
                  <Clock3 aria-hidden="true" />
                </span>
                <div className="mnx-tracking-kpi-copy">
                  <strong>{staleCount + offlineCount}</strong>
                  <p>Sessions need follow-up for stale or lost signal.</p>
                </div>
              </article>
              <article className="mnx-tracking-kpi">
                <span className="mnx-tracking-kpi-icon">
                  <Waypoints aria-hidden="true" />
                </span>
                <div className="mnx-tracking-kpi-copy">
                  <strong>{data.activeOnDutyTrips.length}</strong>
                  <p>Field visits are being logged against active travel.</p>
                </div>
              </article>
            </div>
          </div>

          <div className="mnx-tracking-signal-grid">
            <article className="mnx-tracking-signal-card">
              <p className="mnx-tracking-signal-label">Coverage posture</p>
              <strong>{trackedCoverage}%</strong>
              <span>
                {data.activeTrackingSessions.length} of {data.checkedInEmployees.length}{" "}
                checked-in employees are transmitting live location.
              </span>
            </article>
            <article className="mnx-tracking-signal-card">
              <p className="mnx-tracking-signal-label">Exception pressure</p>
              <strong>{data.unresolvedAlerts.length}</strong>
              <span>
                {highRiskAlertCount > 0
                  ? `${highRiskAlertCount} alerts involve location integrity or app controls.`
                  : "No integrity-risk alert is active right now."}
              </span>
            </article>
            <article className="mnx-tracking-signal-card">
              <p className="mnx-tracking-signal-label">Policy rhythm</p>
              <strong>{averageCadence || "—"}</strong>
              <span>
                {averageCadence > 0
                  ? `Current sessions are configured around a ${averageCadence}-minute heartbeat.`
                  : "Heartbeat cadence will appear after the next live session."}
              </span>
            </article>
          </div>
        </div>

        <div className="mnx-tracking-policy-list">
          <WorkspaceBadge variant="accent">Live operations</WorkspaceBadge>
          <WorkspaceBadge variant={staleCount > 0 ? "warning" : "success"}>
            {staleCount > 0 ? `${staleCount} stale sessions` : "Heartbeat healthy"}
          </WorkspaceBadge>
          <WorkspaceBadge variant={highRiskAlertCount > 0 ? "danger" : "success"}>
            {highRiskAlertCount > 0
              ? `${highRiskAlertCount} integrity events`
              : "No integrity events"}
          </WorkspaceBadge>
          <WorkspaceBadge variant="neutral">
            {data.faceEnrollmentCount} face-auth ready
          </WorkspaceBadge>
        </div>

        {data.unresolvedAlerts.length > 0 ? (
          <WorkspaceAlert variant={highRiskAlertCount > 0 ? "warning" : "info"}>
            {highRiskAlertCount > 0
              ? "Tracking integrity needs attention. Review mock-location, app-closed, and permission-denied events before dispatching more field work."
              : "Live exceptions are active. Review stale signals and GPS-disabled devices to maintain dispatch visibility."}
          </WorkspaceAlert>
        ) : (
          <WorkspaceAlert variant="success">
            The GPS program is currently stable. No unresolved location exceptions are active in the command center.
          </WorkspaceAlert>
        )}
      </PeopleSection>

      <div className="mnx-tracking-split">
        <PeopleSection>
          <PeopleSectionHeader
            eyebrow="Exception monitor"
            title="Operational alert queue"
            description="Surface the incidents that advanced tracking teams usually triage first: signal loss, GPS shutdowns, app exits, and integrity concerns."
          />
          <div className="mnx-tracking-alert-stack">
            {data.unresolvedAlerts.length === 0 ? (
              <div className="mnx-tracking-empty">
                <CheckCircle2 aria-hidden="true" />
                <div>
                  <strong>No active alerts</strong>
                  <p>All tracked employees are currently operating without unresolved GPS exceptions.</p>
                </div>
              </div>
            ) : (
              data.unresolvedAlerts.map((alert) => {
                const AlertIcon =
                  ALERT_ICON_MAP[alert.alertType as keyof typeof ALERT_ICON_MAP] ??
                  AlertTriangle;

                return (
                  <article key={alert.id} className="mnx-tracking-alert-card">
                    <div className="mnx-tracking-alert-top">
                      <span className="mnx-tracking-alert-icon">
                        <AlertIcon aria-hidden="true" />
                      </span>
                      <div className="mnx-tracking-alert-copy">
                        <strong>
                          {ALERT_LABEL_MAP[alert.alertType] ?? alert.alertType}
                        </strong>
                        <p>{alert.user.name}</p>
                      </div>
                      <WorkspaceBadge
                        variant={
                          HIGH_RISK_ALERTS.has(alert.alertType) ? "danger" : "warning"
                        }
                      >
                        {HIGH_RISK_ALERTS.has(alert.alertType)
                          ? "High risk"
                          : "Needs action"}
                      </WorkspaceBadge>
                    </div>
                    <p className="mnx-tracking-alert-message">{alert.message}</p>
                    <dl className="mnx-tracking-alert-meta">
                      <div>
                        <dt>Raised</dt>
                        <dd>{new Date(alert.createdAt).toLocaleString()}</dd>
                      </div>
                      <div>
                        <dt>Last known point</dt>
                        <dd>
                          {alert.lastKnownLat != null && alert.lastKnownLng != null
                            ? `${alert.lastKnownLat.toFixed(4)}, ${alert.lastKnownLng.toFixed(4)}`
                            : "No coordinate recorded"}
                        </dd>
                      </div>
                    </dl>
                  </article>
                );
              })
            )}
          </div>
        </PeopleSection>

        <PeopleSection>
          <PeopleSectionHeader
            eyebrow="Signal intelligence"
            title="Tracking health model"
            description="Model the core controls used in mature fleet and workforce platforms: coverage, freshness, and exception mix."
          />
          <div className="mnx-tracking-health-stack">
            {alertTypeBreakdown.map((item) => (
              <article key={item.label} className="mnx-tracking-health-card">
                <div>
                  <strong>{item.value}</strong>
                  <p>{item.label}</p>
                </div>
                <span>{data.unresolvedAlerts.length > 0 ? "Open now" : "Clear"}</span>
              </article>
            ))}
            <article className="mnx-tracking-health-card">
              <div>
                <strong>{offlineCount}</strong>
                <p>Signal-lost employees</p>
              </div>
              <span>Escalate if still offline after shift rules</span>
            </article>
            <article className="mnx-tracking-health-card">
              <div>
                <strong>{data.faceEnrollmentCount}</strong>
                <p>Identity-secured users</p>
              </div>
              <span>Supports attendance and field-visit trust</span>
            </article>
          </div>
        </PeopleSection>
      </div>

      <PeopleSection>
        <PeopleSectionHeader
          eyebrow="Live workforce feed"
          title="Employee movement and session control"
          description="Search active personnel, isolate stale or high-risk sessions, and review the freshest coordinate attached to each check-in."
        />

        <div className="mnx-tracking-toolbar">
          <PeopleField className="mnx-tracking-search" label="Search employee">
            <PeopleInput
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by employee or designation"
            />
          </PeopleField>
          <PeopleField className="mnx-tracking-toolbar-status" label="Filter status">
            <PeopleSelect
              value={filterStatus}
              onChange={(event) =>
                setFilterStatus(event.target.value as FilterStatus)
              }
            >
              <option value="all">All sessions</option>
              <option value="live">Live tracking</option>
              <option value="stale">Stale heartbeat</option>
              <option value="offline">Signal lost</option>
              <option value="checked-in">Checked in only</option>
              <option value="alert">With alerts</option>
              <option value="on-duty">On duty</option>
            </PeopleSelect>
          </PeopleField>
        </div>

        <PeopleTable>
          <PeopleTableHeader>
            <tr>
              <PeopleTableHead>Employee</PeopleTableHead>
              <PeopleTableHead>Tracking state</PeopleTableHead>
              <PeopleTableHead>Last heartbeat</PeopleTableHead>
              <PeopleTableHead>Coordinate</PeopleTableHead>
              <PeopleTableHead>Session posture</PeopleTableHead>
            </tr>
          </PeopleTableHeader>
          <PeopleTableBody>
            {filteredRows.length === 0 ? (
              <PeopleTableEmpty
                colSpan={5}
                message="No employees match the current tracking filter."
              />
            ) : (
              filteredRows.map((row) => (
                <PeopleTableRow key={row.id}>
                  <PeopleTableCell>
                    <PeoplePerson
                      name={row.name}
                      secondary={
                        <>
                          {row.designation}
                          {row.onDutyTrip ? " • On duty" : ""}
                        </>
                      }
                    />
                  </PeopleTableCell>
                  <PeopleTableCell>
                    <span className={`mnx-tracking-table-status is-${row.status}`}>
                      <span className="mnx-tracking-dot" aria-hidden="true" />
                      {getStatusLabel(row.status)}
                    </span>
                  </PeopleTableCell>
                  <PeopleTableCell>
                    <div className="mnx-tracking-mini">
                      <strong>{formatMinutesAgo(row.lastUpdateMinutes)}</strong>
                      <span>
                        Check-in {new Date(row.checkInAt).toLocaleTimeString()}
                      </span>
                    </div>
                  </PeopleTableCell>
                  <PeopleTableCell>
                    <div className="mnx-tracking-mini">
                      <strong className="mnx-tracking-coordinate">
                        {formatCoordinates(row.lastPoint)}
                      </strong>
                      <span>
                        {row.trackingSession
                          ? `Session age ${formatMinutesAgo(row.sessionAgeMinutes)}`
                          : "Waiting for first tracking session"}
                      </span>
                    </div>
                  </PeopleTableCell>
                  <PeopleTableCell>
                    <div className="mnx-tracking-mini">
                      <strong>
                        {row.alerts.length > 0
                          ? `${row.alerts.length} alert${row.alerts.length === 1 ? "" : "s"}`
                          : "No active alert"}
                      </strong>
                      <span>
                        {row.onDutyTrip
                          ? row.onDutyTrip.purpose || row.onDutyTrip.reason
                          : "Attendance-linked tracking"}
                      </span>
                    </div>
                  </PeopleTableCell>
                </PeopleTableRow>
              ))
            )}
          </PeopleTableBody>
        </PeopleTable>
      </PeopleSection>

      <div className="mnx-tracking-split">
        <PeopleSection>
          <PeopleSectionHeader
            eyebrow="On-duty missions"
            title="Field trip command board"
            description="Keep travel purpose, last waypoint, and live status visible while employees are outside standard attendance zones."
          />
          <div className="mnx-tracking-trip-list">
            {data.activeOnDutyTrips.length === 0 ? (
              <div className="mnx-tracking-empty">
                <Route aria-hidden="true" />
                <div>
                  <strong>No active on-duty movement</strong>
                  <p>When field visits start, they will appear here with the latest trip-linked coordinate.</p>
                </div>
              </div>
            ) : (
              data.activeOnDutyTrips.map((trip) => {
                const lastPoint = trip.trackingSessions[0]?.locationPoints[0];
                const lastSeenMinutes = getMinutesAgo(lastPoint?.timestamp);
                return (
                  <article key={trip.id} className="mnx-tracking-trip-card">
                    <div className="mnx-tracking-trip-top">
                      <PeoplePerson
                        name={trip.user.name}
                        secondary={trip.user.designation || "Field assignment"}
                      />
                      <WorkspaceBadge
                        variant={
                          lastSeenMinutes != null && lastSeenMinutes <= 15
                            ? "success"
                            : "warning"
                        }
                      >
                        {lastSeenMinutes != null && lastSeenMinutes <= 15
                          ? "Live route"
                          : "Awaiting fresh ping"}
                      </WorkspaceBadge>
                    </div>
                    <p className="mnx-tracking-trip-purpose">
                      {trip.purpose || trip.reason}
                    </p>
                    <div className="mnx-tracking-trip-points">
                      <div>
                        <span>Started</span>
                        <strong>{new Date(trip.startedAt).toLocaleString()}</strong>
                      </div>
                      <div>
                        <span>Last point</span>
                        <strong>{formatCoordinates(lastPoint)}</strong>
                      </div>
                      <div>
                        <span>Last seen</span>
                        <strong>{formatMinutesAgo(lastSeenMinutes)}</strong>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </PeopleSection>

        <PeopleSection>
          <PeopleSectionHeader
            eyebrow="Governance"
            title="Advanced tracking controls"
            description="Frame the program around the same control pillars used by mature ERP and telematics products."
          />
          <div className="mnx-tracking-governance-grid">
            <article className="mnx-tracking-governance-card">
              <div className="mnx-tracking-governance-icon">
                <MapPinned aria-hidden="true" />
              </div>
              <div>
                <strong>Geofence readiness</strong>
                <p>
                  Use attendance sites, branch locations, and on-duty destinations as policy zones for entry, exit, and dwell alerts.
                </p>
              </div>
            </article>
            <article className="mnx-tracking-governance-card">
              <div className="mnx-tracking-governance-icon">
                <Shield aria-hidden="true" />
              </div>
              <div>
                <strong>Integrity monitoring</strong>
                <p>
                  Separate signal issues from deliberate bypass attempts like mock GPS, app closure, or permission revocation.
                </p>
              </div>
            </article>
            <article className="mnx-tracking-governance-card">
              <div className="mnx-tracking-governance-icon">
                <Fingerprint aria-hidden="true" />
              </div>
              <div>
                <strong>Identity assurance</strong>
                <p>
                  Combine face enrollment, check-in, and route evidence so managers can trust location-linked attendance.
                </p>
              </div>
            </article>
          </div>

          <div className="mnx-tracking-statline">
            <span>{data.faceEnrollmentCount} employees have active face authentication.</span>
            <span>{alertImpactedCount} employees currently appear in the exception queue.</span>
          </div>

          <PeopleAction onClick={fetchData} variant="secondary">
            Refresh governance snapshot
          </PeopleAction>
        </PeopleSection>
      </div>
    </div>
  );
}
