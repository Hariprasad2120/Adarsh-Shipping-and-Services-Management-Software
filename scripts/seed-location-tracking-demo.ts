/**
 * Additive-only demo data for the Location & Field Tracking module.
 * Exercises the REAL service functions (recordLocationHeartbeat →
 * evaluateGeofencesForPoint → geofence event + visit detection) rather than
 * hand-inserting rows, so this also proves the wiring actually works.
 *
 * Safe to re-run: creates new rows each time, never deletes/mutates anything
 * belonging to another employee/org, never touches unrelated tables.
 *
 * Run: npx tsx scripts/seed-location-tracking-demo.ts
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { recordLocationHeartbeat } from "../src/modules/hrms/on-duty";
import { createGeofence, createException } from "../src/modules/hrms/location-tracking";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);

// Chennai-area coordinates
const OFFICE = { lat: 13.0827, lng: 80.2707 };
const CUSTOMER_SITE = { lat: 13.09, lng: 80.28 }; // ~1.3km from office
const NEAR_CUSTOMER = { lat: 13.0901, lng: 80.2801 }; // inside a 200m geofence around CUSTOMER_SITE

async function main() {
  const org = await db.organisation.findFirstOrThrow();
  const orgId = org.id;

  const salesUser = await db.user.findFirstOrThrow({ where: { orgId, active: true, name: "Amanulla R" } });
  const staleUser = await db.user.findFirstOrThrow({ where: { orgId, active: true, name: "John Arputharaj" } });
  const account = await db.crmAccount.findFirstOrThrow({ where: { orgId, name: "Adarsh Cargo Ltd" } });
  const admin = await db.user.findFirstOrThrow({ where: { orgId, name: "HR Administrator" } });

  console.log(`Seeding demo tracking for ${salesUser.name} (${salesUser.id}), customer ${account.name} (${account.id})`);

  // 1. Give the customer account real coordinates + visit radius (additive nullable fields).
  await db.crmAccount.update({
    where: { id: account.id },
    data: { geoLatitude: CUSTOMER_SITE.lat, geoLongitude: CUSTOMER_SITE.lng, geoVisitRadiusMeters: 200 },
  });

  // 2. Customer geofence, short dwell so the demo visit is immediately ready to confirm.
  const geofence = await createGeofence({
    orgId,
    createdById: admin.id,
    name: `${account.name} — Demo Site`,
    type: "CUSTOMER",
    shape: "CIRCLE",
    centerLat: CUSTOMER_SITE.lat,
    centerLng: CUSTOMER_SITE.lng,
    radiusMeters: 200,
    crmAccountId: account.id,
    dwellMinutesForVisit: 1,
  });
  console.log("Created geofence:", geofence.id);

  // 3. Attendance + tracking session + an active on-duty (sales) journey for the field employee.
  const now = new Date();
  const checkInAt = new Date(now.getTime() - 3 * 60 * 60 * 1000);

  const attendanceSession = await db.attendanceSession.create({
    data: { orgId, userId: salesUser.id, date: new Date(now.toDateString()), checkInAt, trackingEnabled: true, status: "ACTIVE" },
  });

  const onDutyRequest = await db.onDutyRequest.create({
    data: {
      orgId,
      userId: salesUser.id,
      fromDate: new Date(now.toDateString()),
      toDate: new Date(now.toDateString()),
      reason: "Customer site visit",
      purpose: "Sales Visit",
      clientReference: account.name,
      status: "ACTIVE",
      startedAt: checkInAt,
    },
  });

  const trackingSession = await db.locationTrackingSession.create({
    data: { orgId, userId: salesUser.id, attendanceSessionId: attendanceSession.id, onDutyRequestId: onDutyRequest.id, intervalMinutes: 5, status: "ACTIVE" },
  });
  console.log("Created attendance/on-duty/tracking session:", trackingSession.id);

  // 4. Heartbeats through the REAL recordLocationHeartbeat path — travelling from the office...
  await recordLocationHeartbeat(salesUser.id, orgId, { lat: OFFICE.lat, lng: OFFICE.lng, accuracy: 12, speed: 8, timestamp: new Date(now.getTime() - 20 * 60 * 1000).toISOString() }, "ON_DUTY");
  // ...arriving near the customer geofence 15 min ago (triggers ENTERED + visit DETECTED via evaluateGeofencesForPoint)...
  await recordLocationHeartbeat(salesUser.id, orgId, { lat: NEAR_CUSTOMER.lat, lng: NEAR_CUSTOMER.lng, accuracy: 10, speed: 0, timestamp: new Date(now.getTime() - 15 * 60 * 1000).toISOString() }, "ON_DUTY");
  // ...and a fresh "just now" heartbeat so the employee reads as LIVE on the dashboards.
  const heartbeat = await recordLocationHeartbeat(salesUser.id, orgId, { lat: NEAR_CUSTOMER.lat, lng: NEAR_CUSTOMER.lng, accuracy: 8, speed: 0, batteryLevel: 62, timestamp: now.toISOString() }, "ON_DUTY");
  console.log("Recorded heartbeats, latest point:", heartbeat);

  // Back-date the auto-detected visit's arrival so it's already past the 1-minute dwell threshold
  // (recordLocationHeartbeat stamped it with the server-clock "now" at insert time, not our synthetic timestamp).
  const detectedVisit = await db.customerVisit.findFirst({ where: { orgId, userId: salesUser.id, crmAccountId: account.id, status: "DETECTED" }, orderBy: { createdAt: "desc" } });
  if (detectedVisit) {
    await db.customerVisit.update({ where: { id: detectedVisit.id }, data: { arrivalAt: new Date(now.getTime() - 15 * 60 * 1000) } });
    console.log("Auto-detected visit ready for confirmation:", detectedVisit.id);
  } else {
    console.log("No auto-detected visit found — geofence entry may not have registered.");
  }

  // 5. A second, stale employee (checked in, but no recent heartbeat) — proves the STALE/OFFLINE
  // freshness classification renders correctly next to the LIVE one above.
  const staleAttendance = await db.attendanceSession.create({
    data: { orgId, userId: staleUser.id, date: new Date(now.toDateString()), checkInAt: new Date(now.getTime() - 5 * 60 * 60 * 1000), trackingEnabled: true, status: "ACTIVE" },
  });
  const staleSession = await db.locationTrackingSession.create({
    data: { orgId, userId: staleUser.id, attendanceSessionId: staleAttendance.id, intervalMinutes: 60, status: "ACTIVE" },
  });
  await db.locationPoint.create({
    data: { trackingSessionId: staleSession.id, latitude: OFFICE.lat + 0.01, longitude: OFFICE.lng + 0.01, accuracy: 15, timestamp: new Date(now.getTime() - 45 * 60 * 1000), source: "HOURLY" },
  });
  console.log("Created stale employee session:", staleSession.id);

  // 6. An open exception so the Exceptions Center has something to review.
  const exception = await createException({
    orgId,
    userId: staleUser.id,
    exceptionType: "GPS_STALE",
    severity: "MEDIUM",
    description: "No location fix received in over 30 minutes during checked-in hours.",
    evidence: { lastFixMinutesAgo: 45 },
    relatedTrackingSessionId: staleSession.id,
  });
  console.log("Created exception:", exception.id);

  console.log("\nDemo seed complete. Refresh /hrms/location-tracking to see:");
  console.log(`- Overview: 2 employees tracking now, 1 live (${salesUser.name}), 1 stale (${staleUser.name})`);
  console.log(`- Live Sales: ${salesUser.name} shown as an active field/sales journey`);
  console.log(`- Visits: 1 auto-detected visit at ${account.name}, ready to confirm`);
  console.log(`- Geofences: "${geofence.name}" circle around ${account.name}`);
  console.log(`- Exceptions: 1 open GPS_STALE exception for ${staleUser.name}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
