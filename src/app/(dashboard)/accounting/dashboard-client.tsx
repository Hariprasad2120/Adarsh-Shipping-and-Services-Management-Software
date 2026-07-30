"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  BookOpenText,
  FileSpreadsheet,
  Landmark,
  Loader2,
  Lock,
  ReceiptText,
  Settings2,
  Ship,
  Unlock,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { DateInput } from "@/components/ui/date-input";
import {
  AccountingAction,
  AccountingActionLink,
  AccountingAlert,
  AccountingDialog,
  AccountingField,
  AccountingInput,
  AccountingMetric,
  AccountingMetrics,
  AccountingSection,
  AccountingStatus,
} from "@/modules/accounting/components/accounting-workspace";
import { updateTransactionLockAction } from "@/modules/accounting/actions";

interface DashboardClientProps {
  pl: any;
  bs: any;
  recentVouchers: any[];
  recentInvoices: any[];
  recentPayments: any[];
  cashLiquidity: number;
  initialPeriodLock: {
    lockDate: Date;
    lockType: string;
    lockedBy: string;
  } | null;
}

const shortcuts = [
  {
    href: "/accounting/banking",
    label: "Banking and cash",
    description: "Liquidity and transfers",
    icon: Landmark,
  },
  {
    href: "/accounting/quotations",
    label: "Quotations and notes",
    description: "Commercial pipeline",
    icon: ReceiptText,
  },
  {
    href: "/accounting/jobs",
    label: "Cargo job costing",
    description: "Contract profitability",
    icon: Ship,
  },
  {
    href: "/accounting/reports",
    label: "Reports centre",
    description: "Statements and registers",
    icon: FileSpreadsheet,
  },
  {
    href: "/accounting/accounts",
    label: "Chart of accounts",
    description: "Ledger administration",
    icon: BookOpenText,
  },
] as const;

