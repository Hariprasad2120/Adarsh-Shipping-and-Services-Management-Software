import { devConsoleStore } from "./dev-console-store";

const SENSITIVE_QUERY_PARAM_PATTERN = /token|secret|password|apikey|api_key|auth/i;

function sanitizeUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl, window.location.origin);
    for (const key of Array.from(parsed.searchParams.keys())) {
      if (SENSITIVE_QUERY_PARAM_PATTERN.test(key)) {
        parsed.searchParams.set(key, "[redacted]");
      }
    }
    return parsed.toString();
  } catch {
    return rawUrl;
  }
}

function urlFromInput(input: RequestInfo | URL): string {
  const raw = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  return sanitizeUrl(raw);
}

function methodFromInput(input: RequestInfo | URL, init?: RequestInit): string {
  if (init?.method) return init.method.toUpperCase();
  if (typeof input !== "string" && !(input instanceof URL) && input.method) {
    return input.method.toUpperCase();
  }
  return "GET";
}

let originalFetch: typeof window.fetch | null = null;
let originalXhrOpen: typeof XMLHttpRequest.prototype.open | null = null;
let originalXhrSend: typeof XMLHttpRequest.prototype.send | null = null;

export function installDevConsoleNetworkInterceptor(): () => void {
  if (typeof window === "undefined") return () => {};

  originalFetch = window.fetch.bind(window);
  const patchedFetch: typeof window.fetch = async (input, init) => {
    const method = methodFromInput(input, init);
    const url = urlFromInput(input);
    const startedAt = Date.now();

    try {
      const response = await originalFetch!(input, init);
      devConsoleStore.recordNetworkCall({
        method,
        url,
        status: response.status,
        ok: response.ok,
        durationMs: Date.now() - startedAt,
        startedAt,
        failed: false,
      });
      return response;
    } catch (error) {
      devConsoleStore.recordNetworkCall({
        method,
        url,
        status: null,
        ok: false,
        durationMs: Date.now() - startedAt,
        startedAt,
        failed: true,
        failureReason: error instanceof Error ? error.message : "Network request failed",
      });
      throw error;
    }
  };
  window.fetch = patchedFetch;

  originalXhrOpen = XMLHttpRequest.prototype.open;
  originalXhrSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function patchedOpen(
    this: XMLHttpRequest & { __devConsoleMethod?: string; __devConsoleUrl?: string },
    method: string,
    url: string | URL,
    ...rest: unknown[]
  ) {
    this.__devConsoleMethod = method.toUpperCase();
    this.__devConsoleUrl = sanitizeUrl(typeof url === "string" ? url : url.toString());
    return (originalXhrOpen as unknown as (...args: unknown[]) => void).apply(this, [
      method,
      url,
      ...rest,
    ]);
  } as typeof XMLHttpRequest.prototype.open;

  XMLHttpRequest.prototype.send = function patchedSend(
    this: XMLHttpRequest & { __devConsoleMethod?: string; __devConsoleUrl?: string },
    ...args: unknown[]
  ) {
    const startedAt = Date.now();
    const method = this.__devConsoleMethod ?? "GET";
    const url = this.__devConsoleUrl ?? "";

    const handleDone = () => {
      devConsoleStore.recordNetworkCall({
        method,
        url,
        status: this.status || null,
        ok: this.status >= 200 && this.status < 400,
        durationMs: Date.now() - startedAt,
        startedAt,
        failed: this.status === 0,
      });
    };

    this.addEventListener("loadend", handleDone, { once: true });
    return (originalXhrSend as unknown as (...args: unknown[]) => void).apply(this, args);
  } as typeof XMLHttpRequest.prototype.send;

  return () => {
    if (originalFetch) window.fetch = originalFetch;
    if (originalXhrOpen) XMLHttpRequest.prototype.open = originalXhrOpen;
    if (originalXhrSend) XMLHttpRequest.prototype.send = originalXhrSend;
  };
}

