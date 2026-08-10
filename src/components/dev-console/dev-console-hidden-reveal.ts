const REVEAL_CLASS = "mnx-dev-hidden-revealed";

type RestoreEntry = {
  element: HTMLElement;
  display: string;
  visibility: string;
  opacity: string;
  clipPath: string;
  clip: string;
};

let revealed: RestoreEntry[] = [];

export function isRevealActive(): boolean {
  return revealed.length > 0;
}

export function revealHiddenElements(elements: HTMLElement[]) {
  restoreHiddenElements();

  const seen = new Set<HTMLElement>();
  for (const element of elements) {
    if (seen.has(element)) continue;
    seen.add(element);

    revealed.push({
      element,
      display: element.style.display,
      visibility: element.style.visibility,
      opacity: element.style.opacity,
      clipPath: element.style.clipPath,
      clip: element.style.clip,
    });

    element.style.setProperty("display", "revert", "important");
    element.style.setProperty("visibility", "visible", "important");
    element.style.setProperty("opacity", "1", "important");
    element.style.setProperty("clip-path", "none", "important");
    element.style.setProperty("clip", "auto", "important");
    element.classList.add(REVEAL_CLASS);
  }
}

export function restoreHiddenElements() {
  for (const entry of revealed) {
    entry.element.style.display = entry.display;
    entry.element.style.visibility = entry.visibility;
    entry.element.style.opacity = entry.opacity;
    entry.element.style.clipPath = entry.clipPath;
    entry.element.style.clip = entry.clip;
    entry.element.classList.remove(REVEAL_CLASS);
  }
  revealed = [];
}
