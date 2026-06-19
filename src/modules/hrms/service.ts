import { db } from "@/lib/db";
import { notify } from "@/lib/notify";
import { notifyMany, getUsersWithPermission } from "@/modules/notifications/service";
import { getNow } from "@/lib/clock";
import { loadUserPermissions } from "@/lib/rbac";
import { getAttendanceMonthBounds, toAttendanceDate } from "@/lib/attendance-date";

// ─── Core & Dashboard ──────────────────────────────────────────────────────────

export async function getMe(userId: string) {
  // getNow is request-memoized; call it first so todayStart is available for the
  // punch query, then fire all independent DB calls in parallel.
  const now = await getNow();
  const todayStart = toAttendanceDate(now);

  const [user, punch, pendingLeaves, pendingCases, pendingTasks, pref, permsSet] =
    await Promise.all([
      db.user.findUnique({
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
        },
      }),
      db.attendancePunch.findUnique({
        where: { userId_date: { userId, date: todayStart } },
      }),
      db.leaveRequest.count({ where: { userId, status: "pending" } }),
      db.hRCase.count({
        where: { userId, status: { in: ["OPEN", "ASSIGNED", "IN_PROGRESS"] } },
      }),
      db.hrmsTask.count({ where: { assigneeId: userId, status: "PENDING" } }),
      db.employeePreference.findUnique({ where: { userId } }),
      // loadUserPermissions is React-cached — zero extra DB round trip when the
      // calling route already resolved permissions (e.g. requirePermission above).
      loadUserPermissions(userId),
    ]);

  if (!user) throw new Error("User not found");

  let attendanceStatus: "YET_TO_CHECK_IN" | "CHECKED_IN" | "ON_BREAK" | "CHECKED_OUT" =
    "YET_TO_CHECK_IN";
  let totalInTime = "00:00:00";

  if (punch) {
    if (punch.outAt) {
      attendanceStatus = "CHECKED_OUT";
    } else if (punch.inAt) {
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

  let activePref = pref;
  if (!activePref) {
    activePref = await db.employeePreference.create({
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
    permissions: Array.from(permsSet),
    widgets: JSON.parse(activePref.widgets as string),
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
  const todayStart = toAttendanceDate(now);

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
  const { start: from, end: to } = getAttendanceMonthBounds(year, month);

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
      link: "/attendance/leaves",
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
      link: "/hrms/helpdesk",
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
  const todayStart = toAttendanceDate(now);

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

// ─── Onboarding & Profile Verification ───────────────────────────────────────

export async function getOnboardingStatus(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      dob: true,
      gender: true,
      personalPhone: true,
      aadhaar: true,
      pan: true,
      uan: true,
      bankName: true,
      bankAccount: true,
      ifsc: true,
      photo: true,
      hrmsContact: true,
    },
  });
  if (!user) throw new Error("User not found");

  const checklist = [
    { key: "personal_details", label: "Personal Profile", completed: !!(user.firstName && user.lastName && user.dob && user.gender) },
    { key: "contact_details", label: "Contact Details", completed: !!(user.personalPhone && user.hrmsContact?.emergencyPhone && user.hrmsContact?.addressLine1) },
    { key: "financial_details", label: "Bank & Financial Details", completed: !!(user.bankName && user.bankAccount && user.ifsc) },
    { key: "statutory_ids", label: "Statutory IDs (PAN & Aadhaar)", completed: !!(user.pan && user.aadhaar) },
  ];

  const total = checklist.length;
  const completed = checklist.filter((item) => item.completed).length;
  const progressPercent = Math.round((completed / total) * 100);

  return {
    user,
    checklist,
    progressPercent,
  };
}

export async function submitOnboardingDetails(userId: string, data: any) {
  const { personal, contact, financial, statutory } = data;

  return db.user.update({
    where: { id: userId },
    data: {
      firstName: personal?.firstName,
      lastName: personal?.lastName,
      dob: personal?.dob ? new Date(personal.dob) : undefined,
      gender: personal?.gender,
      personalPhone: contact?.personalPhone,
      bankName: financial?.bankName,
      bankAccount: financial?.bankAccount,
      ifsc: financial?.ifsc,
      pan: statutory?.pan,
      aadhaar: statutory?.aadhaar,
      uan: statutory?.uan,
      hrmsContact: {
        upsert: {
          create: {
            personalEmail: contact?.personalEmail,
            emergencyName: contact?.emergencyName,
            emergencyPhone: contact?.emergencyPhone,
            addressLine1: contact?.addressLine1,
            addressLine2: contact?.addressLine2,
            city: contact?.city,
            state: contact?.state,
            country: contact?.country,
            zipCode: contact?.zipCode,
          },
          update: {
            personalEmail: contact?.personalEmail,
            emergencyName: contact?.emergencyName,
            emergencyPhone: contact?.emergencyPhone,
            addressLine1: contact?.addressLine1,
            addressLine2: contact?.addressLine2,
            city: contact?.city,
            state: contact?.state,
            country: contact?.country,
            zipCode: contact?.zipCode,
          },
        },
      },
    },
  });
}

// ─── LMS Services ────────────────────────────────────────────────────────────

export async function getLmsCourses(orgId: string, userId: string) {
  const courses = await db.course.findMany({
    where: { orgId },
    include: {
      enrollments: {
        where: { userId },
      },
    },
  });

  if (courses.length === 0) {
    // Seed default logistics and compliance courses
    const defaults = [
      { title: "Logistics Operations & Supply Chain", duration: "10 Hours", category: "Operations", description: "Basic concepts of freight management, shipping lines, and supply chain strategies." },
      { title: "Security and Safety Compliance", duration: "2 Hours", category: "Compliance", description: "Information security, physical warehouse safety rules, and GDPR compliance." },
      { title: "Customer Relationship Management in Freight", duration: "5 Hours", category: "CRM", description: "How to capture, manage, and coordinate deals and invoices inside the monolith portal." },
    ];
    await db.course.createMany({
      data: defaults.map((d) => ({ orgId, ...d })),
    });
    return db.course.findMany({
      where: { orgId },
      include: {
        enrollments: {
          where: { userId },
        },
      },
    });
  }

  return courses;
}

export async function enrollInCourse(userId: string, courseId: string) {
  const existing = await db.courseEnrollment.findFirst({
    where: { userId, courseId },
  });
  if (existing) return existing;

  return db.courseEnrollment.create({
    data: {
      userId,
      courseId,
      status: "ENROLLED",
      progress: 0.0,
    },
  });
}

export async function updateCourseProgress(userId: string, courseId: string, progress: number) {
  const enrollment = await db.courseEnrollment.findFirst({
    where: { userId, courseId },
  });

  if (!enrollment) {
    throw new Error("User not enrolled in this course");
  }

  const status = progress >= 100 ? "COMPLETED" : "IN_PROGRESS";
  const completedAt = progress >= 100 ? await getNow() : null;

  return db.courseEnrollment.update({
    where: { id: enrollment.id },
    data: {
      progress,
      status,
      completedAt,
    },
  });
}

// ─── PMS / Performance Services ──────────────────────────────────────────────

export async function getPerformanceData(userId: string, orgId: string) {
  const goals = await db.goal.findMany({
    where: { userId },
    orderBy: { dueDate: "asc" },
  });

  const skills = await db.employeeSkill.findMany({
    where: { userId },
    include: { skill: true },
  });

  const feedbacks = await db.performanceFeedback.findMany({
    where: {
      OR: [
        { fromUserId: userId },
        { toUserId: userId },
      ],
    },
    include: {
      fromUser: { select: { name: true, photo: true } },
      toUser: { select: { name: true, photo: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return {
    goals,
    skills,
    feedbacks,
  };
}

export async function createPerformanceGoal(userId: string, orgId: string, title: string, target: string, dueDate: Date) {
  return db.goal.create({
    data: {
      orgId,
      userId,
      title,
      target,
      dueDate,
      status: "NOT_STARTED",
      progress: 0.0,
    },
  });
}

export async function updateGoalProgress(goalId: string, progress: number) {
  const status = progress >= 100 ? "COMPLETED" : progress > 0 ? "IN_PROGRESS" : "NOT_STARTED";
  return db.goal.update({
    where: { id: goalId },
    data: {
      progress,
      status,
    },
  });
}

export async function submitPerformanceFeedback(fromUserId: string, toUserId: string, orgId: string, content: string, feedbackType: string) {
  return db.performanceFeedback.create({
    data: {
      orgId,
      fromUserId,
      toUserId,
      content,
      feedbackType,
    },
  });
}

// ─── Travel & Expenses Services ──────────────────────────────────────────────

export async function getTravelRequests(userId: string, orgId: string) {
  return db.travelRequest.findMany({
    where: { userId, orgId },
    include: { expenses: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function createTravelRequest(userId: string, orgId: string, purpose: string, destination: string, fromDate: Date, toDate: Date) {
  return db.travelRequest.create({
    data: {
      orgId,
      userId,
      purpose,
      destination,
      fromDate,
      toDate,
      status: "PENDING",
    },
  });
}

export async function createTravelExpense(travelRequestId: string, amount: number, category: string, billFileKey?: string) {
  return db.travelExpense.create({
    data: {
      travelRequestId,
      amount,
      category,
      billFileKey,
      status: "PENDING",
    },
  });
}

// ─── HR Letters Services ─────────────────────────────────────────────────────

export async function getHRLetterTemplates(orgId: string) {
  const templates = await db.hRLetterTemplate.findMany({
    where: { orgId },
  });

  if (templates.length === 0) {
    // Seed default template items
    const defaults = [
      { name: "Bonafide Certificate", content: "<p>This is to certify that <strong>{{employeeName}}</strong> is a bona fide employee of our organisation as a <strong>{{designation}}</strong>.</p>", variables: JSON.stringify(["employeeName", "designation"]) },
      { name: "No Objection Certificate (NOC)", content: "<p>We have no objection to <strong>{{employeeName}}</strong> pursuing their educational training or visa procedures. Their designation is <strong>{{designation}}</strong>.</p>", variables: JSON.stringify(["employeeName", "designation"]) },
      { name: "Experience Certificate", content: "<p>This certifies that <strong>{{employeeName}}</strong> worked with us from <strong>{{joiningDate}}</strong> as a <strong>{{designation}}</strong>.</p>", variables: JSON.stringify(["employeeName", "designation", "joiningDate"]) },
    ];
    await db.hRLetterTemplate.createMany({
      data: defaults.map((d) => ({ orgId, ...d })),
    });
    return db.hRLetterTemplate.findMany({
      where: { orgId },
    });
  }

  return templates;
}

export async function getHRLetterRequests(userId: string, orgId: string) {
  return db.hRLetterRequest.findMany({
    where: { userId, orgId },
    orderBy: { createdAt: "desc" },
  });
}

export async function createHRLetterRequest(userId: string, orgId: string, templateId: string, details: any) {
  return db.hRLetterRequest.create({
    data: {
      orgId,
      userId,
      templateId,
      status: "PENDING",
      details: details ? JSON.stringify(details) : "{}",
    },
  });
}

// ─── Tasks Services ──────────────────────────────────────────────────────────

export async function getHrmsTasks(userId: string, orgId: string) {
  return db.hrmsTask.findMany({
    where: {
      orgId,
      OR: [
        { assigneeId: userId },
        { createdById: userId },
      ],
    },
    include: {
      assignee: { select: { name: true, photo: true } },
      createdBy: { select: { name: true } },
    },
    orderBy: { dueDate: "asc" },
  });
}

export async function createHrmsTask(orgId: string, createdById: string, title: string, description: string | null, dueDate: Date, assigneeId: string, priority: "LOW" | "MEDIUM" | "HIGH") {
  return db.hrmsTask.create({
    data: {
      orgId,
      createdById,
      title,
      description,
      dueDate,
      assigneeId,
      priority,
      status: "PENDING",
    },
  });
}

export async function updateHrmsTaskStatus(taskId: string, status: "PENDING" | "COMPLETED") {
  return db.hrmsTask.update({
    where: { id: taskId },
    data: { status },
  });
}

// ─── Approvals Inbox Services ───────────────────────────────────────────────

export async function getPendingApprovals(userId: string, orgId: string, isAdmin: boolean) {
  // If admin: load all pending items in the org. Otherwise, load requests where managerId = userId
  const managerFilter = isAdmin ? {} : { user: { managerId: userId } };
  const otManagerFilter = isAdmin ? {} : { user: { managerId: userId } };
  const workReportFilter = isAdmin ? {} : { report: { user: { managerId: userId } } };

  const [leaves, regularizations, ots, travels, timesheets, workreports] = await Promise.all([
    db.leaveRequest.findMany({
      where: { ...managerFilter, status: "pending" },
      include: {
        user: { select: { name: true, employeeNumber: true, photo: true } },
        leaveType: true,
      },
    }),
    db.attendanceRegularization.findMany({
      where: { ...managerFilter, status: "PENDING" },
      include: {
        user: { select: { name: true, employeeNumber: true, photo: true } },
      },
    }),
    db.otRecord.findMany({
      where: { ...managerFilter, approvalStatus: "PENDING" },
      include: {
        user: { select: { name: true, employeeNumber: true, photo: true } },
      },
    }),
    db.travelRequest.findMany({
      where: { ...managerFilter, status: "PENDING" },
      include: {
        user: { select: { name: true, employeeNumber: true, photo: true } },
      },
    }),
    db.timesheetSubmission.findMany({
      where: { ...managerFilter, status: "PENDING" },
      include: {
        user: { select: { name: true, employeeNumber: true, photo: true } },
      },
    }),
    db.workReportApproval.findMany({
      where: { ...workReportFilter, status: "PENDING" },
      include: {
        report: {
          include: {
            user: { select: { name: true, employeeNumber: true, photo: true } },
          },
        },
      },
    }),
  ]);

  return {
    leaves,
    regularizations,
    ots,
    travels,
    timesheets,
    workreports,
  };
}

export async function executeApprovalDecision(
  userId: string,
  requestId: string,
  type: "LEAVE" | "REGULARIZATION" | "OT" | "TRAVEL" | "TIMESHEET" | "WORKREPORT",
  decision: "APPROVED" | "REJECTED",
  remarks?: string
) {
  const now = await getNow();

  if (type === "LEAVE") {
    const status = decision === "APPROVED" ? "approved" : "rejected";
    return db.leaveRequest.update({
      where: { id: requestId },
      data: { status, approverId: userId, notes: remarks },
    });
  }

  if (type === "REGULARIZATION") {
    return db.attendanceRegularization.update({
      where: { id: requestId },
      data: { status: decision, approvedById: userId, remarks },
    });
  }

  if (type === "OT") {
    return db.otRecord.update({
      where: { id: requestId },
      data: { approvalStatus: decision, approvedById: userId, rejectionRemarks: remarks },
    });
  }

  if (type === "TRAVEL") {
    return db.travelRequest.update({
      where: { id: requestId },
      data: { status: decision, approvedById: userId },
    });
  }

  if (type === "TIMESHEET") {
    return db.timesheetSubmission.update({
      where: { id: requestId },
      data: { status: decision, approvedById: userId },
    });
  }

  if (type === "WORKREPORT") {
    await db.workReportApproval.updateMany({
      where: { reportId: requestId, approverId: userId },
      data: { status: decision, comments: remarks },
    });
    return db.workReport.update({
      where: { id: requestId },
      data: { status: decision },
    });
  }

  throw new Error("Unsupported approval type");
}


