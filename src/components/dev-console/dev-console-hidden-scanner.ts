import { describeElement } from "./dev-console-dom-utils";
import type { DevConsoleHiddenEntry } from "./dev-console-store";

const DEV_CONSOLE_SELECTOR = ".mnx-dev-panel, .mnx-dev-icon";
const FOCUSABLE_SELECTOR =
  "a[href], button, input, select, textarea, [tabindex]:not([tabindex='-1'])";
const MAX_FINDINGS_PER_REASON = 100;

export type HiddenDraft = Omit<DevConsoleHiddenEntry, "id" | "route" | "timestamp">;
export type HiddenMatch = { element: HTMLElement; draft: HiddenDraft };

function isInsideDevConsole(element: Element): boolean {
  return Boolean(element.closest(DEV_CONSOLE_SELECTOR));
}

function isOffscreen(rect: DOMRect): boolean {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  return rect.right < -1000 || rect.bottom < -1000 || rect.left > vw + 1000 || rect.top > vh + 1000;
}

/** Scans the live page and returns both the serializable findings (for the store) and the live element refs (for reveal). */
export function scanForHiddenElements(): HiddenMatch[] {
  if (typeof document === "undefined") return [];

  const matches: HiddenMatch[] = [];
  const counts: Record<string, number> = {};

  function push(element: HTMLElement, draft: HiddenDraft) {
    const count = (counts[draft.reason] ?? 0) + 1;
    counts[draft.reason] = count;
    if (count > MAX_FINDINGS_PER_REASON) return;
    matches.push({ element, draft });
  }

  const elements = document.body.querySelectorAll<HTMLElement>("*");

  for (const element of elements) {
    if (isInsideDevConsole(element)) continue;
    if (element.closest("template")) continue;

    const style = getComputedStyle(element);

    if (style.display === "none") {
      push(element, {
        reason: "display-none",
        description: `display: none — ${describeElement(element)}`,
      });
      continue;
    }

    if (style.visibility === "hidden" || style.visibility === "collapse") {
      push(element, {
        reason: "visibility-hidden",
        description: `visibility: ${style.visibility} — ${describeElement(element)}`,
      });
    }

    if (Number(style.opacity) === 0) {
      push(element, {
        reason: "zero-opacity",
        description: `opacity: 0 — ${describeElement(element)}`,
      });
    }

    const rect = element.getBoundingClientRect();
    const hasChildren = element.children.length > 0;
    if (!hasChildren && rect.width === 0 && rect.height === 0 && element.textContent?.trim()) {
      push(element, {
        reason: "zero-size",
        description: `Zero-size element with content — ${describeElement(element)}`,
      });
    }

    if (rect.width > 0 && rect.height > 0 && isOffscreen(rect)) {
      push(element, {
        reason: "offscreen",
        description: `Positioned off-screen — ${describeElement(element)}`,
      });
    }

    if (style.clipPath === "inset(100%)" || style.clip === "rect(0px, 0px, 0px, 0px)") {
      push(element, {
        reason: "clipped",
        description: `Visually clipped (may be intentional sr-only) — ${describeElement(element)}`,
      });
    }

    if (element.getAttribute("aria-hidden") === "true" && element.querySelector(FOCUSABLE_SELECTOR)) {
      push(element, {
        reason: "aria-hidden-but-focusable",
        description: `aria-hidden="true" but contains a focusable descendant (keyboard trap) — ${describeElement(element)}`,
      });
    }
  }

  return matches;
}
