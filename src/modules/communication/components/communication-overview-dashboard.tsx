"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock3,
  Folder,
  HardDrive,
  Mail,
  MessageSquare,
  RefreshCw,
  Search,
  ShieldAlert,
  Video,
} from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import {
  CommunicationBadge,
  CommunicationPanel,
  CommunicationPanelHeader,
} from "@/modules/communication/components/workspace/communication-workspace";
import {
  DashboardSegmentList,
} from "@/components/data-display/dashboard-insights";

type OverviewIconKey =
  | "mail"
  | "chat"
  | "calendar"
  | "health"
  | "drive"
  | "search"
  | "meeting";

type TrendTone = "accent" | "info" | "success" | "warning" | "danger" | "neutral";

type OverviewMetric = {
  label: string;
  value: string;
  detail: string;
  href?: string;
  actionLabel?: string;
  icon: OverviewIconKey;
  points?: number[];
  tone?: TrendTone;
};

type EmailActivity = {
  id: string;
  href: string;
  sender: string;
  subject: string;
  snippet: string;
  timestamp: string;
  unread: boolean;
};

type ChatActivity = {
  id: string;
  href: string;
  title: string;
  subtitle: string;
  snippet: string;
  timestamp: string;
  badge?: string;
};

type MeetingActivity = {
  id: string;
  href?: string;
  title: string;
  time: string;
  calendarLabel: string;
  relativeTime: string;
};

type QuickAction = {
  href: string;
  label: string;
  icon: OverviewIconKey;
};

type ActivityMetric = {
  label: string;
  value: string;
  helper: string;
  tone?: "positive" | "negative" | "neutral";
  trendLabel?: string;
  points?: number[];
};

type DriveOverview = {
  href: string;
  totalLabel: string;
  helper: string;
  breakdown: Array<{
    label: string;
    value: number;
    tone: TrendTone;
  }>;
};

type AlertItem = {
  id: string;
  severity: "info" | "warning" | "danger" | "success";
  title: string;
  detail: string;
  timestamp: string;
  href?: string;
};

type WorkspaceHealth = {
  label: string;
  description: string;
  score: number;
  href?: string;
};

export type CommunicationOverviewDashboardProps = {
  metrics: OverviewMetric[];
  workspaceHealth: WorkspaceHealth;
  emails: EmailActivity[];
  chats: ChatActivity[];
  mentions: ChatActivity[];
  meetings: MeetingActivity[];
  quickActions: QuickAction[];
  activityMetrics: ActivityMetric[];
  activityRangeLabel: string;
  driveOverview?: DriveOverview | null;
  alerts: AlertItem[];
};

const iconMap: Record<OverviewIconKey, typeof Mail> = {
  mail: Mail,
  chat: MessageSquare,
  calendar: Calendar,
  health: CheckCircle2,
  drive: Folder,
  search: Search,
  meeting: Video,
};

const alertIconMap = {
  danger: ShieldAlert,
  warning: AlertTriangle,
  info: RefreshCw,
  success: CheckCircle2,
} as const;

function HealthRing({ score }: { score: number }) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (Math.max(0, Math.min(100, score)) / 100) * circumference;

  return (
    <svg
      className="mnx-communication-overview-health-ring"
      viewBox="0 0 96 96"
      aria-hidden="true"
    >
      <circle cx="48" cy="48" r={radius} />
      <circle
        cx="48"
        cy="48"
        r={radius}
        className="mnx-communication-overview-health-ring-progress"
        style={{
          strokeDasharray: circumference,
          strokeDashoffset: dashOffset,
        }}
      />
    </svg>
  );
}

function DashboardMetricTile({
  metric,
}: {
  metric: OverviewMetric;
}) {
  const Icon = iconMap[metric.icon];
  const content = (
    <>
      <header className="mnx-communication-overview-kpi-header">
        <span className="mnx-communication-overview-kpi-icon">
          <Icon aria-hidden="true" />
        </span>
        {metric.href ? (
          <span className="mnx-communication-overview-kpi-arrow" aria-hidden="true">
            <ArrowRight />
          </span>
        ) : null}
      </header>
      <div className="mnx-communication-overview-kpi-copy">
        <p>{metric.label}</p>
        <strong>{metric.value}</strong>
        <span>{metric.detail}</span>
      </div>
      {metric.href && metric.actionLabel ? (
        <footer className="mnx-communication-overview-kpi-footer">
          <span className="mnx-communication-overview-kpi-link">
            {metric.actionLabel}
            <ArrowRight aria-hidden="true" />
          </span>
        </footer>
      ) : null}
    </>
  );

  if (!metric.href) {
    return (
      <div className="mnx-communication-overview-kpi-card">
        {content}
      </div>
    );
  }

  return (
    <Link href={metric.href} className="mnx-communication-overview-kpi-card">
      {content}
    </Link>
  );
}

