/**
 * Stage 2 — enterprise platform: observability primitives.
 *
 * `correlation.*` — per-request id in AsyncLocalStorage.
 * `logger.*`      — structured JSON logging, correlation-aware, redacting.
 * `metrics.*`     — in-process counters + summaries.
 *
 * Designed for an external log / metrics / APM pipeline without coupling to one
 * vendor. See /api/health (liveness) and /api/ready (readiness).
 */
export * from "./correlation";
export * from "./logger";
export * from "./metrics";
