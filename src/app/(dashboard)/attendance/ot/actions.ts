"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";

export async function getOtDashboardStatsAction(monthStr: string) {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const isAuthorized = (await can(session.user.id, "attendance.ot.approve")) || (await can(session.user.id, "attendance.punch.manage"));
    if (!isAuthorized) return { ok: false, error: "Forbidden" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Organisation not found" };

    const [yearStr, monthPartStr] = monthStr.split("-");
    const year = parseInt(yearStr!, 10);
    const month = parseInt(monthPartStr!, 10);
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0);

    const [approvedOt, lopRecords, pendingCount] = await Promise.all([
      db.otRecord.findMany({
        where: {
          user: { orgId },
          date: { gte: startOfMonth, lte: endOfMonth },
          approvalStatus: "APPROVED",
        },
        select: {
          otHours: true,
          otAmount: true,
          compOffDays: true,
        },
      }),
      db.employeeLop.findMany({
        where: {
          user: { orgId },
          payrollMonth: startOfMonth,
        },
        select: {
          lopDays: true,
        },
      }),
      db.otRecord.count({
        where: {
          user: { orgId },
          date: { gte: startOfMonth, lte: endOfMonth },
          approvalStatus: { in: ["PENDING", "PENDING_MANAGER"] },
        },
      }),
    ]);

    const totalOtHours = approvedOt.reduce((acc, r) => acc + r.otHours, 0);
    const totalOtAmount = approvedOt.reduce((acc, r) => acc + r.otAmount, 0);
    const totalCompOffDays = approvedOt.reduce((acc, r) => acc + r.compOffDays, 0);
    const totalLopDays = lopRecords.reduce((acc, r) => acc + r.lopDays, 0);

    return {
      ok: true,
      data: {
        totalOtHours,
        totalOtAmount,
        totalCompOffDays,
        totalLopDays,
        pendingCount,
      },
    };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to fetch dashboard stats" };
  }
}

export async function getOtRecordsAction(monthStr: string, statusFilter?: string) {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const isAuthorized = (await can(session.user.id, "attendance.ot.approve")) || (await can(session.user.id, "attendance.punch.manage"));
    if (!isAuthorized) return { ok: false, error: "Forbidden" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Organisation not found" };

    const [yearStr, monthPartStr] = monthStr.split("-");
    const year = parseInt(yearStr!, 10);
    const month = parseInt(monthPartStr!, 10);
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0);

    const where: any = {
      user: { orgId },
      date: { gte: startOfMonth, lte: endOfMonth },
    };

    if (statusFilter && statusFilter !== "ALL") {
      where.approvalStatus = statusFilter;
    }

    const records = await db.otRecord.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            employeeNumber: true,
            department: { select: { name: true } },
          },
        },
      },
      orderBy: [
        { user: { name: "asc" } },
        { date: "asc" },
      ],
    });

    return {
      ok: true,
      data: records,
    };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to fetch OT records" };
  }
}

export async function decideOtRecordAction(
  recordId: string,
  decision: "APPROVED" | "PENDING_MANAGER" | "REJECTED",
  remarks?: string
) {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const isAuthorized = (await can(session.user.id, "attendance.ot.approve")) || (await can(session.user.id, "attendance.punch.manage"));
    if (!isAuthorized) return { ok: false, error: "Forbidden" };

    const record = await db.otRecord.update({
      where: { id: recordId },
      data: {
        approvalStatus: decision,
        approvedById: decision === "APPROVED" ? session.user.id : null,
        rejectionRemarks: remarks || null,
      },
    });

    if (decision === "PENDING_MANAGER") {
      const employee = await db.user.findUnique({
        where: { id: record.userId },
        select: { managerId: true, name: true, orgId: true }
      });

      if (employee?.managerId) {
        const { notify } = await import("@/lib/notify");
        await notify({
          userId: employee.managerId,
          orgId: employee.orgId || undefined,
          kind: "OT_APPROVAL_REQUEST",
          title: `Overtime approval request for ${employee.name}`,
          body: `Admin has referred ${employee.name}'s overtime record on ${new Date(record.date).toLocaleDateString("en-IN")} to you for approval.`,
          link: "/attendance/ot",
          email: true,
        }).catch(err => console.error("Referral notification failed:", err));
      }
    }

    revalidatePath("/attendance/ot");
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to decide OT record" };
  }
}

