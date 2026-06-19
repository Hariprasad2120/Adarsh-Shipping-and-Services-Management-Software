import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { getNow } from "@/lib/clock";
import type { Prisma } from "@/generated/prisma/client";
import { getNotificationPolicy, type NotificationAppearance, type NotificationPriority, type NotificationSource, type NotificationVariant } from "./policy";

export type NotificationEvent =
  | "CREATED"
  | "DISPLAYED"
  | "READ"
  | "ACKNOWLEDGED"
  | "DISMISSED"
  | "DISMISSED_ALL"
  | "OPENED_LINK"
  | "RESENT";

export type CreateNotificationParams = {
  userId: string;
  orgId?: string;
  parentId?: string;
  actorId?: string;
  kind: string;
  title: string;
  body?: string;
  link?: string;
  payload?: Prisma.InputJsonValue;
  source?: NotificationSource;
  variant?: NotificationVariant;
  appearance?: NotificationAppearance;
  priority?: NotificationPriority;
  requiresAck?: boolean;
  email?: boolean;
  emailHtml?: string;
};

export type NotificationFilters = {
  status?: "all" | "unread" | "read" | "acknowledged" | "dismissed";
  requiresAck?: "all" | "yes" | "no";
  kind?: string;
  source?: string;
  from?: string;
  to?: string;
};

export type AdminNotificationFilters = NotificationFilters & {
  userId?: string;
  link?: "all" | "yes" | "no";
  activity?: "all" | "active" | "expired" | "resent";
};

function buildFilterWhere(filters: NotificationFilters) {
  const where: Record<string, unknown> = {};

  if (filters.kind) where.kind = filters.kind;
  if (filters.source) where.source = filters.source;
  if (filters.requiresAck === "yes") where.requiresAck = true;
  if (filters.requiresAck === "no") where.requiresAck = false;

  if (filters.status === "unread") where.readAt = null;
  if (filters.status === "read") where.readAt = { not: null };
  if (filters.status === "acknowledged") where.acknowledgedAt = { not: null };
  if (filters.status === "dismissed") where.dismissedAt = { not: null };

  if (filters.from || filters.to) {
    where.createdAt = {
      ...(filters.from ? { gte: new Date(filters.from) } : {}),
      ...(filters.to ? { lte: new Date(filters.to) } : {}),
    };
  }

  return where;
}

export async function recordNotificationActivity(params: {
  notificationId: string;
  orgId?: string;
  actorId?: string;
  event: NotificationEvent;
  metadata?: Prisma.InputJsonValue;
}) {
  return db.notificationActivity.create({
    data: {
      notificationId: params.notificationId,
      orgId: params.orgId,
      actorId: params.actorId,
      event: params.event,
      metadata: params.metadata,
    },
  });
}

export async function createNotification(params: CreateNotificationParams) {
  const policy = getNotificationPolicy(params.kind);
  const shouldEmail = params.email === true || policy.emailByDefault;

  // Fetch the current time and any missing org/email data in parallel so we
  // only pay extra round trips when strictly needed.
  const [now, resolvedOrgId, userEmail] = await Promise.all([
    getNow(),
    params.orgId !== undefined
      ? Promise.resolve(params.orgId)
      : db.user
          .findUnique({ where: { id: params.userId }, select: { orgId: true } })
          .then((u) => u?.orgId ?? null),
    shouldEmail
      ? db.user
          .findUnique({ where: { id: params.userId }, select: { email: true } })
          .then((u) => u?.email ?? null)
      : Promise.resolve(null),
  ]);

  const notification = await db.notification.create({
    data: {
      parentId: params.parentId,
      userId: params.userId,
      orgId: resolvedOrgId ?? null,
      kind: params.kind,
      title: params.title,
      body: params.body,
      link: params.link,
      payload: params.payload,
      source: params.source ?? policy.source,
      variant: params.variant ?? policy.variant,
      appearance: params.appearance ?? policy.appearance,
      priority: params.priority ?? policy.priority,
      requiresAck: params.requiresAck ?? policy.requiresAck,
      lastSentAt: now,
    },
  });

  // Fire activity record and optional email queue insert in parallel.
  await Promise.all([
    recordNotificationActivity({
      notificationId: notification.id,
      orgId: notification.orgId ?? undefined,
      actorId: params.actorId ?? params.userId,
      event: "CREATED",
    }),
    shouldEmail && userEmail
      ? db.emailQueue.create({
          data: {
            to: userEmail,
            subject: params.title,
            html: params.emailHtml ?? `<p>${params.body ?? params.title}</p>`,
          },
        })
      : Promise.resolve(null),
  ]);

  return notification;
}

export async function notify(params: CreateNotificationParams): Promise<void> {
  await createNotification(params);
}

export async function notifyMany(userIds: string[], params: Omit<CreateNotificationParams, "userId">): Promise<void> {
  await Promise.all(userIds.map((userId) => createNotification({ ...params, userId })));
}

