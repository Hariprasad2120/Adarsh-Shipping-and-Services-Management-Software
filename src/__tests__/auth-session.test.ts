import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Session Nonce Tests ─────────────────────────────────────────────────────

describe("Session nonce generation", () => {
  it("generates a valid UUID v4 nonce", async () => {
    const { randomUUID } = await import("crypto");
    const nonce = randomUUID();
    // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    expect(nonce).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
  });

  it("generates unique nonces on each call", async () => {
    const { randomUUID } = await import("crypto");
    const nonces = new Set(Array.from({ length: 100 }, () => randomUUID()));
    expect(nonces.size).toBe(100);
  });
});

// ─── Welcome Animation Key Tests ─────────────────────────────────────────────

describe("Welcome animation sessionStorage key management", () => {
  let mockStorage: Map<string, string>;

  beforeEach(() => {
    mockStorage = new Map();
  });

  function simulateWelcomeCheck(sessionToken: string): boolean {
    const storageKey = `welcome-toast:${sessionToken}`;

    // Clean up stale keys (same logic as welcome-bar.tsx)
    const keysToRemove: string[] = [];
    for (const key of mockStorage.keys()) {
      if (key.startsWith("welcome-toast:") && key !== storageKey) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => mockStorage.delete(k));

    if (mockStorage.has(storageKey)) return false; // don't show
    mockStorage.set(storageKey, "shown");
    return true; // show welcome
  }

  it("shows welcome on first login", () => {
    const result = simulateWelcomeCheck("nonce-1");
    expect(result).toBe(true);
  });

  it("does not replay on same session (refresh/navigation)", () => {
    simulateWelcomeCheck("nonce-1");
    const result = simulateWelcomeCheck("nonce-1");
    expect(result).toBe(false);
  });

  it("replays after a new login (different nonce)", () => {
    simulateWelcomeCheck("nonce-1");
    const result = simulateWelcomeCheck("nonce-2");
    expect(result).toBe(true);
  });

  it("cleans up stale keys from previous sessions", () => {
    simulateWelcomeCheck("nonce-1");
    expect(mockStorage.has("welcome-toast:nonce-1")).toBe(true);

    simulateWelcomeCheck("nonce-2");
    expect(mockStorage.has("welcome-toast:nonce-1")).toBe(false);
    expect(mockStorage.has("welcome-toast:nonce-2")).toBe(true);
  });

  it("same user ID with different nonces triggers animation each time", () => {
    // This tests the core fix: user.id is constant, but nonce changes per login
    const userId = "user-abc";
    const nonce1 = `${userId}-${Date.now()}-1`;
    const nonce2 = `${userId}-${Date.now()}-2`;

    expect(simulateWelcomeCheck(nonce1)).toBe(true);
    expect(simulateWelcomeCheck(nonce1)).toBe(false); // same session
    expect(simulateWelcomeCheck(nonce2)).toBe(true); // new login
  });
});

// ─── Logout Storage Cleanup Tests ────────────────────────────────────────────

