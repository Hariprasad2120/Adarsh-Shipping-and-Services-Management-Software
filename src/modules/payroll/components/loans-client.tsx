"use client";

import * as React from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Modal } from "@/components/ui/modal";
import { WorkspaceBadge } from "@/components/layout/workspace";
import {
  PeopleControlInput,
  PeopleTable,
  PeopleTableBody,
  PeopleTableCell,
  PeopleTableHead,
  PeopleTableHeader,
  PeopleTableRow,
} from "@/modules/people/components";
import { createPayrollLoanAction, recordLoanRepaymentAction } from "@/modules/payroll/loan-actions";

export type PayrollLoanRow = {
  id: string;
  loanNumber: string;
  loanName: string;
  status: string;
  principalAmount: number;
  emiAmount: number;
  amountRepaid: number;
  remainingAmount: number;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
};

type EmployeeOption = { id: string; name: string; employeeNumber: string };

function formatMoney(value: number) {
  return `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function LoansClient({
  loans,
  employees,
  fixedEmployeeId,
}: {
  loans: PayrollLoanRow[];
  employees: EmployeeOption[];
  fixedEmployeeId?: string;
}) {
  const router = useRouter();
  const [addOpen, setAddOpen] = React.useState(false);
  const [repayLoanId, setRepayLoanId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({
    employeeId: fixedEmployeeId ?? employees[0]?.id ?? "",
    loanName: "Personal Loan",
    principalAmount: "",
    emiAmount: "",
    disbursedAt: new Date().toISOString().slice(0, 10),
  });
  const [repayForm, setRepayForm] = React.useState({ amount: "", repaymentDate: new Date().toISOString().slice(0, 10) });
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleCreate = async () => {
    setIsSubmitting(true);
    try {
      const response = await createPayrollLoanAction({
        employeeId: form.employeeId,
        loanName: form.loanName,
        principalAmount: Number(form.principalAmount),
        emiAmount: Number(form.emiAmount),
        disbursedAt: form.disbursedAt,
      });
      if (!response.ok) {
        toast.error(response.error);
        return;
      }
      toast.success("Loan added");
      setAddOpen(false);
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRepay = async () => {
    if (!repayLoanId) return;
    setIsSubmitting(true);
    try {
      const response = await recordLoanRepaymentAction({
        loanId: repayLoanId,
        amount: Number(repayForm.amount),
        repaymentDate: repayForm.repaymentDate,
      });
      if (!response.ok) {
        toast.error(response.error);
        return;
      }
      toast.success("Repayment recorded");
      setRepayLoanId(null);
      setRepayForm({ amount: "", repaymentDate: new Date().toISOString().slice(0, 10) });
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button type="button" onClick={() => setAddOpen(true)} disabled={employees.length === 0}>
          Add
        </Button>
      </div>

      {loans.length === 0 ? (
        <p className="text-sm text-[var(--mnx-muted)]">
          {fixedEmployeeId ? "This employee hasn't taken any loans yet." : "No loans on record yet."}
        </p>
      ) : (
        <PeopleTable>
          <PeopleTableHeader>
            <PeopleTableRow>
              {!fixedEmployeeId ? <PeopleTableHead>Employee</PeopleTableHead> : null}
              <PeopleTableHead>Loan Number</PeopleTableHead>
              <PeopleTableHead>Loan Name</PeopleTableHead>
              <PeopleTableHead>Status</PeopleTableHead>
              <PeopleTableHead>Loan Amount</PeopleTableHead>
              <PeopleTableHead>Amount Repaid</PeopleTableHead>
              <PeopleTableHead>Remaining Amount</PeopleTableHead>
              <PeopleTableHead>Action</PeopleTableHead>
            </PeopleTableRow>
          </PeopleTableHeader>
          <PeopleTableBody>
            {loans.map((loan) => (
              <PeopleTableRow key={loan.id}>
                {!fixedEmployeeId ? (
                  <PeopleTableCell>
                    {loan.employeeName} ({loan.employeeNumber})
                  </PeopleTableCell>
                ) : null}
                <PeopleTableCell>{loan.loanNumber}</PeopleTableCell>
                <PeopleTableCell>{loan.loanName}</PeopleTableCell>
                <PeopleTableCell>
                  <WorkspaceBadge variant={loan.status === "OPEN" ? "success" : "neutral"}>
                    {loan.status === "OPEN" ? "Open" : "Closed"}
                  </WorkspaceBadge>
                </PeopleTableCell>
                <PeopleTableCell>{formatMoney(loan.principalAmount)}</PeopleTableCell>
                <PeopleTableCell>{formatMoney(loan.amountRepaid)}</PeopleTableCell>
                <PeopleTableCell>{formatMoney(loan.remainingAmount)}</PeopleTableCell>
                <PeopleTableCell>
                  {loan.status === "OPEN" ? (
                    <Button type="button" variant="inverse" size="sm" onClick={() => setRepayLoanId(loan.id)}>
                      Record Repayment
                    </Button>
                  ) : null}
                </PeopleTableCell>
              </PeopleTableRow>
            ))}
          </PeopleTableBody>
        </PeopleTable>
      )}

      <Modal open={addOpen} title="Add Loan" onClose={() => setAddOpen(false)}>
        <div className="space-y-4">
          {!fixedEmployeeId ? (
            <label className="block space-y-1 text-sm">
              <span className="font-medium text-[var(--mnx-text)]">Employee</span>
              <NativeSelect value={form.employeeId} onChange={(e) => setForm((f) => ({ ...f, employeeId: e.target.value }))}>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.name} · #{emp.employeeNumber}</option>
                ))}
              </NativeSelect>
            </label>
          ) : null}
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-[var(--mnx-text)]">Loan name</span>
            <PeopleControlInput value={form.loanName} onChange={(e) => setForm((f) => ({ ...f, loanName: e.target.value }))} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1 text-sm">
              <span className="font-medium text-[var(--mnx-text)]">Loan amount</span>
              <PeopleControlInput type="number" value={form.principalAmount} onChange={(e) => setForm((f) => ({ ...f, principalAmount: e.target.value }))} />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="font-medium text-[var(--mnx-text)]">EMI amount</span>
              <PeopleControlInput type="number" value={form.emiAmount} onChange={(e) => setForm((f) => ({ ...f, emiAmount: e.target.value }))} />
            </label>
          </div>
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-[var(--mnx-text)]">Disbursed on</span>
            <PeopleControlInput type="date" value={form.disbursedAt} onChange={(e) => setForm((f) => ({ ...f, disbursedAt: e.target.value }))} />
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="inverse" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleCreate()} disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={repayLoanId != null} title="Record Repayment" onClose={() => setRepayLoanId(null)}>
        <div className="space-y-4">
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-[var(--mnx-text)]">Amount</span>
            <PeopleControlInput type="number" value={repayForm.amount} onChange={(e) => setRepayForm((f) => ({ ...f, amount: e.target.value }))} />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-[var(--mnx-text)]">Repayment date</span>
            <PeopleControlInput type="date" value={repayForm.repaymentDate} onChange={(e) => setRepayForm((f) => ({ ...f, repaymentDate: e.target.value }))} />
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="inverse" onClick={() => setRepayLoanId(null)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleRepay()} disabled={isSubmitting || !(Number(repayForm.amount) > 0)}>
              {isSubmitting ? "Saving…" : "Record"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
