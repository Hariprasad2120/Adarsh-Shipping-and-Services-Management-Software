"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import {
  devConsoleStore,
  type DevConsoleErrorEntry,
  type DevConsoleNetworkEntry,
  type DevConsoleLogEntry,
  type DevConsoleLogKind,
  type DevConsoleViolationEntry,
  type DevConsoleA11yEntry,
  type DevConsoleHiddenEntry,
  type DevConsoleRouteTimingEntry,
  type DevConsoleComponentTimingEntry,
} from "./dev-console-store";
import { scanForViolations } from "./dev-console-violation-scanner";
import { scanForA11yIssues } from "./dev-console-a11y-scanner";
import { scanForHiddenElements, type HiddenMatch } from "./dev-console-hidden-scanner";
import { revealHiddenElements, restoreHiddenElements } from "./dev-console-hidden-reveal";

type Tab = "overview" | "perf" | "errors" | "network" | "logs" | "violations" | "a11y" | "hidden";

function useDevConsoleErrors(): DevConsoleErrorEntry[] {
  return useSyncExternalStore(
    (listener) => devConsoleStore.subscribe(listener),
    () => devConsoleStore.getErrors(),
    () => [],
  );
}

function useDevConsoleNetwork(): DevConsoleNetworkEntry[] {
  return useSyncExternalStore(
    (listener) => devConsoleStore.subscribe(listener),
    () => devConsoleStore.getNetworkCalls(),
    () => [],
  );
}

function useDevConsoleLogs(): DevConsoleLogEntry[] {
  return useSyncExternalStore(
    (listener) => devConsoleStore.subscribe(listener),
    () => devConsoleStore.getLogs(),
    () => [],
  );
}

function useDevConsoleViolations(): DevConsoleViolationEntry[] {
  return useSyncExternalStore(
    (listener) => devConsoleStore.subscribe(listener),
    () => devConsoleStore.getViolations(),
    () => [],
  );
}

function useDevConsoleA11yIssues(): DevConsoleA11yEntry[] {
  return useSyncExternalStore(
    (listener) => devConsoleStore.subscribe(listener),
    () => devConsoleStore.getA11yIssues(),
    () => [],
  );
}

function useDevConsoleHiddenElements(): DevConsoleHiddenEntry[] {
  return useSyncExternalStore(
    (listener) => devConsoleStore.subscribe(listener),
    () => devConsoleStore.getHiddenElements(),
    () => [],
  );
}

function useDevConsoleRouteTimings(): DevConsoleRouteTimingEntry[] {
  return useSyncExternalStore(
    (listener) => devConsoleStore.subscribe(listener),
    () => devConsoleStore.getRouteTimings(),
    () => [],
  );
}