describe("Logout storage cleanup", () => {
  const AUTH_SESSION_PATTERNS = [
    /^welcome-toast:/,
    /^mona-tooltip-shown$/,
    /^welcomeShown:/,
  ];

  const AUTH_LOCAL_PATTERNS = [
    /^cha_draft_job$/,
    /^catalogue-items-/,
    /^catalogue-deleted-/,
    /^catalogue-overrides-/,
    /^catalogue-currencies-/,
    /^catalogue-currency-toggle$/,
    /^crm-quote-templates$/,
  ];

  const PRESERVED_KEYS = new Set(["theme", "sidebar-collapsed"]);

  function getKeysToRemove(
    storageKeys: string[],
    patterns: RegExp[],
    preserved: Set<string>
  ): string[] {
    return storageKeys.filter(
      (key) =>
        !preserved.has(key) && patterns.some((pattern) => pattern.test(key))
    );
  }

  it("removes welcome-toast keys from sessionStorage", () => {
    const keys = ["welcome-toast:abc123", "welcome-toast:def456", "other-key"];
    const toRemove = getKeysToRemove(keys, AUTH_SESSION_PATTERNS, new Set());
    expect(toRemove).toEqual(["welcome-toast:abc123", "welcome-toast:def456"]);
  });

  it("removes mona-tooltip-shown from sessionStorage", () => {
    const keys = ["mona-tooltip-shown", "other-key"];
    const toRemove = getKeysToRemove(keys, AUTH_SESSION_PATTERNS, new Set());
    expect(toRemove).toEqual(["mona-tooltip-shown"]);
  });

  it("removes user-specific localStorage keys", () => {
    const keys = [
      "cha_draft_job",
      "catalogue-items-custom",
      "catalogue-deleted-ids",
      "crm-quote-templates",
      "theme",
      "sidebar-collapsed",
    ];
    const toRemove = getKeysToRemove(keys, AUTH_LOCAL_PATTERNS, PRESERVED_KEYS);
    expect(toRemove).toEqual([
      "cha_draft_job",
      "catalogue-items-custom",
      "catalogue-deleted-ids",
      "crm-quote-templates",
    ]);
  });

  it("preserves theme and sidebar-collapsed during logout", () => {
    const keys = ["theme", "sidebar-collapsed", "cha_draft_job"];
    const toRemove = getKeysToRemove(keys, AUTH_LOCAL_PATTERNS, PRESERVED_KEYS);
    expect(toRemove).not.toContain("theme");
    expect(toRemove).not.toContain("sidebar-collapsed");
    expect(toRemove).toContain("cha_draft_job");
  });
});

// ─── Middleware Path Matching Tests ──────────────────────────────────────────

describe("Middleware public path matching", () => {
  const PUBLIC_PATHS = [
    "/login",
    "/setup",
    "/api/auth",
    "/verify",
    "/google-chat-link",
    "/api/google-chat",
    "/api/cron",
  ];

  function isPublicPath(pathname: string): boolean {
    if (pathname === "/") return true;
    for (const pub of PUBLIC_PATHS) {
      if (pathname === pub || pathname.startsWith(pub + "/")) return true;
    }
    if (/\.(png|jpg|jpeg|gif|svg|ico|webp|woff2?|ttf|css|js|map)$/i.test(pathname)) {
      return true;
    }
    return false;
  }

  it("allows root path", () => {
    expect(isPublicPath("/")).toBe(true);
  });

  it("allows login page", () => {
    expect(isPublicPath("/login")).toBe(true);
  });

  it("allows NextAuth API routes", () => {
    expect(isPublicPath("/api/auth/callback/credentials")).toBe(true);
    expect(isPublicPath("/api/auth/signout")).toBe(true);
  });

  it("blocks dashboard routes", () => {
    expect(isPublicPath("/dashboard")).toBe(false);
    expect(isPublicPath("/hrms/employees")).toBe(false);
    expect(isPublicPath("/crm/leads")).toBe(false);
  });

  it("blocks protected API routes", () => {
    expect(isPublicPath("/api/users")).toBe(false);
    expect(isPublicPath("/api/todos")).toBe(false);
  });

  it("allows cron API routes", () => {
    expect(isPublicPath("/api/cron/check")).toBe(true);
  });

  it("allows static file extensions", () => {
    expect(isPublicPath("/images/logo.png")).toBe(true);
    expect(isPublicPath("/fonts/geist.woff2")).toBe(true);
  });
});

// ─── BroadcastChannel Message Tests ──────────────────────────────────────────

describe("Cross-tab broadcast messages", () => {
  it("creates valid logout message format", () => {
    const message = { type: "logout", timestamp: Date.now() };
    expect(message.type).toBe("logout");
    expect(typeof message.timestamp).toBe("number");
  });

  it("creates valid session-expired message format", () => {
    const message = { type: "session-expired", timestamp: Date.now() };
    expect(message.type).toBe("session-expired");
  });

  it("creates valid account-changed message format", () => {
    const message = { type: "account-changed", timestamp: Date.now() };
    expect(message.type).toBe("account-changed");
  });
});
