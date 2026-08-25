import {
  ArrowUpRight,
  BellRing,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
} from "lucide-react";
import Link from "next/link";
import {
  MonolithEmptyState,
  MonolithSpecLabel,
} from "@/components/ui/foundation";
import { Badge } from "@/components/ui/badge";
import { WorkspaceSectionHeading } from "@/components/layout/workspace";
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
  today.setHours(12, 0, 0, 0);
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - today.getDay());

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(sunday);
    date.setDate(sunday.getDate() + index);
    date.setHours(12, 0, 0, 0);
    const weekday = date.toLocaleDateString("en-IN", { weekday: "short" });
    const isWeekend = weekday === "Sun" || weekday === "Sat";
    const key = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");

    return {
      key,
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
  const scheduleRange = `${formatDate(schedule[0].key, { day: "2-digit", month: "short" })} - ${formatDate(
    schedule[schedule.length - 1].key,
    { day: "2-digit", month: "short" },
  )}`;
  const commandLinks = moduleSnapshot.modules
    .flatMap((module) =>
      module.actions.slice(0, 1).map((action) => ({
        href: action.href,
        label: action.label,
        moduleTitle: module.title,
      })),
    )
    .slice(0, 5);

  const metrics = [
    {
      label: "Announcements",
      value: data.announcements.length,
      note: nextAnnouncement?.title || "No new broadcast",
    },
    {
      label: "Pending tasks",
      value: data.recentTasks.length,
      note: nextTask?.title || "Your queue is clear",
    },
    {
      label: "Upcoming holidays",
      value: data.upcomingHolidays.length,
      note: nextHoliday?.name || "Nothing scheduled",
    },
  ] as const;

  return (
    <div className="mnx-dashboard-overview">
      <ModuleCommandCenter snapshot={moduleSnapshot} />

      <WorkspaceSectionHeading
        index="04"
        title="Your day at a glance"
        description="Company signals, assigned work, weekly rhythm, and the fastest route into active work."
      />

      <section className="mnx-dashboard-brief">
        <section className="mnx-dashboard-brief-main">
          <header className="mnx-panel-heading">
            <div>
              <MonolithSpecLabel>FOCUS MODE</MonolithSpecLabel>
              <h2>Today&apos;s command brief</h2>
            </div>
            <span className="mnx-user-email">{sessionUser.email}</span>
          </header>

          <p className="mnx-dashboard-brief-copy">
            Welcome back, {profile.name || sessionUser.name}. Your workspace is now organized around
            the next action, the latest company movement, and the quickest launch paths into your live modules.
          </p>

          <div className="mnx-dashboard-brief-status">
            <span>{profile.attendanceStatus.replaceAll("_", " ").toLowerCase()}</span>
            <span>{data.recentTasks.length} active tasks</span>
            <span>{data.announcements.length} company updates</span>
          </div>

          <div className="mnx-dashboard-brief-grid">
            <article className="mnx-dashboard-brief-item">
              <span>Primary focus</span>
              <strong>{nextTask?.title || "Your queue is clear"}</strong>
              <p>{nextTask ? `Due ${formatDate(nextTask.dueDate)}` : "No task is currently demanding attention."}</p>
            </article>
            <article className="mnx-dashboard-brief-item">
              <span>Calendar watch</span>
              <strong>{nextHoliday?.name || "No holiday scheduled"}</strong>
              <p>
                {nextHoliday
                  ? formatDate(nextHoliday.date, { weekday: "long", day: "2-digit", month: "long" })
                  : "Your next company calendar update will appear here."}
              </p>
            </article>
            <article className="mnx-dashboard-brief-item">
              <span>Weekly rhythm</span>
              <strong>{scheduleRange}</strong>
              <p>Use this week&apos;s operating rhythm to plan attendance, handoffs, and follow-ups.</p>
            </article>
          </div>
        </section>

        <aside className="mnx-dashboard-brief-side">
          <section className="mnx-dashboard-brief-panel">
            <header className="mnx-panel-heading">
              <div>
                <MonolithSpecLabel>QUICK LAUNCH</MonolithSpecLabel>
                <h2>Open workspaces faster</h2>
              </div>
            </header>
            <div className="mnx-dashboard-launch-list">
              {commandLinks.map((link) => (
                <Link className="mnx-dashboard-launch-link" href={link.href} key={`${link.moduleTitle}-${link.href}`}>
                  <span>
                    <b>{link.label}</b>
                    <small>{link.moduleTitle}</small>
                  </span>
                  <ArrowUpRight size={14} />
                </Link>
              ))}
            </div>
          </section>

          <section className="mnx-dashboard-brief-panel">
            <header className="mnx-panel-heading">
              <div>
                <MonolithSpecLabel>LIVE SIGNAL</MonolithSpecLabel>
                <h2>What changed most recently</h2>
              </div>
            </header>
            <div className="mnx-dashboard-signal-stack">
              <article>
                <BellRing size={16} />
                <div>
                  <b>{nextAnnouncement?.title || "No new announcement"}</b>
                  <p>{nextAnnouncement ? `Published ${formatDate(nextAnnouncement.createdAt)}` : "Broadcast updates will surface here."}</p>
                </div>
              </article>
              <article>
                <ClipboardCheck size={16} />
                <div>
                  <b>{nextTask ? `${nextTask.priority} priority task` : "Task board is calm"}</b>
                  <p>{nextTask ? nextTask.title : "No pending work is blocking your lane."}</p>
                </div>
              </article>
              <article>
                <CalendarDays size={16} />
                <div>
                  <b>{nextHoliday?.holidayType || "No date marker"}</b>
                  <p>{nextHoliday ? nextHoliday.name : "The company calendar has no upcoming item yet."}</p>
                </div>
              </article>
            </div>
          </section>
        </aside>
      </section>

      <section className="mnx-dashboard-metrics mnx-dashboard-metrics-inline" aria-label="Workspace metrics">
        {metrics.map((metric) => (
          <article className="mnx-metric-card" key={metric.label}>
            <header>
              <span>{metric.label}</span>
            </header>
            <strong>{String(metric.value).padStart(2, "0")}</strong>
            <p>{metric.note}</p>
          </article>
        ))}
      </section>

      <section className="mnx-dashboard-grid mnx-dashboard-grid-refined">
        <section className="mnx-feed-panel">
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
                  <Badge className={`mnx-priority-${nextTask.priority.toLowerCase()}`}>
                    <i />
                    {nextTask.priority} priority
                  </Badge>
                </>
              ) : (
                <div className="mnx-empty-compact">
                  <CheckCircle2 size={20} />
                  <p>You are fully caught up for now.</p>
                </div>
              )}
            </article>
          </div>
        </section>

        <section className="mnx-task-panel">
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
                <Badge className={`mnx-priority-${task.priority.toLowerCase()}`}>
                  {task.priority}
                </Badge>
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
        </section>

        <section className="mnx-schedule-panel">
          <header className="mnx-panel-heading">
            <div>
              <MonolithSpecLabel>WEEKLY RHYTHM</MonolithSpecLabel>
              <h2>Work schedule</h2>
            </div>
            <span className="mnx-count-pill">{scheduleRange}</span>
          </header>

          <div className="mnx-schedule-calendar" aria-label={`Work schedule for ${scheduleRange}`}>
            {schedule.map((day) => (
              <article className={day.isToday ? "is-today" : ""} key={day.key}>
                <time dateTime={day.key}>
                  <span>{day.weekday}</span>
                  <strong>{day.date}</strong>
                </time>
                <div>
                  <b>{day.label}</b>
                  <span>{day.hours}</span>
                </div>
                {day.isToday ? <em>Today</em> : null}
              </article>
            ))}
          </div>
        </section>

        <section className="mnx-holiday-panel">
          <header className="mnx-panel-heading">
            <div>
              <MonolithSpecLabel>UP NEXT</MonolithSpecLabel>
              <h2>Company calendar</h2>
            </div>
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
        </section>
      </section>
    </div>
  );
}
