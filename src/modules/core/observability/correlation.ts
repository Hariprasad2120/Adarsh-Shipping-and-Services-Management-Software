/**
 * Stage 2 — enterprise platform: request correlation context.
 *
 * A per-request id that ties together logs, audit events, background jobs and
 * outbound calls. Carried in `AsyncLocalStorage` so any code in the request can
 * read it without threading a parameter. Route handlers / actions / jobs start
 * a scope with `runWithCorrelation`; middleware only ensures the header exists.
 */

import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";

export const REQUEST_ID_HEADER = "x-request-id";
export const CORRELATION_ID_HEADER = "x-correlation-id";

export type CorrelationContext = {
  /** Stable id for this logical operation; propagates to downstream calls. */
  correlationId: string;
  /** Id unique to this single request / job execution. */
  requestId: string;
  route?: string;
  orgId?: string;
  userId?: string;
  source?: "http" | "job" | "script" | "cron";
};

const storage = new AsyncLocalStorage<CorrelationContext>();

export function newId(): string {
  return randomUUID();
}

/** Run `fn` inside a fresh correlation scope. Missing ids are generated. */
export function runWithCorrelation<T>(
  partial: Partial<CorrelationContext>,
  fn: () => T,
): T {
  const ctx: CorrelationContext = {
    correlationId: partial.correlationId || partial.requestId || newId(),
    requestId: partial.requestId || newId(),
    route: partial.route,
    orgId: partial.orgId,
    userId: partial.userId,
    source: partial.source ?? "http",
  };
  return storage.run(ctx, fn);
}

/** Derive a correlation scope from incoming HTTP headers. */
export function runWithCorrelationFromHeaders<T>(
  headers: Headers | Record<string, string | undefined>,
  extra: Partial<CorrelationContext>,
  fn: () => T,
): T {
  const get = (k: string) =>
    headers instanceof Headers ? headers.get(k) : (headers[k] ?? headers[k.toLowerCase()]);
  return runWithCorrelation(
    {
      correlationId: get(CORRELATION_ID_HEADER) || undefined,
      requestId: get(REQUEST_ID_HEADER) || undefined,
      ...extra,
    },
    fn,
  );
}

export function getCorrelationContext(): CorrelationContext | undefined {
  return storage.getStore();
}

export function getCorrelationId(): string | undefined {
  return storage.getStore()?.correlationId;
}

/** Merge fields (orgId, userId, route) into the active scope, if any. */
export function enrichCorrelation(fields: Partial<CorrelationContext>): void {
  const ctx = storage.getStore();
  if (!ctx) return;
  Object.assign(ctx, fields);
}
