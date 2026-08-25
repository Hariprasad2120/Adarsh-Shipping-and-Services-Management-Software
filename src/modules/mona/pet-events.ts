"use client";

export const MONA_PET_ROUTE_EVENT = "mona:pet-route";
export const MONA_PET_NOTIFICATION_EVENT = "mona:pet-notification";
export const MONA_PET_OPEN_SEARCH_EVENT = "mona:pet-open-search";

export type MonaPetRouteDetail = {
  contextLabel: string;
  pathname: string;
};

export type MonaPetNotificationDetail = {
  count: number;
  title: string;
  variant?: string;
};

export function dispatchMonaPetRoute(detail: MonaPetRouteDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(MONA_PET_ROUTE_EVENT, { detail }));
}

export function dispatchMonaPetNotification(detail: MonaPetNotificationDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(MONA_PET_NOTIFICATION_EVENT, { detail }));
}

export function dispatchMonaPetOpenSearch() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(MONA_PET_OPEN_SEARCH_EVENT));
}
