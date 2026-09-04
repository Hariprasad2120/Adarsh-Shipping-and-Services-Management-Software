import { describe, expect, it } from "vitest";
import {
  mergeRemoteNotifications,
  NORMAL_NOTIFICATION_DURATION_MS,
  shouldAutoDismissRemoteNotification,
  shouldShowFetchedRemoteNotification,
} from "../client-state";
import type { MonolithNotificationPayload } from "../realtime";

function notification(
  id: string,
  priority: "normal" | "important",
  requiresAck = priority === "important",
): MonolithNotificationPayload {
  return {
    id,
    title: id,
    body: null,
    link: null,
    variant: priority === "important" ? "warning" : "success",
    appearance: "light",
    priority,
    requiresAck,
    policy: {
      allowDismiss: !requiresAck,
      autoFadeMs: priority === "important" ? null : NORMAL_NOTIFICATION_DURATION_MS,
      labels: { open: "Open", acknowledge: "Acknowledge" },
    },
  };
}

describe("notification client state", () => {
  it("auto-dismisses normal notifications after the central 5 second duration", () => {
    const normal = notification("normal", "normal", false);

    expect(NORMAL_NOTIFICATION_DURATION_MS).toBe(5000);
    expect(shouldAutoDismissRemoteNotification(normal)).toBe(true);
    expect(normal.policy.autoFadeMs).toBe(5000);
  });

  it("keeps important notifications visible until acknowledgement", () => {
    const important = notification("important", "important", true);

    expect(shouldAutoDismissRemoteNotification(important)).toBe(false);
    expect(important.policy.allowDismiss).toBe(false);
    expect(important.policy.autoFadeMs).toBeNull();
  });

  it("allows unresolved important notifications to return after refresh", () => {
    const hasShown = () => true;

    expect(
      shouldShowFetchedRemoteNotification(
        notification("important", "important", true),
        hasShown,
      ),
    ).toBe(true);
  });

  it("deduplicates repeated server events by notification id", () => {
    const first = notification("n1", "important", true);
    const duplicate = { ...first, title: "same event again" };

    expect(mergeRemoteNotifications([first], [duplicate])).toEqual([duplicate]);
  });
});
