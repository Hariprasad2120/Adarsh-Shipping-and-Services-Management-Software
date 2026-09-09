"use client";

import * as React from "react";
import { CalendarClock } from "lucide-react";
import { ActionNeeded, type ActionNeededItemData } from "@/components/data-display/action-needed";
import {
  Card,
  DefinitionList,
  FilterBar,
  DateRangeSelect,
  type DateRangePreset,
  MetricCard,
  SectionHeader,
  StatGrid,
} from "@/components/ds";
import type {
  DashboardAttentionItem,
  DashboardCommandCenterSnapshot,
} from "@/modules/dashboard/types";
import type { DashboardWidgetsData, UserProfile } from "@/modules/hrms/types";
import type { DashboardModuleSnapshot } from "@/modules/dashboard/types";
import type { DashboardSessionUser } from "./dashboard-types";
import { ModuleCommandCenter } from "./module-command-center";

interface DashboardOverviewProps {
  profile: UserProfile;
  sessionUser: DashboardSessionUser;
  data: DashboardWidgetsData;
  moduleSnapshot: DashboardModuleSnapshot;
  commandCenterSnapshot: DashboardCommandCenterSnapshot;
}

const numberFormat = new Intl.NumberFormat("en-IN");

const financialModules = new Set(["Accounting", "Payroll", "Expense"]);
const operationalModules = new Set(["CHA", "CRM", "Attendance"]);

function formatDate(value: Date | string, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-IN", options ?? {
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function ModuleBadge({ module }: { module: string }) {
  return (
    <span className="ds-mod-badge" data-module={module.toUpperCase()}>
      {module}
    </span>
  );
}

/** Attention items live in commandCenterSnapshot; ActionNeeded expects a
 * slightly richer shape (actionLabel/actionUrl). Adapt without a server
 * round-trip — every field it needs already exists on DashboardAttentionItem. */
function toActionNeeded(item: DashboardAttentionItem): ActionNeededItemData {
  return {
    id: item.id,
    title: item.title,
    description: item.detail,
    module: item.source,
    priority: item.severity === "critical" ? "critical" : item.severity === "warning" ? "high" : "normal",
    actionLabel: "Review",
    actionUrl: item.href,
  };
}

export function DashboardOverview({
  data,
  moduleSnapshot,
  commandCenterSnapshot,
}: DashboardOverviewProps) {
  const [range, setRange] = React.useState<DateRangePreset>("7d");

  const { attentionItems, pulseMetrics, attendanceSignals, recentActivity } =
    commandCenterSnapshot;

  const kpis = pulseMetrics.slice(0, 4);
  const actionNeededItems = attentionItems.map(toActionNeeded);
  const upcomingDeadlines = data.recentTasks.slice(0, 5);
  const financialAttention = attentionItems.filter((item) => financialModules.has(item.source));
  const operationalAttention = attentionItems.filter((item) => operationalModules.has(item.source));

  return (
    <div className="ds-dash">
      <FilterBar>
        <DateRangeSelect
          value={range}
          onChange={setRange}
          icon={<CalendarClock size={14} aria-hidden="true" />}
        />
      </FilterBar>

      {kpis.length > 0 ? (
        <StatGrid cols={4} aria-label="Key metrics">
          {kpis.map((metric) => (
            <MetricCard
              key={metric.id}
              label={metric.label}
              value={numberFormat.format(metric.value)}
              caption={metric.detail}
            />
          ))}
        </StatGrid>
      ) : null}

      <div className="ds-dash-widget-grid">
        <ActionNeeded
          className="ds-widget-span-8"
          items={actionNeededItems}
          totalCount={actionNeededItems.length}
          viewAllUrl="/notifications"
        />

        <Card as="section" className="ds-dash-panel-stack ds-widget-span-4">
          <SectionHeader title="Upcoming Deadlines" />
          {upcomingDeadlines.length > 0 ? (
            <DefinitionList
              items={upcomingDeadlines.map((task) => ({
                term: task.title,
                description: (
                  <span className="flex items-center gap-1.5 justify-end">
                    {formatDate(task.dueDate)}
                  </span>
                ),
              }))}
            />
          ) : (
            <p className="mnx-dashboard-muted">No urgent deadlines in the action queue.</p>
          )}
        </Card>

        <Card as="section" className="ds-dash-panel-stack ds-widget-span-4">
          <SectionHeader title="Financial Attention" />
          {financialAttention.length > 0 ? (
            <DefinitionList
              items={financialAttention.slice(0, 5).map((item) => ({
                term: <ModuleBadge module={item.source} />,
                description: item.title,
              }))}
            />
          ) : (
            <p className="mnx-dashboard-muted">No financial items require attention.</p>
          )}
        </Card>

        <Card as="section" className="ds-dash-panel-stack ds-widget-span-4">
          <SectionHeader title="Recent Activity" />
          {recentActivity.length > 0 ? (
            <DefinitionList
              items={recentActivity.slice(0, 6).map((activity) => ({
                term: <ModuleBadge module={activity.source} />,
                description: activity.title,
              }))}
            />
          ) : (
            <p className="mnx-dashboard-muted">No recent activity in this window.</p>
          )}
        </Card>

        <Card as="section" className="ds-dash-panel-stack ds-widget-span-4">
          <SectionHeader title="Operational Attention" />
          {operationalAttention.length > 0 ? (
            <DefinitionList
              items={operationalAttention.slice(0, 5).map((item) => ({
                term: <ModuleBadge module={item.source} />,
                description: item.title,
              }))}
            />
          ) : (
            <p className="mnx-dashboard-muted">No operational blockers need action.</p>
          )}

          {attendanceSignals.length > 0 ? (
            <>
              <SectionHeader title="Attendance signals" headingLevel={4} />
              <DefinitionList
                items={attendanceSignals.map((signal) => ({
                  term: signal.label,
                  description: numberFormat.format(signal.value),
                }))}
              />
            </>
          ) : null}
        </Card>
      </div>

      <ModuleCommandCenter snapshot={moduleSnapshot} />
    </div>
  );
}
