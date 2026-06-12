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
    const res = await fetch("/api/todos/reminders/upcoming", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as UpcomingReminder[];
    setUpcomingReminders(data);
  });

  const triggerReminders = useEffectEvent(async (taskId?: string) => {
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

    const interval = window.setInterval(() => {
      void triggerReminders();
      void refreshUpcoming();
    }, 30000);

    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
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
