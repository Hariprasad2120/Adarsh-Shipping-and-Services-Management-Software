-- Location & Field Tracking module: additive-only schema changes.
-- New tables: LocationTrackingPolicy, LocationGeofence, LocationGeofenceEvent,
-- CustomerVisit, LocationException. Plus optional geo columns on CrmAccount.
-- No existing table is altered destructively; no data is dropped.

-- AlterTable
ALTER TABLE "CrmAccount" ADD COLUMN     "geoLatitude" DOUBLE PRECISION,
ADD COLUMN     "geoLongitude" DOUBLE PRECISION,
ADD COLUMN     "geoVisitRadiusMeters" INTEGER;

-- CreateTable
CREATE TABLE "LocationTrackingPolicy" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "scopeType" TEXT NOT NULL,
    "scopeId" TEXT,
    "trackingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "normalIntervalMinutes" INTEGER NOT NULL DEFAULT 5,
    "movingIntervalMinutes" INTEGER NOT NULL DEFAULT 1,
    "stationaryIntervalMinutes" INTEGER NOT NULL DEFAULT 5,
    "liveSalesIntervalSeconds" INTEGER NOT NULL DEFAULT 30,
    "visitIntervalMinutes" INTEGER NOT NULL DEFAULT 3,
    "staleThresholdMinutes" INTEGER NOT NULL DEFAULT 10,
    "offlineThresholdMinutes" INTEGER NOT NULL DEFAULT 30,
    "consecutiveFailureLimit" INTEGER NOT NULL DEFAULT 5,
    "autoCheckoutOnFailure" BOOLEAN NOT NULL DEFAULT false,
    "retentionDaysDetailedPoints" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LocationTrackingPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocationGeofence" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "shape" TEXT NOT NULL DEFAULT 'CIRCLE',
    "centerLat" DOUBLE PRECISION,
    "centerLng" DOUBLE PRECISION,
    "radiusMeters" DOUBLE PRECISION,
    "polygon" JSONB,
    "address" TEXT,
    "crmAccountId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "activeFrom" TIMESTAMP(3),
    "activeTo" TIMESTAMP(3),
    "scope" JSONB,
    "notifyOnEnter" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnExit" BOOLEAN NOT NULL DEFAULT true,
    "dwellMinutesForVisit" INTEGER NOT NULL DEFAULT 3,
    "exitCooldownSeconds" INTEGER NOT NULL DEFAULT 60,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LocationGeofence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocationGeofenceEvent" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "geofenceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "trackingSessionId" TEXT,
    "eventType" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'HEARTBEAT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LocationGeofenceEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerVisit" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "crmAccountId" TEXT NOT NULL,
    "geofenceId" TEXT,
    "trackingSessionId" TEXT,
    "onDutyRequestId" TEXT,
    "visitType" TEXT NOT NULL DEFAULT 'UNPLANNED',
    "status" TEXT NOT NULL DEFAULT 'DETECTED',
    "locationConfidence" TEXT NOT NULL DEFAULT 'MEDIUM',
    "arrivalAt" TIMESTAMP(3),
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "departureAt" TIMESTAMP(3),
    "durationMinutes" INTEGER,
    "purpose" TEXT,
    "contactPerson" TEXT,
    "notes" TEXT,
    "outcome" TEXT,
    "followUpAt" TIMESTAMP(3),
    "attachmentUrls" JSONB,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerVisit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocationException" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "exceptionType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "relatedTrackingSessionId" TEXT,
    "relatedGeofenceId" TEXT,
    "relatedVisitId" TEXT,
    "description" TEXT,
    "evidence" JSONB,
    "employeeExplanation" TEXT,
    "employeeAttachmentUrl" TEXT,
    "reviewerId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LocationException_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LocationTrackingPolicy_orgId_scopeType_scopeId_key" ON "LocationTrackingPolicy"("orgId", "scopeType", "scopeId");

-- CreateIndex
CREATE INDEX "LocationTrackingPolicy_orgId_isActive_idx" ON "LocationTrackingPolicy"("orgId", "isActive");

-- CreateIndex
CREATE INDEX "LocationGeofence_orgId_type_isActive_idx" ON "LocationGeofence"("orgId", "type", "isActive");

-- CreateIndex
CREATE INDEX "LocationGeofence_orgId_crmAccountId_idx" ON "LocationGeofence"("orgId", "crmAccountId");

-- CreateIndex
CREATE INDEX "LocationGeofenceEvent_orgId_geofenceId_occurredAt_idx" ON "LocationGeofenceEvent"("orgId", "geofenceId", "occurredAt");

-- CreateIndex
CREATE INDEX "LocationGeofenceEvent_userId_occurredAt_idx" ON "LocationGeofenceEvent"("userId", "occurredAt");

-- CreateIndex
CREATE INDEX "CustomerVisit_orgId_userId_arrivalAt_idx" ON "CustomerVisit"("orgId", "userId", "arrivalAt");

-- CreateIndex
CREATE INDEX "CustomerVisit_orgId_crmAccountId_arrivalAt_idx" ON "CustomerVisit"("orgId", "crmAccountId", "arrivalAt");

-- CreateIndex
CREATE INDEX "CustomerVisit_orgId_status_idx" ON "CustomerVisit"("orgId", "status");

-- CreateIndex
CREATE INDEX "LocationException_orgId_status_idx" ON "LocationException"("orgId", "status");

-- CreateIndex
CREATE INDEX "LocationException_orgId_exceptionType_idx" ON "LocationException"("orgId", "exceptionType");

-- CreateIndex
CREATE INDEX "LocationException_userId_createdAt_idx" ON "LocationException"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "LocationGeofenceEvent" ADD CONSTRAINT "LocationGeofenceEvent_geofenceId_fkey" FOREIGN KEY ("geofenceId") REFERENCES "LocationGeofence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerVisit" ADD CONSTRAINT "CustomerVisit_geofenceId_fkey" FOREIGN KEY ("geofenceId") REFERENCES "LocationGeofence"("id") ON DELETE SET NULL ON UPDATE CASCADE;
