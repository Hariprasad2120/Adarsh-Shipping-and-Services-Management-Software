type Listener = () => void;

const labels = new Map<string, string>();
const listeners = new Set<Listener>();
let cachedSnapshot: Record<string, string> = {};

export function setBreadcrumbLabel(segment: string, label: string) {
  if (labels.get(segment) === label) return;
  labels.set(segment, label);
  cachedSnapshot = Object.fromEntries(labels);
  listeners.forEach((l) => l());
}

export function getBreadcrumbLabels(): Record<string, string> {
  return cachedSnapshot;
}

export function subscribeBreadcrumb(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
