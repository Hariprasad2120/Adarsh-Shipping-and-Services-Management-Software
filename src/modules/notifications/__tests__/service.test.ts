import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockedDb, dispatchUserNotification } = vi.hoisted(() => ({
  mockedDb: {
    notification: {
      create: vi.fn(),
      findFirstOrThrow: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    notificationActivity: {
      create: vi.fn(),
      createMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    emailQueue: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
  dispatchUserNotification: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: mockedDb }));
vi.mock("@/lib/clock", () => ({
  getNow: vi.fn(() => new Date("2026-09-03T10:00:00.000Z")),
}));
vi.mock("@/lib/email", () => ({ sendEmail: vi.fn() }));
vi.mock("@/lib/performance", () => ({
  timeBlock: (_label: string, fn: () => unknown) => fn(),
}));
vi.mock("@/modules/cha/checklist-email-automation", () => ({
  finalizeChecklistMainCustomerEmail: vi.fn(),
}));
vi.mock("@/modules/notifications/realtime", async () => {
  const actual = await vi.importActual<typeof import("../realtime")>("../realtime");
  return {
    ...actual,
    dispatchUserNotification,
  };
});

import {
  acknowledgeNotification,
  createNotification,
  dismissAllNotifications,
  toMonolithNotificationPayload,
} from "../service";

describe("notification service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedDb.notificationActivity.create.mockResolvedValue({});
    mockedDb.notificationActivity.createMany.mockResolvedValue({ count: 0 });
    mockedDb.user.findUnique.mockResolvedValue({ orgId: "org_1", email: "user@example.test" });
  });

  it("creates, persists, and dispatches one realtime notification", async () => {
    const row = {
      id: "notification_1",
      userId: "user_1",
      orgId: "org_1",
      kind: "CHA_JOB_ASSIGNED",
      title: "Job assigned",
      body: "Open the job.",
      link: "/cha/jobs/job_1",
      variant: "primary",
      appearance: "light",
      priority: "important",
      requiresAck: true,
    };
    mockedDb.notification.create.mockResolvedValue(row);

    await createNotification({
      userId: "user_1",
      orgId: "org_1",
      kind: "CHA_JOB_ASSIGNED",
      title: "Job assigned",
      body: "Open the job.",
      link: "/cha/jobs/job_1",
    });

    expect(mockedDb.notification.create).toHaveBeenCalledOnce();
    expect(dispatchUserNotification).toHaveBeenCalledOnce();
    expect(dispatchUserNotification).toHaveBeenCalledWith(
      "user_1",
      expect.objectContaining({
        id: "notification_1",
        priority: "important",
        requiresAck: true,
        policy: expect.objectContaining({ allowDismiss: false, autoFadeMs: null }),
      }),
    );
  });

  it("acknowledges only notifications owned by the authenticated user", async () => {
    mockedDb.notification.findFirstOrThrow.mockResolvedValue({ id: "notification_1" });
    mockedDb.notification.update.mockResolvedValue({
      id: "notification_1",
      orgId: "org_1",
    });

    await acknowledgeNotification("user_a", "notification_1");

    expect(mockedDb.notification.findFirstOrThrow).toHaveBeenCalledWith({
      where: { id: "notification_1", userId: "user_a" },
      select: { id: true },
    });
    expect(mockedDb.notification.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          acknowledgedAt: new Date("2026-09-03T10:00:00.000Z"),
          readAt: new Date("2026-09-03T10:00:00.000Z"),
        }),
      }),
    );
  });

  it("dismiss-all preserves unacknowledged important notifications", async () => {
    mockedDb.notification.findMany.mockResolvedValue([]);

    await dismissAllNotifications("user_1");

    expect(mockedDb.notification.findMany).toHaveBeenCalledWith({
      where: {
        userId: "user_1",
        dismissedAt: null,
        AND: [
          { OR: [{ priority: { not: "important" } }, { acknowledgedAt: { not: null } }] },
          { OR: [{ requiresAck: false }, { acknowledgedAt: { not: null } }] },
        ],
      },
      select: { id: true, orgId: true },
    });
  });

  it("maps normal notifications to the central 5 second policy", () => {
    expect(
      toMonolithNotificationPayload({
        id: "notification_1",
        kind: "TODO_REMINDER",
        title: "Task due",
        body: null,
        link: null,
        variant: "warning",
        appearance: "light",
        priority: "normal",
        requiresAck: false,
      }),
    ).toMatchObject({
      priority: "normal",
      requiresAck: false,
      policy: { allowDismiss: true, autoFadeMs: 5000 },
    });
  });
});