export async function bulkDecideOtRecordsAction(
  recordIds: string[],
  decision: "APPROVED" | "PENDING_MANAGER" | "REJECTED"
) {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const isAuthorized = (await can(session.user.id, "attendance.ot.approve")) || (await can(session.user.id, "attendance.punch.manage"));
    if (!isAuthorized) return { ok: false, error: "Forbidden" };

    await db.otRecord.updateMany({
      where: { id: { in: recordIds } },
      data: {
        approvalStatus: decision,
        approvedById: decision === "APPROVED" ? session.user.id : null,
      },
    });

    if (decision === "PENDING_MANAGER") {
      const records = await db.otRecord.findMany({
        where: { id: { in: recordIds } },
        include: { user: { select: { managerId: true, name: true, orgId: true } } },
      });

      const { notify } = await import("@/lib/notify");
      for (const rec of records) {
        if (rec.user?.managerId) {
          await notify({
            userId: rec.user.managerId,
            orgId: rec.user.orgId || undefined,
            kind: "OT_APPROVAL_REQUEST",
            title: `Overtime approval request for ${rec.user.name}`,
            body: `Admin has referred ${rec.user.name}'s overtime record on ${new Date(rec.date).toLocaleDateString("en-IN")} to you for approval.`,
            link: "/attendance/ot",
            email: true,
          }).catch(err => console.error("Referral notification failed:", err));
        }
      }
    }

    revalidatePath("/attendance/ot");
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to process bulk action" };
  }
}

export async function adjustOtRecordAction(
  recordId: string,
  adjustedMins: number,
  earlyMins: number,
  compOffDays: number
) {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const isAuthorized = (await can(session.user.id, "attendance.ot.approve")) || (await can(session.user.id, "attendance.punch.manage"));
    if (!isAuthorized) return { ok: false, error: "Forbidden" };

    const record = await db.otRecord.findUnique({
      where: { id: recordId },
      include: { user: true },
    });

    if (!record) return { ok: false, error: "Record not found" };

    let rate = record.otRatePerHour;
    if (rate <= 0) {
      const orgId = session.user.orgId!;
      const dbSettings = await db.otSettings.findUnique({ where: { orgId } });
      const settings = {
        standardHours: dbSettings?.standardHours ?? 8.0,
        otRate: dbSettings?.otRate ?? 1.5,
        graceMinutes: dbSettings?.graceMinutes ?? 15,
        compOffSlabs: Array.isArray(dbSettings?.compOffSlabs) ? (dbSettings?.compOffSlabs as any[]) : [],
      };
      const dbCalendar = await db.workingCalendar.findUnique({ where: { orgId } });
      const dbHolidays = await db.holiday.findMany({
        where: {
          orgId,
          date: {
            gte: new Date(record.date.getFullYear(), record.date.getMonth(), 1),
            lte: new Date(record.date.getFullYear(), record.date.getMonth() + 1, 0),
          },
        },
      });
      const holidayDateStrings = dbHolidays.map((h) => new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(h.date));
      const { calendarFromDb } = await import("@/lib/working-hours");
      const calendarConfig = calendarFromDb(dbCalendar as any, holidayDateStrings);
      
      const { getEmployeeHourlyOtRate } = await import("@/lib/ot");
      rate = await getEmployeeHourlyOtRate(record.userId, record.date, settings as any, calendarConfig);
    }

    const otHours = Number((adjustedMins / 60).toFixed(2));
    const otAmount = Number((otHours * rate).toFixed(2));

    await db.otRecord.update({
      where: { id: recordId },
      data: {
        otHours,
        otAmount,
        otRatePerHour: rate,
        earlyLeavingMins: earlyMins,
        compOffDays,
        approvalStatus: "APPROVED",
        approvedById: session.user.id,
      },
    });

    revalidatePath("/attendance/ot");
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to adjust record" };
  }
}

