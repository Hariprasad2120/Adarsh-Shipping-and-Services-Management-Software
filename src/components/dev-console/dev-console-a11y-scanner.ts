import { describeElement } from "./dev-console-dom-utils";
import type { DevConsoleA11yEntry } from "./dev-console-store";

const DEV_CONSOLE_SELECTOR = ".mnx-dev-panel, .mnx-dev-icon";

type A11yDraft = Omit<DevConsoleA11yEntry, "id" | "route" | "timestamp">;

function isInsideDevConsole(element: Element): boolean {
  return Boolean(element.closest(DEV_CONSOLE_SELECTOR));
}

function hasAccessibleName(element: Element): boolean {
  if (element.getAttribute("aria-label")?.trim()) return true;
  if (element.getAttribute("aria-labelledby")?.trim()) return true;
  if (element.textContent?.trim()) return true;
  if (element.getAttribute("title")?.trim()) return true;
  return false;
}

function checkImageAlt(element: Element): A11yDraft | null {
  if (isInsideDevConsole(element)) return null;
  if (element.hasAttribute("alt")) return null;

  return {
    type: "missing-alt",
    severity: "warning",
    description: `<img> missing alt attribute: ${describeElement(element)}`,
  };
}

function checkUnlabeledControl(element: Element): A11yDraft | null {
  if (isInsideDevConsole(element)) return null;
  if (hasAccessibleName(element)) return null;

  return {
    type: "unlabeled-control",
    severity: "warning",
    description: `<${element.tagName.toLowerCase()}> has no accessible name: ${describeElement(element)}`,
  };
}

function checkFormLabel(element: Element): A11yDraft | null {
  if (isInsideDevConsole(element)) return null;
  if (element instanceof HTMLInputElement && element.type === "hidden") return null;

  if (element.getAttribute("aria-label")?.trim()) return null;
  if (element.getAttribute("aria-labelledby")?.trim()) return null;
  if (element.closest("label")) return null;

  const id = element.getAttribute("id");
  if (id && document.querySelector(`label[for="${CSS.escape(id)}"]`)) return null;

  return {
    type: "missing-form-label",
    severity: "warning",
    description: `<${element.tagName.toLowerCase()}> has no associated label: ${describeElement(element)}`,
  };
}

function checkAriaRef(element: Element): A11yDraft[] {
  if (isInsideDevConsole(element)) return [];
  const findings: A11yDraft[] = [];

  for (const attr of ["aria-labelledby", "aria-describedby"] as const) {
    const value = element.getAttribute(attr);
    if (!value) continue;

    for (const refId of value.split(/\s+/).filter(Boolean)) {
      if (!document.getElementById(refId)) {
        findings.push({
          type: "invalid-aria-ref",
          severity: "warning",
          description: `${attr}="${refId}" does not reference an existing element: ${describeElement(element)}`,
        });
      }
    }
  }

  return findings;
}

export function scanForA11yIssues(): A11yDraft[] {
  if (typeof document === "undefined") return [];

  const findings: A11yDraft[] = [];

  for (const img of document.querySelectorAll("img")) {
    const finding = checkImageAlt(img);
    if (finding) findings.push(finding);
  }

  for (const control of document.querySelectorAll("button, a")) {
    const finding = checkUnlabeledControl(control);
    if (finding) findings.push(finding);
  }

  for (const field of document.querySelectorAll("input, select, textarea")) {
    const finding = checkFormLabel(field);
    if (finding) findings.push(finding);
  }

  for (const el of document.querySelectorAll("[aria-labelledby], [aria-describedby]")) {
    findings.push(...checkAriaRef(el));
  }

  const idCounts = new Map<string, Element[]>();
  for (const el of document.querySelectorAll("[id]")) {
    if (isInsideDevConsole(el)) continue;
    const id = el.getAttribute("id")!;
    const bucket = idCounts.get(id) ?? [];
    bucket.push(el);
    idCounts.set(id, bucket);
  }
  for (const [id, elements] of idCounts) {
    if (elements.length > 1) {
      findings.push({
        type: "duplicate-id",
        severity: "warning",
        description: `id="${id}" is used on ${elements.length} elements (first: ${describeElement(elements[0])})`,
      });
    }
  }

  return findings;
}
