"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import { Card, type CardVariant } from "./ds-card";
import { SectionHeader } from "./section-header";
import { EmptyState, ErrorState, LoadingState } from "./states";

/**
 * ChartCard — a titled Card that hosts a chart and owns its loading / empty /
 * error states so the chart body never has to. Pass the chart element as
 * children; give it a fixed `height`.
 */
export interface ChartCardProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  variant?: CardVariant;
  height?: number;
  loading?: boolean;
  error?: React.ReactNode;
  isEmpty?: boolean;
  emptyLabel?: React.ReactNode;
  className?: string;
}
export function ChartCard({
  title,
  description,
  actions,
  children,
  variant = "default",
  height = 240,
  loading,
  error,
  isEmpty,
  emptyLabel = "No data for this range yet.",
  className,
}: ChartCardProps) {
  return (
    <Card variant={variant} className={cn("ds-chartcard", className)}>
      <SectionHeader
        title={title}
        description={description}
        actions={actions}
      />
      <div className="ds-chart-frame" style={{ height }}>
        {error ? (
          <ErrorState description={typeof error === "string" ? error : undefined} />
        ) : loading ? (
          <LoadingState title="Loading chart" />
        ) : isEmpty ? (
          <EmptyState title="Nothing to chart" description={emptyLabel} />
        ) : (
          children
        )}
      </div>
    </Card>
  );
}

/**
 * cssVar — read a CSS custom property at render time so recharts (which needs
 * concrete colour strings) stays in sync with the token layer / theme.
 */
function readCssVar(name: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  return (
    getComputedStyle(document.documentElement)
      .getPropertyValue(name)
      .trim() || fallback
  );
}

function useCssVar(name: string, fallback: string) {
  const [value, setValue] = React.useState(() => readCssVar(name, fallback));
  React.useEffect(() => {
    // Re-read only when the theme actually changes; the initial value is
    // already resolved from the lazy initializer above.
    const sync = () => {
      const next = readCssVar(name, fallback);
      setValue((current) => (current === next ? current : next));
    };
    const raf = requestAnimationFrame(sync);
    const mo = new MutationObserver(sync);
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "class"],
    });
    return () => {
      cancelAnimationFrame(raf);
      mo.disconnect();
    };
  }, [name, fallback]);
  return value;
}

interface TrendPoint {
  label: string;
  value: number;
}
interface TooltipPayloadEntry {
  value?: number | string;
}
function TrendTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
  formatter: (n: number) => string;
}) {
  if (!active || !payload?.length) return null;
  const raw = payload[0]?.value;
  const n = typeof raw === "number" ? raw : Number(raw ?? 0);
  return (
    <div className="ds-chart-tooltip">
      <span className="ds-chart-tooltip-label">{label}</span>
      <b>{formatter(n)}</b>
    </div>
  );
}

/**
 * TrendArea — the primary operational trend (area chart). One series, muted
 * axes, few gridlines, token-driven colour, container-responsive. Handles a
 * zero-only series without collapsing.
 */
export interface TrendAreaProps {
  data: TrendPoint[];
  /** format a raw value for the tooltip + Y axis */
  valueFormatter?: (n: number) => string;
  height?: number;
}
export function TrendArea({
  data,
  valueFormatter = (n) => new Intl.NumberFormat("en-IN").format(n),
  height = 240,
}: TrendAreaProps) {
  const stroke = useCssVar("--ds-chart-1", "#2f6f8f");
  const areaFrom = useCssVar("--ds-chart-area-from", "#2f6f8f38");
  const areaTo = useCssVar("--ds-chart-area-to", "#2f6f8f05");
  const axis = useCssVar("--ds-chart-axis", "#8a959c");
  const gradientId = React.useId().replace(/:/g, "");

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={areaFrom} />
            <stop offset="100%" stopColor={areaTo} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="0" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          stroke={axis}
          minTickGap={16}
          dy={6}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          stroke={axis}
          width={48}
          tickFormatter={(n: number) => valueFormatter(n)}
        />
        <Tooltip
          content={<TrendTooltip formatter={valueFormatter} />}
          cursor={{ stroke: axis, strokeDasharray: "3 3" }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={stroke}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          isAnimationActive={false}
          dot={false}
          activeDot={{ r: 3, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
