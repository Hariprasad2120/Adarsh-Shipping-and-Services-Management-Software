import { describe, expect, it } from "vitest";
import {
  classifyFreshness,
  computeRouteDistanceKm,
  filterNoisyPoints,
  haversineMeters,
  isPointInsideGeofence,
} from "../location-tracking";

describe("classifyFreshness", () => {
  const now = new Date("2026-01-01T12:00:00Z");

  it("classifies a point under 2 minutes old as LIVE", () => {
    expect(classifyFreshness(new Date("2026-01-01T11:59:00Z"), now)).toBe("LIVE");
  });

  it("classifies a point between 2 and 10 minutes old as RECENT", () => {
    expect(classifyFreshness(new Date("2026-01-01T11:55:00Z"), now)).toBe("RECENT");
  });

  it("classifies a point between 10 and 30 minutes old as STALE", () => {
    expect(classifyFreshness(new Date("2026-01-01T11:45:00Z"), now)).toBe("STALE");
  });

  it("classifies a point over 30 minutes old as OFFLINE", () => {
    expect(classifyFreshness(new Date("2026-01-01T11:00:00Z"), now)).toBe("OFFLINE");
  });

  it("classifies a missing timestamp as OFFLINE", () => {
    expect(classifyFreshness(null, now)).toBe("OFFLINE");
  });

  it("respects custom thresholds", () => {
    expect(classifyFreshness(new Date("2026-01-01T11:59:30Z"), now, { liveMs: 60_000 })).toBe("RECENT");
  });
});

describe("haversineMeters", () => {
  it("returns 0 for identical coordinates", () => {
    expect(haversineMeters(13.08, 80.27, 13.08, 80.27)).toBe(0);
  });

  it("returns a plausible distance for two known Chennai coordinates (~1.1km apart)", () => {
    const meters = haversineMeters(13.0827, 80.2707, 13.0900, 80.2750);
    expect(meters).toBeGreaterThan(700);
    expect(meters).toBeLessThan(1200);
  });
});

describe("isPointInsideGeofence", () => {
  const circle = { shape: "CIRCLE", centerLat: 13.0827, centerLng: 80.2707, radiusMeters: 200, polygon: null };

  it("reports true for a point at the exact center", () => {
    expect(isPointInsideGeofence(13.0827, 80.2707, circle)).toBe(true);
  });

  it("reports false for a point well outside the radius", () => {
    expect(isPointInsideGeofence(13.2, 80.4, circle)).toBe(false);
  });

  it("evaluates a polygon geofence via ray-casting", () => {
    const polygon = {
      shape: "POLYGON",
      centerLat: null,
      centerLng: null,
      radiusMeters: null,
      polygon: [
        { lat: 13.0, lng: 80.0 },
        { lat: 13.0, lng: 80.1 },
        { lat: 13.1, lng: 80.1 },
        { lat: 13.1, lng: 80.0 },
      ],
    };
    expect(isPointInsideGeofence(13.05, 80.05, polygon)).toBe(true);
    expect(isPointInsideGeofence(13.5, 80.5, polygon)).toBe(false);
  });

  it("returns false when a circle geofence is missing center/radius data", () => {
    expect(isPointInsideGeofence(13.0827, 80.2707, { shape: "CIRCLE", centerLat: null, centerLng: null, radiusMeters: null, polygon: null })).toBe(false);
  });
});

describe("filterNoisyPoints", () => {
  const base = new Date("2026-01-01T09:00:00Z").getTime();
  function pt(offsetSeconds: number, lat: number, lng: number, accuracy?: number) {
    return { latitude: lat, longitude: lng, accuracy: accuracy ?? 10, timestamp: new Date(base + offsetSeconds * 1000) };
  }

  it("drops points with accuracy worse than the configured threshold", () => {
    const points = [pt(0, 13.08, 80.27, 5), pt(60, 13.081, 80.271, 500)];
    const filtered = filterNoisyPoints(points, { maxAccuracyMeters: 100 });
    expect(filtered).toHaveLength(1);
  });

  it("drops a point implying an impossible speed jump", () => {
    // ~50km jump in 10 seconds is far beyond any plausible ground speed
    const points = [pt(0, 13.08, 80.27), pt(10, 13.5, 80.7)];
    const filtered = filterNoisyPoints(points, { maxSpeedKmh: 180 });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].latitude).toBe(13.08);
  });

  it("keeps a realistic sequence of nearby points", () => {
    const points = [pt(0, 13.08, 80.27), pt(60, 13.0805, 80.2705), pt(120, 13.081, 80.271)];
    const filtered = filterNoisyPoints(points);
    expect(filtered).toHaveLength(3);
  });

  it("sorts out-of-order points by timestamp before filtering", () => {
    const points = [pt(120, 13.081, 80.271), pt(0, 13.08, 80.27)];
    const filtered = filterNoisyPoints(points);
    expect(filtered[0].timestamp.getTime()).toBeLessThan(filtered[1].timestamp.getTime());
  });
});

describe("computeRouteDistanceKm", () => {
  const base = new Date("2026-01-01T09:00:00Z").getTime();
  function pt(offsetSeconds: number, lat: number, lng: number) {
    return { latitude: lat, longitude: lng, accuracy: 10, timestamp: new Date(base + offsetSeconds * 1000) };
  }

  it("returns 0 for a single point", () => {
    expect(computeRouteDistanceKm([pt(0, 13.08, 80.27)])).toBe(0);
  });

  it("sums distance across a clean multi-point route", () => {
    const km = computeRouteDistanceKm([pt(0, 13.0827, 80.2707), pt(300, 13.09, 80.2707), pt(600, 13.0975, 80.2707)]);
    expect(km).toBeGreaterThan(1.5);
    expect(km).toBeLessThan(2);
  });

  it("does not let a single GPS spike inflate total distance", () => {
    const clean = computeRouteDistanceKm([pt(0, 13.0827, 80.2707), pt(300, 13.09, 80.2707)]);
    const withSpike = computeRouteDistanceKm([pt(0, 13.0827, 80.2707), pt(10, 20.0, 90.0), pt(300, 13.09, 80.2707)]);
    expect(withSpike).toBeCloseTo(clean, 1);
  });
});
