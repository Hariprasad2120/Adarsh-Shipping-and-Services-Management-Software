const MAX_TEXT_LENGTH = 60;

export function describeElement(element: Element): string {
  const tag = element.tagName.toLowerCase();
  const ariaLabel = element.getAttribute("aria-label");
  const testId = element.getAttribute("data-testid");
  const text = element.textContent?.trim().replace(/\s+/g, " ").slice(0, MAX_TEXT_LENGTH);
  const href = element instanceof HTMLAnchorElement ? element.getAttribute("href") : null;

  const parts = [`<${tag}>`];
  if (ariaLabel) parts.push(`aria-label="${ariaLabel}"`);
  else if (text) parts.push(`"${text}"`);
  if (testId) parts.push(`data-testid="${testId}"`);
  if (href) parts.push(`-> ${href}`);

  return parts.join(" ");
}
