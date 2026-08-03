export function createStableId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function flattenFormErrors(errors: Record<string, unknown>) {
  const flattened: Partial<Record<string, string>> = {};
  for (const [key, value] of Object.entries(errors)) {
    if (value && typeof value === "object" && "message" in value && typeof value.message === "string") {
      flattened[key] = value.message;
    }
  }
  return flattened;
}

export function confirmDelete(message: string) {
  return window.confirm(message);
}
