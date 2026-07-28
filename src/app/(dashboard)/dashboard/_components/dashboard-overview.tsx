import {
  ArrowUpRight,
  BellRing,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Landmark,
  Megaphone,
} from "lucide-react";
import Link from "next/link";
import {
  MonolithBadge,
  MonolithEmptyState,
  MonolithSpecLabel,
  MonolithSurface,
} from "@/components/monolith/foundation";
import type { DashboardModuleSnapshot } from "@/modules/dashboard/types";
import type { DashboardWidgetsData, UserProfile } from "@/modules/hrms/types";
import type { DashboardSessionUser } from "./dashboard-types";
import { ModuleCommandCenter } from "./module-command-center";

interface DashboardOverviewProps {
  profile: UserProfile;
  sessionUser: DashboardSessionUser;
  data: DashboardWidgetsData;
  moduleSnapshot: DashboardModuleSnapshot;
}

function formatDate(value: Date | string, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-IN", options ?? {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function buildWeeklySchedule() {
  const today = new Date();
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - today.getDay());

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(sunday);
    date.setDate(sunday.getDate() + index);
    const weekday = date.toLocaleDateString("en-IN", { weekday: "short" });
    const isWeekend = weekday === "Sun" || weekday === "Sat";

    return {
      key: date.toISOString(),
      weekday,
      date: date.toLocaleDateString("en-IN", { day: "2-digit" }),
      label: isWeekend ? "Weekend" : "General shift",
      hours: isWeekend ? "Recharge day" : "09:00 – 18:00",
      isToday: date.toDateString() === today.toDateString(),
    };
  });
}