type ActivityTabKey = "email" | "chat" | "mentions";

export function CommunicationOverviewDashboard({
  activityMetrics,
  activityRangeLabel,
  alerts,
  chats,
  driveOverview,
  emails,
  meetings,
  mentions,
  metrics,
  quickActions,
  workspaceHealth,
}: CommunicationOverviewDashboardProps) {
  const [activeTab, setActiveTab] = useState<ActivityTabKey>("email");

  const activeChatRows = useMemo(() => {
    if (activeTab === "mentions") {
      return mentions;
    }
    return chats;
  }, [activeTab, chats, mentions]);

  return (
    <div className="mnx-communication-overview">
      <section
        className="mnx-communication-overview-kpi-grid"
        aria-label="Communication overview metrics"
      >
        {metrics.map((metric) => (
          <DashboardMetricTile key={metric.label} metric={metric} />
        ))}
        <div className="mnx-communication-overview-kpi-card mnx-communication-overview-kpi-card-health">
          <header className="mnx-communication-overview-kpi-header">
            <span className="mnx-communication-overview-kpi-icon">
              <CheckCircle2 aria-hidden="true" />
            </span>
          </header>
          <div className="mnx-communication-overview-health-copy">
            <div>
              <p>Workspace health</p>
              <strong>{workspaceHealth.label}</strong>
              <span>{workspaceHealth.description}</span>
              {workspaceHealth.href ? (
                <ButtonLink href={workspaceHealth.href} variant="inverse">
                  View health
                </ButtonLink>
              ) : null}
            </div>
            <div className="mnx-communication-overview-health-score">
              <HealthRing score={workspaceHealth.score} />
              <div>
                <strong>{workspaceHealth.score}%</strong>
                <span>Operational</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mnx-communication-overview-main-grid">
        <div className="mnx-communication-overview-main-column">
          <CommunicationPanel>
            <CommunicationPanelHeader
              title="Latest activity"
              description="Recent email, chat movement, and direct mentions across the connected workspace."
              actions={
                <div className="mnx-communication-overview-header-actions">
                  <ButtonLink href="/communication/mail" variant="inverse">
                    Open mailbox
                  </ButtonLink>
                  <ButtonLink href="/communication/search" variant="outline">
                    View all
                  </ButtonLink>
                </div>
              }
            />
            <div className="mnx-communication-overview-tabs" role="tablist" aria-label="Workspace activity types">
              {[
                { key: "email" as const, label: "Recent email" },
                { key: "chat" as const, label: "Recent chat" },
                { key: "mentions" as const, label: "Mentions" },
              ].map((tab) => (
                // eslint-disable-next-line no-restricted-syntax -- these are tab controls with explicit tab semantics rather than generic button actions
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.key}
                  className={activeTab === tab.key ? "is-active" : undefined}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === "email" ? (
              emails.length ? (
                <div className="mnx-communication-record-list">
                  {emails.map((email) => (
                    <Link
                      key={email.id}
                      href={email.href}
                      className="mnx-communication-record mnx-communication-overview-email-row"
                    >
                      <div className="mnx-communication-overview-email-top">
                        <strong>{email.sender}</strong>
                        {email.unread ? (
                          <CommunicationBadge variant="accent">Unread</CommunicationBadge>
                        ) : null}
                        <span className="mnx-communication-overview-email-time">
                          {email.timestamp}
                        </span>
                      </div>
                      <span className="mnx-communication-overview-email-subject">
                        {email.subject}
                      </span>
                      <p>{email.snippet}</p>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="mnx-empty-state">No recent email activity is available yet.</div>
              )
            ) : activeChatRows.length ? (
              <div className="mnx-communication-record-list">
                {activeChatRows.map((item) => (
                  <Link key={item.id} href={item.href} className="mnx-communication-record mnx-communication-overview-chat-row">
                    <div>
                      <strong>{item.title}</strong>
                      <small>{item.subtitle}</small>
                    </div>
                    <p>{item.snippet}</p>
                    <div className="mnx-communication-overview-chat-meta">
                      {item.badge ? (
                        <CommunicationBadge variant={activeTab === "mentions" ? "accent" : "neutral"}>
                          {item.badge}
                        </CommunicationBadge>
                      ) : null}
                      <span>{item.timestamp}</span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="mnx-empty-state">
                {activeTab === "mentions"
                  ? "No recent direct mentions were detected."
                  : "No recent chat activity is available yet."}
              </div>
            )}
          </CommunicationPanel>

          <CommunicationPanel>
            <CommunicationPanelHeader
              title="Activity overview"
              description="Operational volume from the live workspace plus the recorded communication audit stream."
              actions={<span className="mnx-communication-overview-range">{activityRangeLabel}</span>}
            />
            <div className="mnx-communication-overview-analytics-grid">
              {activityMetrics.map((metric) => (
                <div key={metric.label} className="mnx-communication-overview-analytics-card">
                  <p>{metric.label}</p>
                  <strong>{metric.value}</strong>
                  <span>{metric.helper}</span>
                  {metric.trendLabel ? (
                    <span
                      className={[
                        "mnx-communication-overview-analytics-trend",
                        metric.tone ? `is-${metric.tone}` : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {metric.trendLabel}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          </CommunicationPanel>
        </div>

        <div className="mnx-communication-overview-side-column">
          <CommunicationPanel>
            <CommunicationPanelHeader
              title="Upcoming meetings"
              actions={
                <ButtonLink href="/communication/calendar" variant="outline">
                  View calendar
                </ButtonLink>
              }
            />
            {meetings.length ? (
              <div className="mnx-communication-record-list">
                {meetings.map((meeting) => (
                  <div key={meeting.id} className="mnx-communication-record mnx-communication-overview-meeting-row">
                    <div className="mnx-communication-overview-meeting-date">
                      <Calendar aria-hidden="true" />
                    </div>
                    <div>
                      <strong>{meeting.title}</strong>
                      <small>{meeting.time}</small>
                      <small>{meeting.calendarLabel}</small>
                    </div>
                    <CommunicationBadge variant="accent">
                      <Clock3 aria-hidden="true" />
                      {meeting.relativeTime}
                    </CommunicationBadge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mnx-empty-state">
                No upcoming meetings are scheduled right now.
              </div>
            )}
          </CommunicationPanel>

          <CommunicationPanel>
            <CommunicationPanelHeader title="Quick actions" />
            <div className="mnx-communication-action-grid">
              {quickActions.map((action) => {
                const Icon = iconMap[action.icon];
                return (
                  <Link key={action.href} href={action.href} className="mnx-communication-overview-action-tile">
                    <span>
                      <Icon aria-hidden="true" />
                      {action.label}
                    </span>
                    <ArrowRight aria-hidden="true" />
                  </Link>
                );
              })}
            </div>
          </CommunicationPanel>

          {driveOverview ? (
            <CommunicationPanel>
              <CommunicationPanelHeader
                title="Drive coverage"
                description={driveOverview.helper}
              />
              <div className="mnx-communication-overview-drive-summary">
                <div>
                  <p>Drive-enabled jobs</p>
                  <strong>{driveOverview.totalLabel}</strong>
                </div>
                <HardDrive aria-hidden="true" />
              </div>
              <div className="mnx-communication-overview-drive-segments">
                <DashboardSegmentList items={driveOverview.breakdown} />
              </div>
              <div className="mnx-communication-overview-drive-action">
                <ButtonLink href={driveOverview.href} variant="inverse">
                  Browse drive
                </ButtonLink>
              </div>
            </CommunicationPanel>
          ) : null}

          <CommunicationPanel>
            <CommunicationPanelHeader
              title="Alerts & notifications"
              actions={
                <ButtonLink href="/communication/settings" variant="outline">
                  Review settings
                </ButtonLink>
              }
            />
            {alerts.length ? (
              <div className="mnx-communication-record-list">
                {alerts.map((alert) => {
                  const Icon = alertIconMap[alert.severity];
                  const content = (
                    <div className="mnx-communication-overview-alert-row">
                      <div className={`mnx-communication-overview-alert-icon is-${alert.severity}`}>
                        <Icon aria-hidden="true" />
                      </div>
                      <div>
                        <strong>{alert.title}</strong>
                        <small>{alert.detail}</small>
                      </div>
                      <span>{alert.timestamp}</span>
                    </div>
                  );

                  if (alert.href) {
                    return (
                      <Link key={alert.id} href={alert.href} className="mnx-communication-record mnx-communication-overview-alert-link">
                        {content}
                      </Link>
                    );
                  }

                  return (
                    <div key={alert.id} className="mnx-communication-record">
                      {content}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mnx-empty-state">No operational alerts need attention.</div>
            )}
          </CommunicationPanel>
        </div>
      </div>
    </div>
  );
}
