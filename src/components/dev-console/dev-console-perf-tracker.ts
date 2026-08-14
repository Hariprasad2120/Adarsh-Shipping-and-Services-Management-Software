import { devConsoleStore } from "./dev-console-store";

let lastNavStartedAt = 0;

/** Marks the start of a route transition so the next paint can be timed against it. */
export function markRouteChangeStart() {
  lastNavStartedAt = performance.now();
}

/**
 * Times from route-change start to next paint and records it as the route's load ping.
 * Falls back to the page's own navigation timing on first load (no prior mark yet).
 */
export function recordRouteLoadPing(route: string) {
  const startedAt = lastNavStartedAt || navigationStartFallback();
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const loadMs = Math.round(performance.now() - startedAt);
      devConsoleStore.recordRouteTiming({ route, loadMs });
    });
  });
}

function navigationStartFallback(): number {
  const [nav] = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
  return nav ? 0 : performance.now();
}
