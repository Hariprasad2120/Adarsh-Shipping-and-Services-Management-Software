"use client";

import { signOut } from "next-auth/react";

// ─── BroadcastChannel for cross-tab sync ─────────────────────────────────────

const LOGOUT_CHANNEL = "monolith-auth";

/**
 * Broadcast a message to all other open tabs.
 * Wrapped in try/catch for environments where BroadcastChannel is unavailable.
 */
function broadcast(type: "logout" | "session-expired" | "account-changed") {
  try {
    const channel = new BroadcastChannel(LOGOUT_CHANNEL);
    channel.postMessage({ type, timestamp: Date.now() });
    channel.close();
  } catch {
    // BroadcastChannel not supported — fall back to storage event
    try {
      window.localStorage.setItem(
        "__auth_event",
        JSON.stringify({ type, timestamp: Date.now() })
      );
      // Clean up immediately — storage event fires on change
      window.localStorage.removeItem("__auth_event");
    } catch {
      // Storage also unavailable — single tab only
    }
  }
}

// ─── Storage Cleanup ─────────────────────────────────────────────────────────

/** Keys that should survive logout (user preferences, not user data) */
const PRESERVED_KEYS = new Set(["theme", "sidebar-collapsed"]);

/** Patterns for keys that must be cleared on logout */
const AUTH_SESSION_STORAGE_PATTERNS = [
  /^welcome-toast:/,
  /^mona-tooltip-shown$/,
  /^welcomeShown:/,
];

const AUTH_LOCAL_STORAGE_PATTERNS = [
  /^cha_draft_job$/,
  /^catalogue-items-/,
  /^catalogue-deleted-/,
  /^catalogue-overrides-/,
  /^catalogue-currencies-/,
  /^catalogue-currency-toggle$/,
  /^crm-quote-templates$/,
];

function clearAuthSessionStorage() {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.sessionStorage.length; i++) {
      const key = window.sessionStorage.key(i);
      if (
        key &&
        AUTH_SESSION_STORAGE_PATTERNS.some((pattern) => pattern.test(key))
      ) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => window.sessionStorage.removeItem(key));
  } catch {
    // sessionStorage not available
  }
}

function clearAuthLocalStorage() {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (
        key &&
        !PRESERVED_KEYS.has(key) &&
        AUTH_LOCAL_STORAGE_PATTERNS.some((pattern) => pattern.test(key))
      ) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // localStorage not available
  }
}

// ─── Centralized Logout ──────────────────────────────────────────────────────

/**
 * Performs a complete, secure logout:
 * 1. Clears session-specific sessionStorage (welcome animation markers, etc.)
 * 2. Clears user-specific localStorage (drafts, cached data)
 * 3. Broadcasts logout to other tabs via BroadcastChannel
 * 4. Calls NextAuth signOut to invalidate the JWT cookie server-side
 * 5. Forces a full-page navigation to /login (not a client-side router push)
 *
 * This function should be the ONLY way logout happens in the app.
 */
export async function performLogout() {
  // 1. Clear client-side storage
  clearAuthSessionStorage();
  clearAuthLocalStorage();

  // 2. Notify other tabs
  broadcast("logout");

  // 3. Server-side signout (hits NextAuth endpoint, which triggers events.signOut)
  try {
    await signOut({ redirect: false });
  } catch {
    // Even if signOut fails, we still clear local state and redirect
  }

  // 4. Full navigation to login (not router.push — we want a clean page load)
  window.location.replace("/login");
}

/**
 * Handle a logout event received from another tab.
 * Clears local state and redirects without calling signOut again
 * (the originating tab already handled the server-side signout).
 */
export function handleRemoteLogout() {
  clearAuthSessionStorage();
  clearAuthLocalStorage();
  window.location.replace("/login");
}

/**
 * Clear stale session data that may belong to a different user.
 * Call this on login success, before navigating to the dashboard.
 */
export function clearStaleSessionData() {
  clearAuthSessionStorage();
  clearAuthLocalStorage();
}
