/**
 * Location & Field Tracking Service
 *
 * Builds on the existing GPS infrastructure (LocationTrackingSession,
 * LocationPoint, TrackingAlert, OnDutyRequest — see src/modules/hrms/on-duty.ts)
 * to add the three missing layers required by the HRMS Location & Field
 * Tracking module:
 *
 *  - Geofence engine (circle/polygon containment, hysteresis, enter/exit events)
 *  - Customer visit lifecycle (auto-detect, confirm, start/complete, dismiss)
 *  - Location exceptions (open → under review → resolved/dismissed workflow)
 *  - Tracking policy (configurable capture intervals / thresholds)
 *
 * Deliberately does NOT declare Prisma relations back onto the `User` model —
 * every model here stores plain `userId`/`orgId` strings and joins are done
 * explicitly, matching the existing TimeLog/TimesheetClient convention. This
 * keeps the change footprint isolated from the (very large, actively edited)
 * User model.
 */
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { getNow } from "@/lib/clock";
import { createNotification } from "@/modules/notifications/service";

// ─── Types ────────────────────────────────────────────────────────────────────

export type FreshnessState = "LIVE" | "RECENT" | "STALE" | "OFFLINE";

export type GeofenceScope = {
  departmentIds?: string[];
  branchIds?: string[];
  designationIds?: string[];
  employeeIds?: string[];
  teamIds?: string[];
};

// ─── Freshness classification ──────────────────────────────────────────────────

const DEFAULT_LIVE_MS = 2 * 60 * 1000;
const DEFAULT_RECENT_MS = 10 * 60 * 1000;
const DEFAULT_STALE_MS = 30 * 60 * 1000;

export function classifyFreshness(
  lastSeenAt: Date | null | undefined,
  now: Date,
  thresholds?: { liveMs?: number; recentMs?: number; staleMs?: number }
): FreshnessState {
  if (!lastSeenAt) return "OFFLINE";
  const ageMs = now.getTime() - lastSeenAt.getTime();
  const liveMs = thresholds?.liveMs ?? DEFAULT_LIVE_MS;
  const recentMs = thresholds?.recentMs ?? DEFAULT_RECENT_MS;
  const staleMs = thresholds?.staleMs ?? DEFAULT_STALE_MS;
  if (ageMs < liveMs) return "LIVE";
  if (ageMs < recentMs) return "RECENT";
  if (ageMs < staleMs) return "STALE";
  return "OFFLINE";
}

