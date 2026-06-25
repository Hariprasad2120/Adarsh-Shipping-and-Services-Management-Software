"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  Radio,
  RefreshCw,
  Shield,
  Smartphone,
  User,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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

const ALERT_ICON_MAP: Record<string, typeof AlertTriangle> = {
  OFFLINE: Radio,
  GPS_DISABLED: MapPin,
  MOCK_DETECTED: Shield,
  LOW_BATTERY: Smartphone,
  APP_KILLED: XCircle,
  PERMISSION_DENIED: Shield,
};

const ALERT_LABEL_MAP: Record<string, string> = {
  OFFLINE: "Employee Offline",
  GPS_DISABLED: "GPS Disabled",
  MOCK_DETECTED: "Mock Location",
  LOW_BATTERY: "Low Battery",
  APP_KILLED: "App Closed",
  PERMISSION_DENIED: "Permission Denied",
};

export function TrackingDashboardView() {
  const [data, setData] = useState<TrackingDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/hrms/tracking");
      const json = await response.json();
      if (!json.ok) throw new Error(json.error || "Failed to load tracking data");
      setData(json.data);
    } catch (error: any) {
      toast.error(error.message || "Failed to load tracking dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000); // Auto-refresh every minute
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading && !data) {
    return (
      <div className="flex min-h-[24rem] flex-col items-center justify-center gap-3 text-on-surface-variant">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="ds-label">Loading Tracking Dashboard</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="rounded-[24px] border border-outline-variant bg-surface p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="ds-icon-badge">
              <MapPin className="size-5" />
            </span>
            <div>
              <h1 className="ds-h1 text-on-surface">EMPLOYEE TRACKING</h1>
              <p className="mt-2 text-sm text-on-surface-variant">
                Live attendance tracking, location monitoring, and on-duty trip management.
              </p>
            </div>
          </div>
          <Button type="button" variant="outline" mode="icon" onClick={fetchData}>
            <RefreshCw className="size-4" />
          </Button>
        </div>
      </Card>

      {/* Stats Row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="card-top-accent rounded-2xl border border-outline-variant bg-surface p-5 shadow-sm">
          <p className="ds-label text-on-surface-variant">CHECKED IN</p>
          <p className="mt-2 text-[2rem] font-extralight tracking-tight text-on-surface ds-numeric">
            {data.checkedInEmployees.length}
          </p>
        </div>
        <div className="card-top-accent rounded-2xl border border-outline-variant bg-surface p-5 shadow-sm">
          <p className="ds-label text-on-surface-variant">TRACKING ACTIVE</p>
          <p className="mt-2 text-[2rem] font-extralight tracking-tight text-on-surface ds-numeric">
            {data.activeTrackingSessions.length}
          </p>
        </div>
        <div className="card-top-accent-orange rounded-2xl border border-outline-variant bg-surface p-5 shadow-sm">
          <p className="ds-label text-on-surface-variant">ALERTS</p>
          <p className="mt-2 text-[2rem] font-extralight tracking-tight text-on-surface ds-numeric">
            {data.unresolvedAlerts.length}
          </p>
        </div>
        <div className="card-top-accent rounded-2xl border border-outline-variant bg-surface p-5 shadow-sm">
          <p className="ds-label text-on-surface-variant">ON DUTY</p>
          <p className="mt-2 text-[2rem] font-extralight tracking-tight text-on-surface ds-numeric">
            {data.activeOnDutyTrips.length}
          </p>
        </div>
      </div>

      {/* Alerts Section */}
      {data.unresolvedAlerts.length > 0 ? (
        <div className="space-y-3">
          <h2 className="ds-h2 text-on-surface">UNRESOLVED ALERTS</h2>
          {data.unresolvedAlerts.map((alert) => {
            const AlertIcon = ALERT_ICON_MAP[alert.alertType] ?? AlertTriangle;
            return (
              <Card key={alert.id} className="card-left-accent-orange rounded-2xl border border-outline-variant bg-surface p-5 shadow-sm">
                <div className="flex flex-wrap items-center gap-4">
                  <span className="ds-icon-badge" style={{ background: "rgba(251,146,60,0.10)", color: "#fb923c" }}>
                    <AlertIcon className="size-4" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-on-surface">
                      {ALERT_LABEL_MAP[alert.alertType] ?? alert.alertType} — {alert.user.name}
                    </p>
                    <p className="mt-1 text-xs text-on-surface-variant">
                      {alert.message} | {new Date(alert.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {alert.lastKnownLat && alert.lastKnownLng ? (
                    <span className="text-xs text-on-surface-variant ds-numeric">
                      {alert.lastKnownLat.toFixed(4)}, {alert.lastKnownLng.toFixed(4)}
                    </span>
                  ) : null}
                </div>
              </Card>
            );
          })}
        </div>
      ) : null}

      {/* Checked-In Employees */}
      <div className="space-y-3">
        <h2 className="ds-h2 text-on-surface">CHECKED-IN EMPLOYEES</h2>
        {data.checkedInEmployees.length === 0 ? (
          <Card className="rounded-2xl border border-dashed border-outline-variant bg-surface p-10 text-center text-on-surface-variant">
            <CheckCircle2 className="mx-auto mb-3 size-10 text-primary" />
            <p className="text-sm">No employees are currently checked in.</p>
          </Card>
        ) : (
          <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface shadow-sm">
            <div className="overflow-x-auto">
              <table className="ds-table">
                <thead>
                  <tr>
                    <th className="px-6 py-3">Employee</th>
                    <th className="px-6 py-3">Designation</th>
                    <th className="px-6 py-3">Check-In Time</th>
                    <th className="px-6 py-3">Last Location</th>
                    <th className="px-6 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.checkedInEmployees.map((session) => {
                    const tracking = data.activeTrackingSessions.find(
                      (t) => t.user.id === session.user.id
                    );
                    const lastPoint = tracking?.locationPoints?.[0];

                    return (
                      <tr key={session.id}>
                        <td className="px-6 py-4 font-medium text-on-surface">{session.user.name}</td>
                        <td className="px-6 py-4 text-on-surface-variant">{session.user.designation || "—"}</td>
                        <td className="px-6 py-4 ds-numeric text-on-surface-variant">
                          {new Date(session.checkInAt).toLocaleTimeString()}
                        </td>
                        <td className="px-6 py-4 text-on-surface-variant ds-numeric">
                          {lastPoint
                            ? `${lastPoint.latitude.toFixed(4)}, ${lastPoint.longitude.toFixed(4)}`
                            : "—"}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                            tracking
                              ? "bg-primary/10 text-primary"
                              : "bg-surface-container-low text-on-surface-variant"
                          }`}>
                            {tracking ? (
                              <>
                                <Radio className="size-3 animate-pulse" />
                                Tracking
                              </>
                            ) : (
                              "Checked In"
                            )}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Active On-Duty Trips */}
      {data.activeOnDutyTrips.length > 0 ? (
        <div className="space-y-3">
          <h2 className="ds-h2 text-on-surface">ACTIVE ON-DUTY TRIPS</h2>
          {data.activeOnDutyTrips.map((trip) => {
            const lastPoint = trip.trackingSessions?.[0]?.locationPoints?.[0];
            return (
              <Card key={trip.id} className="card-left-accent rounded-2xl border border-outline-variant bg-surface p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="ds-icon-badge">
                      <User className="size-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-on-surface">{trip.user.name}</p>
                      <p className="mt-1 text-xs text-on-surface-variant">
                        {trip.purpose || trip.reason} | Started: {new Date(trip.startedAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {lastPoint ? (
                      <span className="text-xs text-on-surface-variant ds-numeric">
                        <MapPin className="mr-1 inline size-3" />
                        {lastPoint.latitude.toFixed(4)}, {lastPoint.longitude.toFixed(4)}
                        <span className="ml-2 text-[10px]">
                          ({new Date(lastPoint.timestamp).toLocaleTimeString()})
                        </span>
                      </span>
                    ) : null}
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">
                      <Radio className="size-3 animate-pulse" /> Live
                    </span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : null}

      {/* Face Enrollment Stats */}
      <Card className="rounded-2xl border border-outline-variant bg-surface p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <span className="ds-icon-badge">
            <Shield className="size-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-on-surface">FACE AUTHENTICATION</p>
            <p className="mt-1 text-xs text-on-surface-variant">
              <span className="ds-numeric">{data.faceEnrollmentCount}</span> employees have active face enrollments
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
