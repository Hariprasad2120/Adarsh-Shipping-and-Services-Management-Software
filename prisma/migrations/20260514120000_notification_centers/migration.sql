ALTER TABLE "Notification"
ADD COLUMN "parentId" TEXT,
ADD COLUMN "payload" JSONB,
ADD COLUMN "source" TEXT,
ADD COLUMN "variant" TEXT NOT NULL DEFAULT 'secondary',
ADD COLUMN "appearance" TEXT NOT NULL DEFAULT 'solid',
ADD COLUMN "priority" TEXT NOT NULL DEFAULT 'normal',
ADD COLUMN "requiresAck" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "presentedAt" TIMESTAMP(3),
ADD COLUMN "acknowledgedAt" TIMESTAMP(3),
ADD COLUMN "dismissedAt" TIMESTAMP(3),
ADD COLUMN "resentCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "lastSentAt" TIMESTAMP(3);

CREATE TABLE "NotificationActivity" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "orgId" TEXT,
    "actorId" TEXT,
    "event" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationActivity_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Notification_userId_dismissedAt_acknowledgedAt_idx" ON "Notification"("userId", "dismissedAt", "acknowledgedAt");
CREATE INDEX "Notification_kind_createdAt_idx" ON "Notification"("kind", "createdAt");
CREATE INDEX "Notification_source_idx" ON "Notification"("source");
CREATE INDEX "NotificationActivity_notificationId_createdAt_idx" ON "NotificationActivity"("notificationId", "createdAt");
CREATE INDEX "NotificationActivity_orgId_event_createdAt_idx" ON "NotificationActivity"("orgId", "event", "createdAt");
CREATE INDEX "NotificationActivity_actorId_idx" ON "NotificationActivity"("actorId");

ALTER TABLE "Notification" ADD CONSTRAINT "Notification_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Notification"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "NotificationActivity" ADD CONSTRAINT "NotificationActivity_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NotificationActivity" ADD CONSTRAINT "NotificationActivity_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "NotificationActivity" ADD CONSTRAINT "NotificationActivity_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
