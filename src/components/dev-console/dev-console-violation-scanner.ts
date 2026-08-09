import { describeElement } from "./dev-console-dom-utils";
import type { DevConsoleViolationEntry } from "./dev-console-store";

const RAW_BUTTON_CLASS_PATTERN = /\bmnx-button/;
const RAW_INPUT_CLASS_PATTERN = /\bmnx-(field|choice|range)-control\b|\bmnx-managed-input\b/;
const RAW_COLOR_PATTERN = /(#[0-9a-fA-F]{3,8}\b)|(rgba?\([^)]*\))/;
const VAR_WRAPPED_COLOR_PATTERN = /var\(--[^)]*\)/;
const DEV_CONSOLE_SELECTOR = ".mnx-dev-panel, .mnx-dev-icon";

type ViolationDraft = Omit<DevConsoleViolationEntry, "id" | "route" | "timestamp">;

function isInsideDevConsole(element: Element): boolean {
  return Boolean(element.closest(DEV_CONSOLE_SELECTOR));
}

function checkButton(element: Element): ViolationDraft | null {
  if (isInsideDevConsole(element)) return null;
  const hasVariantAttr = element.hasAttribute("data-variant");
  const hasButtonClass = RAW_BUTTON_CLASS_PATTERN.test(element.className.toString());
  if (hasVariantAttr || hasButtonClass) return null;

  return {
    type: "raw-button",
    severity: "warning",
    description: `Raw <button> not using shared Button component: ${describeElement(element)}`,
  };
}

function checkInput(element: Element): ViolationDraft | null {
  if (isInsideDevConsole(element)) return null;
  const hasControlClass = RAW_INPUT_CLASS_PATTERN.test(element.className.toString());
  if (hasControlClass) return null;

  return {
    type: "raw-input",
    severity: "warning",
    description: `Raw <${element.tagName.toLowerCase()}> not using shared Input component: ${describeElement(element)}`,
  };
}

function checkInlineColor(element: Element): ViolationDraft | null {
  if (isInsideDevConsole(element)) return null;
  const styleAttr = element.getAttribute("style");
  if (!styleAttr) return null;

  const withoutVarRefs = styleAttr.replace(VAR_WRAPPED_COLOR_PATTERN, "");
  if (!RAW_COLOR_PATTERN.test(withoutVarRefs)) return null;

  return {
    type: "inline-color",
    severity: "info",
    description: `Inline style with a raw color literal: ${describeElement(element)}`,
  };
}

export function scanForViolations(): ViolationDraft[] {
  if (typeof document === "undefined") return [];

  const findings: ViolationDraft[] = [];

  for (const button of document.querySelectorAll("button")) {
    const finding = checkButton(button);
    if (finding) findings.push(finding);
  }

  for (const input of document.querySelectorAll("input, select, textarea")) {
    const finding = checkInput(input);
    if (finding) findings.push(finding);
  }

  for (const styled of document.querySelectorAll("[style]")) {
    const finding = checkInlineColor(styled);
    if (finding) findings.push(finding);
  }

  return findings;
}
