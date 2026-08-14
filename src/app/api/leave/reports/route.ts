import { NextRequest } from "next/server";
import { getSessionOrUnauth, ok, err } from "@/lib/api-helpers";
import { requirePermission, apiError } from "@/lib/rbac";
import {
  getEmployeeLeaveBalanceReport,
  getLedgerReport,
  getLeaveRequestsReport,
  getLeaveTypeUtilizationReport,
  getDepartmentLeaveSummaryReport,
  getUpcomingLeaveReport,
  getLopReport,
  getExpiringLeaveReport,
  getApprovalTurnaroundReport,
} from "@/modules/leave/reports";

const REPORT_TYPES = [
  "balance",
  "ledger",
  "requests",
  "utilization",
  "department-summary",
  "upcoming",
  "lop",
  "expiring",
  "approval-turnaround",
] as const;

/**
 * Single dispatch endpoint for all leave reports (spec §35). Permission is
 * enforced server-side regardless of which UI (if any) surfaces a given
 * report — "do not expose unrestricted admin APIs merely because the UI
 * hides them" (spec §40).
 */
export async function GET(req: NextRequest) {
  try {
    const { session, error } = await getSessionOrUnauth();
    if (error) return error;
    if (!session!.user.orgId) return err("User has no organisation", 400);
    await requirePermission(session!.user.id, "attendance.leave.manage");

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    if (!type || !(REPORT_TYPES as readonly string[]).includes(type)) {
      return err(`type must be one of: ${REPORT_TYPES.join(", ")}`);
    }

    const orgId = session!.user.orgId;
    const year = Number(searchParams.get("year")) || new Date().getFullYear();
    const departmentId = searchParams.get("departmentId") ?? undefined;
    const branchId = searchParams.get("branchId") ?? undefined;
    const leaveTypeId = searchParams.get("leaveTypeId") ?? undefined;
    const fromDate = searchParams.get("fromDate") ? new Date(searchParams.get("fromDate")!) : undefined;
    const toDate = searchParams.get("toDate") ? new Date(searchParams.get("toDate")!) : undefined;
    const filters = { orgId, departmentId, branchId, leaveTypeId, fromDate, toDate };

    switch (type) {
      case "balance":
        return ok(await getEmployeeLeaveBalanceReport(filters, year));
      case "ledger":
        return ok(await getLedgerReport(filters));
      case "requests":
        return ok(await getLeaveRequestsReport(filters));
      case "utilization":
        return ok(await getLeaveTypeUtilizationReport(filters, year));
      case "department-summary":
        return ok(await getDepartmentLeaveSummaryReport(filters, year));
      case "upcoming":
        return ok(await getUpcomingLeaveReport(filters, Number(searchParams.get("daysAhead")) || 30));
      case "lop": {
        const monthParam = searchParams.get("payrollMonth");
        const payrollMonth = monthParam ? new Date(monthParam) : new Date(year, new Date().getMonth(), 1);
        return ok(await getLopReport(filters, payrollMonth));
      }
      case "expiring":
        return ok(await getExpiringLeaveReport(filters, Number(searchParams.get("daysAhead")) || 60));
      case "approval-turnaround":
        return ok(await getApprovalTurnaroundReport(filters));
      default:
        return err("Unknown report type");
    }
  } catch (error) {
    return apiError(error);
  }
}
