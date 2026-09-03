/**
 * Stage 2 — enterprise platform: retry backoff (PURE).
 */

export type BackoffOptions = {
  /** First retry delay, ms. Default 30s. */
  baseMs?: number;
  /** Upper bound on any single delay, ms. Default 1h. */
  capMs?: number;
  /** Random +/- fraction applied to the delay (0..1). Default 0.2. */
  jitter?: number;
};

/**
 * Delay before retry `attempts` (1-based: the delay after the 1st failure is
 * `attempts = 1`). Exponential (`base * 2^(attempts-1)`), capped, with jitter.
 */
export function backoffDelayMs(attempts: number, opts: BackoffOptions = {}): number {
  const base = opts.baseMs ?? 30_000;
  const cap = opts.capMs ?? 3_600_000;
  const jitter = opts.jitter ?? 0.2;
  const n = Math.max(attempts, 1);

  const raw = Math.min(cap, base * 2 ** (n - 1));
  const delta = raw * jitter * (Math.random() * 2 - 1);
  return Math.max(0, Math.round(raw + delta));
}

/** `Date` of the next attempt from `from` (default now). */
export function nextRunAfter(
  attempts: number,
  opts: BackoffOptions = {},
  from: Date = new Date(),
): Date {
  return new Date(from.getTime() + backoffDelayMs(attempts, opts));
}
