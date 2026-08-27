// ─── Mona Data Retrieval Tools ───────────────────────────────────────────────
//
// Each tool is a function that Gemini can call to retrieve live data.
// All tools are permission-gated — the tool list sent to Gemini is filtered
// based on the user's RBAC permissions.
//
import { db } from "@/lib/db";
import { getNow } from "@/lib/clock";
import { toAttendanceDate } from "@/lib/attendance-date";
import { Prisma } from "@/generated/prisma/client";
import {
  buildCreateReminderProposal,
  buildCreateTaskProposal,
  buildDraftEmailProposal,
} from "./actions";
import type { MonaContext, GeminiFunctionDeclaration } from "./types";

// ─── Tool Definitions (sent to Gemini as function declarations) ──────────────

type ToolMeta = {
  declaration: GeminiFunctionDeclaration;
  requiredPermissions?: string[];
  alwaysAvailable?: boolean;
};

const TOOL_REGISTRY: ToolMeta[] = [
  {
    alwaysAvailable: true,
    declaration: {
      name: "getMyProfile",
      description:
        "Get the current user's profile including name, email, designation, department, manager, branch, and employee number.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    alwaysAvailable: true,
    declaration: {
      name: "getMyAttendance",
      description:
        "Get the current user's attendance status for today (checked in, on break, checked out) and recent attendance history for the last 7 days.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    alwaysAvailable: true,
    declaration: {
      name: "getMyLeaves",
      description:
        "Get the current user's leave balances (casual, sick, earned, etc.) and any pending leave requests.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    alwaysAvailable: true,
    declaration: {
      name: "getMyTasks",
      description:
        "Get the current user's pending tasks from both To-Do and HRMS task checklists. Returns task titles, due dates, and statuses.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    alwaysAvailable: true,
    declaration: {
      name: "getMyNotifications",
      description:
        "Get the current user's unread notification count and the 10 most recent notifications.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    alwaysAvailable: true,
    declaration: {
      name: "getMyHrCases",
      description:
        "Get the current user's open help desk / HR support cases.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    alwaysAvailable: true,
    declaration: {
      name: "proposeCreateTask",
      description:
        "Prepare a task creation action for explicit user confirmation. Use only when the user clearly asks to create a task or add a to-do.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Task title" },
          description: { type: "string", description: "Optional task description" },
          dueDate: { type: "string", description: "Optional due date in YYYY-MM-DD format" },
        },
        required: ["title"],
      },
    },
  },
  {
    alwaysAvailable: true,
    declaration: {
      name: "proposeCreateReminder",
      description:
        "Prepare a reminder creation action for explicit user confirmation. Use only when the user clearly asks to create a reminder with a scheduled date or time.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Reminder title" },
          description: { type: "string", description: "Optional reminder description" },
          dueDate: { type: "string", description: "Optional due date in YYYY-MM-DD format" },
          alertAt: {
            type: "string",
            description: "Reminder date and time in ISO-8601 format, for example 2026-08-28T09:30:00+05:30",
          },
        },
        required: ["title", "alertAt"],
      },
    },
  },
  {
    requiredPermissions: ["hrms.employee.read"],
    declaration: {
      name: "searchEmployees",
      description:
        "Search employees by name or department. Returns a list of matching employees with their name, designation, department, and email. Maximum 20 results.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "Search term — matches against employee name, email, or designation",
          },
          department: {
            type: "string",
            description: "Optional — filter by department name (exact match)",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    requiredPermissions: ["hrms.employee.read"],
    declaration: {
      name: "getEmployeeCount",
      description:
        "Get the total number of active employees, optionally filtered by department or branch.",
      parameters: {
        type: "object",
        properties: {
          department: {
            type: "string",
            description: "Optional — filter by department name",
          },
          branch: {
            type: "string",
            description: "Optional — filter by branch name",
          },
        },
        required: [],
      },
    },
  },
  {
    requiredPermissions: ["crm.lead.read"],
    declaration: {
      name: "getCrmLeadsSummary",
      description:
        "Get a summary of CRM leads — total count, counts by status (new, contacted, qualified, lost), and the 5 most recent leads.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    requiredPermissions: ["crm.deal.manage"],
    declaration: {
      name: "getCrmDealsSummary",
      description:
        "Get a summary of CRM deals pipeline — total count, total value, counts and values by stage, and the 5 highest-value open deals.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    requiredPermissions: ["crm.lead.read"],
    declaration: {
      name: "getCrmEnquiriesSummary",
      description:
        "Get a summary of CRM service enquiries — open counts by workflow status, service type mix, and the most recent enquiry records.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    requiredPermissions: ["crm.invoice.manage"],
    declaration: {
      name: "getCrmQuotesSummary",
      description:
        "Get a summary of CRM quotations — counts by approval status, total quoted value, and recent quotes needing follow-up.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    requiredPermissions: ["crm.lead.read", "crm.deal.manage"],
    declaration: {
      name: "getCustomerWorthPursuing",
      description:
        "Synthesize CRM opportunities across deals, leads, reminders, and quotes to identify the customers or prospects worth pursuing first.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    requiredPermissions: ["crm.invoice.manage"],
    declaration: {
      name: "getQuoteFollowUpPriorities",
      description:
        "Rank quotes by follow-up urgency using approval status, customer-viewed state, SLA pressure, value, and recency.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    requiredPermissions: ["attendance.punch.manage"],
    declaration: {
      name: "getTeamAttendanceSummary",
      description:
        "Get today's attendance summary for the organization — how many employees are checked in, on break, checked out, and absent.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    requiredPermissions: ["hrms.letters.manage"],
    declaration: {
      name: "getLetterTemplates",
      description:
        "Get available HR letter templates (offer letter, appointment letter, experience letter, etc.).",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    requiredPermissions: ["communication.mail.access"],
    declaration: {
      name: "proposeDraftEmail",
      description:
        "Prepare an email draft action for explicit user confirmation. Use only when the user clearly asks to draft or save an email.",
      parameters: {
        type: "object",
        properties: {
          to: { type: "string", description: "Primary recipient email addresses" },
          cc: { type: "string", description: "Optional CC recipient email addresses" },
          bcc: { type: "string", description: "Optional BCC recipient email addresses" },
          subject: { type: "string", description: "Email subject" },
          body: { type: "string", description: "HTML or plain message body" },
          textBody: { type: "string", description: "Optional plain text body" },
        },
        required: ["to", "subject", "body"],
      },
    },
  },
  {
    requiredPermissions: ["communication.mail.access"],
    declaration: {
      name: "getCommunicationSummary",
      description:
        "Get a summary of recent communication workspace activity, including mail/chat actions and the latest audit trail events.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    requiredPermissions: ["accounting.journal.read"],
    declaration: {
      name: "getAccountingSummary",
      description:
        "Get a read-only accounting summary covering open documents, journal-ready work, and recent finance records.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    requiredPermissions: ["cha.job.read"],
    declaration: {
      name: "getChaJobsSummary",
      description:
        "Get a summary of CHA operations jobs, including active stages, priorities, and recent job movements.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    requiredPermissions: ["cha.job.read"],
    declaration: {
      name: "getJobRiskOverview",
      description:
        "Synthesize cross-signal risk across active CHA jobs using stage, priority, due pressure, customer query activity, and linked enquiry context.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    requiredPermissions: ["accounting.journal.read", "crm.deal.manage"],
    declaration: {
      name: "getOutstandingPaymentRelationshipSummary",
      description:
        "Synthesize outstanding receivables with CRM relationship context so collection priority can be balanced against open pipeline value.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    alwaysAvailable: true,
    declaration: {
      name: "getProactiveInsights",
      description:
        "Get a structured proactive work brief for the current user — my work today, overdue blockers, follow-up reminders, pending approvals, waiting-for items, and important notifications. Call this at the start of a conversation to surface important items.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
];

// ─── Get available tools for a user ──────────────────────────────────────────

export function getAvailableTools(
  permissions: string[],
  allowedToolNames?: string[],
): GeminiFunctionDeclaration[] {
  const permSet = new Set(permissions);
  const allowedSet = allowedToolNames ? new Set(allowedToolNames) : null;
  return TOOL_REGISTRY.filter((tool) => {
    if (allowedSet && !allowedSet.has(tool.declaration.name)) {
      return false;
    }
    if (tool.alwaysAvailable) return true;
    if (!tool.requiredPermissions) return true;
    return tool.requiredPermissions.every((p) => permSet.has(p));
  }).map((t) => t.declaration);
}

// ─── Tool Execution ──────────────────────────────────────────────────────────

export async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  ctx: MonaContext
): Promise<unknown> {
  switch (toolName) {
    case "getMyProfile":
      return executeGetMyProfile(ctx);
    case "getMyAttendance":
      return executeGetMyAttendance(ctx);
    case "getMyLeaves":
      return executeGetMyLeaves(ctx);
    case "getMyTasks":
      return executeGetMyTasks(ctx);
    case "getMyNotifications":
      return executeGetMyNotifications(ctx);
    case "getMyHrCases":
      return executeGetMyHrCases(ctx);
    case "proposeCreateTask":
      return {
        actionProposal: buildCreateTaskProposal(args, ctx),
        ok: true,
      };
    case "proposeCreateReminder":
      return {
        actionProposal: buildCreateReminderProposal(args, ctx),
        ok: true,
      };
    case "searchEmployees":
      return executeSearchEmployees(args, ctx);
    case "getEmployeeCount":
      return executeGetEmployeeCount(args, ctx);
    case "getCrmLeadsSummary":
      return executeGetCrmLeadsSummary(ctx);
    case "getCrmDealsSummary":
      return executeGetCrmDealsSummary(ctx);
    case "getCrmEnquiriesSummary":
      return executeGetCrmEnquiriesSummary(ctx);
    case "getCrmQuotesSummary":
      return executeGetCrmQuotesSummary(ctx);
    case "getCustomerWorthPursuing":
      return executeGetCustomerWorthPursuing(ctx);
    case "getQuoteFollowUpPriorities":
      return executeGetQuoteFollowUpPriorities(ctx);
    case "getTeamAttendanceSummary":
      return executeGetTeamAttendanceSummary(ctx);
    case "getLetterTemplates":
      return executeGetLetterTemplates(ctx);
    case "proposeDraftEmail":
      return {
        actionProposal: buildDraftEmailProposal(args, ctx),
        ok: true,
      };
    case "getCommunicationSummary":
      return executeGetCommunicationSummary(ctx);
    case "getAccountingSummary":
      return executeGetAccountingSummary(ctx);
    case "getChaJobsSummary":
      return executeGetChaJobsSummary(ctx);
    case "getJobRiskOverview":
      return executeGetJobRiskOverview(ctx);
    case "getOutstandingPaymentRelationshipSummary":
      return executeGetOutstandingPaymentRelationshipSummary(ctx);
    case "getProactiveInsights":
      return executeGetProactiveInsights(ctx);
    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

// ─── Tool Implementations ────────────────────────────────────────────────────

async function executeGetMyProfile(ctx: MonaContext) {
  const user = await db.user.findUnique({
    where: { id: ctx.userId },
    select: {
      name: true,
      email: true,
      designation: true,
      employeeNumber: true,
      department: { select: { name: true } },
      branch: { select: { name: true } },
      manager: { select: { name: true } },
    },
  });
  if (!user) return { error: "User not found" };
  return {
    name: user.name,
    email: user.email,
    designation: user.designation || "Not set",
    employeeNumber: user.employeeNumber || "Not assigned",
    department: user.department?.name || "Not assigned",
    branch: user.branch?.name || "Not assigned",
    manager: user.manager?.name || "No manager assigned",
  };
}

async function executeGetMyAttendance(ctx: MonaContext) {
  const now = await getNow();
  const todayDate = toAttendanceDate(now);

  const [todayPunch, recentPunches] = await Promise.all([
    db.attendancePunch.findUnique({
      where: { userId_date: { userId: ctx.userId, date: todayDate } },
    }),
    db.attendancePunch.findMany({
      where: { userId: ctx.userId },
      orderBy: { date: "desc" },
      take: 7,
      select: {
        date: true,
        inAt: true,
        outAt: true,
        workingHours: true,
        status: true,
      },
    }),
  ]);

  let todayStatus = "Not checked in yet";
  let todayInTime: string | null = null;
  let todayOutTime: string | null = null;

  if (todayPunch) {
    if (todayPunch.outAt) {
      todayStatus = "Checked out";
      todayOutTime = todayPunch.outAt.toLocaleTimeString("en-IN");
    } else if (todayPunch.inAt) {
      todayStatus = "Currently checked in";
    }
    if (todayPunch.inAt) {
      todayInTime = todayPunch.inAt.toLocaleTimeString("en-IN");
    }
  }

  return {
    today: {
      status: todayStatus,
      checkInTime: todayInTime,
      checkOutTime: todayOutTime,
      workingHours: todayPunch?.workingHours ?? null,
    },
    recentHistory: recentPunches.map((p) => ({
      date: p.date.toISOString().split("T")[0],
      checkIn: p.inAt?.toLocaleTimeString("en-IN") || "–",
      checkOut: p.outAt?.toLocaleTimeString("en-IN") || "–",
      workingHours: p.workingHours ?? null,
      status: p.status || "–",
    })),
  };
}

async function executeGetMyLeaves(ctx: MonaContext) {
  const [balances, pendingRequests] = await Promise.all([
    db.leaveBalance.findMany({
      where: { userId: ctx.userId },
      include: { leaveType: { select: { name: true } } },
    }),
    db.leaveRequest.findMany({
      where: { userId: ctx.userId, status: "pending" },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { leaveType: { select: { name: true } } },
    }),
  ]);

  return {
    balances: balances.map((b) => ({
      type: b.leaveType.name,
      balance: b.balance,
    })),
    pendingRequests: pendingRequests.map((r) => ({
      type: r.leaveType.name,
      from: r.fromDate.toISOString().split("T")[0],
      to: r.toDate.toISOString().split("T")[0],
      halfDay: r.halfDay,
      notes: r.notes || "–",
      status: r.status,
    })),
  };
}

async function executeGetMyTasks(ctx: MonaContext) {
  const [todoTasks, hrmsTasks] = await Promise.all([
    db.todoTask.findMany({
      where: {
        userId: ctx.userId,
        status: "PENDING",
      },
      orderBy: { dueDate: "asc" },
      take: 10,
      select: {
        title: true,
        status: true,
        dueDate: true,
      },
    }),
    db.hrmsTask.findMany({
      where: {
        assigneeId: ctx.userId,
        status: "PENDING",
      },
      orderBy: { dueDate: "asc" },
      take: 10,
      select: {
        title: true,
        status: true,
        priority: true,
        dueDate: true,
      },
    }),
  ]);

  return {
    todoTasks: todoTasks.map((t) => ({
      title: t.title,
      status: t.status,
      dueDate: t.dueDate?.toISOString().split("T")[0] || "No due date",
    })),
    hrmsTasks: hrmsTasks.map((t) => ({
      title: t.title,
      status: t.status,
      priority: t.priority,
      dueDate: t.dueDate.toISOString().split("T")[0],
    })),
    summary: {
      totalPending: todoTasks.length + hrmsTasks.length,
      todoCount: todoTasks.length,
      hrmsCount: hrmsTasks.length,
    },
  };
}

async function executeGetMyNotifications(ctx: MonaContext) {
  const [unreadCount, recent] = await Promise.all([
    db.notification.count({
      where: { userId: ctx.userId, readAt: null },
    }),
    db.notification.findMany({
      where: { userId: ctx.userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        title: true,
        body: true,
        kind: true,
        readAt: true,
        createdAt: true,
        link: true,
      },
    }),
  ]);

  return {
    unreadCount,
    recent: recent.map((n) => ({
      title: n.title,
      body: n.body || "",
      type: n.kind,
      read: !!n.readAt,
      time: n.createdAt.toLocaleString("en-IN"),
      link: n.link || null,
    })),
  };
}

async function executeGetMyHrCases(ctx: MonaContext) {
  const cases = await db.hRCase.findMany({
    where: {
      userId: ctx.userId,
      status: { in: ["OPEN", "ASSIGNED", "IN_PROGRESS"] },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
      createdAt: true,
    },
  });

  return {
    openCases: cases.length,
    cases: cases.map((c) => ({
      id: c.id,
      title: c.title,
      status: c.status,
      priority: c.priority,
      created: c.createdAt.toISOString().split("T")[0],
    })),
  };
}

async function executeSearchEmployees(
  args: Record<string, unknown>,
  _ctx: MonaContext
) {
  void _ctx;
  const query = String(args.query || "");
  const department = args.department ? String(args.department) : undefined;

  const where: Prisma.UserWhereInput = {
    active: true,
    OR: [
      { name: { contains: query, mode: "insensitive" } },
      { email: { contains: query, mode: "insensitive" } },
      { designation: { contains: query, mode: "insensitive" } },
    ],
  };

  if (department) {
    where.department = { name: { equals: department, mode: "insensitive" } };
  }

  const employees = await db.user.findMany({
    where,
    take: 20,
    select: {
      name: true,
      email: true,
      designation: true,
      employeeNumber: true,
      department: { select: { name: true } },
      branch: { select: { name: true } },
    },
  });

  return {
    count: employees.length,
    employees: employees.map((e) => ({
      name: e.name,
      email: e.email,
      designation: e.designation || "–",
      employeeNumber: e.employeeNumber || "–",
      department: e.department?.name || "–",
      branch: e.branch?.name || "–",
    })),
  };
}

async function executeGetEmployeeCount(
  args: Record<string, unknown>,
  _ctx: MonaContext
) {
  void _ctx;
  const where: Prisma.UserWhereInput = { active: true };

  if (args.department) {
    where.department = {
      name: { equals: String(args.department), mode: "insensitive" },
    };
  }
  if (args.branch) {
    where.branch = {
      name: { equals: String(args.branch), mode: "insensitive" },
    };
  }

  const count = await db.user.count({ where });
  return { totalActiveEmployees: count };
}

async function executeGetCrmLeadsSummary(ctx: MonaContext) {
  const orgId = ctx.orgId;
  const where = orgId ? { orgId } : {};

  const [total, recentLeads] = await Promise.all([
    db.crmLead.count({ where }),
    db.crmLead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        firstName: true,
        lastName: true,
        company: true,
        status: true,
        source: true,
        createdAt: true,
      },
    }),
  ]);

  // Count by status
  const statusCounts = await db.crmLead.groupBy({
    by: ["status"],
    where,
    _count: true,
  });

  return {
    totalLeads: total,
    byStatus: statusCounts.map((s) => ({
      status: s.status,
      count: s._count,
    })),
    recentLeads: recentLeads.map((l) => ({
      name: [l.firstName, l.lastName].filter(Boolean).join(" "),
      company: l.company || "–",
      status: l.status,
      source: l.source || "–",
      created: l.createdAt.toISOString().split("T")[0],
    })),
  };
}

async function executeGetCrmDealsSummary(ctx: MonaContext) {
  const orgId = ctx.orgId;
  const where = orgId ? { orgId } : {};

  const [total, deals] = await Promise.all([
    db.crmDeal.count({ where }),
    db.crmDeal.findMany({
      where,
      orderBy: { amount: "desc" },
      take: 5,
      select: {
        name: true,
        stage: true,
        amount: true,
        expectedCloseDate: true,
        accountId: true,
      },
    }),
  ]);

  const stageCounts = await db.crmDeal.groupBy({
    by: ["stage"],
    where,
    _count: true,
    _sum: { amount: true },
  });

  return {
    totalDeals: total,
    byStage: stageCounts.map((s) => ({
      stage: s.stage,
      count: s._count,
      totalValue: s._sum.amount || 0,
    })),
    topDeals: deals.map((d) => ({
      name: d.name,
      stage: d.stage,
      amount: d.amount || 0,
      expectedCloseDate: d.expectedCloseDate?.toISOString().split("T")[0] || "–",
    })),
  };
}

async function executeGetCrmEnquiriesSummary(ctx: MonaContext) {
  const orgId = ctx.orgId;
  if (!orgId) {
    return { error: "Organization context is missing" };
  }

  const [total, byStatus, byServiceType, recentEnquiries] = await Promise.all([
    db.crmServiceEnquiry.count({ where: { orgId } }),
    db.crmServiceEnquiry.groupBy({
      by: ["status"],
      where: { orgId },
      _count: true,
    }),
    db.crmServiceEnquiry.groupBy({
      by: ["serviceType"],
      where: { orgId },
      _count: true,
    }),
    db.crmServiceEnquiry.findMany({
      where: { orgId },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: {
        enquiryRef: true,
        serviceType: true,
        status: true,
        shipmentMode: true,
        movementDirection: true,
        updatedAt: true,
        lead: {
          select: {
            company: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    }),
  ]);

  return {
    totalEnquiries: total,
    byStatus: byStatus.map((entry) => ({
      status: entry.status,
      count: entry._count,
    })),
    byServiceType: byServiceType.map((entry) => ({
      serviceType: entry.serviceType,
      count: entry._count,
    })),
    recentEnquiries: recentEnquiries.map((entry) => ({
      enquiryRef: entry.enquiryRef || "–",
      company: entry.lead.company,
      contactName: [entry.lead.firstName, entry.lead.lastName]
        .filter(Boolean)
        .join(" "),
      serviceType: entry.serviceType,
      status: entry.status,
      shipmentMode: entry.shipmentMode || "–",
      movementDirection: entry.movementDirection || "–",
      updatedAt: entry.updatedAt.toISOString().split("T")[0],
    })),
  };
}

async function executeGetCrmQuotesSummary(ctx: MonaContext) {
  const orgId = ctx.orgId;
  if (!orgId) {
    return { error: "Organization context is missing" };
  }

  const quoteWhere = { orgId, type: "QUOTE" };
  const [total, recentQuotes, byApprovalStatus, totals] = await Promise.all([
    db.crmInvoice.count({ where: quoteWhere }),
    db.crmInvoice.findMany({
      where: quoteWhere,
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: {
        id: true,
        invoiceNumber: true,
        approvalStatus: true,
        total: true,
        updatedAt: true,
        account: { select: { name: true } },
      },
    }),
    db.crmInvoice.groupBy({
      by: ["approvalStatus"],
      where: quoteWhere,
      _count: true,
      _sum: { total: true },
    }),
    db.crmInvoice.aggregate({
      where: quoteWhere,
      _sum: { total: true },
    }),
  ]);

  return {
    totalQuotes: total,
    totalQuotedValue: totals._sum.total || 0,
    byApprovalStatus: byApprovalStatus.map((entry) => ({
      status: entry.approvalStatus,
      count: entry._count,
      totalValue: entry._sum.total || 0,
    })),
    recentQuotes: recentQuotes.map((quote) => ({
      id: quote.id,
      quoteNumber: quote.invoiceNumber,
      customerName: quote.account?.name || "Cash Customer",
      approvalStatus: quote.approvalStatus,
      total: quote.total,
      updatedAt: quote.updatedAt.toISOString().split("T")[0],
    })),
  };
}

async function executeGetCustomerWorthPursuing(ctx: MonaContext) {
  const orgId = ctx.orgId;
  if (!orgId) {
    return { error: "Organization context is missing" };
  }

  const now = await getNow();
  const staleThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [deals, dueReminders, pendingQuotes, unconvertedLeads] = await Promise.all([
    db.crmDeal.findMany({
      where: {
        orgId,
        stage: { notIn: ["WON", "LOST"] },
      },
      orderBy: [{ amount: "desc" }, { updatedAt: "desc" }],
      take: 40,
      select: {
        id: true,
        name: true,
        stage: true,
        amount: true,
        probability: true,
        expectedCloseDate: true,
        nextFollowUpDate: true,
        updatedAt: true,
        accountId: true,
        account: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
    }),
    db.crmLeadReminder.findMany({
      where: {
        orgId,
        status: "PENDING",
        alertAt: { lte: now },
      },
      take: 30,
      select: {
        alertAt: true,
        lead: {
          select: {
            id: true,
            company: true,
            firstName: true,
            lastName: true,
            convertedAccountId: true,
          },
        },
      },
    }),
    db.crmInvoice.findMany({
      where: {
        orgId,
        type: "QUOTE",
        approvalStatus: {
          in: [
            "PENDING_MANAGER_APPROVAL",
            "PENDING_APPROVAL",
            "PENDING_CUSTOMER_APPROVAL",
            "SENT",
            "CUSTOMER_VIEWED",
          ],
        },
      },
      take: 40,
      select: {
        total: true,
        accountId: true,
      },
    }),
    db.crmLead.findMany({
      where: {
        orgId,
        isConverted: false,
        status: { in: ["NEW", "CONTACTED", "QUALIFIED"] },
      },
      orderBy: [{ followUpReminderDate: "asc" }, { updatedAt: "desc" }],
      take: 12,
      select: {
        id: true,
        company: true,
        firstName: true,
        lastName: true,
        status: true,
        rating: true,
        followUpReminderDate: true,
        updatedAt: true,
      },
    }),
  ]);

  const accounts = new Map<
    string,
    {
      accountId: string;
      accountName: string;
      stageSet: Set<string>;
      openDeals: number;
      weightedValue: number;
      overdueFollowUps: number;
      staleDeals: number;
      pendingQuotes: number;
      reasons: string[];
    }
  >();

  for (const deal of deals) {
    if (!deal.accountId || !deal.account) {
      continue;
    }

    const current = accounts.get(deal.accountId) ?? {
      accountId: deal.accountId,
      accountName: deal.account.name,
      stageSet: new Set<string>(),
      openDeals: 0,
      weightedValue: 0,
      overdueFollowUps: 0,
      staleDeals: 0,
      pendingQuotes: 0,
      reasons: [],
    };

    current.openDeals += 1;
    current.stageSet.add(deal.stage);
    current.weightedValue += (deal.amount || 0) * ((deal.probability || 0) / 100);
    if (deal.nextFollowUpDate && deal.nextFollowUpDate < now) {
      current.overdueFollowUps += 1;
    }
    if (deal.updatedAt < staleThreshold) {
      current.staleDeals += 1;
    }

    accounts.set(deal.accountId, current);
  }

  for (const quote of pendingQuotes) {
    if (!quote.accountId) continue;
    const current = accounts.get(quote.accountId);
    if (!current) continue;
    current.pendingQuotes += 1;
  }

  const rankedAccounts = [...accounts.values()]
    .map((account) => {
      const score =
        Math.min(account.weightedValue / 100000, 12) +
        account.openDeals * 1.5 +
        account.overdueFollowUps * 2 +
        account.pendingQuotes * 1.5 +
        account.staleDeals;

      const reasons: string[] = [];
      if (account.weightedValue > 0) {
        reasons.push(`weighted pipeline ₹${Math.round(account.weightedValue).toLocaleString("en-IN")}`);
      }
      if (account.overdueFollowUps > 0) {
        reasons.push(`${account.overdueFollowUps} overdue follow-up${account.overdueFollowUps === 1 ? "" : "s"}`);
      }
      if (account.pendingQuotes > 0) {
        reasons.push(`${account.pendingQuotes} live quote${account.pendingQuotes === 1 ? "" : "s"} in motion`);
      }
      if (account.staleDeals > 0) {
        reasons.push(`${account.staleDeals} stale deal${account.staleDeals === 1 ? "" : "s"}`);
      }

      return {
        accountId: account.accountId,
        accountName: account.accountName,
        openDeals: account.openDeals,
        weightedPipelineValue: Math.round(account.weightedValue),
        stageMix: [...account.stageSet],
        pendingQuotes: account.pendingQuotes,
        overdueFollowUps: account.overdueFollowUps,
        staleDeals: account.staleDeals,
        score: Number(score.toFixed(2)),
        reasons,
      };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, 5);

  const prospectReminders = dueReminders
    .filter((reminder) => !reminder.lead.convertedAccountId)
    .map((reminder) => ({
      leadId: reminder.lead.id,
      company: reminder.lead.company,
      contactName: [reminder.lead.firstName, reminder.lead.lastName].filter(Boolean).join(" "),
      alertAt: reminder.alertAt.toISOString(),
    }));

  const rankedProspects = unconvertedLeads
    .map((lead) => {
      const isFollowUpOverdue =
        Boolean(lead.followUpReminderDate) && lead.followUpReminderDate! < now;
      const isStale = lead.updatedAt < staleThreshold;
      const score =
        (lead.status === "QUALIFIED" ? 5 : lead.status === "CONTACTED" ? 3 : 2) +
        (lead.rating === "Hot" ? 3 : lead.rating === "Warm" ? 2 : 1) +
        (isFollowUpOverdue ? 3 : 0) +
        (isStale ? 1 : 0);

      const reasons = [
        `status ${lead.status.toLowerCase()}`,
        lead.rating ? `rating ${lead.rating.toLowerCase()}` : null,
        isFollowUpOverdue ? "follow-up overdue" : null,
        isStale ? "stale without recent movement" : null,
      ].filter((value): value is string => Boolean(value));

      return {
        leadId: lead.id,
        company: lead.company,
        contactName: [lead.firstName, lead.lastName].filter(Boolean).join(" "),
        status: lead.status,
        rating: lead.rating || "Unrated",
        followUpReminderDate: lead.followUpReminderDate?.toISOString() || null,
        score,
        reasons,
      };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, 5);

  return {
    headline:
      rankedAccounts[0]
        ? `${rankedAccounts[0].accountName} leads the pursuit queue based on pipeline value, live quotes, and follow-up pressure.`
        : "No strong cross-module pursuit signals are active right now.",
    topAccounts: rankedAccounts,
    topProspects: rankedProspects,
    dueProspectReminders: prospectReminders.slice(0, 5),
  };
}

async function executeGetQuoteFollowUpPriorities(ctx: MonaContext) {
  const orgId = ctx.orgId;
  if (!orgId) {
    return { error: "Organization context is missing" };
  }

  const now = await getNow();
  const staleThreshold = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

  const quotes = await db.crmInvoice.findMany({
    where: {
      orgId,
      type: "QUOTE",
      approvalStatus: {
        in: [
          "PENDING_MANAGER_APPROVAL",
          "PENDING_APPROVAL",
          "PENDING_CUSTOMER_APPROVAL",
          "SENT",
          "CUSTOMER_VIEWED",
          "REWORK",
        ],
      },
    },
    orderBy: [{ updatedAt: "desc" }],
    take: 25,
    select: {
      id: true,
      invoiceNumber: true,
      approvalStatus: true,
      total: true,
      updatedAt: true,
      slaDeadline: true,
      account: { select: { name: true } },
      crmLead: { select: { company: true } },
    },
  });

  const prioritizedQuotes = quotes
    .map((quote) => {
      let score = 0;
      const reasons: string[] = [];
      const isSlaBreached = Boolean(quote.slaDeadline && quote.slaDeadline < now);
      const isStale = quote.updatedAt < staleThreshold;
      const total = Number(quote.total || 0);

      switch (quote.approvalStatus) {
        case "CUSTOMER_VIEWED":
          score += 6;
          reasons.push("customer has already viewed it");
          break;
        case "PENDING_MANAGER_APPROVAL":
          score += 5;
          reasons.push("waiting on manager approval");
          break;
        case "PENDING_APPROVAL":
          score += 5;
          reasons.push("waiting on approval queue");
          break;
        case "PENDING_CUSTOMER_APPROVAL":
          score += 4;
          reasons.push("awaiting customer decision");
          break;
        case "SENT":
          score += 4;
          reasons.push("sent but not yet progressed");
          break;
        case "REWORK":
          score += 3;
          reasons.push("returned for rework");
          break;
      }

      if (isSlaBreached) {
        score += 4;
        reasons.push("SLA is breached");
      }
      if (isStale) {
        score += 2;
        reasons.push("no recent movement");
      }
      if (total >= 500000) {
        score += 3;
        reasons.push("high quote value");
      } else if (total >= 100000) {
        score += 2;
        reasons.push("meaningful quote value");
      } else if (total > 0) {
        score += 1;
      }

      return {
        id: quote.id,
        quoteNumber: quote.invoiceNumber,
        customerName:
          quote.account?.name ||
          quote.crmLead?.company ||
          "Unlinked quote",
        approvalStatus: quote.approvalStatus,
        total,
        updatedAt: quote.updatedAt.toISOString(),
        slaDeadline: quote.slaDeadline?.toISOString() || null,
        isSlaBreached,
        score,
        reasons,
      };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, 8);

  return {
    headline:
      prioritizedQuotes[0]
        ? `${prioritizedQuotes[0].quoteNumber} is the highest-priority quote follow-up right now.`
        : "No quote follow-up priorities are active right now.",
    prioritizedQuotes,
  };
}

async function executeGetTeamAttendanceSummary(ctx: MonaContext) {
  void ctx;
  const now = await getNow();
  const todayDate = toAttendanceDate(now);

  const [totalEmployees, todayPunches] = await Promise.all([
    db.user.count({ where: { active: true } }),
    db.attendancePunch.findMany({
      where: { date: todayDate },
      select: { inAt: true, outAt: true },
    }),
  ]);

  let checkedIn = 0;
  let checkedOut = 0;

  for (const p of todayPunches) {
    if (p.outAt) checkedOut++;
    else if (p.inAt) checkedIn++;
  }

  const absent = totalEmployees - todayPunches.length;

  return {
    date: todayDate.toISOString().split("T")[0],
    totalEmployees,
    checkedIn,
    checkedOut,
    absent,
    attendanceRate: totalEmployees > 0
      ? Math.round((todayPunches.length / totalEmployees) * 100)
      : 0,
  };
}

async function executeGetLetterTemplates(_ctx: MonaContext) {
  void _ctx;
  const templates = await db.hRLetterTemplate.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      type: true,
      isActive: true,
    },
  });

  return {
    count: templates.length,
    templates: templates.map((t) => ({
      id: t.id,
      name: t.name,
      type: t.type,
      isActive: t.isActive,
    })),
  };
}

async function executeGetCommunicationSummary(ctx: MonaContext) {
  const orgId = ctx.orgId;
  if (!orgId) {
    return { error: "Organization context is missing" };
  }

  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const [totalEvents, recentActions, myRecentActions] = await Promise.all([
    db.communicationAuditEvent.count({
      where: {
        orgId,
        createdAt: { gte: since },
      },
    }),
    db.communicationAuditEvent.findMany({
      where: {
        orgId,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        action: true,
        details: true,
        createdAt: true,
      },
    }),
    db.communicationAuditEvent.count({
      where: {
        orgId,
        userId: ctx.userId,
        createdAt: { gte: since },
      },
    }),
  ]);

  return {
    totalEventsLast14Days: totalEvents,
    myEventsLast14Days: myRecentActions,
    recentActions: recentActions.map((event) => ({
      action: event.action,
      details: event.details || "No detail recorded",
      createdAt: event.createdAt.toISOString().split("T")[0],
    })),
  };
}

async function executeGetAccountingSummary(ctx: MonaContext) {
  const orgId = ctx.orgId;
  if (!orgId) {
    return { error: "Organization context is missing" };
  }

  const [documentStatuses, paymentStatuses, recentDocuments] = await Promise.all([
    db.accountingDocument.groupBy({
      by: ["status"],
      where: { orgId },
      _count: true,
      _sum: { totalAmount: true },
    }),
    db.accountingPayment.groupBy({
      by: ["status"],
      where: { orgId },
      _count: true,
    }),
    db.accountingDocument.findMany({
      where: { orgId },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: {
        id: true,
        documentType: true,
        status: true,
        totalAmount: true,
        postingDate: true,
      },
    }),
  ]);

  return {
    documentStatuses: documentStatuses.map((entry) => ({
      status: entry.status,
      count: entry._count,
      totalAmount: Number(entry._sum.totalAmount || 0),
    })),
    paymentStatuses: paymentStatuses.map((entry) => ({
      status: entry.status,
      count: entry._count,
    })),
    recentDocuments: recentDocuments.map((doc) => ({
      id: doc.id,
      documentType: doc.documentType,
      status: doc.status,
      totalAmount: Number(doc.totalAmount),
      postingDate: doc.postingDate.toISOString().split("T")[0],
    })),
  };
}

async function executeGetChaJobsSummary(ctx: MonaContext) {
  const orgId = ctx.orgId;
  if (!orgId) {
    return { error: "Organization context is missing" };
  }

  const baseWhere: Prisma.ChaJobWhereInput = {
    orgId,
    deletedAt: null,
  };

  if (!ctx.permissions.includes("cha.job.view_all")) {
    baseWhere.OR = [
      { primaryOwnerId: ctx.userId },
      { assignedManagerId: ctx.userId },
    ];
  }

  const [totalJobs, byStage, byPriority, recentJobs] = await Promise.all([
    db.chaJob.count({ where: baseWhere }),
    db.chaJob.groupBy({
      by: ["stage"],
      where: baseWhere,
      _count: true,
    }),
    db.chaJob.groupBy({
      by: ["priority"],
      where: baseWhere,
      _count: true,
    }),
    db.chaJob.findMany({
      where: baseWhere,
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: {
        id: true,
        jobNumber: true,
        title: true,
        stage: true,
        status: true,
        priority: true,
        estimatedClosureDate: true,
      },
    }),
  ]);

  return {
    totalJobs,
    byStage: byStage.map((entry) => ({
      stage: entry.stage,
      count: entry._count,
    })),
    byPriority: byPriority.map((entry) => ({
      priority: entry.priority,
      count: entry._count,
    })),
    recentJobs: recentJobs.map((job) => ({
      id: job.id,
      jobNumber: job.jobNumber,
      title: job.title,
      stage: job.stage,
      status: job.status,
      priority: job.priority,
      estimatedClosureDate: job.estimatedClosureDate
        ? job.estimatedClosureDate.toISOString().split("T")[0]
        : "–",
    })),
  };
}

async function executeGetJobRiskOverview(ctx: MonaContext) {
  const orgId = ctx.orgId;
  if (!orgId) {
    return { error: "Organization context is missing" };
  }

  const now = await getNow();
  const staleThreshold = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);

  const where: Prisma.ChaJobWhereInput = {
    orgId,
    deletedAt: null,
    status: { in: ["ACTIVE", "ON_HOLD"] },
  };

  if (!ctx.permissions.includes("cha.job.view_all")) {
    where.OR = [
      { primaryOwnerId: ctx.userId },
      { assignedManagerId: ctx.userId },
    ];
  }

  const jobs = await db.chaJob.findMany({
    where,
    orderBy: [{ updatedAt: "desc" }],
    take: 30,
    select: {
      id: true,
      jobNumber: true,
      title: true,
      stage: true,
      status: true,
      priority: true,
      estimatedClosureDate: true,
      updatedAt: true,
      customer: { select: { name: true } },
      _count: {
        select: {
          customerQueryThreads: true,
          customerDocumentSubmissions: true,
          crmServiceEnquiries: true,
        },
      },
    },
  });

  const atRiskJobs = jobs
    .map((job) => {
      let score = 0;
      const reasons: string[] = [];
      const closureOverdue = Boolean(
        job.estimatedClosureDate && job.estimatedClosureDate < now,
      );
      const isStale = job.updatedAt < staleThreshold;

      if (job.status === "ON_HOLD") {
        score += 5;
        reasons.push("job is on hold");
      }
      if (job.priority === "URGENT") {
        score += 4;
        reasons.push("urgent priority");
      } else if (job.priority === "HIGH") {
        score += 2;
        reasons.push("high priority");
      }
      if (closureOverdue) {
        score += 4;
        reasons.push("estimated closure date is overdue");
      }
      if (["CHECKLIST_APPROVAL", "FILING"].includes(job.stage)) {
        score += 2;
        reasons.push(`currently in ${job.stage.toLowerCase().replace(/_/g, " ")}`);
      }
      if (job._count.customerQueryThreads > 0) {
        score += 2;
        reasons.push(`${job._count.customerQueryThreads} customer query thread${job._count.customerQueryThreads === 1 ? "" : "s"}`);
      }
      if (job._count.customerDocumentSubmissions === 0) {
        score += 1;
        reasons.push("no customer documents submitted yet");
      }
      if (isStale) {
        score += 1;
        reasons.push("workspace has gone quiet recently");
      }

      const riskLevel =
        score >= 8 ? "high" : score >= 4 ? "medium" : "watch";

      return {
        id: job.id,
        jobNumber: job.jobNumber,
        title: job.title,
        customerName: job.customer.name,
        stage: job.stage,
        status: job.status,
        priority: job.priority,
        estimatedClosureDate:
          job.estimatedClosureDate?.toISOString() || null,
        customerQueryThreads: job._count.customerQueryThreads,
        linkedEnquiries: job._count.crmServiceEnquiries,
        riskLevel,
        score,
        reasons,
      };
    })
    .filter((job) => job.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 8);

  const summary = {
    highRisk: atRiskJobs.filter((job) => job.riskLevel === "high").length,
    mediumRisk: atRiskJobs.filter((job) => job.riskLevel === "medium").length,
    watchList: atRiskJobs.filter((job) => job.riskLevel === "watch").length,
  };

  return {
    headline:
      atRiskJobs[0]
        ? `${atRiskJobs[0].jobNumber} is the most exposed active job based on priority, stage pressure, and customer query activity.`
        : "No elevated job-risk patterns are active right now.",
    summary,
    atRiskJobs,
  };
}

async function executeGetOutstandingPaymentRelationshipSummary(ctx: MonaContext) {
  const orgId = ctx.orgId;
  if (!orgId) {
    return { error: "Organization context is missing" };
  }

  const now = await getNow();

  const [outstandingInvoices, openDeals, pendingQuotes] = await Promise.all([
    db.salesInvoice.findMany({
      where: {
        orgId,
        outstandingAmount: { gt: new Prisma.Decimal(0) },
        status: { in: ["UNPAID", "PARTLY_PAID", "OVERDUE"] },
      },
      orderBy: [{ outstandingAmount: "desc" }, { dueDate: "asc" }],
      take: 50,
      select: {
        id: true,
        invoiceNumber: true,
        dueDate: true,
        status: true,
        outstandingAmount: true,
        customerId: true,
        customer: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        deal: {
          select: {
            id: true,
            name: true,
            stage: true,
            amount: true,
            probability: true,
          },
        },
      },
    }),
    db.crmDeal.findMany({
      where: {
        orgId,
        stage: { notIn: ["WON", "LOST"] },
        accountId: { not: null },
      },
      select: {
        accountId: true,
        amount: true,
        probability: true,
      },
    }),
    db.crmInvoice.findMany({
      where: {
        orgId,
        type: "QUOTE",
        accountId: { not: null },
        approvalStatus: {
          in: ["PENDING_CUSTOMER_APPROVAL", "SENT", "CUSTOMER_VIEWED"],
        },
      },
      select: {
        accountId: true,
        approvalStatus: true,
      },
    }),
  ]);

  const dealMap = new Map<
    string,
    { openDeals: number; weightedPipeline: number }
  >();
  for (const deal of openDeals) {
    if (!deal.accountId) continue;
    const current = dealMap.get(deal.accountId) ?? {
      openDeals: 0,
      weightedPipeline: 0,
    };
    current.openDeals += 1;
    current.weightedPipeline += (deal.amount || 0) * ((deal.probability || 0) / 100);
    dealMap.set(deal.accountId, current);
  }

  const quoteMap = new Map<string, number>();
  for (const quote of pendingQuotes) {
    if (!quote.accountId) continue;
    quoteMap.set(quote.accountId, (quoteMap.get(quote.accountId) || 0) + 1);
  }

  const accountMap = new Map<
    string,
    {
      customerId: string;
      customerName: string;
      invoices: number;
      overdueInvoices: number;
      totalOutstanding: number;
      oldestDueDate: Date | null;
      linkedDeals: number;
      weightedPipeline: number;
      pendingQuotes: number;
    }
  >();

  for (const invoice of outstandingInvoices) {
    const current = accountMap.get(invoice.customerId) ?? {
      customerId: invoice.customerId,
      customerName: invoice.customer.name,
      invoices: 0,
      overdueInvoices: 0,
      totalOutstanding: 0,
      oldestDueDate: null,
      linkedDeals: 0,
      weightedPipeline: 0,
      pendingQuotes: quoteMap.get(invoice.customerId) || 0,
    };

    current.invoices += 1;
    current.totalOutstanding += Number(invoice.outstandingAmount);
    if (invoice.dueDate < now) {
      current.overdueInvoices += 1;
    }
    if (!current.oldestDueDate || invoice.dueDate < current.oldestDueDate) {
      current.oldestDueDate = invoice.dueDate;
    }

    const relatedDeals = dealMap.get(invoice.customerId);
    if (relatedDeals) {
      current.linkedDeals = relatedDeals.openDeals;
      current.weightedPipeline = relatedDeals.weightedPipeline;
    }

    accountMap.set(invoice.customerId, current);
  }

  const prioritizedAccounts = [...accountMap.values()]
    .map((account) => {
      const score =
        Math.min(account.totalOutstanding / 100000, 10) +
        account.overdueInvoices * 2 +
        account.pendingQuotes +
        Math.min(account.weightedPipeline / 200000, 6);

      const reasons: string[] = [
        `₹${Math.round(account.totalOutstanding).toLocaleString("en-IN")} outstanding`,
      ];
      if (account.overdueInvoices > 0) {
        reasons.push(`${account.overdueInvoices} overdue invoice${account.overdueInvoices === 1 ? "" : "s"}`);
      }
      if (account.linkedDeals > 0) {
        reasons.push(`${account.linkedDeals} open CRM deal${account.linkedDeals === 1 ? "" : "s"}`);
      }
      if (account.pendingQuotes > 0) {
        reasons.push(`${account.pendingQuotes} quote${account.pendingQuotes === 1 ? "" : "s"} still in play`);
      }

      return {
        customerId: account.customerId,
        customerName: account.customerName,
        totalOutstanding: Math.round(account.totalOutstanding),
        overdueInvoices: account.overdueInvoices,
        invoiceCount: account.invoices,
        oldestDueDate: account.oldestDueDate?.toISOString() || null,
        openDeals: account.linkedDeals,
        weightedPipelineValue: Math.round(account.weightedPipeline),
        pendingQuotes: account.pendingQuotes,
        score: Number(score.toFixed(2)),
        reasons,
      };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, 6);

  return {
    headline:
      prioritizedAccounts[0]
        ? `${prioritizedAccounts[0].customerName} is the highest-priority receivables relationship based on outstanding amount and live CRM opportunity context.`
        : "No outstanding customer-payment pressure is visible right now.",
    prioritizedAccounts,
  };
}

async function executeGetProactiveInsights(ctx: MonaContext) {
  const now = await getNow();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);

  const canReviewApprovals =
    ctx.isAdmin ||
    ctx.permissions.includes("hrms.approvals.manage") ||
    ctx.permissions.includes("attendance.leave.approve") ||
    ctx.permissions.includes("hrms.workreport.approve");
  const canSeeCrmFollowUps = ctx.permissions.includes("crm.lead.read");
  const canSeeQuotes = ctx.permissions.includes("crm.invoice.manage");

  const approvalScope =
    ctx.isAdmin || ctx.permissions.includes("hrms.approvals.manage")
      ? ctx.orgId
        ? { user: { orgId: ctx.orgId } }
        : {}
      : { user: { managerId: ctx.userId } };

  const [
    overdueTodoCount,
    dueTodayTodoCount,
    overdueHrmsTaskCount,
    pendingHrmsTaskCount,
    unreadNotificationCount,
    importantNotifications,
    openCasesCount,
    urgentCases,
    myPendingLeaveCount,
    crmFollowUpsDueCount,
    crmFollowUpsDueToday,
    waitingOnQuotesCount,
    pendingLeaveApprovals,
    pendingRegularizations,
    pendingOtRecords,
    pendingTravelRequests,
    pendingTimesheets,
    pendingWorkReports,
    pendingOnDutyRequests,
  ] = await Promise.all([
    db.todoTask.count({
      where: {
        userId: ctx.userId,
        status: "PENDING",
        dueDate: { not: null, lt: startOfToday },
      },
    }),
    db.todoTask.count({
      where: {
        userId: ctx.userId,
        status: "PENDING",
        dueDate: { gte: startOfToday, lt: endOfToday },
      },
    }),
    db.hrmsTask.count({
      where: {
        assigneeId: ctx.userId,
        status: "PENDING",
        dueDate: { lt: startOfToday },
      },
    }),
    db.hrmsTask.count({
      where: { assigneeId: ctx.userId, status: "PENDING" },
    }),
    db.notification.count({
      where: { userId: ctx.userId, readAt: null },
    }),
    db.notification.findMany({
      where: {
        userId: ctx.userId,
        dismissedAt: null,
        OR: [
          { priority: "important", acknowledgedAt: null },
          { requiresAck: true, acknowledgedAt: null },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: {
        id: true,
        title: true,
        link: true,
        createdAt: true,
      },
    }),
    db.hRCase.count({
      where: {
        userId: ctx.userId,
        status: { in: ["OPEN", "ASSIGNED", "IN_PROGRESS"] },
      },
    }),
    db.hRCase.findMany({
      where: {
        userId: ctx.userId,
        status: { in: ["OPEN", "ASSIGNED", "IN_PROGRESS"] },
        priority: { in: ["HIGH", "URGENT"] },
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      take: 2,
      select: {
        id: true,
        title: true,
        priority: true,
      },
    }),
    db.leaveRequest.count({
      where: { userId: ctx.userId, status: "pending" },
    }),
    canSeeCrmFollowUps
      ? db.crmLeadReminder.count({
          where: {
            userId: ctx.userId,
            status: "PENDING",
            alertAt: { lte: endOfToday },
          },
        })
      : Promise.resolve(0),
    canSeeCrmFollowUps
      ? db.crmLeadReminder.findMany({
          where: {
            userId: ctx.userId,
            status: "PENDING",
            alertAt: { lte: endOfToday },
          },
          orderBy: { alertAt: "asc" },
          take: 3,
          select: {
            leadId: true,
            alertAt: true,
            lead: {
              select: {
                firstName: true,
                lastName: true,
                company: true,
              },
            },
          },
        })
      : Promise.resolve([]),
    canSeeQuotes
      ? db.crmInvoice.count({
          where: {
            orgId: ctx.orgId,
            ownerId: ctx.userId,
            type: "QUOTE",
            approvalStatus: {
              in: [
                "PENDING_MANAGER_APPROVAL",
                "PENDING_APPROVAL",
                "PENDING_CUSTOMER_APPROVAL",
                "SENT",
                "CUSTOMER_VIEWED",
              ],
            },
          },
        })
      : Promise.resolve(0),
    canReviewApprovals
      ? db.leaveRequest.count({
          where: { ...approvalScope, status: "pending" },
        })
      : Promise.resolve(0),
    canReviewApprovals
      ? db.attendanceRegularization.count({
          where: { ...approvalScope, status: "PENDING" },
        })
      : Promise.resolve(0),
    canReviewApprovals
      ? db.otRecord.count({
          where: { ...approvalScope, approvalStatus: "PENDING" },
        })
      : Promise.resolve(0),
    canReviewApprovals
      ? db.travelRequest.count({
          where: { ...approvalScope, status: "PENDING" },
        })
      : Promise.resolve(0),
    canReviewApprovals
      ? db.timesheetSubmission.count({
          where: { ...approvalScope, status: "PENDING" },
        })
      : Promise.resolve(0),
    canReviewApprovals
      ? db.workReportApproval.count({
          where: { approverId: ctx.userId, status: "PENDING" },
        })
      : Promise.resolve(0),
    canReviewApprovals
      ? db.onDutyRequest.count({
          where: { ...approvalScope, status: "PENDING" },
        })
      : Promise.resolve(0),
  ]);

  const overdueBlockers: Array<{
    title: string;
    detail: string;
    href: string;
    severity: "critical" | "warning" | "info";
  }> = [];
  const pendingApprovals: typeof overdueBlockers = [];
  const followUps: typeof overdueBlockers = [];
  const waitingFor: typeof overdueBlockers = [];
  const insights: string[] = [];

  if (overdueTodoCount > 0) {
    overdueBlockers.push({
      title: `${overdueTodoCount} overdue to-do item${overdueTodoCount === 1 ? "" : "s"}`,
      detail: "Personal tasks have passed their due date.",
      href: "/todo",
      severity: "critical",
    });
  }

  if (overdueHrmsTaskCount > 0) {
    overdueBlockers.push({
      title: `${overdueHrmsTaskCount} overdue HRMS task${overdueHrmsTaskCount === 1 ? "" : "s"}`,
      detail: "Assigned HRMS work is overdue and needs action.",
      href: "/hrms/tasks",
      severity: "critical",
    });
  }

  if (urgentCases.length > 0) {
    overdueBlockers.push({
      title: `${urgentCases.length} urgent support case${urgentCases.length === 1 ? "" : "s"}`,
      detail: urgentCases.map((item) => item.title).join(" · "),
      href: "/hrms/helpdesk",
      severity: "warning",
    });
  }

  if (importantNotifications.length > 0) {
    overdueBlockers.push({
      title: `${importantNotifications.length} important notification${importantNotifications.length === 1 ? "" : "s"}`,
      detail: importantNotifications.map((item) => item.title).join(" · "),
      href: "/notifications",
      severity: "warning",
    });
  }

  const approvalGroups = [
    {
      count: pendingLeaveApprovals,
      title: "leave approval",
      detail: "Pending leave requests need a decision.",
    },
    {
      count: pendingRegularizations,
      title: "attendance regularization",
      detail: "Attendance corrections are waiting in the queue.",
    },
    {
      count: pendingOtRecords,
      title: "OT review",
      detail: "Overtime records need approval.",
    },
    {
      count: pendingTravelRequests,
      title: "travel request",
      detail: "Travel plans are waiting for review.",
    },
    {
      count: pendingTimesheets,
      title: "timesheet",
      detail: "Timesheet submissions are pending review.",
    },
    {
      count: pendingWorkReports,
      title: "work report",
      detail: "Work reports need your approval.",
    },
    {
      count: pendingOnDutyRequests,
      title: "on-duty request",
      detail: "Field-duty requests are pending action.",
    },
  ];

  for (const group of approvalGroups) {
    if (group.count <= 0) continue;
    pendingApprovals.push({
      title: `${group.count} ${group.title}${group.count === 1 ? "" : "s"} waiting`,
      detail: group.detail,
      href: "/hrms/approvals",
      severity: group.count >= 5 ? "critical" : "warning",
    });
  }

  if (crmFollowUpsDueCount > 0) {
    followUps.push({
      title: `${crmFollowUpsDueCount} CRM follow-up reminder${crmFollowUpsDueCount === 1 ? "" : "s"} due`,
      detail:
        crmFollowUpsDueToday.length > 0
          ? crmFollowUpsDueToday
              .map((item) =>
                item.lead.company ||
                [item.lead.firstName, item.lead.lastName].filter(Boolean).join(" ") ||
                "Lead follow-up",
              )
              .join(" · ")
          : "Lead reminders are due today.",
      href: "/crm/leads",
      severity: "warning",
    });
  }

  if (dueTodayTodoCount > 0) {
    followUps.push({
      title: `${dueTodayTodoCount} to-do item${dueTodayTodoCount === 1 ? "" : "s"} due today`,
      detail: "Today’s personal tasks should be cleared before they slip.",
      href: "/todo",
      severity: "info",
    });
  }

  if (myPendingLeaveCount > 0) {
    waitingFor.push({
      title: `${myPendingLeaveCount} leave request${myPendingLeaveCount === 1 ? "" : "s"} waiting on approval`,
      detail: "Your leave applications are still pending decision.",
      href: "/attendance/leaves",
      severity: "info",
    });
  }

  if (waitingOnQuotesCount > 0) {
    waitingFor.push({
      title: `${waitingOnQuotesCount} quote follow-up item${waitingOnQuotesCount === 1 ? "" : "s"} waiting`,
      detail: "Your quotations are waiting on internal or customer movement.",
      href: "/crm/quotes",
      severity: "info",
    });
  }

  if (pendingHrmsTaskCount > 0 && overdueHrmsTaskCount === 0) {
    waitingFor.push({
      title: `${pendingHrmsTaskCount} HRMS task${pendingHrmsTaskCount === 1 ? "" : "s"} still open`,
      detail: "Assigned HRMS work remains in your queue.",
      href: "/hrms/tasks",
      severity: "info",
    });
  }

  if (overdueBlockers.length > 0) {
    insights.push(
      `⚠️ ${overdueBlockers[0].title.charAt(0).toUpperCase()}${overdueBlockers[0].title.slice(1)} need${overdueBlockers[0].title.startsWith("1 ") ? "s" : ""} attention.`,
    );
  }
  if (pendingApprovals.length > 0) {
    const totalPendingApprovals = approvalGroups.reduce((sum, group) => sum + group.count, 0);
    insights.push(
      `📋 You have **${totalPendingApprovals}** approval item${totalPendingApprovals === 1 ? "" : "s"} waiting in your queue.`,
    );
  }
  if (followUps.length > 0) {
    insights.push(
      `⏰ You have **${crmFollowUpsDueCount + dueTodayTodoCount}** follow-up item${crmFollowUpsDueCount + dueTodayTodoCount === 1 ? "" : "s"} due today.`,
    );
  }
  if (waitingFor.length > 0) {
    insights.push(
      `🕒 There ${waitingFor.length === 1 ? "is" : "are"} **${waitingFor.length}** waiting-for area${waitingFor.length === 1 ? "" : "s"} to keep an eye on.`,
    );
  }
  if (unreadNotificationCount > 0) {
    insights.push(
      `🔔 You have **${unreadNotificationCount}** unread notification${unreadNotificationCount === 1 ? "" : "s"}.`,
    );
  }
  if (openCasesCount > 0) {
    insights.push(
      `🎫 You still have **${openCasesCount}** open help desk case${openCasesCount === 1 ? "" : "s"}.`,
    );
  }

  const headline =
    overdueBlockers.length > 0
      ? "You have a few blockers to clear first."
      : pendingApprovals.length > 0
        ? "Your queue is mostly approvals and follow-ups."
        : followUps.length > 0 || waitingFor.length > 0
          ? "Your day is under control, with a few follow-ups to keep moving."
          : "You are caught up. Nothing urgent is demanding attention right now.";

  return {
    insightCount: insights.length,
    insights,
    hasUrgentItems: overdueBlockers.some((item) => item.severity === "critical"),
    brief: {
      generatedAt: now.toISOString(),
      headline,
      myWorkToday: {
        overdueBlockers: overdueBlockers.length,
        approvalsWaiting: pendingApprovals.length,
        followUpsDue: followUps.length,
        waitingFor: waitingFor.length,
        unreadNotifications: unreadNotificationCount,
      },
      sections: {
        overdueBlockers,
        pendingApprovals,
        followUps,
        waitingFor,
      },
    },
  };
}