export async function listActiveUserNotifications(userId: string) {
  const notifications = await db.notification.findMany({
    where: {
      userId,
      dismissedAt: null,
      OR: [
        { priority: "important", acknowledgedAt: null },
        { priority: "normal", presentedAt: null },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  if (notifications.length > 0) {
    const ids = notifications.map((notification) => notification.id);

    // Run the time lookup and existing-activity check in parallel rather than
    // sequentially. Both are independent of each other.
    const [now, existingDisplayed] = await Promise.all([
      getNow(),
      db.notificationActivity.findMany({
        where: { notificationId: { in: ids }, actorId: userId, event: "DISPLAYED" },
        select: { notificationId: true },
      }),
    ]);

    const displayedIds = new Set(existingDisplayed.map((item) => item.notificationId));
    const newlyDisplayed = notifications.filter((n) => !displayedIds.has(n.id));

    // Fire the updateMany and all new activity inserts in parallel.
    await Promise.all([
      db.notification.updateMany({
        where: { id: { in: ids }, presentedAt: null },
        data: { presentedAt: now },
      }),
      ...newlyDisplayed.map((n) =>
        recordNotificationActivity({
          notificationId: n.id,
          orgId: n.orgId ?? undefined,
          actorId: userId,
          event: "DISPLAYED",
        })
      ),
    ]);
  }

  return notifications.map((notification) => ({
    ...notification,
    policy: getNotificationPolicy(notification.kind),
  }));
}

export async function listUserNotifications(userId: string, filters: NotificationFilters = {}) {
  return db.notification.findMany({
    where: {
      userId,
      ...buildFilterWhere(filters),
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function listAdminNotifications(orgId: string, filters: AdminNotificationFilters = {}) {
  const where: Record<string, unknown> = {
    orgId,
    ...buildFilterWhere(filters),
  };

  if (filters.userId) where.userId = filters.userId;
  if (filters.link === "yes") where.link = { not: null };
  if (filters.link === "no") where.link = null;
  if (filters.activity === "active") where.dismissedAt = null;
  if (filters.activity === "expired") where.dismissedAt = { not: null };
  if (filters.activity === "resent") where.resentCount = { gt: 0 };

  return db.notification.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, name: true, email: true } },
      activities: {
        orderBy: { createdAt: "desc" },
        include: { actor: { select: { id: true, name: true, email: true } } },
      },
    },
  });
}

export async function markNotificationRead(userId: string, notificationId: string) {
  const now = await getNow();
  const existing = await db.notification.findFirstOrThrow({
    where: { id: notificationId, userId },
    select: { id: true },
  });
  const notification = await db.notification.update({
    where: { id: existing.id },
    data: { readAt: now },
  });

  await recordNotificationActivity({
    notificationId,
    orgId: notification.orgId ?? undefined,
    actorId: userId,
    event: "READ",
  });

  return notification;
}

export async function markAllNotificationsRead(userId: string) {
  const notifications = await db.notification.findMany({
    where: { userId, readAt: null },
    select: { id: true, orgId: true },
  });
  const now = await getNow();
  await db.notification.updateMany({
    where: { id: { in: notifications.map((notification) => notification.id) } },
    data: { readAt: now },
  });
  await Promise.all(
    notifications.map((notification) =>
      recordNotificationActivity({
        notificationId: notification.id,
        orgId: notification.orgId ?? undefined,
        actorId: userId,
        event: "READ",
      })
    )
  );
}

export async function acknowledgeNotification(userId: string, notificationId: string) {
  const now = await getNow();
  const existing = await db.notification.findFirstOrThrow({
    where: { id: notificationId, userId },
    select: { id: true },
  });
  const notification = await db.notification.update({
    where: { id: existing.id },
    data: {
      acknowledgedAt: now,
      readAt: now,
    },
  });

  await recordNotificationActivity({
    notificationId,
    orgId: notification.orgId ?? undefined,
    actorId: userId,
    event: "ACKNOWLEDGED",
  });

  return notification;
}

export async function dismissNotification(userId: string, notificationId: string) {
  const now = await getNow();
  const existing = await db.notification.findFirstOrThrow({
    where: { id: notificationId, userId },
    select: { id: true },
  });
  const notification = await db.notification.update({
    where: { id: existing.id },
    data: {
      dismissedAt: now,
      readAt: now,
    },
  });

  await recordNotificationActivity({
    notificationId,
    orgId: notification.orgId ?? undefined,
    actorId: userId,
    event: "DISMISSED",
  });

  return notification;
}

export async function dismissAllNotifications(userId: string) {
  const notifications = await db.notification.findMany({
    where: { userId, dismissedAt: null },
    select: { id: true, orgId: true },
  });
  const now = await getNow();
  await db.notification.updateMany({
    where: { id: { in: notifications.map((notification) => notification.id) } },
    data: { dismissedAt: now, readAt: now },
  });
  await Promise.all(
    notifications.map((notification) =>
      recordNotificationActivity({
        notificationId: notification.id,
        orgId: notification.orgId ?? undefined,
        actorId: userId,
        event: "DISMISSED_ALL",
      })
    )
  );
}

export async function openNotificationLink(userId: string, notificationId: string) {
  const notification = await db.notification.findFirst({
    where: { id: notificationId, userId },
    select: { id: true, orgId: true, link: true },
  });
  if (!notification) return null;

  await markNotificationRead(userId, notificationId);
  await recordNotificationActivity({
    notificationId,
    orgId: notification.orgId ?? undefined,
    actorId: userId,
    event: "OPENED_LINK",
  });

  return notification.link;
}

export async function resendNotification(adminUserId: string, adminOrgId: string, notificationId: string) {
  const original = await db.notification.findUnique({
    where: { id: notificationId },
  });
  if (!original) {
    throw new Error("Notification not found");
  }
  if (original.orgId !== adminOrgId) {
    throw new Error("Forbidden");
  }

  const clone = await createNotification({
    parentId: original.id,
    actorId: adminUserId,
    userId: original.userId,
    orgId: original.orgId ?? undefined,
    kind: original.kind,
    title: original.title,
    body: original.body ?? undefined,
    link: original.link ?? undefined,
    payload: (original.payload as Prisma.InputJsonValue | null) ?? undefined,
    source: (original.source as NotificationSource | null) ?? undefined,
    variant: original.variant as NotificationVariant,
    appearance: original.appearance as NotificationAppearance,
    priority: original.priority as NotificationPriority,
    requiresAck: original.requiresAck,
    email: true,
  });

  const now = await getNow();
  await db.notification.update({
    where: { id: original.id },
    data: {
      resentCount: { increment: 1 },
      lastSentAt: now,
    },
  });

  await recordNotificationActivity({
    notificationId: original.id,
    orgId: original.orgId ?? undefined,
    actorId: adminUserId,
    event: "RESENT",
    metadata: { resentNotificationId: clone.id },
  });

  return clone;
}

export async function getUsersWithPermission(orgId: string, permissionKey: string) {
  const rows = await db.userRole.findMany({
    where: {
      role: {
        orgId,
        permissions: { some: { permission: { key: permissionKey } } },
      },
    },
    select: { userId: true },
  });

  return [...new Set(rows.map((row) => row.userId))];
}

export async function flushEmailQueue(limit = 50): Promise<number> {
  const items = await db.emailQueue.findMany({
    where: { status: "pending", attempts: { lt: 3 } },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  let sent = 0;
  for (const item of items) {
    try {
      await sendEmail({ to: item.to, subject: item.subject, html: item.html });
      await db.emailQueue.update({
        where: { id: item.id },
        data: { status: "sent", sentAt: await getNow(), attempts: { increment: 1 } },
      });
      sent++;
    } catch {
      await db.emailQueue.update({
        where: { id: item.id },
        data: {
          attempts: { increment: 1 },
          status: item.attempts + 1 >= 3 ? "failed" : "pending",
        },
      });
    }
  }
  return sent;
}

/**
 * Checks for existing active BIOMETRIC_OFFLINE notification.
 * If none (i.e. no undismissed notification), triggers notifications to all users with permission 'attendance.punch.manage'.
 */
export async function intimateAdminsOffline(orgId: string, errorMsg: string) {
  try {
    const adminIds = await getUsersWithPermission(orgId, "attendance.punch.manage");
    if (adminIds.length === 0) return;

    for (const adminId of adminIds) {
      const existing = await db.notification.findFirst({
        where: {
          userId: adminId,
          orgId,
          kind: "BIOMETRIC_OFFLINE",
          dismissedAt: null, // Keep alert active if not dismissed, even if read or acknowledged
        },
      });

      if (!existing) {
        await createNotification({
          userId: adminId,
          orgId,
          kind: "BIOMETRIC_OFFLINE",
          title: "Biometric Host System Offline",
          body: `The eSSL database host has gone offline or is unreachable. Error details: ${errorMsg}`,
          link: "/attendance/biometric-sync",
          priority: "important",
          requiresAck: true,
          email: true,
        });
      }
    }
  } catch (err) {
    console.error("Failed to intimate admins about offline biometric database:", err);
  }
}

/**
 * Automatically resolves (dismisses) all active offline alerts for the given organisation
 * once the biometric database is detected back online.
 */
export async function resolveOfflineNotifications(orgId: string) {
  try {
    const now = await getNow();
    const activeAlerts = await db.notification.findMany({
      where: {
        orgId,
        kind: "BIOMETRIC_OFFLINE",
        dismissedAt: null,
      },
      select: { id: true, userId: true },
    });

    if (activeAlerts.length === 0) return;

    await db.notification.updateMany({
      where: { id: { in: activeAlerts.map((n) => n.id) } },
      data: {
        dismissedAt: now,
        readAt: now,
      },
    });

    await Promise.all(
      activeAlerts.map((n) =>
        recordNotificationActivity({
          notificationId: n.id,
          orgId,
          actorId: n.userId,
          event: "DISMISSED",
        })
      )
    );
  } catch (err) {
    console.error("Failed to resolve offline notifications:", err);
  }
}


