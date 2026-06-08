"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarDays, Clock3, Sun, Sunrise, Sunset } from "lucide-react";

function toTitleCase(value: string) {
  return value
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getGreeting(date: Date) {
  const hour = date.getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

function getGreetingPeriod(date: Date | null) {
  if (!date) return "afternoon";
  const hour = date.getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

export function AppHeader({
  userName,
  sessionToken,
}: {
  userName: string;
  sessionToken: string;
}) {
  const [now, setNow] = useState<Date | null>(null);
  const firstName = useMemo(
    () => toTitleCase(userName.split(" ")[0] || "there"),
    [userName],
  );

  useEffect(() => {
    const initialTick = window.setTimeout(() => setNow(new Date()), 0);
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => {
      window.clearTimeout(initialTick);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const storageKey = `welcome-toast:${sessionToken}`;
    if (window.sessionStorage.getItem(storageKey)) return;
    window.sessionStorage.setItem(storageKey, "shown");
    toast.success(`Welcome back, ${firstName}`, {
      description: "Your performance workspace is ready.",
      duration: 5000,
      position: "top-center",
    });
  }, [firstName, sessionToken]);

  const greeting = now ? getGreeting(now) : "Good Day";
  const greetingPeriod = getGreetingPeriod(now);
  const dateLabel = now
    ? now.toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Loading date";
  const timeLabel = now
    ? now.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "--:--:--";

  return (
    <header className="bg-background/90 py-1 backdrop-blur">
      <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="pt-0.5">
          <h1 className="ds-h1 heading-icon-none flex items-center gap-4 text-foreground">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#00cec4]/10 text-[#00cec4]">
              {greetingPeriod === "morning" ? (
                <Sunrise className="size-5" />
              ) : greetingPeriod === "evening" ? (
                <Sunset className="size-5" />
              ) : (
                <Sun className="size-5" />
              )}
            </span>
            {greeting}, {firstName}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-2 rounded-2xl border border-outline-variant/30 bg-card px-3 py-2">
            <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-[#00cec4]/10 text-[#00cec4]">
              <CalendarDays className="size-5" />
            </span>
            {dateLabel}
          </span>
          <span className="inline-flex items-center gap-2 rounded-2xl border border-outline-variant/30 bg-card px-3 py-2 font-normal tabular-nums text-foreground">
            <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-[#00cec4]/10 text-[#00cec4]">
              <Clock3 className="size-5" />
            </span>
            {timeLabel}
          </span>
        </div>
      </div>
    </header>
  );
}

export const WelcomeBar = AppHeader;