export async function getOtSettingsAction() {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const isAuthorized = (await can(session.user.id, "attendance.ot.approve")) || (await can(session.user.id, "attendance.punch.manage"));
    if (!isAuthorized) return { ok: false, error: "Forbidden" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Organisation not found" };

    const settings = await db.otSettings.findUnique({
      where: { orgId },
    });

    return {
      ok: true,
      data: settings || {
        orgId,
        standardHours: 8.0,
        otRate: 1.5,
        graceMinutes: 15,
        compOffSlabs: [
          { minHours: 4, compOffDays: 0.5 },
          { minHours: 8, compOffDays: 1.0 },
          { minHours: 11, compOffDays: 1.5 },
        ],
      },
    };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to get OT settings" };
  }
}

export async function saveOtSettingsAction(data: {
  standardHours: number;
  otRate: number;
  graceMinutes: number;
  compOffSlabs: any;
}) {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const isAuthorized = (await can(session.user.id, "attendance.ot.approve")) || (await can(session.user.id, "attendance.punch.manage"));
    if (!isAuthorized) return { ok: false, error: "Forbidden" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Organisation not found" };

    const settings = await db.otSettings.upsert({
      where: { orgId },
      update: {
        standardHours: data.standardHours,
        otRate: data.otRate,
        graceMinutes: data.graceMinutes,
        compOffSlabs: data.compOffSlabs,
      },
      create: {
        orgId,
        standardHours: data.standardHours,
        otRate: data.otRate,
        graceMinutes: data.graceMinutes,
        compOffSlabs: data.compOffSlabs,
      },
    });

    revalidatePath("/attendance/ot");
    return { ok: true, data: settings };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to save OT settings" };
  }
}

export async function getHolidaysAction(year: number) {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const isAuthorized = (await can(session.user.id, "attendance.ot.approve")) || (await can(session.user.id, "attendance.punch.manage"));
    if (!isAuthorized) return { ok: false, error: "Forbidden" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Organisation not found" };

    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31);

    const holidays = await db.holiday.findMany({
      where: {
        orgId,
        date: { gte: startOfYear, lte: endOfYear },
      },
      include: {
        branch: { select: { name: true } },
      },
      orderBy: { date: "asc" },
    });

    return { ok: true, data: holidays };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to fetch holidays" };
  }
}

export async function saveHolidayAction(data: {
  id?: string;
  date: string;
  name: string;
  holidayType: string;
  branchId?: string | null;
}) {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const isAuthorized = (await can(session.user.id, "attendance.ot.approve")) || (await can(session.user.id, "attendance.punch.manage"));
    if (!isAuthorized) return { ok: false, error: "Forbidden" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Organisation not found" };

    const holidayDate = new Date(data.date);

    if (data.id) {
      await db.holiday.update({
        where: { id: data.id },
        data: {
          date: holidayDate,
          name: data.name,
          holidayType: data.holidayType,
          branchId: data.branchId || null,
        },
      });
    } else {
      await db.holiday.create({
        data: {
          orgId,
          date: holidayDate,
          name: data.name,
          holidayType: data.holidayType,
          branchId: data.branchId || null,
        },
      });
    }

    revalidatePath("/attendance/ot");
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to save holiday" };
  }
}

export async function deleteHolidayAction(id: string) {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const isAuthorized = (await can(session.user.id, "attendance.ot.approve")) || (await can(session.user.id, "attendance.punch.manage"));
    if (!isAuthorized) return { ok: false, error: "Forbidden" };

    await db.holiday.delete({ where: { id } });

    revalidatePath("/attendance/ot");
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to delete holiday" };
  }
}

export async function getLopRecordsAction(monthStr: string) {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const isAuthorized = (await can(session.user.id, "attendance.ot.approve")) || (await can(session.user.id, "attendance.punch.manage"));
    if (!isAuthorized) return { ok: false, error: "Forbidden" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Organisation not found" };

    const [yearStr, monthPartStr] = monthStr.split("-");
    const year = parseInt(yearStr!, 10);
    const month = parseInt(monthPartStr!, 10);
    const startOfMonth = new Date(year, month - 1, 1);

    const lopRecords = await db.employeeLop.findMany({
      where: {
        user: { orgId },
        payrollMonth: startOfMonth,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            employeeNumber: true,
            department: { select: { name: true } },
          },
        },
      },
      orderBy: { user: { name: "asc" } },
    });

    return { ok: true, data: lopRecords };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to fetch LOP records" };
  }
}

