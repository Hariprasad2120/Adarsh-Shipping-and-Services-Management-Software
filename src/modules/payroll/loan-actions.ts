"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { db } from "@/lib/db";
import { fireAutomation } from "@/modules/payroll/automation";

type ActionResponse = { ok: true } | { ok: false; error: string };

function asNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

async function nextLoanNumber(orgId: string) {
  const count = await db.payrollLoan.count({ where: { orgId } });
  return `LOAN-${String(count + 1).padStart(5, "0")}`;
}

export async function listPayrollLoans(orgId: string, employeeId?: string) {
  const loans = await db.payrollLoan.findMany({
    where: { orgId, ...(employeeId ? { employeeId } : {}) },
    include: {
      repayments: { orderBy: { repaymentDate: "desc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  const employeeIds = [...new Set(loans.map((l) => l.employeeId))];
  const employees = await db.user.findMany({
    where: { id: { in: employeeIds } },
    select: { id: true, name: true, employeeNumber: true },
  });
  const employeeMap = new Map(employees.map((e) => [e.id, e]));

  return loans.map((loan) => {
    const amountRepaid = loan.repayments.reduce((sum, r) => sum + asNumber(r.amount), 0);
    const employee = employeeMap.get(loan.employeeId);
    return {
      id: loan.id,
      loanNumber: loan.loanNumber,
      loanName: loan.loanName,
      status: loan.status,
      principalAmount: loan.principalAmount,
      emiAmount: loan.emiAmount,
      disbursedAt: loan.disbursedAt.toISOString(),
      amountRepaid,
      remainingAmount: Math.max(0, loan.principalAmount - amountRepaid),
      employeeId: loan.employeeId,
      employeeName: employee?.name ?? "Unknown",
      employeeNumber: employee?.employeeNumber == null ? "-" : String(employee.employeeNumber),
      repayments: loan.repayments.map((r) => ({
        id: r.id,
        amount: r.amount,
        repaymentDate: r.repaymentDate.toISOString(),
        mode: r.mode,
        notes: r.notes,
      })),
    };
  });
}

export async function createPayrollLoanAction(input: {
  employeeId: string;
  loanName: string;
  principalAmount: number;
  emiAmount: number;
  disbursedAt: string;
  notes?: string;
}): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "hrms.salary.manage");

    if (!(input.principalAmount > 0)) return { ok: false, error: "Loan amount must be greater than zero" };
    if (!(input.emiAmount > 0)) return { ok: false, error: "EMI amount must be greater than zero" };

    const employee = await db.user.findFirst({ where: { id: input.employeeId, orgId }, select: { id: true } });
    if (!employee) return { ok: false, error: "Employee not found" };

    const loanNumber = await nextLoanNumber(orgId);
    await db.payrollLoan.create({
      data: {
        orgId,
        employeeId: input.employeeId,
        loanNumber,
        loanName: input.loanName.trim() || "Personal Loan",
        principalAmount: input.principalAmount,
        emiAmount: input.emiAmount,
        disbursedAt: new Date(input.disbursedAt),
        notes: input.notes?.trim() || null,
      },
    });

    revalidatePath("/payroll/loans");
    revalidatePath(`/payroll/employees/${input.employeeId}/loans`);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to create loan" };
  }
}

export async function recordLoanRepaymentAction(input: {
  loanId: string;
  amount: number;
  repaymentDate: string;
  notes?: string;
}): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "hrms.salary.manage");

    if (!(input.amount > 0)) return { ok: false, error: "Repayment amount must be greater than zero" };

    // Read-then-write on the outstanding balance races if two repayments
    // are recorded concurrently for the same loan (e.g. double-submit, or
    // the auto payroll-deduction and a manual entry landing together).
    // FOR UPDATE locks the loan row for the duration of the transaction so
    // the balance check and the insert are atomic against other writers.
    let employeeId: string | null = null;
    let closedLoanNumber: string | null = null;
    await db.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<Array<{ id: string; orgId: string; employeeId: string; status: string; principalAmount: number; loanNumber: string }>>`
        SELECT id, "orgId", "employeeId", status, "principalAmount", "loanNumber"
        FROM "PayrollLoan"
        WHERE id = ${input.loanId}
        FOR UPDATE
      `;
      const loan = locked[0];
      if (!loan || loan.orgId !== orgId) throw new Error("Loan not found");
      if (loan.status === "CLOSED") throw new Error("This loan is already closed");
      employeeId = loan.employeeId;

      const repayments = await tx.payrollLoanRepayment.findMany({
        where: { loanId: input.loanId },
        select: { amount: true },
      });
      const alreadyRepaid = repayments.reduce((sum, r) => sum + asNumber(r.amount), 0);
      const remaining = loan.principalAmount - alreadyRepaid;
      if (input.amount > remaining + 0.01) {
        throw new Error(`Repayment exceeds remaining balance of ${remaining.toFixed(2)}`);
      }

      await tx.payrollLoanRepayment.create({
        data: {
          loanId: input.loanId,
          amount: input.amount,
          repaymentDate: new Date(input.repaymentDate),
          notes: input.notes?.trim() || null,
        },
      });
      if (input.amount >= remaining - 0.01) {
        await tx.payrollLoan.update({ where: { id: input.loanId }, data: { status: "CLOSED" } });
        closedLoanNumber = loan.loanNumber;
      }
    });

    if (closedLoanNumber && employeeId) {
      await fireAutomation(orgId, "LOAN_FULLY_REPAID", {
        type: "LOAN",
        id: input.loanId,
        employeeId,
        summary: `Loan ${closedLoanNumber} has been fully repaid.`,
        link: `/payroll/employees/${employeeId}/loans`,
      });
    }

    revalidatePath("/payroll/loans");
    if (employeeId) revalidatePath(`/payroll/employees/${employeeId}/loans`);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to record repayment" };
  }
}
