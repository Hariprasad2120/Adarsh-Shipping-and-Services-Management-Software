// ─── Mona Data Retrieval Tools ───────────────────────────────────────────────
//
// Each tool is a function that Gemini can call to retrieve live data.
// All tools are permission-gated — the tool list sent to Gemini is filtered
// based on the user's RBAC permissions.
//
import { db } from "@/lib/db";
import { getNow } from "@/lib/clock";
import { toAttendanceDate } from "@/lib/attendance-date";
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
    alwaysAvailable: true,
    declaration: {
      name: "getProactiveInsights",
      description:
        "Get proactive insights and alerts for the current user — overdue tasks, pending approvals, low leave balance, upcoming deadlines. Call this at the start of a conversation to surface important items.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
];

// ─── Get available tools for a user ──────────────────────────────────────────

export function getAvailableTools(
  permissions: string[]
): GeminiFunctionDeclaration[] {
  const permSet = new Set(permissions);
  return TOOL_REGISTRY.filter((tool) => {
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
    case "searchEmployees":
      return executeSearchEmployees(args, ctx);
    case "getEmployeeCount":
      return executeGetEmployeeCount(args, ctx);
    case "getCrmLeadsSummary":
      return executeGetCrmLeadsSummary(ctx);
    case "getCrmDealsSummary":
      return executeGetCrmDealsSummary(ctx);
    case "getTeamAttendanceSummary":
      return executeGetTeamAttendanceSummary(ctx);
    case "getLetterTemplates":
      return executeGetLetterTemplates(ctx);
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
  const query = String(args.query || "");
  const department = args.department ? String(args.department) : undefined;

  const where: Record<string, unknown> = {
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
    where: where as any,
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
  const where: Record<string, unknown> = { active: true };

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

  const count = await db.user.count({ where: where as any });
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

async function executeGetTeamAttendanceSummary(ctx: MonaContext) {
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

async function executeGetProactiveInsights(ctx: MonaContext) {
  const now = await getNow();
  const insights: string[] = [];

  // 1. Overdue tasks
  const overdueTasks = await db.todoTask.count({
    where: {
      userId: ctx.userId,
      status: "PENDING",
      dueDate: { lt: now },
    },
  });
  if (overdueTasks > 0) {
    insights.push(
      `⚠️ You have **${overdueTasks}** overdue task${overdueTasks > 1 ? "s" : ""} that need attention.`
    );
  }

  // 2. Unread notifications
  const unreadNotifs = await db.notification.count({
    where: { userId: ctx.userId, readAt: null },
  });
  if (unreadNotifs > 0) {
    insights.push(
      `🔔 You have **${unreadNotifs}** unread notification${unreadNotifs > 1 ? "s" : ""}.`
    );
  }

  // 3. Pending leave requests (for managers)
  if (ctx.permissions.includes("attendance.leave.approve")) {
    const pendingLeaves = await db.leaveRequest.count({
      where: { status: "pending", user: { managerId: ctx.userId } },
    });
    if (pendingLeaves > 0) {
      insights.push(
        `📋 **${pendingLeaves}** leave request${pendingLeaves > 1 ? "s" : ""} pending your approval.`
      );
    }
  }

  // 4. Open HR cases
  const openCases = await db.hRCase.count({
    where: {
      userId: ctx.userId,
      status: { in: ["OPEN", "ASSIGNED", "IN_PROGRESS"] },
    },
  });
  if (openCases > 0) {
    insights.push(
      `🎫 You have **${openCases}** open help desk case${openCases > 1 ? "s" : ""}.`
    );
  }

  // 5. Pending HRMS tasks
  const pendingHrmsTasks = await db.hrmsTask.count({
    where: { assigneeId: ctx.userId, status: "PENDING" },
  });
  if (pendingHrmsTasks > 0) {
    insights.push(
      `📌 **${pendingHrmsTasks}** HRMS task${pendingHrmsTasks > 1 ? "s" : ""} assigned to you are pending.`
    );
  }

  return {
    insightCount: insights.length,
    insights,
    hasUrgentItems: overdueTasks > 0,
  };
}
