const APP_EDITIONS = ["full", "cha"] as const;

export type AppEdition = (typeof APP_EDITIONS)[number];

const CHA_VISIBLE_NAV_SECTIONS = new Set([
  "dashboard",
  "todo",
  "notifications",
  "cha",
  "admin",
]);

const CHA_BLOCKED_ROUTE_PREFIXES = [
  "/accounting",
  "/ams",
  "/attendance",
  "/communication",
  "/crm",
  "/expense",
  "/hrms",
  "/lms",
  "/product-catalogue",
];

const CHA_BLOCKED_API_PREFIXES = [
  "/api/google-chat",
  "/api/hrms",
  "/api/recruit",
];

function normalizeEdition(value: string | undefined): AppEdition {
  const normalized = value?.trim().toLowerCase();
  return APP_EDITIONS.includes(normalized as AppEdition) ? (normalized as AppEdition) : "full";
}

export function getAppEdition(): AppEdition {
  return normalizeEdition(process.env.APP_EDITION);
}

export function isChaEdition() {
  return getAppEdition() === "cha";
}

export function isNavSectionEnabled(sectionId: string) {
  if (!isChaEdition()) return true;
  return CHA_VISIBLE_NAV_SECTIONS.has(sectionId);
}

export function isBlockedRoutePath(pathname: string) {
  if (!isChaEdition()) return false;
  return CHA_BLOCKED_ROUTE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function isBlockedApiPath(pathname: string) {
  if (!isChaEdition()) return false;
  return CHA_BLOCKED_API_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