function useDevConsoleComponentTimings(): DevConsoleComponentTimingEntry[] {
  return useSyncExternalStore(
    (listener) => devConsoleStore.subscribe(listener),
    () => devConsoleStore.getComponentTimings(),
    () => [],
  );
}

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString(undefined, {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

const PING_GOOD_MS = 200;
const PING_OK_MS = 500;

function pingRating(ms: number): "good" | "ok" | "slow" {
  if (ms <= PING_GOOD_MS) return "good";
  if (ms <= PING_OK_MS) return "ok";
  return "slow";
}

function PingMeter({ ms }: { ms: number }) {
  const rating = pingRating(ms);
  const pct = Math.min(100, Math.round((ms / 1500) * 100));
  return (
    <div className={`mnx-dev-ping-meter is-${rating}`}>
      <div className="mnx-dev-ping-meter-track">
        <div className="mnx-dev-ping-meter-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="mnx-dev-ping-value">{ms}ms</span>
    </div>
  );
}

function PerfTab() {
  const routeTimings = useDevConsoleRouteTimings();
  const componentTimings = useDevConsoleComponentTimings();
  const pathname = usePathname();

  const currentRouteTimings = routeTimings.filter((entry) => entry.route === pathname);
  const latest = currentRouteTimings[0];
  const average =
    currentRouteTimings.length > 0
      ? Math.round(
          currentRouteTimings.reduce((sum, entry) => sum + entry.loadMs, 0) / currentRouteTimings.length,
        )
      : null;

  const slowestComponents = [...componentTimings]
    .sort((a, b) => b.durationMs - a.durationMs)
    .slice(0, 20);

  return (
    <div className="mnx-dev-list">
      <div className="mnx-dev-perf-summary">
        <div>
          <dt>Current route ping</dt>
          <dd>{latest ? <PingMeter ms={latest.loadMs} /> : <span className="mnx-dev-empty-inline">Navigate to measure</span>}</dd>
        </div>
        <div>
          <dt>Average ({currentRouteTimings.length} loads)</dt>
          <dd>{average !== null ? <PingMeter ms={average} /> : <span className="mnx-dev-empty-inline">—</span>}</dd>
        </div>
      </div>

      <div className="mnx-dev-list-actions">
        <span className="mnx-dev-tag">Slow components (&gt;16ms render)</span>
        <button
          type="button"
          onClick={() => {
            devConsoleStore.clearComponentTimings();
            devConsoleStore.clearRouteTimings();
          }}
        >
          Clear
        </button>
      </div>

      {slowestComponents.length === 0 ? (
        <p className="mnx-dev-empty">No slow component renders recorded on this route yet.</p>
      ) : (
        slowestComponents.map((entry) => {
          const isSlow = entry.durationMs > 50;
          return (
            <div key={entry.id} className={`mnx-dev-list-item${isSlow ? " is-slow" : ""}`}>
              <div className="mnx-dev-list-item-head">
                <span className="mnx-dev-tag">{entry.phase}</span>
                <span>{formatTime(entry.timestamp)}</span>
                <span>{entry.durationMs}ms</span>
              </div>
              <p>{entry.name}</p>
              <p className="mnx-dev-url">{entry.route}</p>
            </div>
          );
        })
      )}

      <div className="mnx-dev-list-actions">
        <span className="mnx-dev-tag">Route load history</span>
      </div>
      {routeTimings.length === 0 ? (
        <p className="mnx-dev-empty">No route loads recorded yet.</p>
      ) : (
        routeTimings.slice(0, 15).map((entry) => (
          <div key={entry.id} className={`mnx-dev-list-item is-${pingRating(entry.loadMs)}`}>
            <div className="mnx-dev-list-item-head">
              <span>{formatTime(entry.timestamp)}</span>
              <span>{entry.loadMs}ms</span>
            </div>
            <p className="mnx-dev-url">{entry.route}</p>
          </div>
        ))
      )}
    </div>
  );
}

function OverviewTab({ userEmail, userRole }: { userEmail?: string; userRole?: string }) {
  const pathname = usePathname();
  const errors = useDevConsoleErrors();
  const network = useDevConsoleNetwork();
  const routeTimings = useDevConsoleRouteTimings();
  const latestPing = routeTimings.find((entry) => entry.route === pathname);

  const rows: Array<[string, string]> = [
    ["Route", pathname || "-"],
    ["Route ping", latestPing ? `${latestPing.loadMs}ms` : "—"],
    ["Environment", process.env.NODE_ENV],
    ["App version", process.env.NEXT_PUBLIC_APP_VERSION ?? "0.1.0"],
    ["User", userEmail ?? "-"],
    ["Role", userRole ?? "-"],
    ["Errors recorded", String(errors.length)],
    ["Network calls recorded", String(network.length)],
  ];

  return (
    <dl className="mnx-dev-overview">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function ErrorsTab() {
  const errors = useDevConsoleErrors();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (errors.length === 0) {
    return <p className="mnx-dev-empty">No errors recorded this session.</p>;
  }

  return (
    <div className="mnx-dev-list">
      <div className="mnx-dev-list-actions">
        <button type="button" onClick={() => devConsoleStore.clearErrors()}>
          Clear
        </button>
      </div>
      {errors.map((entry) => (
        <div
          key={entry.id}
          className={`mnx-dev-list-item is-${entry.severity}`}
          onClick={() => setExpandedId((current) => (current === entry.id ? null : entry.id))}
        >
          <div className="mnx-dev-list-item-head">
            <span className="mnx-dev-tag">{entry.source}</span>
            <span>{formatTime(entry.timestamp)}</span>
          </div>
          <p>{entry.message}</p>
          {expandedId === entry.id && entry.stack ? (
            <pre className="mnx-dev-stack">{entry.stack}</pre>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function NetworkTab() {
  const network = useDevConsoleNetwork();

  if (network.length === 0) {
    return <p className="mnx-dev-empty">No network calls recorded yet.</p>;
  }

  return (
    <div className="mnx-dev-list">
      <div className="mnx-dev-list-actions">
        <button type="button" onClick={() => devConsoleStore.clearNetwork()}>
          Clear
        </button>
      </div>
      {network.map((entry) => {
        const isSlow = entry.durationMs > 2000;
        const isError = entry.failed || (entry.status !== null && entry.status >= 400);
        return (
          <div
            key={entry.id}
            className={`mnx-dev-list-item${isError ? " is-error" : ""}${isSlow ? " is-slow" : ""}`}
          >
            <div className="mnx-dev-list-item-head">
              <span className="mnx-dev-tag">{entry.method}</span>
              <span>{entry.status ?? "—"}</span>
              <span>{entry.durationMs}ms</span>
            </div>
            <p className="mnx-dev-url">{entry.url}</p>
            {entry.failureReason ? <p className="mnx-dev-error-reason">{entry.failureReason}</p> : null}
          </div>
        );
      })}
    </div>
  );
}

const LOG_KIND_FILTERS: Array<{ value: DevConsoleLogKind | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "console", label: "Console" },
  { value: "route-change", label: "Routes" },
  { value: "user-action", label: "Actions" },
];

function LogsTab() {
  const logs = useDevConsoleLogs();
  const [kindFilter, setKindFilter] = useState<DevConsoleLogKind | "all">("all");

  const filtered = kindFilter === "all" ? logs : logs.filter((entry) => entry.kind === kindFilter);

  return (
    <div className="mnx-dev-list">
      <div className="mnx-dev-list-actions has-filters">
        <div className="mnx-dev-filter-group" role="group" aria-label="Filter logs">
          {LOG_KIND_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              className={kindFilter === filter.value ? "is-active" : ""}
              onClick={() => setKindFilter(filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => devConsoleStore.clearLogs()}>
          Clear
        </button>
      </div>
      {filtered.length === 0 ? (
        <p className="mnx-dev-empty">No log entries recorded yet.</p>
      ) : (
        filtered.map((entry) => (
          <div key={entry.id} className={`mnx-dev-list-item is-${entry.level}`}>
            <div className="mnx-dev-list-item-head">
              <span className="mnx-dev-tag">{entry.kind}</span>
              <span>{formatTime(entry.timestamp)}</span>
            </div>
            <p>{entry.message}</p>
          </div>
        ))
      )}
    </div>
  );
}

const VIOLATION_TYPE_LABEL: Record<DevConsoleViolationEntry["type"], string> = {
  "raw-button": "Raw button",
  "raw-input": "Raw input",
  "inline-color": "Inline color",
};

function runScan() {
  devConsoleStore.setViolations(scanForViolations());
}

function ViolationsTab() {
  const violations = useDevConsoleViolations();
  const pathname = usePathname();

  useEffect(() => {
    runScan();
  }, [pathname]);

  const counts = violations.reduce<Record<string, number>>((acc, entry) => {
    acc[entry.type] = (acc[entry.type] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="mnx-dev-list">
      <div className="mnx-dev-list-actions has-filters">
        <div className="mnx-dev-filter-group" aria-live="polite">
          {Object.entries(counts).map(([type, count]) => (
            <span key={type} className="mnx-dev-tag">
              {VIOLATION_TYPE_LABEL[type as DevConsoleViolationEntry["type"]]}: {count}
            </span>
          ))}
        </div>
        <button type="button" onClick={runScan}>
          Rescan
        </button>
      </div>
      {violations.length === 0 ? (
        <p className="mnx-dev-empty">No design-system violations found on this page.</p>
      ) : (
        violations.map((entry) => (
          <div key={entry.id} className={`mnx-dev-list-item is-${entry.severity}`}>
            <div className="mnx-dev-list-item-head">
              <span className="mnx-dev-tag">{VIOLATION_TYPE_LABEL[entry.type]}</span>
            </div>
            <p>{entry.description}</p>
          </div>
        ))
      )}
    </div>
  );
}

const A11Y_TYPE_LABEL: Record<DevConsoleA11yEntry["type"], string> = {
  "missing-alt": "Missing alt",
  "unlabeled-control": "Unlabeled control",
  "missing-form-label": "Missing form label",
  "invalid-aria-ref": "Invalid ARIA ref",
  "duplicate-id": "Duplicate id",
};

function runA11yScan() {
  devConsoleStore.setA11yIssues(scanForA11yIssues());
}

function A11yTab() {
  const issues = useDevConsoleA11yIssues();
  const pathname = usePathname();

  useEffect(() => {
    runA11yScan();
  }, [pathname]);

  const counts = issues.reduce<Record<string, number>>((acc, entry) => {
    acc[entry.type] = (acc[entry.type] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="mnx-dev-list">
      <div className="mnx-dev-list-actions has-filters">
        <div className="mnx-dev-filter-group" aria-live="polite">
          {Object.entries(counts).map(([type, count]) => (
            <span key={type} className="mnx-dev-tag">
              {A11Y_TYPE_LABEL[type as DevConsoleA11yEntry["type"]]}: {count}
            </span>
          ))}
        </div>
        <button type="button" onClick={runA11yScan}>
          Rescan
        </button>
      </div>
      {issues.length === 0 ? (
        <p className="mnx-dev-empty">No accessibility issues found on this page.</p>
      ) : (
        issues.map((entry) => (
          <div key={entry.id} className={`mnx-dev-list-item is-${entry.severity}`}>
            <div className="mnx-dev-list-item-head">
              <span className="mnx-dev-tag">{A11Y_TYPE_LABEL[entry.type]}</span>
            </div>
            <p>{entry.description}</p>
          </div>
        ))
      )}
    </div>
  );
}

const HIDDEN_REASON_LABEL: Record<DevConsoleHiddenEntry["reason"], string> = {
  "display-none": "display: none",
  "visibility-hidden": "visibility: hidden",
  "zero-opacity": "opacity: 0",
  "zero-size": "Zero size",
  offscreen: "Off-screen",
  "aria-hidden-but-focusable": "aria-hidden + focusable",
  clipped: "Clipped",
};

function runHiddenScan(): HiddenMatch[] {
  const matches = scanForHiddenElements();
  devConsoleStore.setHiddenElements(matches.map((match) => match.draft));
  return matches;
}

function HiddenElementsTab() {
  const entries = useDevConsoleHiddenElements();
  const pathname = usePathname();
  const [reasonFilter, setReasonFilter] = useState<DevConsoleHiddenEntry["reason"] | "all">("all");
  const [revealing, setRevealing] = useState(false);
  const elementByIdRef = useRef<Map<string, HTMLElement>>(new Map());

  function scan() {
    const matches = runHiddenScan();
    const nextEntries = devConsoleStore.getHiddenElements();
    const map = new Map<string, HTMLElement>();
    matches.forEach((match, index) => {
      const entry = nextEntries[index];
      if (entry) map.set(entry.id, match.element);
    });
    elementByIdRef.current = map;
    return matches;
  }

  useEffect(() => {
    scan();
    if (revealing) revealHiddenElements(Array.from(elementByIdRef.current.values()));
    return () => {
      restoreHiddenElements();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- rescan on route change only
  }, [pathname]);

  const counts = entries.reduce<Record<string, number>>((acc, entry) => {
    acc[entry.reason] = (acc[entry.reason] ?? 0) + 1;
    return acc;
  }, {});

  const filtered = reasonFilter === "all" ? entries : entries.filter((entry) => entry.reason === reasonFilter);

  function rescan() {
    scan();
    if (revealing) revealHiddenElements(Array.from(elementByIdRef.current.values()));
  }

  function toggleRevealing(next: boolean) {
    setRevealing(next);
    if (next) revealHiddenElements(Array.from(elementByIdRef.current.values()));
    else restoreHiddenElements();
  }

  function jumpToElement(entryId: string) {
    const element = elementByIdRef.current.get(entryId);
    if (!element) return;
    if (!revealing) toggleRevealing(true);
    element.scrollIntoView({ behavior: "smooth", block: "center" });
    element.classList.add("mnx-dev-hidden-flash");
    window.setTimeout(() => element.classList.remove("mnx-dev-hidden-flash"), 1500);
  }

  return (
    <div className="mnx-dev-list">
      <div className="mnx-dev-list-actions has-filters">
        <label className="mnx-dev-reveal-toggle">
          <input
            type="checkbox"
            checked={revealing}
            onChange={(event) => toggleRevealing(event.target.checked)}
          />
          Show hidden elements on page
        </label>
        <button type="button" onClick={rescan}>
          Rescan
        </button>
      </div>
      <div className="mnx-dev-list-actions has-filters">
        <div className="mnx-dev-filter-group" role="group" aria-label="Filter hidden elements">
          <button
            type="button"
            className={reasonFilter === "all" ? "is-active" : ""}
            onClick={() => setReasonFilter("all")}
          >
            All ({entries.length})
          </button>
          {Object.entries(counts).map(([reason, count]) => (
            <button
              key={reason}
              type="button"
              className={reasonFilter === reason ? "is-active" : ""}
              onClick={() => setReasonFilter(reason as DevConsoleHiddenEntry["reason"])}
            >
              {HIDDEN_REASON_LABEL[reason as DevConsoleHiddenEntry["reason"]]} ({count})
            </button>
          ))}
        </div>
      </div>
      {filtered.length === 0 ? (
        <p className="mnx-dev-empty">No hidden elements found on this page.</p>
      ) : (
        filtered.map((entry) => (
          <div
            key={entry.id}
            className="mnx-dev-list-item is-warning"
            onClick={() => jumpToElement(entry.id)}
          >
            <div className="mnx-dev-list-item-head">
              <span className="mnx-dev-tag">{HIDDEN_REASON_LABEL[entry.reason]}</span>
            </div>
            <p>{entry.description}</p>
          </div>
        ))
      )}
    </div>
  );
}

export function DevPanel({
  onClose,
  userEmail,
  userRole,
}: {
  onClose: () => void;
  userEmail?: string;
  userRole?: string;
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div className="mnx-dev-panel" role="dialog" aria-label="Developer console">
      <header className="mnx-dev-panel-header">
        <div className="mnx-dev-tabs" role="tablist">
          {(["overview", "perf", "errors", "network", "logs", "violations", "a11y", "hidden"] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              className={tab === value ? "is-active" : ""}
              onClick={() => setTab(value)}
            >
              {value[0].toUpperCase() + value.slice(1)}
            </button>
          ))}
        </div>
        <button type="button" className="mnx-dev-panel-close" onClick={onClose} aria-label="Close developer console">
          ×
        </button>
      </header>
      <div className="mnx-dev-panel-body">
        {tab === "overview" ? <OverviewTab userEmail={userEmail} userRole={userRole} /> : null}
        {tab === "perf" ? <PerfTab /> : null}
        {tab === "errors" ? <ErrorsTab /> : null}
        {tab === "network" ? <NetworkTab /> : null}
        {tab === "logs" ? <LogsTab /> : null}
        {tab === "violations" ? <ViolationsTab /> : null}
        {tab === "a11y" ? <A11yTab /> : null}
        {tab === "hidden" ? <HiddenElementsTab /> : null}
      </div>
    </div>,
    document.body,
  );
}
