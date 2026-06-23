"use client";

import { performLogout } from "@/lib/logout";

/**
 * Global fetch wrapper for client-side API calls.
 * Intercepts 401 responses and triggers centralized logout.
 *
 * Usage:
 *   import { fetchWithAuth } from "@/lib/fetch-with-auth";
 *   const res = await fetchWithAuth("/api/some-endpoint");
 */
export async function fetchWithAuth(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const response = await fetch(input, init);

  if (response.status === 401) {
    // Session has expired or been revoked — trigger full logout
    // Use setTimeout to allow the current call stack to unwind
    setTimeout(() => {
      performLogout();
    }, 0);
  }

  return response;
}
