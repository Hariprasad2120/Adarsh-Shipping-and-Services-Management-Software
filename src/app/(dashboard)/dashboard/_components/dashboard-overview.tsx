import * as React from "react";
import {
  CalendarClock,
  AlertCircle,
  FileText,
  DollarSign,
  CheckCircle2,
} from "lucide-react";
import { ActionNeeded } from "@/components/data-display/action-needed";
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
import type { DashboardCommandCenterSnapshot } from "@/modules/dashboard/types";
import type { DashboardWidgetsData, UserProfile } from "@/modules/hrms/types";
import type { DashboardSessionUser } from "./dashboard-types";

interface DashboardOverviewProps {
  profile: UserProfile;
  sessionUser: DashboardSessionUser;
  data: DashboardWidgetsData;
  commandCenterSnapshot: DashboardCommandCenterSnapshot;
}

const numberFormat = new Intl.NumberFormat("en-IN");

const financialModules = new Set(["Accounting", "Payroll", "Expense"]);
const operationalModules = new Set(["CHA", "CRM", "Attendance"]);

const KPI_TONES: Array<"primary" | "info" | "warning" | "success"> = [
  "primary",
  "info",
  "warning",
  "success",
];
const KPI_ICONS = [
  <AlertCircle key="1" size={16} />,
  <FileText key="2" size={16} />,
  <DollarSign key="3" size={16} />,
  <CheckCircle2 key="4" size={16} />,
];

function formatWhen(value?: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function ModuleBadge({ module }: { module: string }) {
  const modUpper = module.toUpperCase();
  return (
    <span className="ds-mod-badge" data-module={modUpper}>
      {module}
    </span>
  );
}

export function DashboardOverview({
  commandCenterSnapshot,
}: DashboardOverviewProps) {
  const [range, setRange] = React.useState<DateRangePreset>("7d");

  const {
    actionNeededItems,
    totalActionNeededCount,
    pulseMetrics,
    attendanceSignals,
    recentActivity,
  } = commandCenterSnapshot;

  const kpis = pulseMetrics.slice(0, 4);

  const upcomingDeadlines = actionNeededItems
    .filter((item) => item.dueDate)
    .slice(0, 5);
  const operationalAttention = actionNeededItems.filter((item) =>
    operationalModules.has(item.module),
  );
  const financialAttention = actionNeededItems.filter((item) =>
    financialModules.has(item.module),
  );

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
          {kpis.map((metric, idx) => (
            <MetricCard
              key={metric.id}
              label={metric.label}
              value={numberFormat.format(metric.value)}
              caption={metric.detail}
              tone={KPI_TONES[idx % KPI_TONES.length]}
              icon={KPI_ICONS[idx % KPI_ICONS.length]}
            />
          ))}
        </StatGrid>
      ) : null}

      <div className="ds-dash-widget-grid">
        <ActionNeeded
          className="ds-widget-span-8"
          items={actionNeededItems}
          totalCount={totalActionNeededCount}
          viewAllUrl="/notifications"
        />

        <Card as="section" className="ds-dash-panel-stack ds-widget-span-4">
          <SectionHeader title="Upcoming Deadlines" />
          {upcomingDeadlines.length > 0 ? (
            <DefinitionList
              items={upcomingDeadlines.map((item) => ({
                term: item.title,
                description: (
                  <span className="flex items-center gap-1.5 justify-end">
                    <span>{formatWhen(item.dueDate) ?? "Soon"}</span>
                    <ModuleBadge module={item.module} />
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
                term: <ModuleBadge module={item.module} />,
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
                term: <ModuleBadge module={item.module} />,
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
    </div>
  );
}
