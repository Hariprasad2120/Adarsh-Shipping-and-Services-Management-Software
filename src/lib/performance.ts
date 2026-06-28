/**
 * Performance tracking and logging utility.
 *
 * `PERF_VERBOSE=true` enables per-call logging for baseline investigations.
 * In normal runtime we only emit slow-request warnings.
 */

const verbosePerfLogging = process.env.PERF_VERBOSE === "true";
const defaultSlowThresholdMs = Number(process.env.PERF_SLOW_THRESHOLD_MS ?? "1000");

function logPerf(label: string, elapsedMs: number, slowThresholdMs: number) {
  const rounded = Number(elapsedMs.toFixed(1));
  if (rounded >= slowThresholdMs) {
    console.warn(JSON.stringify({ type: "perf", severity: "slow", label, elapsedMs: rounded }));
    return;
  }

  if (verbosePerfLogging) {
    console.log(JSON.stringify({ type: "perf", severity: "trace", label, elapsedMs: rounded }));
  }
}

export async function timeBlock<T>(
  label: string,
  block: () => Promise<T> | T,
  slowThresholdMs = 50
): Promise<T> {
  const start = performance.now();
  try {
    return await block();
  } finally {
    logPerf(label, performance.now() - start, slowThresholdMs);
  }
}

export async function tracePerformance<T>(
  label: string,
  block: () => Promise<T> | T,
  slowThresholdMs = defaultSlowThresholdMs,
): Promise<T> {
  const start = performance.now();
  try {
    return await block();
  } finally {
    logPerf(label, performance.now() - start, slowThresholdMs);
  }
}
