import { devConsoleStore } from "./dev-console-store";
import { describeElement } from "./dev-console-dom-utils";

const MEANINGFUL_SELECTOR = 'button, a, [role="button"], [data-testid], [aria-label]';

export function installDevConsoleActionTracker(): () => void {
  if (typeof window === "undefined") return () => {};

  function handleClick(event: MouseEvent) {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest(".mnx-dev-panel, .mnx-dev-icon")) return;

    const meaningful = target.closest(MEANINGFUL_SELECTOR);
    if (!meaningful) return;

    devConsoleStore.recordLog({
      kind: "user-action",
      level: "info",
      message: `Clicked ${describeElement(meaningful)}`,
    });
  }

  document.addEventListener("click", handleClick, { capture: true });
  return () => {
    document.removeEventListener("click", handleClick, { capture: true });
  };
}
