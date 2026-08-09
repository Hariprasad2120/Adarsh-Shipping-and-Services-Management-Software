const MAX_ENTRIES = 200;

export type DevConsoleErrorSeverity = "error" | "warning";

export type DevConsoleErrorEntry = {
  id: string;
  message: string;
  stack?: string;
  source: "react" | "window.onerror" | "unhandledrejection" | "console.error" | "console.warn";
  severity: DevConsoleErrorSeverity;
  route: string;
  timestamp: number;
  fingerprint: string;
};

export type DevConsoleNetworkEntry = {
  id: string;
  method: string;
  url: string;
  status: number | null;
  ok: boolean | null;
  durationMs: number;
  startedAt: number;
  failed: boolean;
  failureReason?: string;
};

export type DevConsoleLogKind = "console" | "route-change" | "user-action";
export type DevConsoleLogLevel = "debug" | "info" | "warning" | "error";

export type DevConsoleLogEntry = {
  id: string;
  kind: DevConsoleLogKind;
  level: DevConsoleLogLevel;
  message: string;
  timestamp: number;
  route: string;
};

export type DevConsoleViolationType = "raw-button" | "raw-input" | "inline-color";
export type DevConsoleViolationSeverity = "warning" | "info";

export type DevConsoleViolationEntry = {
  id: string;
  type: DevConsoleViolationType;
  severity: DevConsoleViolationSeverity;
  description: string;
  route: string;
  timestamp: number;
};

export type DevConsoleA11yIssueType =
  | "missing-alt"
  | "unlabeled-control"
  | "missing-form-label"
  | "invalid-aria-ref"
  | "duplicate-id";

export type DevConsoleA11yEntry = {
  id: string;
  type: DevConsoleA11yIssueType;
  severity: "warning";
  description: string;
  route: string;
  timestamp: number;
};

type Listener = () => void;

function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function fingerprintFor(message: string, stack?: string) {
  const firstStackLine = stack?.split("\n")[1]?.trim() ?? "";
  return `${message}::${firstStackLine}`.slice(0, 200);
}

class DevConsoleStore {
  private errors: DevConsoleErrorEntry[] = [];
  private network: DevConsoleNetworkEntry[] = [];
  private logs: DevConsoleLogEntry[] = [];
  private violations: DevConsoleViolationEntry[] = [];
  private a11yIssues: DevConsoleA11yEntry[] = [];
  private listeners = new Set<Listener>();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    for (const listener of this.listeners) listener();
  }

  getErrors(): DevConsoleErrorEntry[] {
    return this.errors;
  }

  getNetworkCalls(): DevConsoleNetworkEntry[] {
    return this.network;
  }

  getLogs(): DevConsoleLogEntry[] {
    return this.logs;
  }

  getViolations(): DevConsoleViolationEntry[] {
    return this.violations;
  }

  getA11yIssues(): DevConsoleA11yEntry[] {
    return this.a11yIssues;
  }

  recordError(input: {
    message: string;
    stack?: string;
    source: DevConsoleErrorEntry["source"];
    severity?: DevConsoleErrorSeverity;
  }) {
    const entry: DevConsoleErrorEntry = {
      id: makeId(),
      message: input.message,
      stack: input.stack,
      source: input.source,
      severity: input.severity ?? "error",
      route: typeof window === "undefined" ? "" : window.location.pathname,
      timestamp: Date.now(),
      fingerprint: fingerprintFor(input.message, input.stack),
    };
    this.errors = [entry, ...this.errors].slice(0, MAX_ENTRIES);
    this.notify();
  }

  recordNetworkCall(entry: Omit<DevConsoleNetworkEntry, "id">) {
    const full: DevConsoleNetworkEntry = { ...entry, id: makeId() };
    this.network = [full, ...this.network].slice(0, MAX_ENTRIES);
    this.notify();
  }

  recordLog(input: {
    kind: DevConsoleLogKind;
    level: DevConsoleLogLevel;
    message: string;
  }) {
    const entry: DevConsoleLogEntry = {
      id: makeId(),
      kind: input.kind,
      level: input.level,
      message: input.message,
      route: typeof window === "undefined" ? "" : window.location.pathname,
      timestamp: Date.now(),
    };
    this.logs = [entry, ...this.logs].slice(0, MAX_ENTRIES);
    this.notify();
  }

  setViolations(entries: Array<Omit<DevConsoleViolationEntry, "id" | "route" | "timestamp">>) {
    const route = typeof window === "undefined" ? "" : window.location.pathname;
    const timestamp = Date.now();
    this.violations = entries.map((entry) => ({
      ...entry,
      id: makeId(),
      route,
      timestamp,
    }));
    this.notify();
  }

  clearViolations() {
    this.violations = [];
    this.notify();
  }

  setA11yIssues(entries: Array<Omit<DevConsoleA11yEntry, "id" | "route" | "timestamp">>) {
    const route = typeof window === "undefined" ? "" : window.location.pathname;
    const timestamp = Date.now();
    this.a11yIssues = entries.map((entry) => ({
      ...entry,
      id: makeId(),
      route,
      timestamp,
    }));
    this.notify();
  }

  clearA11yIssues() {
    this.a11yIssues = [];
    this.notify();
  }

  clearErrors() {
    this.errors = [];
    this.notify();
  }

  clearNetwork() {
    this.network = [];
    this.notify();
  }

  clearLogs() {
    this.logs = [];
    this.notify();
  }
}

export const devConsoleStore = new DevConsoleStore();
