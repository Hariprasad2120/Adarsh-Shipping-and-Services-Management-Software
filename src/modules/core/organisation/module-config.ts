export const TOGGLEABLE_MODULE_SECTION_IDS = [
  "product-catalogue",
  "hrms",
  "attendance",
  "ams",
  "lms",
  "crm",
  "communication",
  "expense",
  "cha",
  "accounting",
  "recruit",
] as const;

export const ALWAYS_ENABLED_SECTION_IDS = [
  "dashboard",
  "todo",
  "notifications",
  "admin",
] as const;

export type ToggleableModuleSectionId = (typeof TOGGLEABLE_MODULE_SECTION_IDS)[number];
export type AlwaysEnabledSectionId = (typeof ALWAYS_ENABLED_SECTION_IDS)[number];
export type ManagedModuleSectionId = ToggleableModuleSectionId | AlwaysEnabledSectionId;

export type ModuleControlItem = {
  id: ToggleableModuleSectionId;
  label: string;
  description: string;
};

export const MODULE_CONTROL_ITEMS: readonly ModuleControlItem[] = [
  { id: "product-catalogue", label: "Product Catalogue", description: "Interactive catalogue and technical manual pages." },
  { id: "hrms", label: "HRMS", description: "Employees, onboarding, letters, payroll, and people operations." },
  { id: "attendance", label: "Attendance", description: "Punching, leaves, OT, timesheets, and attendance reports." },
  { id: "ams", label: "AMS", description: "Appraisals, cycles, criteria, increments, and performance workflows." },
  { id: "lms", label: "LMS", description: "Courses, learning progress, assignments, and reporting." },
  { id: "crm", label: "CRM", description: "Sales, pipeline, leads, quotes, products, and customer workspaces." },
  { id: "communication", label: "Communication", description: "Mail, chat, calendar, meetings, files, docs, and forms." },
  { id: "expense", label: "Expense", description: "Expense workspace access from the primary navigation." },
  { id: "cha", label: "CHA", description: "Custom house agent jobs, approvals, expenses, reports, and settings." },
  { id: "accounting", label: "Accounting", description: "Ledgers, journals, invoices, payment entries, and reports." },
  { id: "recruit", label: "Recruit", description: "Employer and job-seeker recruiting workspaces." },
] as const;

const TOGGLEABLE_MODULE_SET = new Set<string>(TOGGLEABLE_MODULE_SECTION_IDS);

const MANAGED_ROUTE_PREFIXES: Array<{ prefix: string; sectionId: ToggleableModuleSectionId }> = [
  { prefix: "/product-catalogue", sectionId: "product-catalogue" },
  { prefix: "/hrms/recruit", sectionId: "recruit" },
  { prefix: "/hrms", sectionId: "hrms" },
  { prefix: "/attendance", sectionId: "attendance" },
  { prefix: "/ams", sectionId: "ams" },
  { prefix: "/lms", sectionId: "lms" },
  { prefix: "/crm", sectionId: "crm" },
  { prefix: "/communication", sectionId: "communication" },
  { prefix: "/expense", sectionId: "expense" },
  { prefix: "/cha", sectionId: "cha" },
  { prefix: "/accounting", sectionId: "accounting" },
] as const;

export function isSectionEnabled(
  sectionId: string,
  enabledModuleIds?: Iterable<string>,
) {
  if (ALWAYS_ENABLED_SECTION_IDS.includes(sectionId as AlwaysEnabledSectionId)) return true;
  if (!TOGGLEABLE_MODULE_SET.has(sectionId)) return true;
  if (!enabledModuleIds) return true;

  const enabledSet = enabledModuleIds instanceof Set ? enabledModuleIds : new Set(enabledModuleIds);
  return enabledSet.has(sectionId);
}

export function getManagedModuleSectionIdForPath(pathname: string) {
  for (const route of MANAGED_ROUTE_PREFIXES) {
    if (pathname === route.prefix || pathname.startsWith(`${route.prefix}/`)) {
      return route.sectionId;
    }
  }

  return null;
}
