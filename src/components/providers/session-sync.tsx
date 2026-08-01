"use client";

import { useEffect } from "react";
import { handleRemoteLogout } from "@/lib/logout";

const CHANNEL_NAME = "monolith-auth";

/**
 * Invisible client component that synchronizes authentication events
 * across browser tabs using BroadcastChannel API.
 *
 * When one tab logs out, this component ensures all other tabs
 * also clear their state and redirect to the login page.
 */
export function SessionSync() {
  useEffect(() => {
    let channel: BroadcastChannel | null = null;

    try {
      channel = new BroadcastChannel(CHANNEL_NAME);

      channel.onmessage = (event) => {
        const { type } = event.data ?? {};

        switch (type) {
          case "logout":
          case "session-expired":
          case "account-changed":
            // Another tab triggered logout — clean up and redirect
            handleRemoteLogout();
            break;
        }
      };
    } catch {
      // BroadcastChannel not supported — fall back to storage event
      const handleStorage = (e: StorageEvent) => {
        if (e.key === "__auth_event" && e.newValue) {
          try {
            const data = JSON.parse(e.newValue);
            if (
              data.type === "logout" ||
              data.type === "session-expired" ||
              data.type === "account-changed"
            ) {
              handleRemoteLogout();
            }
          } catch {
            // Invalid JSON — ignore
          }
        }
      };

      window.addEventListener("storage", handleStorage);

      return () => {
        window.removeEventListener("storage", handleStorage);
      };
    }

    return () => {
      channel?.close();
    };
  }, []);

  return null;
}
