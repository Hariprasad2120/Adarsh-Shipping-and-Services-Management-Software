"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Settings, RefreshCw, Save, Loader2, ShieldCheck } from "lucide-react";
import { updateAccountingSettingsAction, initializeCOAAction } from "@/modules/accounting/actions";

interface SettingsClientProps {
  initialSettings: any;
  accounts: any[];
}

export function SettingsClient({ initialSettings, accounts }: SettingsClientProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  const [formData, setFormData] = useState({
    defaultReceivableAccountId: initialSettings?.defaultReceivableAccountId || "",
    defaultPayableAccountId: initialSettings?.defaultPayableAccountId || "",
    defaultCashAccountId: initialSettings?.defaultCashAccountId || "",
    defaultBankAccountId: initialSettings?.defaultBankAccountId || "",
    defaultSalesAccountId: initialSettings?.defaultSalesAccountId || "",
    defaultPurchaseAccountId: initialSettings?.defaultPurchaseAccountId || "",
    defaultTaxAccountId: initialSettings?.defaultTaxAccountId || "",
    defaultRoundOffAccountId: initialSettings?.defaultRoundOffAccountId || "",
    defaultSalaryExpenseAccountId: initialSettings?.defaultSalaryExpenseAccountId || "",
    defaultSalaryPayableAccountId: initialSettings?.defaultSalaryPayableAccountId || "",
    defaultDepreciationExpenseAccountId: initialSettings?.defaultDepreciationExpenseAccountId || "",
    defaultAccumulatedDepreciationAccountId: initialSettings?.defaultAccumulatedDepreciationAccountId || "",
  });

  const handleSelectChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await updateAccountingSettingsAction(formData);
      if (res.ok) {
        toast.success("Accounting settings updated successfully!");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetCOA = async () => {
    if (!confirm("This will ensure all default accounts are seeded in the Chart of Accounts. Continue?")) return;
    setIsInitializing(true);
    try {
      const res = await initializeCOAAction();
      if (res.ok) {
        toast.success("Chart of Accounts initialized successfully!");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to initialize COA");
    } finally {
      setIsInitializing(false);
    }
  };

  // Filter lists by account type
  const cashAccounts = accounts.filter((a) => a.accountType === "CASH" || a.accountType === "BANK");
  const receivableAccounts = accounts.filter((a) => a.accountType === "RECEIVABLE");
  const payableAccounts = accounts.filter((a) => a.accountType === "PAYABLE");
  const salesAccounts = accounts.filter((a) => a.accountType === "SALES");
  const purchaseAccounts = accounts.filter((a) => a.accountType === "PURCHASE" || a.accountType === "EXPENSE");
  const taxAccounts = accounts.filter((a) => a.accountType === "TAX");
  const expenseAccounts = accounts.filter((a) => a.accountType === "EXPENSE");
  const deprAccounts = accounts.filter((a) => a.accountType === "DEPRECIATION");

  return (
    <div className="space-y-6">
      
      <form onSubmit={handleSave} className="space-y-6">
        
        {/* LIQUIDITY SETTINGS */}
        <div className="p-6 rounded-xl bg-[#0f1319] border border-[#1c212a]/55 space-y-4">
          <h3 className="text-white font-bold text-xs uppercase tracking-wider border-b border-[#1c212a]/30 pb-2">
            1. Liquidity & Cash Defaults
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <label className="ds-label block text-slate-400">Default Bank Account</label>
              <select
                value={formData.defaultBankAccountId}
                onChange={(e) => handleSelectChange("defaultBankAccountId", e.target.value)}
                className="w-full bg-[#161f28] border border-[#1c212a] text-white rounded-xl p-2.5"
              >
                <option value="">Select Account...</option>
                {cashAccounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.accountCode} - {a.accountName}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="ds-label block text-slate-400">Default Cash Account</label>
              <select
                value={formData.defaultCashAccountId}
                onChange={(e) => handleSelectChange("defaultCashAccountId", e.target.value)}
                className="w-full bg-[#161f28] border border-[#1c212a] text-white rounded-xl p-2.5"
              >
                <option value="">Select Account...</option>
                {cashAccounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.accountCode} - {a.accountName}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* OPERATIONS SETTINGS */}
        <div className="p-6 rounded-xl bg-[#0f1319] border border-[#1c212a]/55 space-y-4">
          <h3 className="text-white font-bold text-xs uppercase tracking-wider border-b border-[#1c212a]/30 pb-2">
            2. Customer Billing & Vendor Payables
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <label className="ds-label block text-slate-400">Accounts Receivable (Customers)</label>
              <select
                value={formData.defaultReceivableAccountId}
                onChange={(e) => handleSelectChange("defaultReceivableAccountId", e.target.value)}
                className="w-full bg-[#161f28] border border-[#1c212a] text-white rounded-xl p-2.5"
              >
                <option value="">Select Account...</option>
                {receivableAccounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.accountCode} - {a.accountName}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="ds-label block text-slate-400">Accounts Payable (Suppliers)</label>
              <select
                value={formData.defaultPayableAccountId}
                onChange={(e) => handleSelectChange("defaultPayableAccountId", e.target.value)}
                className="w-full bg-[#161f28] border border-[#1c212a] text-white rounded-xl p-2.5"
              >
                <option value="">Select Account...</option>
                {payableAccounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.accountCode} - {a.accountName}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="ds-label block text-slate-400">Default Sales Account (Revenue)</label>
              <select
                value={formData.defaultSalesAccountId}
                onChange={(e) => handleSelectChange("defaultSalesAccountId", e.target.value)}
                className="w-full bg-[#161f28] border border-[#1c212a] text-white rounded-xl p-2.5"
              >
                <option value="">Select Account...</option>
                {salesAccounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.accountCode} - {a.accountName}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="ds-label block text-slate-400">Default Purchase Account (Expense)</label>
              <select
                value={formData.defaultPurchaseAccountId}
                onChange={(e) => handleSelectChange("defaultPurchaseAccountId", e.target.value)}
                className="w-full bg-[#161f28] border border-[#1c212a] text-white rounded-xl p-2.5"
              >
                <option value="">Select Account...</option>
                {purchaseAccounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.accountCode} - {a.accountName}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="ds-label block text-slate-400">Default Tax Account (GST)</label>
              <select
                value={formData.defaultTaxAccountId}
                onChange={(e) => handleSelectChange("defaultTaxAccountId", e.target.value)}
                className="w-full bg-[#161f28] border border-[#1c212a] text-white rounded-xl p-2.5"
              >
                <option value="">Select Account...</option>
                {taxAccounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.accountCode} - {a.accountName}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* PAYROLL SETTINGS */}
        <div className="p-6 rounded-xl bg-[#0f1319] border border-[#1c212a]/55 space-y-4">
          <h3 className="text-white font-bold text-xs uppercase tracking-wider border-b border-[#1c212a]/30 pb-2">
            3. HRMS Payroll Mappings
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <label className="ds-label block text-slate-400">Salary Expense Account</label>
              <select
                value={formData.defaultSalaryExpenseAccountId}
                onChange={(e) => handleSelectChange("defaultSalaryExpenseAccountId", e.target.value)}
                className="w-full bg-[#161f28] border border-[#1c212a] text-white rounded-xl p-2.5"
              >
                <option value="">Select Account...</option>
                {expenseAccounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.accountCode} - {a.accountName}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="ds-label block text-slate-400">Salary Payable Account</label>
              <select
                value={formData.defaultSalaryPayableAccountId}
                onChange={(e) => handleSelectChange("defaultSalaryPayableAccountId", e.target.value)}
                className="w-full bg-[#161f28] border border-[#1c212a] text-white rounded-xl p-2.5"
              >
                <option value="">Select Account...</option>
                {payableAccounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.accountCode} - {a.accountName}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* DEPRECIATION SETTINGS */}
        <div className="p-6 rounded-xl bg-[#0f1319] border border-[#1c212a]/55 space-y-4">
          <h3 className="text-white font-bold text-xs uppercase tracking-wider border-b border-[#1c212a]/30 pb-2">
            4. Asset Depreciation Mappings
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <label className="ds-label block text-slate-400">Depreciation Expense Account</label>
              <select
                value={formData.defaultDepreciationExpenseAccountId}
                onChange={(e) => handleSelectChange("defaultDepreciationExpenseAccountId", e.target.value)}
                className="w-full bg-[#161f28] border border-[#1c212a] text-white rounded-xl p-2.5"
              >
                <option value="">Select Account...</option>
                {expenseAccounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.accountCode} - {a.accountName}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="ds-label block text-slate-400">Accumulated Depreciation Account</label>
              <select
                value={formData.defaultAccumulatedDepreciationAccountId}
                onChange={(e) => handleSelectChange("defaultAccumulatedDepreciationAccountId", e.target.value)}
                className="w-full bg-[#161f28] border border-[#1c212a] text-white rounded-xl p-2.5"
              >
                <option value="">Select Account...</option>
                {deprAccounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.accountCode} - {a.accountName}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* SUBMIT */}
        <div className="flex justify-end p-6 rounded-xl bg-[#0f1319] border border-[#1c212a]/55">
          <button
            type="submit"
            disabled={isSaving}
            className="bg-[#00cec4] text-white hover:bg-[#00b8af] hover:shadow-[0_0_0_3px_rgba(0,206,196,0.25)] px-6 py-2.5 rounded-xl text-xs uppercase tracking-wide font-bold transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            {isSaving ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                <span>Saving Mappings...</span>
              </>
            ) : (
              <>
                <Save className="size-4" />
                <span>Save Mappings</span>
              </>
            )}
          </button>
        </div>

      </form>

      {/* RE-INITIALIZE COA */}
      <div className="p-6 rounded-xl bg-[#0f1319] border border-[#1c212a]/55 space-y-4">
        <h3 className="text-white font-bold text-xs uppercase tracking-wider border-b border-red-500/10 pb-2">
          Danger Zone
        </h3>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
          <p className="text-slate-400 max-w-xl">
            Seeding Chart of Accounts initializes the default general ledger structure (Assets, Liabilities, Equity, Income, Expenses) if it has not been seeded yet.
          </p>
          <button
            disabled={isInitializing}
            onClick={handleResetCOA}
            className="flex items-center gap-1.5 bg-red-500/10 text-red-450 hover:bg-red-500/20 border border-red-500/30 px-4 py-2.5 rounded-xl text-xs uppercase tracking-wide font-bold transition-all cursor-pointer disabled:opacity-50 shrink-0"
          >
            {isInitializing ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <RefreshCw className="size-3.5" />
            )}
            <span>Seed Standard COA</span>
          </button>
        </div>
      </div>

    </div>
  );
}
