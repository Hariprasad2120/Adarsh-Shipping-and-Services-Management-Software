-- Performance: index for listActiveUserNotifications (dismissedAt IS NULL + priority filter)
CREATE INDEX IF NOT EXISTS "Notification_userId_dismissedAt_priority_idx"
  ON "Notification"("userId", "dismissedAt", "priority");

-- Performance: index for marking notifications as presented (presentedAt IS NULL filter)
CREATE INDEX IF NOT EXISTS "Notification_userId_presentedAt_idx"
  ON "Notification"("userId", "presentedAt");

-- Performance: covers the "already displayed?" lookup in listActiveUserNotifications
CREATE INDEX IF NOT EXISTS "NotificationActivity_notificationId_actorId_event_idx"
  ON "NotificationActivity"("notificationId", "actorId", "event");
