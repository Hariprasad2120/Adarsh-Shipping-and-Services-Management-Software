/**
 * Stage 2 — enterprise platform: lightweight in-process metrics.
 *
 * Per-process counters and value summaries — enough to expose on a readiness /
 * ops endpoint and to spot regressions. Cross-instance aggregation is the
 * infrastructure's job (scrape + roll up); nothing critical is stored only here.
 */

type CounterKey = string;

type Summary = {
  count: number;
  sum: number;
  min: number;
  max: number;
};

const counters = new Map<CounterKey, number>();
const summaries = new Map<CounterKey, Summary>();

function key(name: string, labels?: Record<string, string | number>): CounterKey {
  if (!labels) return name;
  const parts = Object.keys(labels)
    .sort()
    .map((k) => `${k}=${labels[k]}`);
  return parts.length ? `${name}{${parts.join(",")}}` : name;
}

/** Increment a counter (default by 1). */
export function incr(
  name: string,
  labels?: Record<string, string | number>,
  by = 1,
): void {
  const k = key(name, labels);
  counters.set(k, (counters.get(k) ?? 0) + by);
}

/** Record a value into a summary (latency ms, batch size, …). */
export function observe(
  name: string,
  value: number,
  labels?: Record<string, string | number>,
): void {
  const k = key(name, labels);
  const s = summaries.get(k);
  if (!s) {
    summaries.set(k, { count: 1, sum: value, min: value, max: value });
  } else {
    s.count += 1;
    s.sum += value;
    if (value < s.min) s.min = value;
    if (value > s.max) s.max = value;
  }
}

/** Time an async block and record it as a summary in milliseconds. */
export async function timed<T>(
  name: string,
  fn: () => Promise<T>,
  labels?: Record<string, string | number>,
): Promise<T> {
  const start = performance.now();
  try {
    return await fn();
  } finally {
    observe(name, performance.now() - start, labels);
  }
}

export type MetricsSnapshot = {
  counters: Record<string, number>;
  summaries: Record<string, Summary & { avg: number }>;
};

export function snapshot(): MetricsSnapshot {
  return {
    counters: Object.fromEntries(counters),
    summaries: Object.fromEntries(
      [...summaries].map(([k, s]) => [k, { ...s, avg: s.count ? s.sum / s.count : 0 }]),
    ),
  };
}

/** Test helper — clear all state. */
export function resetMetrics(): void {
  counters.clear();
  summaries.clear();
}
