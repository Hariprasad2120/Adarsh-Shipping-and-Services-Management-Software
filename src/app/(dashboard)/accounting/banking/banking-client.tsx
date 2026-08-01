"use client";

import {
  ArrowLeftRight,
  CircleDollarSign,
  CreditCard,
  Landmark,
  Link2,
  Loader2,
  WalletCards,
  Workflow,
} from "lucide-react";
import { useState } from "react";
import { DateInput } from "@/components/ui/date-input";
import {
  AccountingAction,
  AccountingActionLink,
  AccountingAlert,
  AccountingDialog,
  AccountingEmptyTableRow,
  AccountingField,
  AccountingInput,
  AccountingMetric,
  AccountingMetrics,
  AccountingPanel,
  AccountingSection,
  AccountingSelect,
  AccountingStatus,
  AccountingTable,
  AccountingTextarea,
} from "@/modules/accounting/components/accounting-workspace";
import { recordBankTransferAction } from "@/modules/accounting/actions";

interface BankAccount {
  id: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  balance: number;
}

interface BankTransaction {
  id: string;
  postingDate: Date;
  accountName: string;
  accountCode: string;
  voucherType: string;
  voucherId: string;
  debit: number;
  credit: number;
  remarks: string | null;
}

interface LeafAccount {
  id: string;
  accountCode: string;
  accountName: string;
  accountType: string;
}

