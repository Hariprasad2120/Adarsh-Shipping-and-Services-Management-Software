import type {
  NotificationAppearance,
  NotificationPriority,
  NotificationVariant,
} from "./policy";

export type MonolithNotificationPayload = {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  variant: NotificationVariant;
  appearance: NotificationAppearance;
  priority: NotificationPriority;
  requiresAck: boolean;
  policy: {
    allowDismiss: boolean;
    autoFadeMs: number | null;
    labels?: { open?: string; acknowledge?: string };
  };
};

type NotificationListener = (notification: MonolithNotificationPayload) => void;

const globalForNotifications = globalThis as unknown as {
  monolithNotificationListeners?: Map<string, Set<NotificationListener>>;
};

function getListeners() {
  if (!globalForNotifications.monolithNotificationListeners) {
    globalForNotifications.monolithNotificationListeners = new Map();
  }
  return globalForNotifications.monolithNotificationListeners;
}

export function subscribeToUserNotifications(
  userId: string,
  listener: NotificationListener,
) {
  const listeners = getListeners();
  const userListeners = listeners.get(userId) ?? new Set<NotificationListener>();
  userListeners.add(listener);
  listeners.set(userId, userListeners);

  return () => {
    userListeners.delete(listener);
    if (userListeners.size === 0) {
      listeners.delete(userId);
    }
  };
}

export function dispatchUserNotification(
  userId: string,
  notification: MonolithNotificationPayload,
) {
  const userListeners = getListeners().get(userId);
  if (!userListeners || userListeners.size === 0) return;

  for (const listener of userListeners) {
    listener(notification);
  }
}
