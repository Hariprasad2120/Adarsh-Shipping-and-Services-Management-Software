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
import {
  DashboardInsightCard,
  DashboardInsightGrid,
  DashboardMiniBarChart,
  DashboardSegmentList,
} from "@/components/data-display/dashboard-insights";
import { WorkspaceSectionHeading } from "@/components/layout/workspace";
import type {
  DashboardCommandCenterSnapshot,
  DashboardModuleSnapshot,
} from "@/modules/dashboard/types";
import type { DashboardWidgetsData, UserProfile } from "@/modules/hrms/types";
import type { DashboardSessionUser } from "./dashboard-types";
import { ModuleCommandCenter } from "./module-command-center";

interface DashboardOverviewProps {
  profile: UserProfile;
  sessionUser: DashboardSessionUser;
  data: DashboardWidgetsData;
  moduleSnapshot: DashboardModuleSnapshot;
  commandCenterSnapshot: DashboardCommandCenterSnapshot;
}

function formatDate(value: Date | string, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-IN", options ?? {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function DashboardOverview({
  profile,
  sessionUser,
  data,
  moduleSnapshot,
  commandCenterSnapshot,
}: DashboardOverviewProps) {
  const nextAnnouncement = data.announcements[0];
  const nextTask = data.recentTasks[0];
  const nextHoliday = data.upcomingHolidays[0];
  const commandLinks = moduleSnapshot.modules
    .flatMap((module) =>
      module.actions.slice(0, 1).map((action) => ({
        href: action.href,
        label: action.label,
        moduleTitle: module.title,
      })),
    )
    .slice(0, 6);
  const attentionItems = commandCenterSnapshot.attentionItems;
  const recentActivity = commandCenterSnapshot.recentActivity;

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
      <section className="mnx-dashboard-metrics mnx-dashboard-metrics-inline" aria-label="Workspace summary metrics">
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

      <WorkspaceSectionHeading
        index="03"
        title="Operations hub"
        description="Company signals, assigned work, weekly rhythm, and your quick launcher into active modules."
      />

      <div className="mnx-dashboard-main-hub">
        <div className="mnx-hub-primary">
          <section className="mnx-feed-panel">
            <header className="mnx-panel-heading">
              <div>
                <MonolithSpecLabel>MY COMMAND FEED</MonolithSpecLabel>
                <h2>A clear start to the day</h2>
              </div>
              <span className="mnx-user-email">{sessionUser.email}</span>
            </header>

            <p className="mnx-feed-intro">
              Welcome back, {profile.name || sessionUser.name}. Your workspace is prioritized around
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

          <section className="mnx-table-card">
            <header className="mnx-panel-heading">
              <div>
                <MonolithSpecLabel>RECENT ACTIVITY</MonolithSpecLabel>
                <h2>Latest operational movement</h2>
              </div>
            </header>

            {recentActivity.length > 0 ? (
              <div className="mnx-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Update</th>
                      <th>Source</th>
                      <th>When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentActivity.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <b className="mnx-table-primary">
                            {item.href ? <Link href={item.href}>{item.title}</Link> : item.title}
                          </b>
                          <small>{item.detail}</small>
                        </td>
                        <td>{item.source}</td>
                        <td>{formatDate(item.occurredAt, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <MonolithEmptyState className="mnx-table-empty">
                <BellRing size={24} />
                <h3>No recent activity</h3>
                <p>Announcements, notifications, and workflow changes will appear here.</p>
              </MonolithEmptyState>
            )}
          </section>
        </div>

        <aside className="mnx-hub-secondary">
          <section className="mnx-dashboard-brief-panel">
            <header className="mnx-panel-heading">
              <div>
                <MonolithSpecLabel>EXCEPTIONS</MonolithSpecLabel>
                <h2>Needs attention</h2>
              </div>
            </header>
            {attentionItems.length > 0 ? (
              <div className="mnx-card-list">
                {attentionItems.slice(0, 4).map((item) => (
                  <Link className="mnx-inset-card" href={item.href} key={item.id}>
                    <header>
                      <span>{item.source}</span>
                      <Badge
                        className={
                          item.severity === "critical"
                            ? "mnx-badge-danger"
                            : item.severity === "warning"
                              ? "mnx-badge-warning"
                              : "mnx-badge-neutral"
                        }
                      >
                        <i />
                        {item.severity}
                      </Badge>
                    </header>
                    <h3>{item.title}</h3>
                    <p>{item.detail}</p>
                  </Link>
                ))}
              </div>
            ) : (
              <MonolithEmptyState>
                <CheckCircle2 size={24} />
                <h3>Everything under control</h3>
                <p>No urgent exceptions waiting.</p>
              </MonolithEmptyState>
            )}
          </section>

          <section className="mnx-dashboard-brief-panel">
            <header className="mnx-panel-heading">
              <div>
                <MonolithSpecLabel>QUICK LAUNCH</MonolithSpecLabel>
                <h2>Shortcut routes</h2>
              </div>
            </header>
            <div className="mnx-dashboard-launch-list">
              {commandLinks.map((link) => (
                <Link className="mnx-dashboard-launch-link" href={link.href} key={`hub-launch-${link.moduleTitle}-${link.href}`}>
                  <span>
                    <b>{link.label}</b>
                    <small>{link.moduleTitle}</small>
                  </span>
                  <ArrowUpRight size={14} />
                </Link>
              ))}
            </div>
          </section>

          <section className="mnx-holiday-panel">
            <header className="mnx-panel-heading">
              <div>
                <MonolithSpecLabel>COMPANY CALENDAR</MonolithSpecLabel>
                <h2>Up next</h2>
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
        </aside>
      </div>

      <WorkspaceSectionHeading
        index="05"
        title="Analytics & Workflows"
        description="Live module metrics, AMS appraisal pipeline distribution, and attendance signal analysis."
      />

      <DashboardInsightGrid>
        <DashboardInsightCard
          eyebrow="Organization pulse"
          title="Role-visible live module metrics"
          detail="This strip reuses the permission-aware module snapshot so the dashboard only summarizes workspaces your role can actually open."
          chart={(
            <DashboardMiniBarChart
              items={commandCenterSnapshot.pulseMetrics.map((metric) => ({
                label: metric.label,
                value: metric.value,
                tone: "info",
              }))}
            />
          )}
          footer={(
            <div className="mnx-dashboard-segments-list">
              {commandCenterSnapshot.pulseMetrics.slice(0, 4).map((metric) => (
                <div key={metric.id}>
                  <b>{metric.label}</b>
                  <strong>{metric.value}</strong>
                </div>
              ))}
            </div>
          )}
        />
        <DashboardInsightCard
          eyebrow="Appraisal pipeline"
          title="Current AMS stage distribution"
          detail="These counts come from the live appraisal workflow stages, making it easier to spot where review work is accumulating."
          chart={(
            <DashboardSegmentList
              items={commandCenterSnapshot.appraisalStages.map((stage) => ({
                label: stage.label,
                value: stage.value,
                tone: stage.value > 0 ? "accent" : "neutral",
              }))}
            />
          )}
          footer={(
            <Link className="mnx-text-link" href="/ams/appraisals">
              View appraisal workspace <ArrowUpRight size={14} />
            </Link>
          )}
        />
        <DashboardInsightCard
          eyebrow="Attendance pulse"
          title="Today's attendance and queue signals"
          detail="This summarizes active attendance movement, leave queue pressure, and the next calendar marker."
          chart={(
            <DashboardMiniBarChart
              items={commandCenterSnapshot.attendanceSignals.map((signal) => ({
                label: signal.label,
                value: signal.value,
                tone: signal.id === "leave-pending" ? "warning" : "success",
              }))}
            />
          )}
          footer={(
            <Link className="mnx-text-link" href="/attendance">
              Open attendance workspace <ArrowUpRight size={14} />
            </Link>
          )}
        />
      </DashboardInsightGrid>

      <ModuleCommandCenter snapshot={moduleSnapshot} />
    </div>
  );
}
