import { AsyncLocalStorage } from "node:async_hooks";
import type { NextResponse } from "next/server";

type RequestPerfEntry = {
  operation: string;
  elapsedMs: number;
};

type DatabaseBreakdownEntry = {
  queryCount: number;
  totalMs: number;
};

type RequestPerfStore = {
  route: string;
  startedAt: number;
  entries: RequestPerfEntry[];
  queryCount: number;
  dbTimeMs: number;
  dbByTarget: Map<string, DatabaseBreakdownEntry>;
};

const perfStorage = new AsyncLocalStorage<RequestPerfStore>();

function round(elapsedMs: number) {
  return Number(elapsedMs.toFixed(1));
}

function extractQueryTarget(statement: string) {
  return (
    statement.match(/(?:FROM|JOIN|INTO|UPDATE)\s+(?:"[^"]+"\.)?"([^"]+)"/i)?.[1] ??
    "transaction"
  );
}

export function withRequestPerformance<T>(
  route: string,
  block: () => Promise<T> | T,
): Promise<T> | T {
  return perfStorage.run(
    {
      route,
      startedAt: performance.now(),
      entries: [],
      queryCount: 0,
      dbTimeMs: 0,
      dbByTarget: new Map(),
    },
    block,
  );
}

export function recordMeasuredBlock(operation: string, elapsedMs: number) {
  const store = perfStorage.getStore();
  const roundedElapsedMs = round(elapsedMs);
  const payload = {
    type: "perf",
    route: store?.route ?? "unknown",
    operation,
    elapsedMs: roundedElapsedMs,
  };

  if (store) {
    store.entries.push({ operation, elapsedMs: roundedElapsedMs });
  }

  console.log(JSON.stringify(payload));
}

export function recordDatabaseQuery(event: { query: string; duration: number }) {
  const store = perfStorage.getStore();
  if (!store) return;

  const target = extractQueryTarget(event.query);
  const current = store.dbByTarget.get(target) ?? { queryCount: 0, totalMs: 0 };
  current.queryCount += 1;
  current.totalMs += event.duration;
  store.dbByTarget.set(target, current);
  store.queryCount += 1;
  store.dbTimeMs += event.duration;
}

export function getRequestPerformanceSnapshot() {
  const store = perfStorage.getStore();
  if (!store) return null;

  const totalMs = round(performance.now() - store.startedAt);
  return {
    route: store.route,
    totalMs,
    queryCount: store.queryCount,
    dbTimeMs: round(store.dbTimeMs),
    entries: [...store.entries],
    dbTargets: [...store.dbByTarget.entries()]
      .map(([target, entry]) => ({
        target,
        queryCount: entry.queryCount,
        totalMs: round(entry.totalMs),
      }))
      .sort((left, right) => right.totalMs - left.totalMs),
  };
}

export function attachRequestPerformanceHeaders<T extends NextResponse>(response: T) {
  const snapshot = getRequestPerformanceSnapshot();
  if (!snapshot) return response;

  const topEntries = snapshot.entries
    .slice()
    .sort((left, right) => right.elapsedMs - left.elapsedMs)
    .slice(0, 4);
  const serverTiming = [
    `total;dur=${snapshot.totalMs}`,
    `db;dur=${snapshot.dbTimeMs};desc="${snapshot.queryCount} queries"`,
    ...topEntries.map((entry, index) =>
      `app${index + 1};dur=${entry.elapsedMs};desc="${entry.operation.replace(/"/g, "")}"`,
    ),
  ].join(", ");

  response.headers.set("Server-Timing", serverTiming);
  response.headers.set("X-Perf-Query-Count", String(snapshot.queryCount));
  response.headers.set("X-Perf-Db-Time-Ms", String(snapshot.dbTimeMs));
  console.log(JSON.stringify({ type: "perf:summary", ...snapshot }));
  return response;
}