export function DashboardOverview({
  profile,
  sessionUser,
  data,
  moduleSnapshot,
}: DashboardOverviewProps) {
  const nextAnnouncement = data.announcements[0];
  const nextTask = data.recentTasks[0];
  const nextHoliday = data.upcomingHolidays[0];
  const schedule = buildWeeklySchedule();

  const metrics = [
    {
      label: "Announcements",
      value: data.announcements.length,
      note: nextAnnouncement?.title || "No new broadcast",
      icon: Megaphone,
      tone: "info",
    },
    {
      label: "Pending tasks",
      value: data.recentTasks.length,
      note: nextTask?.title || "Your queue is clear",
      icon: ClipboardCheck,
      tone: "warning",
    },
    {
      label: "Upcoming holidays",
      value: data.upcomingHolidays.length,
      note: nextHoliday?.name || "Nothing scheduled",
      icon: Landmark,
      tone: "success",
    },
  ] as const;

  return (
    <div className="mnx-dashboard-overview">
      <ModuleCommandCenter snapshot={moduleSnapshot} />

      <header className="mnx-dashboard-section-heading">
        <div>
          <MonolithSpecLabel>PERSONAL PULSE</MonolithSpecLabel>
          <h2>Your day at a glance</h2>
        </div>
        <p>Company signals, assigned work, and the next date on your calendar.</p>
      </header>

      <section className="mnx-dashboard-metrics" aria-label="Workspace metrics">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <article className={`mnx-metric-card mnx-semantic-${metric.tone}`} key={metric.label}>
              <header>
                <span>{metric.label}</span>
                <i><Icon size={18} /></i>
              </header>
              <strong>{String(metric.value).padStart(2, "0")}</strong>
              <p>{metric.note}</p>
            </article>
          );
        })}
      </section>

      <section className="mnx-dashboard-grid">
        <MonolithSurface className="mnx-feed-panel">
          <header className="mnx-panel-heading">
            <div>
              <MonolithSpecLabel>MY COMMAND FEED</MonolithSpecLabel>
              <h2>A clear start to the day</h2>
            </div>
            <span className="mnx-user-email">{sessionUser.email}</span>
          </header>

          <p className="mnx-feed-intro">
            Welcome back, {profile.name || sessionUser.name}. Your workspace is prioritised around
            current attendance, the next task in motion, and the latest company signal.
          </p>

          <div className="mnx-feed-cards">
            <article className="mnx-inset-card">
              <header><BellRing size={16} /><span>Latest announcement</span></header>
              {nextAnnouncement ? (
                <>
                  <h3>{nextAnnouncement.title}</h3>
                  <p>{nextAnnouncement.body}</p>
                  <small>Published {formatDate(nextAnnouncement.createdAt)}</small>
                </>
              ) : (
                <div className="mnx-empty-compact">
                  <CheckCircle2 size={20} />
                  <p>No new company announcements are waiting.</p>
                </div>
              )}
            </article>

            <article className="mnx-inset-card">
              <header><ClipboardCheck size={16} /><span>Priority focus</span></header>
              {nextTask ? (
                <>
                  <h3>{nextTask.title}</h3>
                  <p>Due {formatDate(nextTask.dueDate)}</p>
                  <MonolithBadge className={`mnx-priority-${nextTask.priority.toLowerCase()}`}>
                    <i />
                    {nextTask.priority} priority
                  </MonolithBadge>
                </>
              ) : (
                <div className="mnx-empty-compact">
                  <CheckCircle2 size={20} />
                  <p>You are fully caught up for now.</p>
                </div>
              )}
            </article>
          </div>
        </MonolithSurface>

        <MonolithSurface className="mnx-task-panel">
          <header className="mnx-panel-heading">
            <div>
              <MonolithSpecLabel>OPEN WORK</MonolithSpecLabel>
              <h2>Task pipeline</h2>
            </div>
            <span className="mnx-count-pill">{data.recentTasks.length} active</span>
          </header>

          <div className="mnx-task-list">
            {data.recentTasks.length > 0 ? data.recentTasks.slice(0, 5).map((task) => (
              <article key={task.id}>
                <span className="mnx-task-check" aria-hidden="true" />
                <div>
                  <h3>{task.title}</h3>
                  <p>Due {formatDate(task.dueDate)}</p>
                </div>
                <MonolithBadge className={`mnx-priority-${task.priority.toLowerCase()}`}>
                  {task.priority}
                </MonolithBadge>
              </article>
            )) : (
              <MonolithEmptyState>
                <CheckCircle2 size={24} />
                <h3>The board is clear</h3>
                <p>No pending tasks require your attention.</p>
              </MonolithEmptyState>
            )}
          </div>

          <Link className="mnx-text-link" href="/todo">
            Open task workspace <ArrowUpRight size={14} />
          </Link>
        </MonolithSurface>

        <MonolithSurface className="mnx-schedule-panel">
          <header className="mnx-panel-heading">
            <div>
              <MonolithSpecLabel>WEEKLY RHYTHM</MonolithSpecLabel>
              <h2>Work schedule</h2>
            </div>
            <CalendarDays size={19} />
          </header>

          <div className="mnx-schedule-list">
            {schedule.map((day) => (
              <article className={day.isToday ? "is-today" : ""} key={day.key}>
                <time><b>{day.weekday}</b><span>{day.date}</span></time>
                <div><b>{day.label}</b><span>{day.hours}</span></div>
                {day.isToday ? <MonolithBadge tone="warning"><i />Today</MonolithBadge> : null}
              </article>
            ))}
          </div>
        </MonolithSurface>

        <MonolithSurface className="mnx-holiday-panel">
          <header className="mnx-panel-heading">
            <div>
              <MonolithSpecLabel>UP NEXT</MonolithSpecLabel>
              <h2>Company calendar</h2>
            </div>
            <Landmark size={19} />
          </header>

          {nextHoliday ? (
            <div className="mnx-holiday-feature">
              <time dateTime={new Date(nextHoliday.date).toISOString()}>
                <strong>{formatDate(nextHoliday.date, { day: "2-digit" })}</strong>
                <span>{formatDate(nextHoliday.date, { month: "short" })}</span>
              </time>
              <div>
                <span>{nextHoliday.holidayType}</span>
                <h3>{nextHoliday.name}</h3>
                <p>{formatDate(nextHoliday.date, { weekday: "long", day: "2-digit", month: "long" })}</p>
              </div>
            </div>
          ) : (
            <MonolithEmptyState>
              <CalendarDays size={24} />
              <h3>No holiday scheduled</h3>
              <p>The company calendar has no upcoming entry.</p>
            </MonolithEmptyState>
          )}
        </MonolithSurface>
      </section>
    </div>
  );
}
