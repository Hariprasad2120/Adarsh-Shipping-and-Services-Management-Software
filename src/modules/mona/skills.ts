import type { MonaContext } from "./types";

type MonaSkillRouteModule =
  | "dashboard"
  | "crm"
  | "communication"
  | "hrms"
  | "attendance"
  | "accounting"
  | "cha"
  | "payroll";

type MonaEntityKind = NonNullable<MonaContext["entity"]>["kind"];

export type MonaSkillId =
  | "dashboard_personal_work"
  | "cross_module_intelligence"
  | "crm_workspace"
  | "enquiry_workspace"
  | "quotation_workspace"
  | "communication_workspace"
  | "hrms_workspace"
  | "accounting_read_only"
  | "payroll_read_only"
  | "jobs_operations";

export type MonaSkillSpec = {
  contextRequirements: {
    entityKinds?: MonaEntityKind[];
    routeModules?: MonaSkillRouteModule[];
    routePrefixes?: string[];
  };
  description: string;
  id: MonaSkillId;
  intentKeywords: string[];
  label: string;
  preferredToolNames: string[];
};

export type MonaSkillSelection = {
  allowedToolNames: string[];
  reason:
    | "entity_match"
    | "intent_match"
    | "route_default"
    | "route_prefix_match";
  skill: MonaSkillSpec;
};

const MONA_SKILLS: MonaSkillSpec[] = [
  {
    id: "dashboard_personal_work",
    label: "Dashboard / Personal Work",
    description:
      "Personal work triage across tasks, notifications, attendance, leave, support cases, and proactive signals.",
    intentKeywords: [
      "my work",
      "tasks",
      "todo",
      "to-do",
      "notifications",
      "attendance",
      "leave",
      "profile",
      "helpdesk",
      "case",
      "cases",
      "attention",
    ],
    preferredToolNames: [
      "getMyProfile",
      "getMyAttendance",
      "getMyLeaves",
      "getMyTasks",
      "getMyNotifications",
      "getMyHrCases",
      "getProactiveInsights",
      "proposeCreateTask",
      "proposeCreateReminder",
    ],
    contextRequirements: {
      routeModules: ["dashboard", "attendance", "hrms"],
      routePrefixes: ["/dashboard", "/todo", "/notifications"],
    },
  },
  {
    id: "cross_module_intelligence",
    label: "Cross-Module Intelligence",
    description:
      "Synthesized operational intelligence across CRM, accounting, quotations, and jobs with permission-safe prioritization.",
    intentKeywords: [
      "worth pursuing",
      "customer worth pursuing",
      "quote follow up priority",
      "quotation follow up priority",
      "which quotes need follow up",
      "job risk",
      "jobs at risk",
      "outstanding payment",
      "receivables",
      "collections",
      "cross module",
      "relationship summary",
    ],
    preferredToolNames: [
      "getCustomerWorthPursuing",
      "getQuoteFollowUpPriorities",
      "getJobRiskOverview",
      "getOutstandingPaymentRelationshipSummary",
      "getProactiveInsights",
    ],
    contextRequirements: {},
  },
  {
    id: "crm_workspace",
    label: "CRM Workspace",
    description:
      "General relationship and pipeline summaries for CRM leads, deals, and related records.",
    intentKeywords: [
      "crm",
      "lead",
      "leads",
      "deal",
      "deals",
      "pipeline",
      "customer",
      "client",
      "account",
      "contact",
    ],
    preferredToolNames: [
      "getCrmLeadsSummary",
      "getCrmDealsSummary",
      "getCrmEnquiriesSummary",
      "getCrmQuotesSummary",
      "getProactiveInsights",
      "proposeDraftEmail",
      "proposeCreateTask",
      "proposeCreateReminder",
    ],
    contextRequirements: {
      routeModules: ["crm"],
      entityKinds: [
        "crm_lead",
        "crm_deal",
        "crm_contact",
        "crm_account",
        "crm_invoice",
      ],
      routePrefixes: ["/crm", "/crm/dashboard"],
    },
  },
  {
    id: "enquiry_workspace",
    label: "Enquiry Workspace",
    description:
      "Service-enquiry workflows, rate-request progress, and active enquiry state in CRM.",
    intentKeywords: [
      "enquiry",
      "inquiry",
      "rate request",
      "service enquiry",
      "pricing",
      "agent reply",
      "routed",
    ],
    preferredToolNames: [
      "getCrmEnquiriesSummary",
      "getCrmLeadsSummary",
      "getCrmQuotesSummary",
      "getProactiveInsights",
      "proposeDraftEmail",
      "proposeCreateTask",
    ],
    contextRequirements: {
      routeModules: ["crm"],
      routePrefixes: [
        "/crm/enquiries",
        "/crm/freight-forwarding",
        "/crm/customs-clearance",
      ],
    },
  },
  {
    id: "quotation_workspace",
    label: "Quotation Workspace",
    description:
      "Quotation status, approval, and customer follow-up for CRM quotes.",
    intentKeywords: [
      "quote",
      "quotes",
      "quotation",
      "quotations",
      "approval",
      "quoted",
      "customer viewed",
      "sla",
    ],
    preferredToolNames: [
      "getCrmQuotesSummary",
      "getCrmEnquiriesSummary",
      "getCrmDealsSummary",
      "getProactiveInsights",
      "proposeDraftEmail",
      "proposeCreateTask",
    ],
    contextRequirements: {
      routeModules: ["crm"],
      routePrefixes: ["/crm/quotes", "/crm/invoices"],
      entityKinds: ["crm_invoice"],
    },
  },
  {
    id: "communication_workspace",
    label: "Communication Workspace",
    description:
      "Mail/chat activity, inbox-oriented triage, and communication workspace context.",
    intentKeywords: [
      "mail",
      "email",
      "thread",
      "communication",
      "chat",
      "message",
      "inbox",
      "gmail",
    ],
    preferredToolNames: [
      "getCommunicationSummary",
      "getMyNotifications",
      "getProactiveInsights",
      "proposeDraftEmail",
    ],
    contextRequirements: {
      routeModules: ["communication"],
      routePrefixes: ["/communication"],
    },
  },
  {
    id: "hrms_workspace",
    label: "HRMS Workspace",
    description:
      "HR workflows for people lookup, team attendance, and document template operations.",
    intentKeywords: [
      "employee",
      "employees",
      "directory",
      "team attendance",
      "attendance summary",
      "letter",
      "template",
      "hrms",
      "people",
    ],
    preferredToolNames: [
      "searchEmployees",
      "getEmployeeCount",
      "getTeamAttendanceSummary",
      "getLetterTemplates",
      "getProactiveInsights",
      "proposeCreateTask",
      "proposeCreateReminder",
    ],
    contextRequirements: {
      routeModules: ["hrms", "attendance"],
      routePrefixes: ["/hrms", "/attendance"],
    },
  },
  {
    id: "accounting_read_only",
    label: "Accounting Read-Only",
    description:
      "Read-only finance status across accounting documents, payments, and recent records.",
    intentKeywords: [
      "accounting",
      "finance",
      "journal",
      "payment entry",
      "payments",
      "document status",
      "approval queue",
    ],
    preferredToolNames: ["getAccountingSummary", "getProactiveInsights"],
    contextRequirements: {
      routeModules: ["accounting"],
      routePrefixes: ["/accounting"],
    },
  },
  {
    id: "payroll_read_only",
    label: "Payroll Read-Only",
    description:
      "Payroll route guidance and adjacent work awareness without write-capable payroll actions in Mona yet.",
    intentKeywords: [
      "payroll",
      "pay run",
      "payslip",
      "salary",
      "taxes and forms",
      "compliance",
    ],
    preferredToolNames: ["getProactiveInsights"],
    contextRequirements: {
      routeModules: ["payroll"],
      routePrefixes: ["/payroll", "/my-payroll", "/hrms/payroll"],
    },
  },
  {
    id: "jobs_operations",
    label: "Jobs / Operations",
    description:
      "CHA job flow, stage risk, and operational workload across active jobs.",
    intentKeywords: [
      "cha",
      "job",
      "jobs",
      "filing",
      "checklist",
      "clearance",
      "operations",
      "shipment",
    ],
    preferredToolNames: [
      "getChaJobsSummary",
      "getProactiveInsights",
      "proposeCreateTask",
      "proposeCreateReminder",
      "proposeDraftEmail",
    ],
    contextRequirements: {
      routeModules: ["cha"],
      routePrefixes: ["/cha", "/communication/job-spaces"],
    },
  },
];

