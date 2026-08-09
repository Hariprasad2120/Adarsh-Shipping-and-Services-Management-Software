"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
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
} from "./dev-console-store";
import { scanForViolations } from "./dev-console-violation-scanner";
import { scanForA11yIssues } from "./dev-console-a11y-scanner";

type Tab = "overview" | "errors" | "network" | "logs" | "violations" | "a11y";

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

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString(undefined, {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function OverviewTab({ userEmail, userRole }: { userEmail?: string; userRole?: string }) {
  const pathname = usePathname();
  const errors = useDevConsoleErrors();
  const network = useDevConsoleNetwork();

  const rows: Array<[string, string]> = [
    ["Route", pathname || "-"],
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
          {(["overview", "errors", "network", "logs", "violations", "a11y"] as const).map((value) => (
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
        {tab === "errors" ? <ErrorsTab /> : null}
        {tab === "network" ? <NetworkTab /> : null}
        {tab === "logs" ? <LogsTab /> : null}
        {tab === "violations" ? <ViolationsTab /> : null}
        {tab === "a11y" ? <A11yTab /> : null}
      </div>
    </div>,
    document.body,
  );
}
