import { auth } from "@/lib/auth";
import { loadCaps } from "@/lib/rbac";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { OtClient } from "./ot-client";
import { Clock } from "lucide-react";
import { getOTEntries } from "@/modules/attendance/service";
import { getNow } from "@/lib/clock";

export const metadata = {
  title: "Overtime Management | Attendance | Adarsh Shipping",
};

interface PageProps {
  searchParams?: Promise<{ month?: string }> | { month?: string };
}

type OtClientProps = React.ComponentProps<typeof OtClient>;

export default async function OvertimePage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session) redirect("/login");

  const caps = await loadCaps(session.user.id);
  const canApprove = Boolean(caps["attendance.ot.approve"] || caps["attendance.punch.manage"]);
  const canRequest = Boolean(caps["attendance.ot.request"]);

  if (!canApprove && !canRequest) {
    return (
      <div className="rounded-xl border border-outline-variant bg-surface p-8 text-center text-sm text-on-surface-variant">
        Access Denied: You do not have permissions for Overtime Management.
      </div>
    );
  }

  const orgId = session.user.orgId;
  if (!orgId) {
    return (
      <div className="rounded-xl border border-outline-variant bg-surface p-8 text-center text-sm text-on-surface-variant">
        Organisation configuration missing.
      </div>
    );
  }

  // Resolve searchParams month
  const resolvedParams = await (searchParams instanceof Promise ? searchParams : Promise.resolve(searchParams));
  const nowIst = await getNow();
  const defaultMonth = `${nowIst.getUTCFullYear()}-${String(nowIst.getUTCMonth() + 1).padStart(2, "0")}`;
  const monthStr = resolvedParams?.month || defaultMonth;
  const [yearStr, monthPartStr] = monthStr.split("-");
  const currentYear = parseInt(yearStr!, 10) || nowIst.getUTCFullYear();
  const currentMonth = parseInt(monthPartStr!, 10) || (nowIst.getUTCMonth() + 1);

  const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
  const endOfMonth = new Date(currentYear, currentMonth, 0);

  // Load basic entries for legacy requesting users
  const legacyEntries = !canApprove
    ? await getOTEntries(orgId, { userId: session.user.id })
    : [];

  // If user is admin/manager, load all admin data
  let adminData = null;
  if (canApprove) {
    // 1. Fetch Stats
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

    // 2. Fetch OT Records
    const otRecords = await db.otRecord.findMany({
      where: {
        user: { orgId },
        date: { gte: startOfMonth, lte: endOfMonth },
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
      orderBy: [
        { user: { name: "asc" } },
        { date: "asc" },
      ],
    });

    // 3. Fetch Holidays for the current year
    const holidays = await db.holiday.findMany({
      where: {
        orgId,
        date: {
          gte: new Date(currentYear, 0, 1),
          lte: new Date(currentYear, 11, 31),
        },
      },
      include: {
        branch: { select: { name: true } },
      },
      orderBy: { date: "asc" },
    });

    // 4. Fetch LOP Records
    const lopRecordsDb = await db.employeeLop.findMany({
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

    // 5. Fetch Settings
    const otSettings = await db.otSettings.findUnique({
      where: { orgId },
    });

    const settings = otSettings || {
      id: "global",
      orgId,
      standardHours: 8.0,
      otRate: 1.5,
      graceMinutes: 15,
      compOffSlabs: [
        { minHours: 4, compOffDays: 0.5 },
        { minHours: 8, compOffDays: 1.0 },
        { minHours: 11, compOffDays: 1.5 },
      ],
    };

    // 6. Active Employees
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

    // 7. Branches
    const branches = await db.branch.findMany({
      where: { orgId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    adminData = {
      stats: {
        totalOtHours,
        totalOtAmount,
        totalCompOffDays,
        totalLopDays,
        pendingCount,
      },
      otRecords,
      holidays,
      lopRecords: lopRecordsDb,
      settings,
      employees,
      branches,
    };
  }

  return (
    <div className="max-w-7xl space-y-6">
      <div className="space-y-1">
        <h1 className="ds-h1 flex items-center gap-4 text-on-surface">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#00cec4]/10 text-[#00cec4]">
            <Clock className="size-5" />
          </span>
          Overtime Management
        </h1>
        <p className="text-sm font-medium text-on-surface-variant">
          {canApprove
            ? "Configure grace periods, view overtime metrics, track holidays, manage LOP logs, and export payroll statements."
            : "Request overtime compensation and track your submission history."}
        </p>
      </div>

      <OtClient
        initialEntries={legacyEntries as OtClientProps["initialEntries"]}
        canApprove={canApprove}
        canRequest={canRequest}
        currentUserId={session.user.id}
        monthStr={monthStr}
        adminData={adminData as OtClientProps["adminData"]}
      />
    </div>
  );
}
