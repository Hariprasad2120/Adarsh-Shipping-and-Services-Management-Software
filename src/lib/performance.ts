/**
 * Performance tracking and logging utility
 */

export async function timeBlock<T>(
  label: string,
  block: () => Promise<T> | T,
  slowThresholdMs = 50
): Promise<T> {
  const start = performance.now();
  try {
    return await block();
  } finally {
    const elapsed = performance.now() - start;
    if (elapsed >= slowThresholdMs) {
      console.warn(`[PERF WARNING] ${label} took ${elapsed.toFixed(1)}ms`);
    } else {
      console.log(`[PERF] ${label} took ${elapsed.toFixed(1)}ms`);
    }
  }
}
