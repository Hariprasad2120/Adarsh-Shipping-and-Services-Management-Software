/**
 * Stage 2 — enterprise platform: structured logger.
 *
 * Emits one JSON object per line — `{ ts, level, msg, correlationId, ...fields }`
 * — ready for an external log pipeline (no vendor coupling). Levels gate on
 * `LOG_LEVEL` (default "info"). Sensitive-looking field values are redacted.
 */

import { getCorrelationContext } from "./correlation";

export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function activeThreshold(): number {
  const raw = (process.env.LOG_LEVEL ?? "info").toLowerCase();
  return LEVEL_ORDER[raw as LogLevel] ?? LEVEL_ORDER.info;
}

const SENSITIVE_RE =
  /pass(word|phrase)?|secret|token|api[-_]?key|private[-_]?key|client[-_]?secret|credential|cookie|authorization|bearer|salt|otp|totp|mfa/i;

function scrub(value: unknown, depth = 0): unknown {
  if (depth > 6) return "[truncated]";
  if (value == null || typeof value !== "object") return value;
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }
  if (Array.isArray(value)) return value.map((v) => scrub(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = SENSITIVE_RE.test(k) ? "[redacted]" : scrub(v, depth + 1);
  }
  return out;
}

export type LogSink = (line: string) => void;

const defaultSink: LogSink = (line) => {
  process.stdout.write(line + "\n");
};

let sink: LogSink = defaultSink;

/** Swap the output sink (tests). Pass nothing to restore the default. */
export function setLogSink(next?: LogSink): void {
  sink = next ?? defaultSink;
}

function emit(level: LogLevel, msg: string, fields?: Record<string, unknown>): void {
  if (LEVEL_ORDER[level] < activeThreshold()) return;
  const ctx = getCorrelationContext();
  const record: Record<string, unknown> = {
    ts: new Date().toISOString(),
    level,
    msg,
    ...(ctx
      ? {
          correlationId: ctx.correlationId,
          requestId: ctx.requestId,
          ...(ctx.route ? { route: ctx.route } : {}),
          ...(ctx.orgId ? { orgId: ctx.orgId } : {}),
          ...(ctx.userId ? { userId: ctx.userId } : {}),
        }
      : {}),
    ...(fields ? (scrub(fields) as Record<string, unknown>) : {}),
  };
  try {
    sink(JSON.stringify(record));
  } catch {
    // Never let logging throw into the caller.
  }
}

export const logger = {
  debug: (msg: string, fields?: Record<string, unknown>) => emit("debug", msg, fields),
  info: (msg: string, fields?: Record<string, unknown>) => emit("info", msg, fields),
  warn: (msg: string, fields?: Record<string, unknown>) => emit("warn", msg, fields),
  error: (msg: string, fields?: Record<string, unknown>) => emit("error", msg, fields),
};
