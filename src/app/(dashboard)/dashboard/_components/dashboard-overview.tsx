"use client";

import * as React from "react";
import { CalendarClock } from "lucide-react";
import {
  Card,
  ChartCard,
  DefinitionList,
  FilterBar,
  DateRangeSelect,
  type DateRangePreset,
  FunnelBars,
  MetricCard,
  SectionHeader,
  StatGrid,
  TrendArea,
  TrendBadge,
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

function windowDays(preset: DateRangePreset) {
  return preset === "24h" ? 1 : preset === "7d" ? 7 : preset === "30d" ? 30 : 90;
}

export function DashboardOverview({
  commandCenterSnapshot,
}: DashboardOverviewProps) {
  const [range, setRange] = React.useState<DateRangePreset>("7d");

  const {
    pulseMetrics,
    appraisalStages,
    attendanceSignals,
    activityTrend,
  } = commandCenterSnapshot;

  const kpis = pulseMetrics.slice(0, 4);

  const days = windowDays(range);
  const trendData = activityTrend
    .slice(-days)
    .map((p) => ({ label: p.label, value: p.value }));
  const trendTotal = trendData.reduce((sum, p) => sum + p.value, 0);
  const trendPrev = activityTrend
    .slice(-days * 2, -days)
    .reduce((sum, p) => sum + p.value, 0);
  const trendDelta =
    trendPrev > 0
      ? Math.round(((trendTotal - trendPrev) / trendPrev) * 100)
      : null;

  const pipelineStages = appraisalStages.filter((s) => s.value >= 0);
  const pipelineEntry = pipelineStages[0]?.value ?? 0;
  const pipelineExit = pipelineStages[pipelineStages.length - 1]?.value ?? 0;
  const conversionRate =
    pipelineEntry > 0 ? Math.round((pipelineExit / pipelineEntry) * 100) : 0;
  const hasPipeline = pipelineStages.some((s) => s.value > 0);

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

      <div className="ds-dash-analytics">
        <ChartCard
          title="Activity volume"
          description={`Operational activity routed to you - last ${days} days`}
          height={260}
          isEmpty={trendTotal === 0}
          emptyLabel="No activity in this window."
          actions={
            trendDelta !== null ? (
              <TrendBadge
                direction={
                  trendDelta > 0 ? "up" : trendDelta < 0 ? "down" : "flat"
                }
                value={`${trendDelta > 0 ? "+" : ""}${trendDelta}%`}
                srLabel={`${
                  trendDelta > 0 ? "up" : trendDelta < 0 ? "down" : "unchanged"
                } ${Math.abs(trendDelta)} percent versus the previous ${days} days`}
              />
            ) : undefined
          }
        >
          <TrendArea data={trendData} height={260} />
        </ChartCard>

        <Card className="ds-dash-panel-stack">
          <SectionHeader
            title="Appraisal pipeline"
            description="Live count of appraisals at each lifecycle stage"
            actions={
              <span className="ds-badge" data-tone="neutral">
                {conversionRate}% reach decision
              </span>
            }
          />
          {hasPipeline ? (
            <FunnelBars
              stages={pipelineStages.map((s) => ({
                id: s.id,
                label: s.label,
                value: s.value,
              }))}
            />
          ) : (
            <FunnelBars stages={[]} emptyLabel="No active appraisal cycle." />
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
