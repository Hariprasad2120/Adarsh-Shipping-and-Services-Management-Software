import { db } from "@/lib/db";
import { notify } from "@/lib/notify";
import { notifyMany, getUsersWithPermission } from "@/modules/notifications/service";
import { getNow } from "@/lib/clock";

// ─── Core & Dashboard ──────────────────────────────────────────────────────────

export async function getMe(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      orgId: true,
      name: true,
      email: true,
      designation: true,
      employeeNumber: true,
      branchId: true,
      departmentId: true,
      managerId: true,
      tlId: true,
      photo: true,
      manager: { select: { id: true, name: true } },
      department: { select: { id: true, name: true } },
      branch: { select: { id: true, name: true } },
      roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
    },
  });

  if (!user) throw new Error("User not found");

  const permissionKeys = user.roles.flatMap((ur) =>
    ur.role.permissions.map((rp) => rp.permission.key)
  );

  // Today's attendance status
  const now = await getNow();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const punch = await db.attendancePunch.findUnique({
    where: { userId_date: { userId, date: todayStart } },
  });

  let attendanceStatus: "YET_TO_CHECK_IN" | "CHECKED_IN" | "ON_BREAK" | "CHECKED_OUT" = "YET_TO_CHECK_IN";
  let totalInTime = "00:00:00";

  if (punch) {
    if (punch.outAt) {
      attendanceStatus = "CHECKED_OUT";
    } else if (punch.inAt) {
      // Check if there is an active break
      const activeBreak = await db.attendanceBreak.findFirst({
        where: { punchId: punch.id, breakEnd: null },
      });
      attendanceStatus = activeBreak ? "ON_BREAK" : "CHECKED_IN";
    }

    if (punch.inAt) {
      const end = punch.outAt || now;
      const diffMs = end.getTime() - punch.inAt.getTime();
      const hrs = Math.floor(diffMs / 3600000);
      const mins = Math.floor((diffMs % 3600000) / 60000);
      const secs = Math.floor((diffMs % 60000) / 1000);
      totalInTime = `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }
  }

  // Pending counts (Leave requests, HR cases, Tasks)
  const pendingLeaves = await db.leaveRequest.count({
    where: { userId, status: "pending" },
  });

  const pendingCases = await db.hRCase.count({
    where: { userId, status: { in: ["OPEN", "ASSIGNED", "IN_PROGRESS"] } },
  });

  const pendingTasks = await db.hrmsTask.count({
    where: { assigneeId: userId, status: "PENDING" },
  });

  // Load preferences
  let pref = await db.employeePreference.findUnique({ where: { userId } });
  if (!pref) {
    pref = await db.employeePreference.create({
      data: {
        userId,
        widgets: JSON.stringify([
          { key: "ANNOUNCEMENTS", visible: true, order: 0, width: "md" },
          { key: "QUICKLINKS", visible: true, order: 1, width: "sm" },
          { key: "HOLIDAYLIST", visible: true, order: 2, width: "sm" },
          { key: "MYPENDINGTASKS", visible: true, order: 3, width: "md" },
          { key: "ENPS_SURVEY", visible: true, order: 4, width: "sm" },
        ]),
      },
    });
  }

  return {
    user: {
      id: user.id,
      employeeNo: String(user.employeeNumber ?? ""),
      name: user.name,
      email: user.email,
      designation: user.designation ?? "",
      department: user.department?.name ?? "",
      branch: user.branch?.name ?? "",
      manager: user.manager?.name ?? "",
      photo: user.photo,
    },
    permissions: Array.from(new Set(permissionKeys)),
    widgets: JSON.parse(pref.widgets as string),
    attendanceStatus,
    totalInTime,
    pendingCounts: {
      leaves: pendingLeaves,
      cases: pendingCases,
      tasks: pendingTasks,
    },
  };
}

export async function getDashboardWidgets(userId: string, orgId: string) {
  const now = await getNow();
  const upcomingHolidays = await db.holiday.findMany({
    where: { orgId, date: { gte: now } },
    take: 5,
    orderBy: { date: "asc" },
  });

  const announcements = await db.announcement.findMany({
    where: { orgId },
    take: 3,
    orderBy: { createdAt: "desc" },
  });

  const recentTasks = await db.hrmsTask.findMany({
    where: { assigneeId: userId, status: "PENDING" },
    take: 5,
    orderBy: { dueDate: "asc" },
  });

  return {
    upcomingHolidays,
    announcements,
    recentTasks,
  };
}

export async function updateDashboardWidgets(userId: string, widgets: any[]) {
  return db.employeePreference.upsert({
    where: { userId },
    update: { widgets: JSON.stringify(widgets) },
    create: { userId, widgets: JSON.stringify(widgets) },
  });
}

// ─── Attendance & Punching ───────────────────────────────────────────────────

export async function punchAction(
  userId: string,
  orgId: string,
  action: "CHECK_IN" | "CHECK_OUT" | "START_BREAK" | "RESUME_WORK",
  source: string = "WEB",
  note?: string,
  deviceId?: string
) {
  const now = await getNow();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let punch = await db.attendancePunch.findUnique({
    where: { userId_date: { userId, date: todayStart } },
  });

  if (action === "CHECK_IN") {
    if (punch && punch.inAt) {
      throw new Error("Already checked in today");
    }
    punch = await db.attendancePunch.upsert({
      where: { userId_date: { userId, date: todayStart } },
      update: { inAt: now, source },
      create: { userId, date: todayStart, inAt: now, source },
    });
  } else {
    if (!punch || !punch.inAt) {
      throw new Error("You must check in first");
    }

    if (action === "CHECK_OUT") {
      if (punch.outAt) {
        throw new Error("Already checked out today");
      }
      // Auto close active breaks
      await db.attendanceBreak.updateMany({
        where: { punchId: punch.id, breakEnd: null },
        data: { breakEnd: now, durationMinutes: 0 },
      });

      punch = await db.attendancePunch.update({
        where: { id: punch.id },
        data: { outAt: now },
      });
    } else if (action === "START_BREAK") {
      const activeBreak = await db.attendanceBreak.findFirst({
        where: { punchId: punch.id, breakEnd: null },
      });
      if (activeBreak) {
        throw new Error("Already on break");
      }
      await db.attendanceBreak.create({
        data: { punchId: punch.id, breakStart: now },
      });
    } else if (action === "RESUME_WORK") {
      const activeBreak = await db.attendanceBreak.findFirst({
        where: { punchId: punch.id, breakEnd: null },
      });
      if (!activeBreak) {
        throw new Error("Not currently on break");
      }
      const diffMins = Math.floor((now.getTime() - activeBreak.breakStart.getTime()) / 60000);
      await db.attendanceBreak.update({
        where: { id: activeBreak.id },
        data: { breakEnd: now, durationMinutes: diffMins },
      });
    }
  }

  // Audit Log
  await db.hrmsAuditLog.create({
    data: {
      orgId,
      userId,
      action: `ATTENDANCE_${action}`,
      details: JSON.stringify({ note, deviceId, timestamp: now.toISOString() }),
    },
  });

  return punch;
}

export async function getAttendanceCalendar(userId: string, year: number, month: number) {
  const from = new Date(year, month - 1, 1);
  const to = new Date(year, month, 0);

  const punches = await db.attendancePunch.findMany({
    where: { userId, date: { gte: from, lte: to } },
  });

  const breaks = await db.attendanceBreak.findMany({
    where: { punchId: { in: punches.map((p) => p.id) } },
  });

  return punches.map((p) => {
    const punchBreaks = breaks.filter((b) => b.punchId === p.id);
    const breakSum = punchBreaks.reduce((sum, b) => sum + (b.durationMinutes ?? 0), 0);
    return {
      date: p.date.toISOString().split("T")[0],
      inAt: p.inAt,
      outAt: p.outAt,
      breaksCount: punchBreaks.length,
      totalBreakMins: breakSum,
      status: p.status || "PRESENT",
    };
  });
}

// ─── Leaves Tracker ──────────────────────────────────────────────────────────

export async function getLeaveTrackerSummary(userId: string, orgId: string) {
  const year = new Date().getFullYear();
  const balances = await db.leaveBalance.findMany({
    where: { userId, year },
    include: { leaveType: true },
  });

  const requests = await db.leaveRequest.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { leaveType: true, approver: { select: { name: true } } },
  });

  return {
    balances,
    requests,
  };
}

export async function applyLeave(
  userId: string,
  orgId: string,
  data: {
    leaveTypeId: string;
    fromDate: Date;
    toDate: Date;
    reason: string;
    fromHalf: boolean;
    toHalf: boolean;
  }
) {
  const request = await db.leaveRequest.create({
    data: {
      userId,
      leaveTypeId: data.leaveTypeId,
      fromDate: data.fromDate,
      toDate: data.toDate,
      halfDay: data.fromHalf || data.toHalf,
      status: "pending",
      notes: data.reason,
    },
    include: {
      user: { select: { name: true } },
      leaveType: { select: { name: true } },
    },
  });

  // Notify Approvers
  const approverIds = await getUsersWithPermission(orgId, "attendance.leave.approve");
  const recipients = approverIds.filter((id) => id !== userId);
  if (recipients.length > 0) {
    await notifyMany(recipients, {
      orgId,
      kind: "LEAVE_SUBMITTED",
      title: `New Leave Request`,
      body: `${request.user.name} applied for ${request.leaveType.name} from ${data.fromDate.toLocaleDateString()} to ${data.toDate.toLocaleDateString()}.`,
      link: "/hrms/peopleplus?service=leavetracker",
      payload: { requestId: request.id },
    });
  }

  return request;
}

// ─── Timesheets & Time Tracker ───────────────────────────────────────────────

export async function getTimesheetProjects(orgId: string) {
  return db.timesheetProject.findMany({
    where: { orgId },
    include: { client: true, jobs: true },
  });
}

export async function getTimeLogs(userId: string, orgId: string) {
  return db.timeLog.findMany({
    where: { userId, orgId },
    include: { job: { include: { project: true } } },
    orderBy: { date: "desc" },
  });
}

export async function createTimeLog(
  userId: string,
  orgId: string,
  data: {
    jobId: string;
    date: Date;
    hours: number;
    isBillable: boolean;
    description?: string;
  }
) {
  return db.timeLog.create({
    data: {
      userId,
      orgId,
      jobId: data.jobId,
      date: data.date,
      hours: data.hours,
      isBillable: data.isBillable,
      description: data.description,
    },
  });
}

// ─── HR Help Desk ────────────────────────────────────────────────────────────

export async function getHelpDeskCases(orgId: string, userId: string, isAdmin: boolean) {
  const where: any = { orgId };
  if (!isAdmin) {
    where.userId = userId;
  }

  const cases = await db.hRCase.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true } },
      comments: { orderBy: { createdAt: "asc" } },
    },
  });

  const categories = await db.hRCaseCategory.findMany({
    where: { orgId },
    include: { faqs: true },
  });

  return {
    cases,
    categories,
  };
}

export async function createHRCase(
  userId: string,
  orgId: string,
  data: {
    categoryId: string;
    title: string;
    description: string;
    priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  }
) {
  const ticket = await db.hRCase.create({
    data: {
      orgId,
      userId,
      categoryId: data.categoryId,
      title: data.title,
      description: data.description,
      priority: data.priority,
      status: "OPEN",
    },
    include: { user: { select: { name: true } } },
  });

  // Notify HR admins
  const hrIds = await getUsersWithPermission(orgId, "hrms.helpdesk.manage");
  if (hrIds.length > 0) {
    await notifyMany(hrIds, {
      orgId,
      kind: "HR_CASE_CREATED",
      title: `New HR Desk Query Raised`,
      body: `${ticket.user.name} raised case: "${data.title}"`,
      link: "/hrms/peopleplus?service=hrcase",
      payload: { caseId: ticket.id },
    });
  }

  return ticket;
}

export async function addCaseComment(caseId: string, userId: string, message: string) {
  return db.hRCaseComment.create({
    data: {
      caseId,
      userId,
      message,
    },
  });
}

// ─── File Manager ────────────────────────────────────────────────────────────

export async function getFiles(orgId: string, userId: string, scope: "personal" | "organization" | "employee") {
  const folders = await db.fileFolder.findMany({
    where: { orgId, scope, OR: [
      { scope: "personal", createdById: userId },
      { scope: "organization" },
      { scope: "employee" },
    ]},
    orderBy: { name: "asc" },
  });

  const files = await db.fileAsset.findMany({
    where: { orgId, scope, OR: [
      { scope: "personal", createdById: userId },
      { scope: "organization" },
      { scope: "employee" },
    ]},
    orderBy: { name: "asc" },
  });

  return { folders, files };
}

export async function createFolder(orgId: string, name: string, scope: string, userId: string) {
  return db.fileFolder.create({
    data: {
      orgId,
      name,
      scope,
      createdById: userId,
    },
  });
}

export async function uploadFileAsset(
  orgId: string,
  name: string,
  fileKey: string,
  mimeType: string,
  sizeBytes: number,
  folderId: string | null,
  scope: string,
  userId: string
) {
  return db.fileAsset.create({
    data: {
      orgId,
      name,
      fileKey,
      mimeType,
      sizeBytes,
      folderId: folderId || undefined,
      scope,
      createdById: userId,
    },
  });
}

// ─── Surveys & Engagement ────────────────────────────────────────────────────

export async function getSurveys(orgId: string, userId: string) {
  const surveys = await db.survey.findMany({
    where: { orgId, status: "ACTIVE" },
    include: { questions: true },
  });

  const myResponses = await db.surveyResponse.findMany({
    where: { orgId, userId },
  });

  const myRespondedIds = new Set(myResponses.map((r) => r.surveyId));

  return surveys.map((s) => ({
    ...s,
    answered: myRespondedIds.has(s.id),
  }));
}

export async function submitSurveyResponse(
  orgId: string,
  surveyId: string,
  userId: string,
  answers: any
) {
  const survey = await db.survey.findUnique({
    where: { id: surveyId },
  });
  if (!survey) throw new Error("Survey not found");

  return db.surveyResponse.create({
    data: {
      orgId,
      surveyId,
      userId: survey.anonymous ? null : userId,
      answers,
    },
  });
}

// ─── Settings Customization ──────────────────────────────────────────────────

export async function getServiceDefinitions(orgId: string) {
  let list = await db.serviceDefinition.findMany({
    where: { orgId },
    orderBy: { position: "asc" },
  });

  if (list.length === 0) {
    // Seed default services for this org on request
    const defaults = [
      { key: "onboarding", name: "Onboarding", icon: "UserPlus", position: 1 },
      { key: "organization", name: "Employee Information", icon: "Users", position: 2 },
      { key: "leavetracker", name: "Leave Tracker", icon: "CalendarOff", position: 3 },
      { key: "attendance", name: "Attendance", icon: "Fingerprint", position: 4 },
      { key: "timetracker", name: "Time Tracker", icon: "Timer", position: 5 },
      { key: "performance", name: "Performance", icon: "Target", position: 6 },
      { key: "lms", name: "LMS", icon: "BookOpen", position: 7 },
      { key: "files", name: "Files", icon: "FolderOpen", position: 8 },
      { key: "employeeengagement", name: "Employee Engagement", icon: "HeartHandshake", position: 9 },
      { key: "hrcase", name: "HR Help Desk", icon: "HelpCircle", position: 10 },
    ];
    await db.serviceDefinition.createMany({
      data: defaults.map((d) => ({ orgId, ...d })),
    });
    list = await db.serviceDefinition.findMany({
      where: { orgId },
      orderBy: { position: "asc" },
    });
  }

  return list;
}

export async function updateServiceSettings(orgId: string, services: any[]) {
  return db.$transaction(
    services.map((s) =>
      db.serviceDefinition.update({
        where: { key: s.key },
        data: { enabled: s.enabled, position: s.position },
      })
    )
  );
}

// ─── Work Reports (Daily Update Reports) ──────────────────────────────────────

export async function getWorkReports(userId: string, orgId: string, filter: "my" | "reportees" | "all") {
  const whereClause: any = { orgId };

  if (filter === "my") {
    whereClause.userId = userId;
  } else if (filter === "reportees") {
    whereClause.user = { managerId: userId };
  } else if (filter === "all") {
    whereClause.OR = [
      { userId },
      { user: { managerId: userId } }
    ];
  }

  return db.workReport.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          employeeNumber: true,
          photo: true,
          email: true,
        }
      },
      approvals: {
        orderBy: { createdAt: "asc" }
      }
    }
  });
}

export async function createWorkReport(
  userId: string,
  orgId: string,
  data: {
    date: Date;
    workedOn: string;
    jobNoName: string;
    description: string;
    addedAddress?: string;
  }
) {
  // Find employee's manager
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { managerId: true }
  });

  const report = await db.workReport.create({
    data: {
      orgId,
      userId,
      date: data.date,
      workedOn: data.workedOn,
      jobNoName: data.jobNoName,
      description: data.description,
      addedAddress: data.addedAddress,
      modifiedAddress: data.addedAddress,
      status: user?.managerId ? "PENDING" : "APPROVED",
    }
  });

  // If employee has a manager, create a WorkReportApproval entry
  if (user?.managerId) {
    await db.workReportApproval.create({
      data: {
        reportId: report.id,
        approverId: user.managerId,
        status: "PENDING",
      }
    });
  }

  return report;
}

export async function submitWorkReportApproval(
  userId: string,
  orgId: string,
  reportId: string,
  status: "APPROVED" | "REJECTED",
  comments?: string
) {
  const approval = await db.workReportApproval.findFirst({
    where: {
      reportId,
      approverId: userId,
      status: "PENDING",
    }
  });

  if (!approval) {
    throw new Error("No pending approval request found for this report and approver.");
  }

  await db.workReportApproval.update({
    where: { id: approval.id },
    data: {
      status,
      comments,
    }
  });

  const updatedReport = await db.workReport.update({
    where: { id: reportId },
    data: {
      status,
    }
  });

  return updatedReport;
}

// ─── Team Reportees & Shifts ──────────────────────────────────────────────────

export async function getTeamReportees(userId: string, orgId: string) {
  const reportees = await db.user.findMany({
    where: { managerId: userId, orgId },
    select: {
      id: true,
      name: true,
      email: true,
      employeeNumber: true,
      designation: true,
      photo: true,
      branch: {
        select: {
          name: true
        }
      },
      hrmsShiftAssignments: {
        orderBy: { startDate: "desc" },
        take: 1,
        include: {
          shift: true
        }
      }
    }
  });

  const now = await getNow();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const result = [];
  for (const emp of reportees) {
    const punch = await db.attendancePunch.findUnique({
      where: { userId_date: { userId: emp.id, date: todayStart } }
    });

    let punchStatus: "YET_TO_CHECK_IN" | "CHECKED_IN" | "ON_BREAK" | "CHECKED_OUT" = "YET_TO_CHECK_IN";
    if (punch) {
      if (punch.outAt) {
        punchStatus = "CHECKED_OUT";
      } else if (punch.inAt) {
        const activeBreak = await db.attendanceBreak.findFirst({
          where: { punchId: punch.id, breakEnd: null }
        });
        punchStatus = activeBreak ? "ON_BREAK" : "CHECKED_IN";
      }
    }

    const currentShift = emp.hrmsShiftAssignments?.[0]?.shift || null;

    result.push({
      id: emp.id,
      name: emp.name,
      email: emp.email,
      employeeNo: String(emp.employeeNumber ?? ""),
      designation: emp.designation ?? "Associate",
      location: emp.branch?.name ?? "Chennai",
      photo: emp.photo,
      punchStatus,
      shift: currentShift ? {
        name: currentShift.name,
        startTime: currentShift.startTime,
        endTime: currentShift.endTime,
      } : null
    });
  }

  return result;
}