export async function saveLopRecordAction(data: {
  userId: string;
  monthStr: string;
  lopDays: number;
  remarks?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const isAuthorized = (await can(session.user.id, "attendance.ot.approve")) || (await can(session.user.id, "attendance.punch.manage"));
    if (!isAuthorized) return { ok: false, error: "Forbidden" };

    const [yearStr, monthPartStr] = data.monthStr.split("-");
    const year = parseInt(yearStr!, 10);
    const month = parseInt(monthPartStr!, 10);
    const startOfMonth = new Date(year, month - 1, 1);

    await db.employeeLop.upsert({
      where: {
        userId_payrollMonth: {
          userId: data.userId,
          payrollMonth: startOfMonth,
        },
      },
      update: {
        lopDays: data.lopDays,
        remarks: data.remarks || null,
        createdById: session.user.id,
      },
      create: {
        userId: data.userId,
        payrollMonth: startOfMonth,
        lopDays: data.lopDays,
        remarks: data.remarks || null,
        createdById: session.user.id,
      },
    });

    revalidatePath("/attendance/ot");
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to save LOP record" };
  }
}

export async function deleteLopRecordAction(id: string) {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const isAuthorized = (await can(session.user.id, "attendance.ot.approve")) || (await can(session.user.id, "attendance.punch.manage"));
    if (!isAuthorized) return { ok: false, error: "Forbidden" };

    await db.employeeLop.delete({ where: { id } });

    revalidatePath("/attendance/ot");
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to delete LOP record" };
  }
}

export async function generatePayrollSummaryAction(monthStr: string) {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const isAuthorized = (await can(session.user.id, "attendance.ot.approve")) || (await can(session.user.id, "attendance.punch.manage"));
    if (!isAuthorized) return { ok: false, error: "Forbidden" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Organisation not found" };

    const [yearStr, monthPartStr] = monthStr.split("-");
    const year = parseInt(yearStr!, 10);
    const month = parseInt(monthPartStr!, 10);
    const monthDate = new Date(year, month - 1, 1);

    const { generatePayrollSummary } = await import("@/lib/ot");
    const summary = await generatePayrollSummary(orgId, monthDate);

    return { ok: true, data: summary };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to generate payroll summary" };
  }
}

export async function processMonthOtAction(monthStr: string) {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const isAuthorized = (await can(session.user.id, "attendance.ot.approve")) || (await can(session.user.id, "attendance.punch.manage"));
    if (!isAuthorized) return { ok: false, error: "Forbidden" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Organisation not found" };

    const [yearStr, monthPartStr] = monthStr.split("-");
    const year = parseInt(yearStr!, 10);
    const month = parseInt(monthPartStr!, 10);
    const monthDate = new Date(year, month - 1, 1);

    const { processMonthOt } = await import("@/lib/ot");
    const result = await processMonthOt(orgId, monthDate);

    revalidatePath("/attendance/ot");
    return { ok: true, data: result };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to process month OT" };
  }
}

export async function getActiveEmployeesAction() {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const isAuthorized = (await can(session.user.id, "attendance.ot.approve")) || (await can(session.user.id, "attendance.punch.manage"));
    if (!isAuthorized) return { ok: false, error: "Forbidden" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Organisation not found" };

    const employees = await db.user.findMany({
      where: { orgId, active: true, isPlatformAdmin: false },
      select: {
        id: true,
        name: true,
        employeeNumber: true,
        department: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    });

    return { ok: true, data: employees };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to fetch active employees" };
  }
}

export async function getBranchesAction() {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const isAuthorized = (await can(session.user.id, "attendance.ot.approve")) || (await can(session.user.id, "attendance.punch.manage"));
    if (!isAuthorized) return { ok: false, error: "Forbidden" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Organisation not found" };

    const branches = await db.branch.findMany({
      where: { orgId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    return { ok: true, data: branches };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to fetch branches" };
  }
}

type Result = { ok: true } | { ok: false; error: string };

export async function requestOtAction(formData: FormData): Promise<Result> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    await requirePermissionAction(session.user.id, "attendance.ot.request");

    const dateStr = formData.get("date") as string;
    const hoursStr = formData.get("hours") as string;
    const notes = formData.get("notes") as string;

    if (!dateStr || !hoursStr) {
      return { ok: false, error: "Missing required fields" };
    }

    const date = new Date(dateStr);
    const hours = parseFloat(hoursStr);

    if (isNaN(hours) || hours <= 0 || hours > 16) {
      return { ok: false, error: "Hours must be between 0.5 and 16" };
    }

    const { createOTEntry } = await import("@/modules/attendance/service");
    await createOTEntry(session.user.id, {
      date,
      hours,
      notes: notes || undefined,
    });

    revalidatePath("/attendance/ot");
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to submit OT request" };
  }
}

export async function decideOtAction(formData: FormData): Promise<Result> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    await requirePermissionAction(session.user.id, "attendance.ot.approve");

    const entryId = formData.get("entryId") as string;
    const decision = formData.get("decision") as "approved" | "rejected";

    if (!entryId || !decision) {
      return { ok: false, error: "Missing parameters" };
    }

    const { decideOT } = await import("@/modules/attendance/service");
    await decideOT(entryId, session.user.id, decision);

    revalidatePath("/attendance/ot");
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to process OT decision" };
  }
}

