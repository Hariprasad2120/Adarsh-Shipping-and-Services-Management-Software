"use client";

/** Leaflet map showing employee markers colour-coded by freshness state. */
import { useEffect, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { Freshness, LatestLocationRow } from "./shared";

const FRESHNESS_COLOR: Record<Freshness, string> = {
  LIVE: "#16a34a",
  RECENT: "#1a5fb4",
  STALE: "#d97706",
  OFFLINE: "#6b7280",
};

export function EmployeeMap({
  employees,
  onSelect,
  center = [13.0827, 80.2707],
}: {
  employees: LatestLocationRow[];
  onSelect?: (userId: string) => void;
  center?: [number, number];
}) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const timeout = window.setTimeout(() => setReady(true), 0);
    return () => window.clearTimeout(timeout);
  }, []);
  if (!ready) return <div className="h-[420px] animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-800" aria-hidden="true" />;

  const withPoints = employees.filter((e) => e.latestPoint);
  const mapCenter: [number, number] = withPoints.length > 0 && withPoints[0].latestPoint ? [withPoints[0].latestPoint.latitude, withPoints[0].latestPoint.longitude] : center;

  return (
    <div className="h-[420px] w-full overflow-hidden rounded-lg border">
      <MapContainer center={mapCenter} zoom={11} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {withPoints.map((row) =>
          row.latestPoint ? (
            <CircleMarker
              key={row.userId}
              center={[row.latestPoint.latitude, row.latestPoint.longitude]}
              radius={9}
              pathOptions={{ color: FRESHNESS_COLOR[row.freshness], fillColor: FRESHNESS_COLOR[row.freshness], fillOpacity: 0.85, weight: 2 }}
              eventHandlers={onSelect ? { click: () => onSelect(row.userId) } : undefined}
            >
              <Tooltip>
                {row.user?.name ?? "Unknown"} — {row.freshness}
              </Tooltip>
            </CircleMarker>
          ) : null
        )}
      </MapContainer>
    </div>
  );
}
