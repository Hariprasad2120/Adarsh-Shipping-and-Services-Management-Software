import { afterEach, describe, expect, it } from "vitest";
import {
  enrichCorrelation,
  getCorrelationContext,
  getCorrelationId,
  runWithCorrelation,
  runWithCorrelationFromHeaders,
} from "../correlation";
import { logger, setLogSink } from "../logger";
import { incr, observe, resetMetrics, snapshot, timed } from "../metrics";

afterEach(() => {
  setLogSink();
  resetMetrics();
});

describe("correlation", () => {
  it("generates ids when none supplied and exposes them in scope", () => {
    runWithCorrelation({}, () => {
      const ctx = getCorrelationContext()!;
      expect(ctx.correlationId).toMatch(/[0-9a-f-]{36}/);
      expect(ctx.requestId).toMatch(/[0-9a-f-]{36}/);
      expect(getCorrelationId()).toBe(ctx.correlationId);
    });
    expect(getCorrelationContext()).toBeUndefined(); // scope ends
  });

  it("adopts ids from headers and lets correlationId span requests", () => {
    const headers = new Headers({
      "x-correlation-id": "corr-123",
      "x-request-id": "req-a",
    });
    runWithCorrelationFromHeaders(headers, { route: "/x" }, () => {
      const ctx = getCorrelationContext()!;
      expect(ctx.correlationId).toBe("corr-123");
      expect(ctx.requestId).toBe("req-a");
      expect(ctx.route).toBe("/x");
    });
  });

  it("enrichCorrelation merges fields into the active scope only", () => {
    enrichCorrelation({ orgId: "o1" }); // no scope — no-op, no throw
    runWithCorrelation({}, () => {
      enrichCorrelation({ orgId: "o1", userId: "u1" });
      expect(getCorrelationContext()).toMatchObject({ orgId: "o1", userId: "u1" });
    });
  });
});

describe("logger", () => {
  it("emits one JSON line with level, msg and correlation ids", () => {
    const lines: string[] = [];
    setLogSink((l) => lines.push(l));
    runWithCorrelation({ correlationId: "c1", requestId: "r1", orgId: "o1" }, () => {
      logger.info("hello", { foo: "bar" });
    });
    expect(lines).toHaveLength(1);
    const rec = JSON.parse(lines[0]);
    expect(rec).toMatchObject({ level: "info", msg: "hello", correlationId: "c1", orgId: "o1", foo: "bar" });
    expect(typeof rec.ts).toBe("string");
  });

  it("redacts sensitive field names", () => {
    const lines: string[] = [];
    setLogSink((l) => lines.push(l));
    logger.warn("auth", { password: "hunter2", apiKey: "sk-1", nested: { token: "t" }, ok: 1 });
    const rec = JSON.parse(lines[0]);
    expect(rec.password).toBe("[redacted]");
    expect(rec.apiKey).toBe("[redacted]");
    expect(rec.nested.token).toBe("[redacted]");
    expect(rec.ok).toBe(1);
  });

  it("gates below the active level", () => {
    const prev = process.env.LOG_LEVEL;
    process.env.LOG_LEVEL = "warn";
    const lines: string[] = [];
    setLogSink((l) => lines.push(l));
    logger.info("skipped");
    logger.error("kept");
    process.env.LOG_LEVEL = prev;
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0]).msg).toBe("kept");
  });

  it("serialises Error objects", () => {
    const lines: string[] = [];
    setLogSink((l) => lines.push(l));
    logger.error("boom", { err: new Error("nope") });
    const rec = JSON.parse(lines[0]);
    expect(rec.err.message).toBe("nope");
    expect(rec.err.name).toBe("Error");
  });
});

describe("metrics", () => {
  it("counts with and without labels", () => {
    incr("jobs.run");
    incr("jobs.run");
    incr("jobs.run", { queue: "email" }, 3);
    const snap = snapshot();
    expect(snap.counters["jobs.run"]).toBe(2);
    expect(snap.counters["jobs.run{queue=email}"]).toBe(3);
  });

  it("summarises observed values", () => {
    observe("latency", 10);
    observe("latency", 20);
    observe("latency", 30);
    const s = snapshot().summaries["latency"];
    expect(s).toMatchObject({ count: 3, sum: 60, min: 10, max: 30, avg: 20 });
  });

  it("timed() records a duration summary and returns the value", async () => {
    const v = await timed("op", async () => 42);
    expect(v).toBe(42);
    expect(snapshot().summaries["op"].count).toBe(1);
  });
});