async function requirePermissionAction(userId: string, permissionKey: string) {
  const allowed = await can(userId, permissionKey);
  if (!allowed) {
    throw new Error(`Forbidden: missing permission ${permissionKey}`);
  }
}

export async function importAttendanceDataAction(
  rows: any[],
  mapping: {
    employeeNumber?: string;
    employeeName?: string;
    officialEmail?: string;
    attendanceDate: string;
    checkIn?: string;
    checkOut?: string;
    totalHours?: string;
  }
) {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const isAuthorized = (await can(session.user.id, "attendance.ot.approve")) || (await can(session.user.id, "attendance.punch.manage"));
    if (!isAuthorized) return { ok: false, error: "Forbidden" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Organisation not found" };

    // Fetch employees
    const employees = await db.user.findMany({
      where: { orgId, active: true, isPlatformAdmin: false },
      select: { id: true, name: true, email: true, employeeNumber: true },
    });

    let imported = 0;
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    const { calculateOtForPunch } = await import("@/lib/ot");

    for (const [index, row] of rows.entries()) {
      try {
        // Match employee
        const empNumVal = row[mapping.employeeNumber || ""];
        const emailVal = String(row[mapping.officialEmail || ""] || "").trim().toLowerCase();
        const nameVal = String(row[mapping.employeeName || ""] || "").trim().toLowerCase();
        const empNumber = empNumVal ? parseInt(String(empNumVal).replace(/,/g, ""), 10) : null;

        let matchedEmp = null;
        if (empNumber !== null && !isNaN(empNumber)) {
          matchedEmp = employees.find((e) => e.employeeNumber === empNumber);
        }
        if (!matchedEmp && emailVal) {
          matchedEmp = employees.find((e) => e.email.toLowerCase() === emailVal);
        }
        if (!matchedEmp && nameVal) {
          matchedEmp = employees.find((e) => e.name.toLowerCase() === nameVal);
        }

        if (!matchedEmp) {
          throw new Error(`Employee match not found (ID: ${empNumVal || "N/A"}, Name: ${nameVal || "N/A"}, Email: ${emailVal || "N/A"})`);
        }

        // Parse Date
        const dateVal = row[mapping.attendanceDate];
        if (!dateVal) throw new Error("Missing attendance date");

        let attendanceDate = null;
        const strDate = String(dateVal).trim();
        // Try standard new Date
        const standardDate = new Date(strDate);
        if (!isNaN(standardDate.getTime())) {
          attendanceDate = standardDate;
        } else {
          const parts = strDate.split(/[-/]/);
          if (parts.length === 3) {
            const day = parseInt(parts[0]!, 10);
            const month = parseInt(parts[1]!, 10);
            const year = parseInt(parts[2]!, 10);
            if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
              const fullYear = year < 100 ? 2000 + year : year;
              attendanceDate = new Date(fullYear, month - 1, day);
            }
          }
        }

        if (!attendanceDate || isNaN(attendanceDate.getTime())) {
          throw new Error(`Invalid date format: ${dateVal}`);
        }

        // Normalize to IST Midnight to match database format
        const year = attendanceDate.getFullYear();
        const month = attendanceDate.getMonth() + 1;
        const day = attendanceDate.getDate();
        const normalizedDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));

        // Parse check-in/out
        const rawIn = row[mapping.checkIn || ""];
        const rawOut = row[mapping.checkOut || ""];

        let checkIn = null;
        if (rawIn) {
          const parsedIn = parseTimeStr(normalizedDate, String(rawIn));
          if (parsedIn) checkIn = parsedIn;
        }

        let checkOut = null;
        if (rawOut) {
          const parsedOut = parseTimeStr(normalizedDate, String(rawOut));
          if (parsedOut) checkOut = parsedOut;
        }

        // Parse total hours worked
        let workingHours = null;
        const rawHours = row[mapping.totalHours || ""];
        if (rawHours) {
          const parsedHours = parseFloat(String(rawHours).replace(/,/g, ""));
          if (!isNaN(parsedHours)) workingHours = parsedHours;
        }

        if (checkIn && checkOut && !workingHours) {
          workingHours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
          workingHours = Math.round(workingHours * 100) / 100;
        }

        const existing = await db.attendancePunch.findUnique({
          where: { userId_date: { userId: matchedEmp.id, date: normalizedDate } },
          select: { id: true },
        });

        // Upsert punch record
        await db.attendancePunch.upsert({
          where: { userId_date: { userId: matchedEmp.id, date: normalizedDate } },
          update: {
            inAt: checkIn,
            outAt: checkOut,
            workingHours,
            source: "import",
            biometricSynced: false,
          },
          create: {
            userId: matchedEmp.id,
            date: normalizedDate,
            inAt: checkIn,
            outAt: checkOut,
            workingHours,
            source: "import",
            biometricSynced: false,
          },
        });

        // Recalculate calculations
        await calculateOtForPunch(matchedEmp.id, normalizedDate);

        if (existing) updated++;
        else imported++;
      } catch (err: any) {
        skipped++;
        if (errors.length < 50) {
          errors.push(`Row ${index + 2}: ${err.message || String(err)}`);
        }
      }
    }

    revalidatePath("/attendance/ot");
    return {
      ok: true,
      data: {
        imported,
        updated,
        skipped,
        errors,
      },
    };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to import attendance data" };
  }
}

