"use client";

import { useEffect, useEffectEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useNotifications } from "@/components/notifications/notification-provider";

type UpcomingReminder = {
  id: string;
  title: string;
  alertAt: string | null;
};

type TriggeredReminder = {
  id: string;
  taskId: string;
  title: string;
  body: string;
  link: string;
};

export function TodoReminderAgent() {
  const router = useRouter();
  const { pushToast } = useNotifications();
  const [upcomingReminders, setUpcomingReminders] = useState<UpcomingReminder[]>([]);

  const refreshUpcoming = useEffectEvent(async () => {
    if (typeof document !== "undefined" && document.hidden) return;
    const res = await fetch("/api/todos/reminders/upcoming", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as UpcomingReminder[];
    setUpcomingReminders(data);
  });

  const triggerReminders = useEffectEvent(async (taskId?: string) => {
    if (typeof document !== "undefined" && document.hidden) return;
    const res = await fetch("/api/todos/reminders/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(taskId ? { taskId } : {}),
    });
    if (!res.ok) return;

    const data = (await res.json()) as TriggeredReminder[];
    for (const reminder of data) {
      pushToast({
        title: reminder.title,
        body: reminder.body,
        variant: "warning",
        appearance: "light",
        actionLabel: "Open task",
        onAction: () => {
          router.push(reminder.link);
        },
      });
    }

    if (data.length > 0 || taskId) {
      await refreshUpcoming();
    }
  });

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void triggerReminders();
      void refreshUpcoming();
    }, 0);

    const handleVisibilityChange = () => {
      if (typeof document !== "undefined" && !document.hidden) {
        void triggerReminders();
        void refreshUpcoming();
      }
    };

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }

    const interval = window.setInterval(() => {
      void triggerReminders();
      void refreshUpcoming();
    }, 60000); // 60 seconds

    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      }
    };
  }, []);

  useEffect(() => {
    const timers = upcomingReminders
      .map((reminder) => {
        if (!reminder.alertAt) return null;
        const diff = new Date(reminder.alertAt).getTime() - Date.now();
        if (diff <= 0) {
          void triggerReminders(reminder.id);
          return null;
        }

        return window.setTimeout(() => {
          void triggerReminders(reminder.id);
        }, diff);
      })
      .filter((timer): timer is number => timer !== null);

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [upcomingReminders]);

  return null;
}
