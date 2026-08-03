"use client";

import { Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { DateInput } from "@/components/monolith/date-input";
import {
  AccountingAction,
  AccountingDetail,
  AccountingDetailList,
  AccountingEmptyTableRow,
  AccountingField,
  AccountingInput,
  AccountingMetric,
  AccountingMetrics,
  AccountingSection,
  AccountingSelect,
  AccountingStatus,
  AccountingTable,
  AccountingTextarea,
} from "@/components/monolith/accounting-workspace";
import {
  cancelRecurringExpenseProfileAction,
  createRecurringExpenseProfileAction,
  generateDueRecurringExpensesAction,
  generateRecurringExpenseOccurrenceAction,
  pauseRecurringExpenseProfileAction,
  resumeRecurringExpenseProfileAction,
  skipRecurringExpenseOccurrenceAction,
} from "@/modules/accounting/recurring-expense-actions";

type VendorOption = { id: string; name: string; email: string | null };
type BranchOption = { id: string; name: string };
type ExpenseAccountOption = { id: string; accountCode: string; accountName: string };
type ProfileRecord = {
  id: string;
  templateName: string;
  vendorId: string;
  expenseAccountId: string;
  amount: string;
  taxRate: number;
  frequency: string;
  startDate: string;
  endDate: string | null;
  nextDueDate: string;
  narration: string | null;
  paymentMethod: string | null;
  paymentTermName: string | null;
  isActive: boolean;
  vendor: VendorOption;
  branch: BranchOption | null;
  expenseAccount: ExpenseAccountOption;
  runs: Array<{
    id: string;
    dueDate: string;
    runStatus: string;
    generatedPurchaseInvoiceId: string | null;
    failureReason: string | null;
    createdAt: string;
  }>;
};

export function RecurringExpenseClient({
  vendors,
  branches,
  expenseAccounts,
  profiles,
  summary,
  canManageTemplates,
  canProcessOccurrences,
}: {
  vendors: VendorOption[];
  branches: BranchOption[];
  expenseAccounts: ExpenseAccountOption[];
  profiles: ProfileRecord[];
  summary: {
    total: number;
    active: number;
    paused: number;
    dueNow: number;
  };
  canManageTemplates: boolean;
  canProcessOccurrences: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [vendorId, setVendorId] = useState(vendors[0]?.id ?? "");
  const [expenseAccountId, setExpenseAccountId] = useState(expenseAccounts[0]?.id ?? "");
  const [branchId, setBranchId] = useState("");
  const [amount, setAmount] = useState("");
  const [taxRate, setTaxRate] = useState("18");
  const [frequency, setFrequency] = useState<"DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY">("MONTHLY");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState("");
  const [nextDueDate, setNextDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentTermName, setPaymentTermName] = useState("");
  const [narration, setNarration] = useState("");

  const estimatedTotals = useMemo(() => {
    const subtotal = Number(amount || 0);
    const tax = subtotal * (Number(taxRate || 0) / 100);
    return { subtotal, tax, total: subtotal + tax };
  }, [amount, taxRate]);

  function runAction(actionKey: string, work: () => Promise<void>) {
    setBusyAction(actionKey);
    startTransition(async () => {
      try {
        await work();
        router.refresh();
      } finally {
        setBusyAction(null);
      }
    });
  }

  function createProfile() {
    runAction("create-expense-profile", async () => {
      const result = await createRecurringExpenseProfileAction({
        templateName,
        vendorId,
        expenseAccountId,
        amount,
        taxRate,
        frequency,
        branchId: branchId || null,
        startDate,
        endDate: endDate || null,
        nextDueDate: nextDueDate || null,
        narration: narration || null,
        paymentMethod: paymentMethod || null,
        paymentTermName: paymentTermName || null,
      });
      if (!result.ok) throw new Error(result.error);
      toast.success("Recurring bill profile created");
      setTemplateName("");
      setAmount("");
      setNarration("");
      setPaymentMethod("");
      setPaymentTermName("");
    });
  }

  function processDue() {
    runAction("process-due-expenses", async () => {
      const result = await generateDueRecurringExpensesAction();
      if (!result.ok) throw new Error(result.error);
      const generated = (result.data as Array<{ status: string }>).filter((entry) => entry.status === "GENERATED").length;
      toast.success(generated > 0 ? `${generated} recurring bill occurrence(s) generated` : "No due recurring bills needed processing");
    });
  }

  return (
    <>
      <AccountingMetrics>
        <AccountingMetric label="Bill profiles" value={summary.total} />
        <AccountingMetric label="Active" value={summary.active} />
        <AccountingMetric label="Paused" value={summary.paused} />
        <AccountingMetric label="Due now" value={summary.dueNow} />
      </AccountingMetrics>

      {canManageTemplates ? (
        <AccountingSection
          eyebrow="Recurring bills"
          title="Create recurring bill profile"
          description="Capture vendor, expense account, cadence, and bill metadata for draft purchase-invoice generation."
          actions={
            <AccountingAction
              disabled={isPending && busyAction === "create-expense-profile"}
              onClick={() => createProfile()}
            >
              {isPending && busyAction === "create-expense-profile" ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <Plus size={16} />
              )}
              Create bill profile
            </AccountingAction>
          }
        >
          <div className="mnx-accounting-form-grid mnx-accounting-form-grid-wide">
            <AccountingField label="Template name" required>
              <AccountingInput value={templateName} onChange={(event) => setTemplateName(event.target.value)} />
            </AccountingField>
            <AccountingField label="Vendor" required>
              <AccountingSelect value={vendorId} onChange={(event) => setVendorId(event.target.value)}>
                {vendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Expense account" required>
              <AccountingSelect value={expenseAccountId} onChange={(event) => setExpenseAccountId(event.target.value)}>
                {expenseAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.accountCode} — {account.accountName}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Branch">
              <AccountingSelect value={branchId} onChange={(event) => setBranchId(event.target.value)}>
                <option value="">Global / Head office</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Amount" required>
              <AccountingInput type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} />
            </AccountingField>
            <AccountingField label="Tax rate" required>
              <AccountingInput type="number" min="0" step="0.01" value={taxRate} onChange={(event) => setTaxRate(event.target.value)} />
            </AccountingField>
            <AccountingField label="Frequency" required>
              <AccountingSelect value={frequency} onChange={(event) => setFrequency(event.target.value as typeof frequency)}>
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
                <option value="QUARTERLY">Quarterly</option>
                <option value="YEARLY">Yearly</option>
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Start date" required>
              <DateInput value={startDate} onChange={(event) => setStartDate(event.target.value)} />
            </AccountingField>
            <AccountingField label="Next due date">
              <DateInput value={nextDueDate} onChange={(event) => setNextDueDate(event.target.value)} />
            </AccountingField>
            <AccountingField label="End date">
              <DateInput value={endDate} onChange={(event) => setEndDate(event.target.value)} />
            </AccountingField>
            <AccountingField label="Payment method">
              <AccountingInput value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} placeholder="BANK_TRANSFER / UPI / etc." />
            </AccountingField>
            <AccountingField label="Payment term">
              <AccountingInput value={paymentTermName} onChange={(event) => setPaymentTermName(event.target.value)} placeholder="Net 30" />
            </AccountingField>
            <AccountingField label="Narration" className="mnx-accounting-field-span">
              <AccountingTextarea rows={3} value={narration} onChange={(event) => setNarration(event.target.value)} />
            </AccountingField>
          </div>
          <AccountingDetailList>
            <AccountingDetail label="Estimated subtotal" value={estimatedTotals.subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })} />
            <AccountingDetail label="Estimated tax" value={estimatedTotals.tax.toLocaleString("en-IN", { minimumFractionDigits: 2 })} />
            <AccountingDetail label="Estimated total" value={estimatedTotals.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })} />
          </AccountingDetailList>
        </AccountingSection>
      ) : null}

      <AccountingSection
        eyebrow="Bill profiles"
        title="Recurring bill register"
        description="Generate draft purchase invoices, pause or resume billing cadences, skip due dates, and review recent run lineage."
        actions={
          canProcessOccurrences ? (
            <AccountingAction
              disabled={isPending && busyAction === "process-due-expenses"}
              onClick={() => processDue()}
            >
              {isPending && busyAction === "process-due-expenses" ? (
                <Loader2 className="animate-spin" size={16} />
              ) : null}
              Process due bills
            </AccountingAction>
          ) : undefined
        }
      >
        <AccountingTable>
          <thead>
            <tr>
              <th>Template</th>
              <th>Vendor</th>
              <th>Expense account</th>
              <th>Next due</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Recent runs</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {profiles.length === 0 ? (
              <AccountingEmptyTableRow colSpan={8}>
                No recurring bill profiles are configured yet.
              </AccountingEmptyTableRow>
            ) : (
              profiles.map((profile) => (
                <tr key={profile.id}>
                  <td>
                    <div>
                      <strong>{profile.templateName}</strong>
                      <small>{profile.narration || "No narration"}</small>
                    </div>
                  </td>
                  <td>{profile.vendor.name}</td>
                  <td>{profile.expenseAccount.accountCode} — {profile.expenseAccount.accountName}</td>
                  <td>{new Date(profile.nextDueDate).toLocaleDateString("en-IN")}</td>
                  <td>
                    ₹{(
                      Number(profile.amount) * (1 + Number(profile.taxRate) / 100)
                    ).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                  <td>
                    <AccountingStatus status={profile.isActive ? "ACTIVE" : "PAUSED"} />
                  </td>
                  <td>
                    <AccountingDetailList>
                      {profile.runs.length === 0 ? (
                        <AccountingDetail label="Runs" value="No runs yet" />
                      ) : (
                        profile.runs.map((run) => (
                          <AccountingDetail
                            key={run.id}
                            label={`${new Date(run.dueDate).toLocaleDateString("en-IN")} · ${run.runStatus}`}
                            value={run.generatedPurchaseInvoiceId || run.failureReason || "Recorded"}
                          />
                        ))
                      )}
                    </AccountingDetailList>
                  </td>
                  <td>
                    <div className="mnx-accounting-inline-actions">
                      {canProcessOccurrences ? (
                        <>
                          <AccountingAction
                            disabled={isPending && busyAction === `generate-expense-${profile.id}`}
                            onClick={() =>
                              runAction(`generate-expense-${profile.id}`, async () => {
                                const result = await generateRecurringExpenseOccurrenceAction(profile.id);
                                if (!result.ok) throw new Error(result.error);
                                toast.success("Draft purchase invoice generated");
                              })
                            }
                          >
                            Generate
                          </AccountingAction>
                          <AccountingAction
                            variant="secondary"
                            disabled={isPending && busyAction === `skip-expense-${profile.id}`}
                            onClick={() =>
                              runAction(`skip-expense-${profile.id}`, async () => {
                                const result = await skipRecurringExpenseOccurrenceAction(profile.id);
                                if (!result.ok) throw new Error(result.error);
                                toast.success("Recurring bill occurrence skipped");
                              })
                            }
                          >
                            Skip
                          </AccountingAction>
                        </>
                      ) : null}
                      {canManageTemplates ? (
                        profile.isActive ? (
                          <AccountingAction
                            variant="secondary"
                            disabled={isPending && busyAction === `pause-expense-${profile.id}`}
                            onClick={() =>
                              runAction(`pause-expense-${profile.id}`, async () => {
                                const result = await pauseRecurringExpenseProfileAction(profile.id);
                                if (!result.ok) throw new Error(result.error);
                                toast.success("Recurring bill profile paused");
                              })
                            }
                          >
                            Pause
                          </AccountingAction>
                        ) : (
                          <AccountingAction
                            variant="secondary"
                            disabled={isPending && busyAction === `resume-expense-${profile.id}`}
                            onClick={() =>
                              runAction(`resume-expense-${profile.id}`, async () => {
                                const result = await resumeRecurringExpenseProfileAction(profile.id);
                                if (!result.ok) throw new Error(result.error);
                                toast.success("Recurring bill profile resumed");
                              })
                            }
                          >
                            Resume
                          </AccountingAction>
                        )
                      ) : null}
                      {canManageTemplates ? (
                        <AccountingAction
                          variant="destructive"
                          disabled={isPending && busyAction === `cancel-expense-${profile.id}`}
                          onClick={() =>
                            runAction(`cancel-expense-${profile.id}`, async () => {
                              const result = await cancelRecurringExpenseProfileAction(profile.id);
                              if (!result.ok) throw new Error(result.error);
                              toast.success("Recurring bill profile cancelled");
                            })
                          }
                        >
                          Cancel
                        </AccountingAction>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </AccountingTable>
      </AccountingSection>
    </>
  );
}