export function BankingClient({
  bankAccounts,
  canCreatePayment,
  canPrepareTransfer,
  leafAccounts,
  transactions,
}: {
  bankAccounts: BankAccount[];
  canCreatePayment: boolean;
  canPrepareTransfer: boolean;
  transactions: BankTransaction[];
  leafAccounts: LeafAccount[];
}) {
  const [showTransfer, setShowTransfer] = useState(false);
  const [fromAccount, setFromAccount] = useState("");
  const [toAccount, setToAccount] = useState("");
  const [amount, setAmount] = useState("");
  const [postingDate, setPostingDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const transferAccounts = leafAccounts.filter(
    (account) =>
      account.accountType === "BANK" || account.accountType === "CASH",
  );
  const totalLiquidity = bankAccounts.reduce(
    (sum, account) => sum + account.balance,
    0,
  );
  const bankingRoutes = [
    {
      href: "/accounting/banking",
      title: "Overview",
      description: "Balances, recent movement, and treasury controls.",
      icon: Landmark,
    },
    {
      href: "/accounting/payments",
      title: "All payments",
      description: "One register for receipts, payments, and their posting state.",
      icon: WalletCards,
    },
    {
      href: "/accounting/customer-receipts",
      title: "Customer receipts",
      description: "Incoming collections, applied amounts, and unapplied balances.",
      icon: CircleDollarSign,
    },
    {
      href: "/accounting/vendor-payments",
      title: "Vendor payments",
      description: "Supplier disbursements with posting and reversal lineage.",
      icon: CreditCard,
    },
    {
      href: "/accounting/allocations",
      title: "Allocations",
      description: "Links between payment documents and settled invoices or bills.",
      icon: Workflow,
    },
  ];

  async function submitTransfer(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    if (!fromAccount || !toAccount)
      return setError("Select both source and destination accounts.");
    if (fromAccount === toAccount)
      return setError("Source and destination accounts must be different.");
    if (!/^(?:0*[1-9]\d*)(?:\.\d+)?$/.test(amount.trim()))
      return setError("Enter a valid transfer amount.");

    setLoading(true);
    try {
      const result = await recordBankTransferAction({
        fromAccountId: fromAccount,
        toAccountId: toAccount,
        amount: amount.trim(),
        postingDate,
        remarks,
      });
      if (result.ok) {
        setSuccess("Bank transfer submitted for Accounting approval.");
        setAmount("");
        setRemarks("");
        window.setTimeout(() => {
          setShowTransfer(false);
          setSuccess(null);
        }, 1500);
      } else setError(result.error || "Failed to record bank transfer.");
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
      <AccountingMetrics>
        <AccountingMetric
          label="Total liquidity"
          value={`₹${totalLiquidity.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
          detail="Combined live cash and bank balance"
        />
        <AccountingMetric
          label="Bank accounts"
          value={bankAccounts.filter((account) => account.accountType === "BANK").length}
          detail="Active bank posting accounts"
        />
        <AccountingMetric
          label="Cash accounts"
          value={bankAccounts.filter((account) => account.accountType === "CASH").length}
          detail="Active cash posting accounts"
        />
        <AccountingMetric
          label="Recent postings"
          value={transactions.length}
          detail="Latest liquid-account movements listed below"
        />
      </AccountingMetrics>

      <AccountingSection
        eyebrow="Banking"
        title="Connected workflows"
        description="All bank-related functions now sit under one Banking workspace so operators can move between overview, receipts, payments, and allocations without leaving the section."
        actions={
          canCreatePayment ? (
            <AccountingActionLink
              href="/accounting/payment-entries/new"
              variant="primary"
            >
              <Link2 aria-hidden="true" size={16} />
              Open payment workflow
            </AccountingActionLink>
          ) : undefined
        }
      >
        <div className="mnx-accounting-card-grid mnx-accounting-workflow-grid">
          {bankingRoutes.map((route) => {
            const Icon = route.icon;

            return (
              <AccountingPanel
                className="mnx-accounting-workflow-card"
                key={route.href}
              >
                <header className="mnx-accounting-workflow-card-header">
                  <span className="mnx-accounting-workflow-card-icon">
                    <Icon aria-hidden="true" size={18} />
                  </span>
                  <div>
                    <h3>{route.title}</h3>
                    <p>{route.description}</p>
                  </div>
                </header>
                <footer className="mnx-accounting-workflow-card-footer">
                  <AccountingActionLink href={route.href}>
                    Open {route.title}
                  </AccountingActionLink>
                </footer>
              </AccountingPanel>
            );
          })}
        </div>
      </AccountingSection>

      <AccountingSection
        eyebrow="Banking"
        title="Liquid accounts"
        description="Current balances calculated from opening balances and posted general-ledger movement."
        actions={
          canPrepareTransfer ? (
            <AccountingAction onClick={() => setShowTransfer(true)}>
              <ArrowLeftRight aria-hidden="true" size={16} />
              Record transfer
            </AccountingAction>
          ) : undefined
        }
      >
        <div className="mnx-accounting-card-grid">
          {bankAccounts.map((account) => (
            <article className="mnx-accounting-record-card" key={account.id}>
              <header>
                <div>
                  <h3>{account.accountName}</h3>
                  <small>
                    {account.accountCode} · {account.accountType}
                  </small>
                </div>
                <AccountingStatus status="ACTIVE" />
              </header>
              <strong className="mnx-accounting-amount">
                ₹
                {account.balance.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                })}
              </strong>
            </article>
          ))}
        </div>
      </AccountingSection>

      <AccountingSection
        eyebrow="Banking"
        title="Recent bank and cash movement"
        description="The latest 50 non-cancelled ledger postings across liquid accounts."
      >
        <AccountingTable>
          <thead>
            <tr>
              <th>Posting date</th>
              <th>Account</th>
              <th>Voucher</th>
              <th>Remarks</th>
              <th>Debit</th>
              <th>Credit</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <AccountingEmptyTableRow colSpan={6}>
                No bank or cash transactions have been posted yet.
              </AccountingEmptyTableRow>
            ) : (
              transactions.map((transaction) => (
                <tr key={transaction.id}>
                  <td>
                    {new Date(transaction.postingDate).toLocaleDateString("en-IN")}
                  </td>
                  <td>
                    <strong>{transaction.accountName}</strong>
                    <small>{transaction.accountCode}</small>
                  </td>
                  <td>{transaction.voucherType.replaceAll("_", " ")}</td>
                  <td>{transaction.remarks || "—"}</td>
                  <td className="mnx-accounting-amount mnx-accounting-amount-success">
                    {transaction.debit > 0
                      ? `₹${transaction.debit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                      : "—"}
                  </td>
                  <td className="mnx-accounting-amount mnx-accounting-amount-danger">
                    {transaction.credit > 0
                      ? `₹${transaction.credit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                      : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </AccountingTable>
      </AccountingSection>

      <AccountingDialog
        open={showTransfer}
        onClose={() => setShowTransfer(false)}
        title="Record internal transfer"
        description="Post equal and opposite ledger movement between two bank or cash accounts."
        footer={
          <>
            <AccountingAction
              type="button"
              variant="secondary"
              onClick={() => setShowTransfer(false)}
            >
              Cancel
            </AccountingAction>
            <AccountingAction
              disabled={loading}
              form="accounting-transfer-form"
              type="submit"
            >
              {loading ? <Loader2 aria-hidden="true" className="animate-spin" size={16} /> : null}
              Record transfer
            </AccountingAction>
          </>
        }
      >
        <form
          className="mnx-accounting-form"
          id="accounting-transfer-form"
          onSubmit={submitTransfer}
        >
          {error ? <AccountingAlert variant="danger">{error}</AccountingAlert> : null}
          {success ? (
            <AccountingAlert variant="success">{success}</AccountingAlert>
          ) : null}
          <AccountingField label="Source account" required>
            <AccountingSelect
              required
              value={fromAccount}
              onChange={(event) => setFromAccount(event.target.value)}
            >
              <option value="">Select source account</option>
              {transferAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.accountCode} — {account.accountName}
                </option>
              ))}
            </AccountingSelect>
          </AccountingField>
          <AccountingField label="Destination account" required>
            <AccountingSelect
              required
              value={toAccount}
              onChange={(event) => setToAccount(event.target.value)}
            >
              <option value="">Select destination account</option>
              {transferAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.accountCode} — {account.accountName}
                </option>
              ))}
            </AccountingSelect>
          </AccountingField>
          <div className="mnx-accounting-form-grid">
            <AccountingField label="Amount" required>
              <AccountingInput
                required
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </AccountingField>
            <AccountingField label="Posting date" required>
              <DateInput
                required
                value={postingDate}
                onChange={(event) => setPostingDate(event.target.value)}
              />
            </AccountingField>
          </div>
          <AccountingField label="Remarks">
            <AccountingTextarea
              rows={3}
              value={remarks}
              onChange={(event) => setRemarks(event.target.value)}
            />
          </AccountingField>
        </form>
      </AccountingDialog>
    </>
  );
}
