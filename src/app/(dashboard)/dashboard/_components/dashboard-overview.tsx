import { ArrowUpRight, Check, ChevronRight } from "lucide-react";
import Link from "next/link";
import {
  WorkspaceEmptyTableRow,
  WorkspaceTable,
} from "@/components/layout/workspace";
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

const SEVERITY_ORDER = { critical: 0, warning: 1, info: 2 } as const;

function formatDate(value: Date | string, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(
    "en-IN",
    options ?? { day: "2-digit", month: "short" },
  ).format(new Date(value));
}

function relativeTime(value: Date | string) {
  const diffMs = Date.now() - new Date(value).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

export function DashboardOverview({
  data,
  moduleSnapshot,
  commandCenterSnapshot,
}: DashboardOverviewProps) {
  const attention = [...commandCenterSnapshot.attentionItems].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
  );
  const visibleAttention = attention.slice(0, 6);
  const recentActivity = commandCenterSnapshot.recentActivity.slice(0, 6);
  const nextHoliday = data.upcomingHolidays[0];
  const nextAnnouncement = data.announcements[0];

  const quickLinks = moduleSnapshot.modules
    .flatMap((module) =>
      module.actions.slice(0, 1).map((action) => ({
        href: action.href,
        label: action.label,
      })),
    )
    .slice(0, 4);

  const todayRows = [
    { label: "Deadlines this week", value: data.recentTasks.length },
    {
      label: "Upcoming holidays",
      value: data.upcomingHolidays.length,
    },
    {
      label: "Announcements",
      value: data.announcements.length,
    },
  ].filter((row) => row.value > 0);

  return (
    <div className="mnx-dash2">
      {/* P0 — attention queue: the one question this page answers */}
      <section aria-label="Items that need your attention">
        <p className="mnx-dash2-label">
          Needs you
          {visibleAttention.length > 0 ? <b>{attention.length}</b> : null}
        </p>

        {visibleAttention.length > 0 ? (
          <>
            <div className="mnx-dash2-queue">
              {visibleAttention.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="mnx-dash2-queue-row"
                  data-severity={item.severity}
                >
                  <span className="mnx-dash2-queue-src">{item.source}</span>
                  <span className="mnx-dash2-queue-body">
                    <h3>{item.title}</h3>
                    <p>{item.detail}</p>
                  </span>
                  <span className="mnx-dash2-queue-actions">
                    <ChevronRight
                      size={16}
                      className="mnx-dash2-queue-chev"
                      aria-hidden="true"
                    />
                  </span>
                </Link>
              ))}
            </div>
            {attention.length > visibleAttention.length ? (
              <div className="mnx-dash2-queue-foot">
                <Link className="mnx-text-link" href="/notifications">
                  View all {attention.length} <ArrowUpRight size={14} />
                </Link>
              </div>
            ) : null}
          </>
        ) : (
          <div className="mnx-dash2-healthy">
            <Check size={16} aria-hidden="true" />
            Nothing needs you right now.
          </div>
        )}
      </section>

      {/* P1/P2 — today at a glance + recent movement */}
      <div className="mnx-dash2-split">
        <div className="mnx-dash2-panel">
          <p className="mnx-dash2-label">Recent activity</p>
          <WorkspaceTable scrollLabel="Recent operational activity">
            <thead>
              <tr>
                <th>Update</th>
                <th>Source</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {recentActivity.length > 0 ? (
                recentActivity.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <b className="mnx-table-primary">
                        {item.href ? (
                          <Link href={item.href}>{item.title}</Link>
                        ) : (
                          item.title
                        )}
                      </b>
                      <small>{item.detail}</small>
                    </td>
                    <td>{item.source}</td>
                    <td>{relativeTime(item.occurredAt)}</td>
                  </tr>
                ))
              ) : (
                <WorkspaceEmptyTableRow colSpan={3}>
                  No activity recorded yet.
                </WorkspaceEmptyTableRow>
              )}
            </tbody>
          </WorkspaceTable>
        </div>

        <aside className="mnx-dash2-aside">
          {todayRows.length > 0 ? (
            <div className="mnx-dash2-panel">
              <p className="mnx-dash2-label">Today</p>
              <div className="mnx-dash2-today-list">
                {todayRows.map((row) => (
                  <div className="mnx-dash2-today-item" key={row.label}>
                    <span>{row.label}</span>
                    <b>{row.value}</b>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {quickLinks.length > 0 ? (
            <div className="mnx-dash2-panel">
              <p className="mnx-dash2-label">Quick actions</p>
              <div className="mnx-dash2-quick">
                {quickLinks.map((link) => (
                  <Link href={link.href} key={link.href}>
                    <ArrowUpRight size={15} aria-hidden="true" />
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          {nextAnnouncement || nextHoliday ? (
            <div className="mnx-dash2-panel">
              <p className="mnx-dash2-label">Announcements &amp; calendar</p>
              {nextAnnouncement ? (
                <div className="mnx-dash2-note">
                  <h3>{nextAnnouncement.title}</h3>
                  <p>Published {formatDate(nextAnnouncement.createdAt)}</p>
                </div>
              ) : null}
              {nextHoliday ? (
                <div className="mnx-dash2-note mnx-dash2-cal">
                  <time dateTime={new Date(nextHoliday.date).toISOString()}>
                    <strong>{formatDate(nextHoliday.date, { day: "2-digit" })}</strong>
                    <span>{formatDate(nextHoliday.date, { month: "short" })}</span>
                  </time>
                  <div>
                    <h3>{nextHoliday.name}</h3>
                    <p>
                      {formatDate(nextHoliday.date, {
                        weekday: "long",
                        day: "2-digit",
                        month: "long",
                      })}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </aside>
      </div>

      {/* P3 — module launcher, compact, no illustrated graphics */}
      <ModuleCommandCenter snapshot={moduleSnapshot} />
    </div>
  );
}
