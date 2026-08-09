import { devConsoleStore, type DevConsoleLogLevel } from "./dev-console-store";

const SENSITIVE_KEY_PATTERN = /token|secret|password|apikey|api_key|auth/i;
const MAX_MESSAGE_LENGTH = 500;

function redactValue(value: unknown, seen = new WeakSet<object>()): unknown {
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) return "[circular]";
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item, seen));
  }

  const redacted: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    redacted[key] = SENSITIVE_KEY_PATTERN.test(key) ? "[redacted]" : redactValue(val, seen);
  }
  return redacted;
}

function serializeArg(arg: unknown): string {
  if (typeof arg === "string") return arg;
  if (arg instanceof Error) return arg.message;
  if (typeof arg === "object" && arg !== null) {
    try {
      return JSON.stringify(redactValue(arg));
    } catch {
      return String(arg);
    }
  }
  return String(arg);
}

function formatArgs(args: unknown[]): string {
  return args.map(serializeArg).join(" ").slice(0, MAX_MESSAGE_LENGTH);
}

type ConsoleMethod = "log" | "info" | "warn" | "error";

const LEVEL_BY_METHOD: Record<ConsoleMethod, DevConsoleLogLevel> = {
  log: "debug",
  info: "info",
  warn: "warning",
  error: "error",
};

let originals: Partial<Record<ConsoleMethod, (...args: unknown[]) => void>> = {};

export function installDevConsoleConsoleInterceptor(): () => void {
  if (typeof window === "undefined") return () => {};

  const methods: ConsoleMethod[] = ["log", "info", "warn", "error"];

  for (const method of methods) {
    originals[method] = console[method].bind(console);
    console[method] = (...args: unknown[]) => {
      originals[method]!(...args);
      devConsoleStore.recordLog({
        kind: "console",
        level: LEVEL_BY_METHOD[method],
        message: formatArgs(args),
      });
    };
  }

  return () => {
    for (const method of methods) {
      if (originals[method]) {
        console[method] = originals[method]!;
      }
    }
    originals = {};
  };
}
