import React from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getPayrollBatches } from "@/modules/accounting/service";
import { PayrollClient } from "./payroll-client";
import { ShieldAlert } from "lucide-react";

export default async function PayrollPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId;
  if (!orgId) {
    return (
      <div className="p-8 text-center text-red-400">
        <ShieldAlert className="size-12 mx-auto mb-4" />
        <h2 className="text-xl font-bold">Configuration Error</h2>
        <p className="text-sm mt-1">Missing organisation context.</p>
      </div>
    );
  }

  // Fetch batches and settings
  const [batches, settings] = await Promise.all([
    getPayrollBatches(orgId),
    db.accountingSettings.findUnique({ where: { orgId } }),
  ]);

  // Convert Prisma Decimals to Numbers for client-side serialization compatibility
  const serializedBatches = batches.map(batch => ({
    ...batch,
    totalAmount: Number(batch.totalAmount),
    month: batch.month.toISOString(),
    createdAt: batch.createdAt.toISOString(),
    updatedAt: batch.updatedAt.toISOString(),
  }));

  const settingsConfigured = !!(settings?.defaultSalaryExpenseAccountId && settings?.defaultSalaryPayableAccountId && settings?.defaultBankAccountId);

  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-outline-variant/20 pb-5">
        <div>
          <h2 className="ds-h1 text-white">HRMS Payroll Batches</h2>
          <p className="text-slate-400 text-xs mt-1">
            Accrue and process monthly employee salaries, posting balanced ledger journal entries automatically.
          </p>
        </div>
      </div>

      {!settingsConfigured && (
        <div className="p-4 rounded-xl border border-orange-500/30 bg-orange-500/5 text-orange-400 text-xs flex gap-3 items-start card-left-accent-orange">
          <ShieldAlert className="size-5 shrink-0" />
          <div>
            <span className="font-bold uppercase tracking-wider block mb-1">Accounting Config Required</span>
            To finalize or pay payroll batches, configure the default accounts (Salary Expense, Salary Payable, and Bank) in <span className="font-bold underline">Accounting Settings</span> first.
          </div>
        </div>
      )}

      <PayrollClient
        initialBatches={serializedBatches}
        settingsConfigured={settingsConfigured}
      />
    </div>
  );
}