export function formatRelativeAge(lastSeenAt: Date | null | undefined, now: Date): string {
  if (!lastSeenAt) return "never";
  const seconds = Math.max(0, Math.round((now.getTime() - lastSeenAt.getTime()) / 1000));
  if (seconds < 60) return `${seconds} sec ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

// ─── Distance helpers ───────────────────────────────────────────────────────────

const EARTH_RADIUS_M = 6371000;

export function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Ray-casting point-in-polygon test. `polygon` is an array of {lat, lng}. */
function pointInPolygon(lat: number, lng: number, polygon: Array<{ lat: number; lng: number }>): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng, yi = polygon[i].lat;
    const xj = polygon[j].lng, yj = polygon[j].lat;
    const intersects = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

export function isPointInsideGeofence(
  lat: number,
  lng: number,
  geofence: { shape: string; centerLat: number | null; centerLng: number | null; radiusMeters: number | null; polygon: unknown }
): boolean {
  if (geofence.shape === "POLYGON" && Array.isArray(geofence.polygon)) {
    return pointInPolygon(lat, lng, geofence.polygon as Array<{ lat: number; lng: number }>);
  }
  if (geofence.centerLat == null || geofence.centerLng == null || geofence.radiusMeters == null) return false;
  return haversineMeters(lat, lng, geofence.centerLat, geofence.centerLng) <= geofence.radiusMeters;
}

/** Filters out GPS noise so route distance isn't inflated by jitter. */
export function filterNoisyPoints<T extends { latitude: number; longitude: number; accuracy?: number | null; timestamp: Date }>(
  points: T[],
  opts: { maxAccuracyMeters?: number; maxSpeedKmh?: number } = {}
): T[] {
  const maxAccuracy = opts.maxAccuracyMeters ?? 100;
  const maxSpeedKmh = opts.maxSpeedKmh ?? 180;
  const sorted = [...points].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  const clean: T[] = [];
  for (const p of sorted) {
    if (p.accuracy != null && p.accuracy > maxAccuracy) continue;
    const prev = clean[clean.length - 1];
    if (prev) {
      const distM = haversineMeters(prev.latitude, prev.longitude, p.latitude, p.longitude);
      const hours = Math.max((p.timestamp.getTime() - prev.timestamp.getTime()) / 3_600_000, 1 / 3600);
      const speedKmh = distM / 1000 / hours;
      if (speedKmh > maxSpeedKmh) continue; // impossible-movement jump, drop
    }
    clean.push(p);
  }
  return clean;
}

export function computeRouteDistanceKm(points: Array<{ latitude: number; longitude: number; accuracy?: number | null; timestamp: Date }>): number {
  const clean = filterNoisyPoints(points);
  let totalM = 0;
  for (let i = 1; i < clean.length; i++) {
    totalM += haversineMeters(clean[i - 1].latitude, clean[i - 1].longitude, clean[i].latitude, clean[i].longitude);
  }
  return Math.round((totalM / 1000) * 100) / 100;
}

// ─── Tracking Policy ────────────────────────────────────────────────────────────

const POLICY_DEFAULTS = {
  trackingEnabled: true,
  normalIntervalMinutes: 5,
  movingIntervalMinutes: 1,
  stationaryIntervalMinutes: 5,
  liveSalesIntervalSeconds: 30,
  visitIntervalMinutes: 3,
  staleThresholdMinutes: 10,
  offlineThresholdMinutes: 30,
  consecutiveFailureLimit: 5,
  autoCheckoutOnFailure: false,
  retentionDaysDetailedPoints: null as number | null,
};

/** Resolves effective policy for a user: employee > designation > department > branch > org > hardcoded defaults. */
export async function getEffectivePolicy(
  orgId: string,
  target: { userId?: string; designationId?: string; departmentId?: string; branchId?: string }
) {
  const scopes: Array<{ scopeType: string; scopeId: string | null }> = [
    target.userId ? { scopeType: "EMPLOYEE", scopeId: target.userId } : null,
    target.designationId ? { scopeType: "DESIGNATION", scopeId: target.designationId } : null,
    target.departmentId ? { scopeType: "DEPARTMENT", scopeId: target.departmentId } : null,
    target.branchId ? { scopeType: "BRANCH", scopeId: target.branchId } : null,
    { scopeType: "ORG", scopeId: null },
  ].filter(Boolean) as Array<{ scopeType: string; scopeId: string | null }>;

  for (const scope of scopes) {
    const policy = await db.locationTrackingPolicy.findFirst({
      where: { orgId, scopeType: scope.scopeType, scopeId: scope.scopeId, isActive: true },
    });
    if (policy) return policy;
  }
  return { ...POLICY_DEFAULTS, id: null, orgId, scopeType: "ORG", scopeId: null } as const;
}

export async function listPolicies(orgId: string) {
  return db.locationTrackingPolicy.findMany({ where: { orgId }, orderBy: [{ scopeType: "asc" }, { createdAt: "desc" }] });
}

export async function upsertPolicy(input: {
  orgId: string;
  scopeType: string;
  scopeId: string | null;
  createdById: string;
  settings: Partial<typeof POLICY_DEFAULTS>;
}) {
  const existing = await db.locationTrackingPolicy.findFirst({
    where: { orgId: input.orgId, scopeType: input.scopeType, scopeId: input.scopeId },
  });
  const data = { ...POLICY_DEFAULTS, ...input.settings, orgId: input.orgId, scopeType: input.scopeType, scopeId: input.scopeId, createdById: input.createdById };
  if (existing) {
    return db.locationTrackingPolicy.update({ where: { id: existing.id }, data });
  }
  return db.locationTrackingPolicy.create({ data });
}

// ─── Geofence CRUD ──────────────────────────────────────────────────────────────

export async function listGeofences(orgId: string, filters?: { type?: string; isActive?: boolean }) {
  return db.locationGeofence.findMany({
    where: { orgId, type: filters?.type, isActive: filters?.isActive },
    orderBy: { createdAt: "desc" },
  });
}

export async function createGeofence(input: {
  orgId: string;
  createdById: string;
  name: string;
  type: string;
  shape?: string;
  centerLat?: number;
  centerLng?: number;
  radiusMeters?: number;
  polygon?: Array<{ lat: number; lng: number }>;
  address?: string;
  crmAccountId?: string;
  scope?: GeofenceScope;
  notifyOnEnter?: boolean;
  notifyOnExit?: boolean;
  dwellMinutesForVisit?: number;
  activeFrom?: Date;
  activeTo?: Date;
}) {
  return db.locationGeofence.create({
    data: {
      orgId: input.orgId,
      createdById: input.createdById,
      name: input.name,
      type: input.type,
      shape: input.shape ?? "CIRCLE",
      centerLat: input.centerLat,
      centerLng: input.centerLng,
      radiusMeters: input.radiusMeters,
      polygon: input.polygon as Prisma.InputJsonValue | undefined,
      address: input.address,
      crmAccountId: input.crmAccountId,
      scope: input.scope as Prisma.InputJsonValue | undefined,
      notifyOnEnter: input.notifyOnEnter ?? true,
      notifyOnExit: input.notifyOnExit ?? true,
      dwellMinutesForVisit: input.dwellMinutesForVisit ?? 3,
      activeFrom: input.activeFrom,
      activeTo: input.activeTo,
    },
  });
}

export async function updateGeofence(id: string, orgId: string, patch: Record<string, unknown>) {
  const existing = await db.locationGeofence.findFirst({ where: { id, orgId } });
  if (!existing) throw new Error("Geofence not found");
  return db.locationGeofence.update({ where: { id }, data: patch as Prisma.LocationGeofenceUpdateInput });
}

export async function deactivateGeofence(id: string, orgId: string) {
  const existing = await db.locationGeofence.findFirst({ where: { id, orgId } });
  if (!existing) throw new Error("Geofence not found");
  return db.locationGeofence.update({ where: { id }, data: { isActive: false } });
}

// ─── Geofence Engine (enter/exit with hysteresis) ──────────────────────────────

/**
 * Evaluates one location point against all active geofences applicable org-wide
 * (scope filtering by employee is intentionally coarse here — full department/
 * branch/designation targeting can be layered on once those directory ids are
 * threaded through; org-wide and explicit employeeIds are honoured today).
 *
 * Debounced via `exitCooldownSeconds`: an ENTERED/EXITED event only fires if the
 * previous event for this (user, geofence) pair is older than the cooldown, or
 * this is the first observation — this avoids notification storms from GPS
 * jitter right on a boundary.
 */
export async function evaluateGeofencesForPoint(params: {
  orgId: string;
  userId: string;
  trackingSessionId?: string | null;
  latitude: number;
  longitude: number;
  occurredAt: Date;
  source?: string;
}) {
  const geofences = await db.locationGeofence.findMany({ where: { orgId: params.orgId, isActive: true } });
  const results: Array<{ geofenceId: string; eventType: "ENTERED" | "EXITED"; crmAccountId: string | null; dwellMinutesForVisit: number }> = [];

  for (const gf of geofences) {
    const scope = (gf.scope as GeofenceScope | null) ?? null;
    if (scope?.employeeIds?.length && !scope.employeeIds.includes(params.userId)) continue;

    const inside = isPointInsideGeofence(params.latitude, params.longitude, gf);

    const lastEvent = await db.locationGeofenceEvent.findFirst({
      where: { orgId: params.orgId, geofenceId: gf.id, userId: params.userId },
      orderBy: { occurredAt: "desc" },
    });

    const currentlyInside = lastEvent?.eventType === "ENTERED";
    if (inside === currentlyInside) continue; // no state change

    if (lastEvent) {
      const sinceLastMs = params.occurredAt.getTime() - lastEvent.occurredAt.getTime();
      if (sinceLastMs < gf.exitCooldownSeconds * 1000) continue; // debounce jitter
    }

    const eventType = inside ? "ENTERED" : "EXITED";
    await db.locationGeofenceEvent.create({
      data: {
        orgId: params.orgId,
        geofenceId: gf.id,
        userId: params.userId,
        trackingSessionId: params.trackingSessionId ?? undefined,
        eventType,
        latitude: params.latitude,
        longitude: params.longitude,
        occurredAt: params.occurredAt,
        source: params.source ?? "HEARTBEAT",
      },
    });

    if ((eventType === "ENTERED" && gf.notifyOnEnter) || (eventType === "EXITED" && gf.notifyOnExit)) {
      const user = await db.user.findFirst({ where: { id: params.userId }, select: { name: true, managerId: true } });
      if (user?.managerId) {
        await createNotification({
          userId: user.managerId,
          orgId: params.orgId,
          kind: eventType === "ENTERED" ? "HRMS_GEOFENCE_ENTERED" : "HRMS_GEOFENCE_EXITED",
          title: eventType === "ENTERED" ? `${user.name} entered ${gf.name}` : `${user.name} left ${gf.name}`,
          body: gf.type === "CUSTOMER" ? "Customer geofence event." : "Geofence event.",
          link: `/hrms/location-tracking/geofences`,
          priority: "normal",
        });
      }
    }

    results.push({ geofenceId: gf.id, eventType, crmAccountId: gf.crmAccountId, dwellMinutesForVisit: gf.dwellMinutesForVisit });

    if (gf.type === "CUSTOMER" && gf.crmAccountId) {
      if (eventType === "ENTERED") {
        await maybeDetectVisit({ orgId: params.orgId, userId: params.userId, geofence: gf, arrivalAt: params.occurredAt, trackingSessionId: params.trackingSessionId ?? null });
      } else {
        await maybeCloseVisitOnExit({ orgId: params.orgId, userId: params.userId, geofenceId: gf.id, departureAt: params.occurredAt });
      }
    }
  }

  return results;
}

// ─── Customer Visits ────────────────────────────────────────────────────────────

async function maybeDetectVisit(params: { orgId: string; userId: string; geofence: { id: string; crmAccountId: string | null; dwellMinutesForVisit: number }; arrivalAt: Date; trackingSessionId: string | null }) {
  if (!params.geofence.crmAccountId) return;
  const existingOpen = await db.customerVisit.findFirst({
    where: { orgId: params.orgId, userId: params.userId, geofenceId: params.geofence.id, status: { in: ["DETECTED", "CONFIRMED", "IN_PROGRESS"] } },
  });
  if (existingOpen) return;

  await db.customerVisit.create({
    data: {
      orgId: params.orgId,
      userId: params.userId,
      crmAccountId: params.geofence.crmAccountId,
      geofenceId: params.geofence.id,
      trackingSessionId: params.trackingSessionId,
      visitType: "UNPLANNED",
      status: "DETECTED",
      locationConfidence: "MEDIUM",
      arrivalAt: params.arrivalAt,
    },
  });
  // NOTE: "DETECTED" is a candidate only. Promotion to CONFIRMED happens either
  // via explicit employee action (confirmVisit) or automatically once dwell time
  // inside the geofence exceeds `dwellMinutesForVisit` — see promoteDwellingVisits().
}

async function maybeCloseVisitOnExit(params: { orgId: string; userId: string; geofenceId: string; departureAt: Date }) {
  const open = await db.customerVisit.findFirst({
    where: { orgId: params.orgId, userId: params.userId, geofenceId: params.geofenceId, status: { in: ["DETECTED", "CONFIRMED", "IN_PROGRESS"] } },
    orderBy: { arrivalAt: "desc" },
  });
  if (!open) return;

  if (open.status === "DETECTED") {
    // Never left dwell-confirmation state and employee already left — drop the candidate rather than
    // silently recording a "verified" meeting from GPS proximity alone.
    await db.customerVisit.update({ where: { id: open.id }, data: { status: "DISMISSED", departureAt: params.departureAt } });
    return;
  }

  const durationMinutes = open.startAt ? Math.round((params.departureAt.getTime() - open.startAt.getTime()) / 60000) : null;
  await db.customerVisit.update({
    where: { id: open.id },
    data: { departureAt: params.departureAt, endAt: open.endAt ?? params.departureAt, durationMinutes, status: open.status === "IN_PROGRESS" ? "COMPLETED" : open.status },
  });
}

/** Promotes DETECTED visits to a "ready to confirm" state once dwell threshold is exceeded. Call from a periodic sweep. */
export async function promoteDwellingVisits(orgId: string) {
  const now = await getNow();
  const detected = await db.customerVisit.findMany({ where: { orgId, status: "DETECTED" } });
  const readyIds: string[] = [];
  for (const v of detected) {
    if (!v.arrivalAt) continue;
    const geofence = v.geofenceId ? await db.locationGeofence.findUnique({ where: { id: v.geofenceId } }) : null;
    const dwellMin = geofence?.dwellMinutesForVisit ?? 3;
    if (now.getTime() - v.arrivalAt.getTime() >= dwellMin * 60_000) readyIds.push(v.id);
  }
  return readyIds; // caller (UI) surfaces "Possible customer visit detected" prompt for these ids
}

export async function confirmVisit(id: string, orgId: string, actorId: string, patch?: { purpose?: string; contactPerson?: string; notes?: string }) {
  const visit = await db.customerVisit.findFirst({ where: { id, orgId } });
  if (!visit) throw new Error("Visit not found");
  return db.customerVisit.update({
    where: { id },
    data: { status: "IN_PROGRESS", startAt: visit.startAt ?? (await getNow()), locationConfidence: "HIGH", createdById: actorId, ...patch },
  });
}

export async function dismissVisit(id: string, orgId: string) {
  const visit = await db.customerVisit.findFirst({ where: { id, orgId } });
  if (!visit) throw new Error("Visit not found");
  return db.customerVisit.update({ where: { id }, data: { status: "DISMISSED" } });
}

export async function completeVisit(id: string, orgId: string, patch: { outcome?: string; notes?: string; followUpAt?: Date }) {
  const visit = await db.customerVisit.findFirst({ where: { id, orgId } });
  if (!visit) throw new Error("Visit not found");
  const now = await getNow();
  const durationMinutes = visit.startAt ? Math.round((now.getTime() - visit.startAt.getTime()) / 60000) : null;
  return db.customerVisit.update({ where: { id }, data: { status: "COMPLETED", endAt: now, durationMinutes, ...patch } });
}

export async function createPlannedVisit(input: {
  orgId: string;
  userId: string;
  crmAccountId: string;
  createdById: string;
  purpose?: string;
  contactPerson?: string;
  notes?: string;
  scheduledAt?: Date;
}) {
  return db.customerVisit.create({
    data: {
      orgId: input.orgId,
      userId: input.userId,
      crmAccountId: input.crmAccountId,
      createdById: input.createdById,
      visitType: "PLANNED",
      status: "DETECTED",
      locationConfidence: "LOW",
      purpose: input.purpose,
      contactPerson: input.contactPerson,
      notes: input.notes,
      arrivalAt: input.scheduledAt,
    },
  });
}

export async function listVisits(orgId: string, filters?: { userId?: string; crmAccountId?: string; status?: string; from?: Date; to?: Date }) {
  return db.customerVisit.findMany({
    where: {
      orgId,
      userId: filters?.userId,
      crmAccountId: filters?.crmAccountId,
      status: filters?.status,
      arrivalAt: filters?.from || filters?.to ? { gte: filters?.from, lte: filters?.to } : undefined,
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

// ─── Exceptions ─────────────────────────────────────────────────────────────────

export async function createException(input: {
  orgId: string;
  userId: string;
  exceptionType: string;
  severity?: string;
  description?: string;
  evidence?: Record<string, unknown>;
  relatedTrackingSessionId?: string;
  relatedGeofenceId?: string;
  relatedVisitId?: string;
}) {
  return db.locationException.create({
    data: {
      orgId: input.orgId,
      userId: input.userId,
      exceptionType: input.exceptionType,
      severity: input.severity ?? "MEDIUM",
      description: input.description,
      evidence: input.evidence as Prisma.InputJsonValue | undefined,
      relatedTrackingSessionId: input.relatedTrackingSessionId,
      relatedGeofenceId: input.relatedGeofenceId,
      relatedVisitId: input.relatedVisitId,
    },
  });
}

export async function listExceptions(orgId: string, filters?: { status?: string; exceptionType?: string; userId?: string }) {
  return db.locationException.findMany({
    where: { orgId, status: filters?.status, exceptionType: filters?.exceptionType, userId: filters?.userId },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function submitExceptionExplanation(id: string, orgId: string, userId: string, explanation: string, attachmentUrl?: string) {
  const exception = await db.locationException.findFirst({ where: { id, orgId, userId } });
  if (!exception) throw new Error("Exception not found");
  return db.locationException.update({
    where: { id },
    data: { employeeExplanation: explanation, employeeAttachmentUrl: attachmentUrl, status: "UNDER_REVIEW" },
  });
}

export async function reviewException(
  id: string,
  orgId: string,
  reviewerId: string,
  action: "REQUEST_EXPLANATION" | "RESOLVE" | "DISMISS",
  resolution?: string
) {
  const exception = await db.locationException.findFirst({ where: { id, orgId } });
  if (!exception) throw new Error("Exception not found");
  const now = await getNow();
  const status = action === "REQUEST_EXPLANATION" ? "EXPLANATION_REQUESTED" : action === "RESOLVE" ? "RESOLVED" : "DISMISSED";
  return db.locationException.update({
    where: { id },
    data: { status, reviewerId, reviewedAt: now, resolution },
  });
}

// ─── Latest-location read model (efficient — avoids scanning full history) ──────

export async function getLatestLocationsForOrg(orgId: string) {
  const activeSessions = await db.locationTrackingSession.findMany({
    where: { orgId, status: "ACTIVE" },
    include: {
      locationPoints: { orderBy: { timestamp: "desc" }, take: 1 },
    },
  });

  const userIds = activeSessions.map((s) => s.userId);
  const users = userIds.length
    ? await db.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, designation: true, photo: true, department: { select: { name: true } } },
      })
    : [];
  const userMap = new Map(users.map((u) => [u.id, u]));

  return activeSessions.map((s) => ({
    userId: s.userId,
    user: userMap.get(s.userId) ?? null,
    trackingSessionId: s.id,
    onDutyRequestId: s.onDutyRequestId,
    intervalMinutes: s.intervalMinutes,
    latestPoint: s.locationPoints[0] ?? null,
  }));
}