export function resolveMonaSkillSelection(
  ctx: MonaContext,
  userMessage: string,
): MonaSkillSelection {
  const normalizedMessage = userMessage.toLowerCase();
  const currentPath = ctx.currentPath.toLowerCase();

  const entityKind = ctx.entity?.kind;
  if (entityKind) {
    const entitySkill = MONA_SKILLS.find((skill) =>
      skill.contextRequirements.entityKinds?.includes(entityKind),
    );
    if (entitySkill) {
      return {
        skill: entitySkill,
        allowedToolNames: entitySkill.preferredToolNames,
        reason: "entity_match",
      };
    }
  }

  const routePrefixSkill = MONA_SKILLS.find((skill) =>
    skill.contextRequirements.routePrefixes?.some((prefix) =>
      currentPath === prefix || currentPath.startsWith(`${prefix}/`),
    ),
  );
  if (routePrefixSkill) {
    return {
      skill: routePrefixSkill,
      allowedToolNames: routePrefixSkill.preferredToolNames,
      reason: "route_prefix_match",
    };
  }

  const bestIntentSkill = MONA_SKILLS.map((skill) => ({
    skill,
    score: skill.intentKeywords.reduce(
      (total, keyword) => total + (normalizedMessage.includes(keyword) ? 1 : 0),
      0,
    ),
  }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)[0];

  if (bestIntentSkill) {
    return {
      skill: bestIntentSkill.skill,
      allowedToolNames: bestIntentSkill.skill.preferredToolNames,
      reason: "intent_match",
    };
  }

  const routeSkill =
    MONA_SKILLS.find((skill) =>
      skill.contextRequirements.routeModules?.includes(
        ctx.route.moduleId as MonaSkillRouteModule,
      ),
    ) ?? MONA_SKILLS[0];

  return {
    skill: routeSkill,
    allowedToolNames: routeSkill.preferredToolNames,
    reason: "route_default",
  };
}

export function listMonaSkills() {
  return MONA_SKILLS;
}