export function DashboardClient({
  bs,
  cashLiquidity,
  initialPeriodLock,
  pl,
  recentInvoices,
  recentPayments,
  recentVouchers,
}: DashboardClientProps) {
  const [periodLock, setPeriodLock] = useState<any | null>(initialPeriodLock);
  const [showLockDialog, setShowLockDialog] = useState(false);
  const [lockDate, setLockDate] = useState(
    initialPeriodLock
      ? new Date(initialPeriodLock.lockDate).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0],
  );
  const [lockPassword, setLockPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const totalAssets = bs.totalAssets;
  const totalLiabilities = bs.liabilities.total;
  const netProfit = pl.netProfit;
  const liquidityRatio =
    totalAssets > 0 ? Math.max(0, cashLiquidity / totalAssets) * 100 : 0;
  const profitRatio =
    totalAssets > 0 ? (netProfit / totalAssets) * 100 : 0;

  async function updateLock(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await updateTransactionLockAction({
        lockDate,
        password: lockPassword || undefined,
        lockType: "FULL",
        lockedBy: "Administrator",
      });
      if (result.ok) {
        setPeriodLock(result.data);
        setShowLockDialog(false);
        setLockPassword("");
      } else setError(result.error || "Failed to update period lock.");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "An unexpected error occurred.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="mnx-accounting-toolbar">
        <div>
          <AccountingAction
            variant={periodLock ? "secondary" : "primary"}
            onClick={() => setShowLockDialog(true)}
          >
            {periodLock ? (
              <Lock aria-hidden="true" size={16} />
            ) : (
              <Unlock aria-hidden="true" size={16} />
            )}
            {periodLock ? "Period locked" : "Lock period"}
          </AccountingAction>
          <AccountingActionLink href="/accounting/settings">
            <Settings2 aria-hidden="true" size={16} />
            Settings
          </AccountingActionLink>
        </div>
      </div>

      <AccountingSection
        eyebrow="Workspace navigation"
        title="Finance operations"
        description="Move directly into the core accounting registers and controls."
      >
        <div className="mnx-accounting-card-grid">
          {shortcuts.map((shortcut) => {
            const Icon = shortcut.icon;
            return (
              <Link
                className="mnx-accounting-record-card"
                href={shortcut.href}
                key={shortcut.href}
              >
                <header>
                  <Icon aria-hidden="true" size={20} />
                  <span aria-hidden="true">↗</span>
                </header>
                <div>
                  <h3>{shortcut.label}</h3>
                  <small>{shortcut.description}</small>
                </div>
              </Link>
            );
          })}
        </div>
      </AccountingSection>

      <AccountingMetrics>
        <AccountingMetric
          label="Total assets"
          value={`₹${totalAssets.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
          detail="Balance-sheet asset position"
          href="/accounting/balance-sheet"
          actionLabel="Open balance sheet"
        />
        <AccountingMetric
          label="Total liabilities"
          value={`₹${totalLiabilities.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
          detail="Balance-sheet liability position"
          href="/accounting/balance-sheet"
          actionLabel="Open balance sheet"
        />
        <AccountingMetric
          label={netProfit >= 0 ? "Net profit" : "Net loss"}
          value={`₹${netProfit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
          detail="Current profit-and-loss position"
          href="/accounting/profit-loss"
          actionLabel="Open profit and loss"
        />
        <AccountingMetric
          label="Cash liquidity"
          value={`₹${cashLiquidity.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
          detail={`${liquidityRatio.toFixed(1)}% of assets`}
          href="/accounting/banking"
          actionLabel="Open banking and cash"
        />
        <AccountingMetric
          label="Asset margin"
          value={`${profitRatio.toFixed(1)}%`}
          detail="Net performance relative to assets"
          href="/accounting/reports"
          actionLabel="Open accounting reports"
        />
      </AccountingMetrics>

      {periodLock ? (
        <AccountingAlert variant="warning">
          Records posted on or before{" "}
          <strong>
            {new Date(periodLock.lockDate).toLocaleDateString("en-IN")}
          </strong>{" "}
          are protected against edit or deletion.
        </AccountingAlert>
      ) : (
        <AccountingAlert>
          No transaction lock is active. Use a period lock after financial
          records are finalised.
        </AccountingAlert>
      )}

      <div className="mnx-accounting-card-grid">
        <AccountingSection
          eyebrow="Receivables"
          title="Recent invoices"
          description="Latest customer billing records."
          actions={
            <AccountingActionLink
              className="mnx-button-compact"
              href="/accounting/sales-invoices"
            >
              View all
            </AccountingActionLink>
          }
        >
          <ul className="mnx-accounting-list">
            {recentInvoices.length === 0 ? (
              <li>No invoices have been created.</li>
            ) : (
              recentInvoices.map((invoice) => (
                <li className="mnx-accounting-list-row" key={invoice.id}>
                  <div>
                    <b>{invoice.invoiceNumber}</b>
                    <small>{invoice.customerName}</small>
                  </div>
                  <div>
                    <strong className="mnx-accounting-amount">
                      ₹{invoice.grandTotal.toLocaleString("en-IN")}
                    </strong>
                    <AccountingStatus status={invoice.status} />
                  </div>
                </li>
              ))
            )}
          </ul>
        </AccountingSection>

        <AccountingSection
          eyebrow="Cash movement"
          title="Recent payments"
          description="Latest receipt and disbursement vouchers."
          actions={
            <AccountingActionLink
              className="mnx-button-compact"
              href="/accounting/payment-entries"
            >
              View all
            </AccountingActionLink>
          }
        >
          <ul className="mnx-accounting-list">
            {recentPayments.length === 0 ? (
              <li>No payments have been recorded.</li>
            ) : (
              recentPayments.map((payment) => (
                <li className="mnx-accounting-list-row" key={payment.id}>
                  <div>
                    <b>{payment.referenceNo}</b>
                    <small>
                      {payment.paymentType} · {payment.partyType}
                    </small>
                  </div>
                  <strong className="mnx-accounting-amount">
                    ₹{payment.amount.toLocaleString("en-IN")}
                  </strong>
                </li>
              ))
            )}
          </ul>
        </AccountingSection>

        <AccountingSection
          eyebrow="General journal"
          title="Recent vouchers"
          description="Latest balanced journal adjustments."
          actions={
            <AccountingActionLink
              className="mnx-button-compact"
              href="/accounting/journal-entries"
            >
              View all
            </AccountingActionLink>
          }
        >
          <ul className="mnx-accounting-list">
            {recentVouchers.length === 0 ? (
              <li>No journal entries have been created.</li>
            ) : (
              recentVouchers.map((voucher) => (
                <li className="mnx-accounting-list-row" key={voucher.id}>
                  <div>
                    <b>{voucher.voucherNo}</b>
                    <small>{voucher.remarks}</small>
                  </div>
                  <div>
                    <strong className="mnx-accounting-amount">
                      ₹{voucher.totalDebit.toLocaleString("en-IN")}
                    </strong>
                    <AccountingStatus status={voucher.status} />
                  </div>
                </li>
              ))
            )}
          </ul>
        </AccountingSection>
      </div>

      <AccountingDialog
        open={showLockDialog}
        onClose={() => setShowLockDialog(false)}
        title="Update transaction lock"
        description="Protect finalised records on or before the selected date."
        footer={
          <>
            <AccountingAction
              type="button"
              variant="secondary"
              onClick={() => setShowLockDialog(false)}
            >
              Cancel
            </AccountingAction>
            <AccountingAction
              disabled={loading}
              form="accounting-lock-form"
              type="submit"
            >
              {loading ? <Loader2 aria-hidden="true" className="animate-spin" size={16} /> : null}
              Apply lock
            </AccountingAction>
          </>
        }
      >
        <form
          className="mnx-accounting-form"
          id="accounting-lock-form"
          onSubmit={updateLock}
        >
          {error ? <AccountingAlert variant="danger">{error}</AccountingAlert> : null}
          <AccountingField label="Lock through date" required>
            <DateInput
              required
              value={lockDate}
              onChange={(event) => setLockDate(event.target.value)}
            />
          </AccountingField>
          <AccountingField
            label="Confirmation password"
            hint="Required only when policy demands elevated confirmation."
          >
            <AccountingInput
              type="password"
              value={lockPassword}
              onChange={(event) => setLockPassword(event.target.value)}
            />
          </AccountingField>
        </form>
      </AccountingDialog>
    </>
  );
}
