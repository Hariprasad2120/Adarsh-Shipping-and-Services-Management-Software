import * as React from "react";
import { cn } from "@/lib/utils";
import { EmptyState } from "./states";

/**
 * FunnelBars — the reference's conversion/pipeline chart. A dense row of
 * proportional vertical bars; a few are "marked" checkpoints rendered in the
 * positive hue with a percentage + label + count beneath.
 *
 * Fed real lifecycle stage counts. `stages` are the ordered checkpoints;
 * `filler` (optional) sets how many muted track bars sit between each marked
 * bar purely for the visual texture in the reference — it carries no data and
 * defaults to a value that keeps the row readable.
 *
 * Percentages are computed against the first stage's value (funnel entry).
 * Zero entry → renders an empty state rather than dividing by zero.
 */
export interface FunnelStage {
  id: string;
  label: string;
  value: number;
}
export interface FunnelBarsProps {
  stages: FunnelStage[];
  filler?: number;
  className?: string;
  emptyLabel?: React.ReactNode;
}

export function FunnelBars({
  stages,
  filler = 4,
  className,
  emptyLabel = "No records in this pipeline yet.",
}: FunnelBarsProps) {
  const entry = stages[0]?.value ?? 0;
  const maxValue = Math.max(...stages.map((s) => s.value), 1);

  if (stages.length === 0 || entry === 0) {
    return <EmptyState title="Pipeline is empty" description={emptyLabel} />;
  }

  // Build the visual bar row: each marked stage, then `filler` decaying track
  // bars leading toward the next stage's height.
  const bars: { height: number; mark: boolean }[] = [];
  stages.forEach((stage, i) => {
    bars.push({ height: stage.value / maxValue, mark: true });
    const next = stages[i + 1];
    if (next) {
      for (let f = 1; f <= filler; f += 1) {
        const t = f / (filler + 1);
        const h =
          (stage.value + (next.value - stage.value) * t) / maxValue;
        bars.push({ height: Math.max(h, 0.04), mark: false });
      }
    }
  });

  return (
    <div className={cn("ds-funnel", className)}>
      <span className="ds-funnel-scale">100%</span>
      <div
        className="ds-funnel-track"
        role="img"
        aria-label={`Pipeline: ${stages
          .map((s) => `${s.label} ${s.value}`)
          .join(", ")}`}
      >
        {bars.map((b, i) => (
          <span
            key={i}
            className="ds-funnel-bar"
            data-mark={b.mark ? "true" : undefined}
            style={{ height: `${Math.round(b.height * 100)}%` }}
          />
        ))}
      </div>
      <div className="ds-funnel-marks">
        {stages.map((stage) => {
          const pct = entry > 0 ? Math.round((stage.value / entry) * 100) : 0;
          return (
            <div className="ds-funnel-mark" key={stage.id}>
              <span className="ds-funnel-mark-pct">{pct}%</span>
              <span className="ds-funnel-mark-label" title={stage.label}>
                {stage.label}
              </span>
              <span className="ds-funnel-mark-value">{stage.value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
