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

export type DashboardAttentionSeverity = "critical" | "warning" | "info";
export type DashboardActionNeededPriority = "critical" | "high" | "normal";

export type DashboardAttentionItem = {
  id: string;
  title: string;
  detail: string;
  href: string;
  source: string;
  severity: DashboardAttentionSeverity;
  createdAt?: string;
};

export type DashboardActionNeededItem = {
  id: string;
  title: string;
  description: string;
  module: string;
  priority: DashboardActionNeededPriority;
  actionLabel: string;
  actionUrl: string;
  dueDate?: string | null;
  status?: string | null;
};

export type DashboardPulseMetric = {
  id: string;
  label: string;
  value: number;
  detail: string;
  href: string;
};

export type DashboardStageCount = {
  id: string;
  label: string;
  value: number;
};

export type DashboardRecentActivityItem = {
  id: string;
  title: string;
  detail: string;
  source: string;
  occurredAt: string;
  href?: string | null;
};

export type DashboardTrendPoint = {
  /** ISO date (yyyy-mm-dd) of the bucket */
  date: string;
  /** short display label, e.g. "Mon 04" */
  label: string;
  value: number;
};

export type DashboardCommandCenterSnapshot = {
  generatedAt: string;
  actionNeededItems: DashboardActionNeededItem[];
  totalActionNeededCount: number;
  attentionItems: DashboardAttentionItem[];
  pulseMetrics: DashboardPulseMetric[];
  appraisalStages: DashboardStageCount[];
  attendanceSignals: DashboardStageCount[];
  recentActivity: DashboardRecentActivityItem[];
  /** per-day notification volume for the current user over the trailing window */
  activityTrend: DashboardTrendPoint[];
};