function parseTimeStr(date: Date, val: string): Date | null {
  const raw = val.trim();
  if (!raw) return null;

  const match = raw.match(/^(\d{1,2})(?::(\d{2}))(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (!match) {
    const full = new Date(raw);
    if (!isNaN(full.getTime())) return full;
    return null;
  }

  let hour = parseInt(match[1]!, 10);
  const minute = parseInt(match[2] ?? "0", 10);
  const second = parseInt(match[3] ?? "0", 10);
  const meridiem = match[4]?.toUpperCase();

  if (meridiem === "PM" && hour < 12) hour += 12;
  if (meridiem === "AM" && hour === 12) hour = 0;

  const result = new Date(date);
  result.setHours(hour, minute, second, 0);
  return result;
}

export async function clearMonthOtRecordsAction(monthStr: string) {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };

    const isAuthorized = (await can(session.user.id, "attendance.ot.approve")) || (await can(session.user.id, "attendance.punch.manage"));
    if (!isAuthorized) return { ok: false, error: "Forbidden" };

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Organisation not found" };

    const [yearStr, monthPartStr] = monthStr.split("-");
    const year = parseInt(yearStr!, 10);
    const month = parseInt(monthPartStr!, 10);
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0);

    // Delete OtRecords
    const deletedOt = await db.otRecord.deleteMany({
      where: {
        user: { orgId },
        date: { gte: startOfMonth, lte: endOfMonth },
      },
    });

    // Delete AttendancePunches that were imported
    const deletedPunches = await db.attendancePunch.deleteMany({
      where: {
        user: { orgId },
        date: { gte: startOfMonth, lte: endOfMonth },
        source: "import",
      },
    });

    revalidatePath("/attendance/ot");
    return {
      ok: true,
      data: {
        deletedOtCount: deletedOt.count,
        deletedPunchesCount: deletedPunches.count,
      },
    };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to clear month records" };
  }
}
