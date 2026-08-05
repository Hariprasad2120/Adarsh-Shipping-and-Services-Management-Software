import type { ToggleableModuleSectionId } from "@/modules/core/organisation/module-config";

export type DashboardModuleId = ToggleableModuleSectionId;

export type DashboardModuleIcon =
  | "accounting"
  | "ams"
  | "attendance"
  | "cha"
  | "communication"
  | "crm"
  | "expense"
  | "freight-forwarding"
  | "hrms"
  | "lms"
  | "product-catalogue"
  | "recruit";

export type DashboardModuleTone = "neutral" | "info" | "success" | "warning";

export type DashboardModuleMetric = {
  label: string;
  value: number;
};

export type DashboardModuleAction = {
  label: string;
  href: string;
};

export type DashboardModuleSummary = {
  id: DashboardModuleId;
  title: string;
  eyebrow: string;
  description: string;
  href: string;
  icon: DashboardModuleIcon;
  tone: DashboardModuleTone;
  primaryMetric: {
    label: string;
    value: number;
    detail: string;
  };
  supportingMetrics: DashboardModuleMetric[];
  actions: DashboardModuleAction[];
  available: boolean;
};

export type DashboardModuleSnapshot = {
  modules: DashboardModuleSummary[];
  generatedAt: string;
};
