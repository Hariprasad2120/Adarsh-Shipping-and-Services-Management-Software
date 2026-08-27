import type {
  HowToGuide,
  ModuleInfo,
  StaticFaq,
} from "./knowledge-base";
import type { MonaCitation, MonaContext } from "./types";

const TOOL_CITATION_MAP: Record<
  string,
  { detail: string; href?: string; label: string }
> = {
  getMyProfile: {
    label: "Live employee profile",
    detail: "Live profile data from your Monolith user and HR profile records.",
  },
  getMyAttendance: {
    label: "Live attendance records",
    detail: "Live attendance punch data from your recent Monolith attendance records.",
    href: "/attendance/punch",
  },
  getMyLeaves: {
    label: "Live leave balances",
    detail: "Live leave balances and pending leave requests from the attendance workspace.",
    href: "/attendance/leaves",
  },
  getMyTasks: {
    label: "Live task queues",
    detail: "Live To-Do and HRMS assigned task data from your current workspace.",
    href: "/todo",
  },
  getMyNotifications: {
    label: "Live notifications",
    detail: "Live recent notifications and unread counts from your Monolith notification feed.",
    href: "/notifications",
  },
  getMyHrCases: {
    label: "Live support cases",
    detail: "Live HR support case data from your help desk records.",
    href: "/hrms/helpdesk",
  },
  searchEmployees: {
    label: "Live employee directory",
    detail: "Live employee directory matches filtered from current HRMS records.",
    href: "/hrms/employees",
  },
  getEmployeeCount: {
    label: "Live employee counts",
    detail: "Live active employee counts from Monolith HRMS records.",
    href: "/hrms/employees",
  },
  getCrmLeadsSummary: {
    label: "Live CRM leads",
    detail: "Live CRM lead counts, statuses, and recent records from your organization workspace.",
    href: "/crm/leads",
  },
  getCrmDealsSummary: {
    label: "Live CRM deals",
    detail: "Live deal pipeline stages and top-value records from your CRM workspace.",
    href: "/crm/deals",
  },
  getCrmEnquiriesSummary: {
    label: "Live CRM enquiries",
    detail: "Live service enquiry workflow statuses and recent enquiry activity from your CRM workspace.",
    href: "/crm/enquiries",
  },
  getCrmQuotesSummary: {
    label: "Live CRM quotations",
    detail: "Live quotation approval and value summaries from the CRM quotes workspace.",
    href: "/crm/quotes",
  },
  getCustomerWorthPursuing: {
    label: "Live CRM pursuit intelligence",
    detail: "Cross-module prioritization built from live CRM deal, lead, reminder, and quotation signals.",
    href: "/crm",
  },
  getQuoteFollowUpPriorities: {
    label: "Live quote follow-up priorities",
    detail: "Cross-module ranking of quotation follow-up urgency using live CRM approval, SLA, and value signals.",
    href: "/crm/quotes",
  },
  getTeamAttendanceSummary: {
    label: "Live team attendance",
    detail: "Live organization attendance summary from current attendance punch records.",
    href: "/attendance/reports",
  },
  getLetterTemplates: {
    label: "Live HR letter templates",
    detail: "Live HR letter template definitions currently available in Monolith.",
    href: "/hrms/letters",
  },
  getCommunicationSummary: {
    label: "Live communication audit",
    detail: "Live communication workspace audit activity from recent mail and chat actions.",
    href: "/communication",
  },
  getAccountingSummary: {
    label: "Live accounting records",
    detail: "Live accounting document and payment status summaries from the finance workspace.",
    href: "/accounting",
  },
  getChaJobsSummary: {
    label: "Live CHA operations",
    detail: "Live CHA job stage and priority summaries from the operations workspace.",
    href: "/cha/jobs",
  },
  getJobRiskOverview: {
    label: "Live job risk overview",
    detail: "Cross-module job risk synthesis using live CHA job stage, priority, customer, and query activity signals.",
    href: "/cha/jobs",
  },
  getOutstandingPaymentRelationshipSummary: {
    label: "Live receivables relationship summary",
    detail: "Cross-module receivables and CRM relationship synthesis using live accounting sales invoice and open-deal signals.",
    href: "/accounting",
  },
  getProactiveInsights: {
    label: "Live proactive signals",
    detail: "Live task, notification, case, and approval signals computed from your current workspace data.",
  },
};

export function createGuideCitation(guide: HowToGuide): MonaCitation {
  return {
    id: `guide:${guide.title.toLowerCase().replace(/\s+/g, "-")}`,
    kind: "guide",
    label: guide.title,
    detail: "Monolith workflow guide",
    href: normalizePath(guide.path),
  };
}

export function createFaqCitation(faq: StaticFaq): MonaCitation {
  return {
    id: `faq:${faq.question.toLowerCase().replace(/\s+/g, "-")}`,
    kind: "faq",
    label: faq.question,
    detail: "Monolith FAQ entry",
  };
}

export function createModuleCitation(moduleInfo: ModuleInfo): MonaCitation {
  return {
    id: `module:${moduleInfo.name.toLowerCase().replace(/\s+/g, "-")}`,
    kind: "module",
    label: moduleInfo.name,
    detail: "Monolith module reference",
    href: normalizePath(moduleInfo.path),
  };
}

export function createDocumentCitation(params: {
  detail: string;
  href?: string;
  id: string;
  label: string;
}): MonaCitation {
  return {
    id: params.id,
    kind: "document",
    label: params.label,
    detail: params.detail,
    href: params.href,
  };
}

export function createToolCitations(
  toolNames: string[],
  ctx: MonaContext,
): MonaCitation[] {
  const uniqueTools = [...new Set(toolNames)];

  return uniqueTools
    .flatMap((toolName) => {
      const config = TOOL_CITATION_MAP[toolName];
      if (!config) return [];
      return [{
        id: `tool:${toolName}`,
        kind: "tool" as const,
        label: config.label,
        detail: config.detail,
        href: config.href ?? ctx.currentPath,
      }];
    })
    .slice(0, 3);
}

function normalizePath(path: string | undefined) {
  if (!path) return undefined;
  return path.replace(/\*/g, "");
}
