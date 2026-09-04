import type { MonolithNotificationPayload } from "./realtime";

export const NORMAL_NOTIFICATION_DURATION_MS = 5000;
export const REMOTE_TOAST_SHOWN_PREFIX = "remote-toast-shown:";
export const REMOTE_TOAST_MAX_VISIBLE = 5;

export function getRemoteToastShownStorageKey(notificationId: string) {
  return `${REMOTE_TOAST_SHOWN_PREFIX}${notificationId}`;
}

export function shouldPersistRemoteNotification(
  notification: MonolithNotificationPayload,
) {
  return notification.priority === "important" || notification.requiresAck;
}

export function shouldAutoDismissRemoteNotification(
  notification: MonolithNotificationPayload,
) {
  return !shouldPersistRemoteNotification(notification);
}

export function shouldShowFetchedRemoteNotification(
  notification: MonolithNotificationPayload,
  hasShown: (notificationId: string) => boolean,
) {
  return shouldPersistRemoteNotification(notification) || !hasShown(notification.id);
}

export function mergeRemoteNotifications(
  current: MonolithNotificationPayload[],
  incoming: MonolithNotificationPayload[],
) {
  const merged = new Map<string, MonolithNotificationPayload>();

  for (const notification of current) {
    if (shouldPersistRemoteNotification(notification)) {
      merged.set(notification.id, notification);
    }
  }

  for (const notification of incoming) {
    merged.set(notification.id, notification);
  }

  return Array.from(merged.values())
    .sort((a, b) => {
      const aImportant = shouldPersistRemoteNotification(a) ? 1 : 0;
      const bImportant = shouldPersistRemoteNotification(b) ? 1 : 0;
      return bImportant - aImportant;
    })
    .slice(0, REMOTE_TOAST_MAX_VISIBLE);
}
