"use client";

/**
 * Leaflet map for the Geofences tab: shows existing geofences as circles and
 * lets the user draw a new one by click (center) + drag (radius) + release
 * (commit). No Leaflet Draw plugin — this is a small enough interaction to
 * hand-roll with native Leaflet events, avoiding a second mapping dependency.
 *
 * OpenStreetMap tiles — no API key/credential needed, nothing to configure.
 */
import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Circle, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Leaflet's default marker icons reference image URLs that don't resolve under
// bundlers unless re-pointed — a well-known Leaflet+webpack/Next gotcha.
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export type ExistingGeofence = {
  id: string;
  name: string;
  centerLat: number | null;
  centerLng: number | null;
  radiusMeters: number | null;
  isActive: boolean;
};

export type DraftCircle = { lat: number; lng: number; radiusMeters: number } | null;

function DrawController({ drawing, onDraft }: { drawing: boolean; onDraft: (draft: DraftCircle) => void }) {
  const draggingRef = useRef<{ lat: number; lng: number } | null>(null);

  const map = useMapEvents({
    mousedown(e) {
      if (!drawing) return;
      draggingRef.current = { lat: e.latlng.lat, lng: e.latlng.lng };
      map.dragging.disable();
      onDraft({ lat: e.latlng.lat, lng: e.latlng.lng, radiusMeters: 0 });
    },
    mousemove(e) {
      if (!drawing || !draggingRef.current) return;
      const center = draggingRef.current;
      const radiusMeters = map.distance([center.lat, center.lng], [e.latlng.lat, e.latlng.lng]);
      onDraft({ lat: center.lat, lng: center.lng, radiusMeters: Math.round(radiusMeters) });
    },
    mouseup() {
      if (!drawing || !draggingRef.current) return;
      draggingRef.current = null;
      map.dragging.enable();
    },
  });

  useEffect(() => {
    if (!drawing) {
      draggingRef.current = null;
      map.dragging.enable();
    }
  }, [drawing, map]);

  return null;
}

export function GeofenceMap({
  existing,
  drawing,
  draft,
  onDraftChange,
  center = [13.0827, 80.2707], // Chennai — sensible default center for this org
}: {
  existing: ExistingGeofence[];
  drawing: boolean;
  draft: DraftCircle;
  onDraftChange: (draft: DraftCircle) => void;
  center?: [number, number];
}) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const timeout = window.setTimeout(() => setReady(true), 0);
    return () => window.clearTimeout(timeout);
  }, []);
  if (!ready) return <div className="h-[420px] animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-800" aria-hidden="true" />;

  return (
    <div className="h-[420px] w-full overflow-hidden rounded-lg border">
      <MapContainer center={center} zoom={12} style={{ height: "100%", width: "100%", cursor: drawing ? "crosshair" : "grab" }} scrollWheelZoom>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {existing.map((gf) =>
          gf.centerLat != null && gf.centerLng != null && gf.radiusMeters != null ? (
            <Circle
              key={gf.id}
              center={[gf.centerLat, gf.centerLng]}
              radius={gf.radiusMeters}
              pathOptions={{ color: gf.isActive ? "#1a5fb4" : "#9ca3af", fillOpacity: 0.12 }}
            />
          ) : null
        )}

        {draft ? (
          <>
            <Marker position={[draft.lat, draft.lng]} />
            <Circle center={[draft.lat, draft.lng]} radius={draft.radiusMeters} pathOptions={{ color: "#e11d48", fillOpacity: 0.15, dashArray: "4 4" }} />
          </>
        ) : null}

        <DrawController drawing={drawing} onDraft={onDraftChange} />
      </MapContainer>
    </div>
  );
}
