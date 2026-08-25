/** Shared types/helpers for the Location & Field Tracking module UI. */

export type Freshness = "LIVE" | "RECENT" | "STALE" | "OFFLINE";

export type LatestLocationRow = {
  userId: string;
  user: { id: string; name: string; designation?: string | null; photo?: string | null; department?: { name: string } | null } | null;
  trackingSessionId: string;
  onDutyRequestId: string | null;
  intervalMinutes: number;
  latestPoint: {
    id: string;
    latitude: number;
    longitude: number;
    accuracy: number | null;
    speed: number | null;
    batteryLevel: number | null;
    timestamp: string;
  } | null;
  freshness: Freshness;
};

export function freshnessLabel(f: Freshness, ageSeconds?: number | null) {
  const suffix = ageSeconds != null ? ` • ${formatAge(ageSeconds)}` : "";
  switch (f) {
    case "LIVE":
      return `LIVE${suffix}`;
    case "RECENT":
      return `RECENT${suffix}`;
    case "STALE":
      return `STALE${suffix}`;
    default:
      return `OFFLINE${suffix}`;
  }
}

export function formatAge(seconds: number) {
  if (seconds < 60) return `${Math.round(seconds)} sec ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return `${hours} hr ago`;
}

export function ageSecondsOf(timestamp?: string | null) {
  if (!timestamp) return null;
  return (Date.now() - new Date(timestamp).getTime()) / 1000;
}

export function freshnessBadgeVariant(f: Freshness): "success" | "accent" | "warning" | "danger" {
  switch (f) {
    case "LIVE":
      return "success";
    case "RECENT":
      return "accent";
    case "STALE":
      return "warning";
    default:
      return "danger";
  }
}

export function mapsLink(lat: number, lng: number) {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

export async function fetchJson<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const json = await res.json().catch(() => ({}) as Record<string, unknown>);
  if (!res.ok || json?.ok === false) {
    const errorField = json?.error as { message?: string } | string | undefined;
    const message = typeof errorField === "string" ? errorField : errorField?.message;
    throw new Error(message || `Request failed (${res.status})`);
  }
  return (json.data ?? json) as T;
}
