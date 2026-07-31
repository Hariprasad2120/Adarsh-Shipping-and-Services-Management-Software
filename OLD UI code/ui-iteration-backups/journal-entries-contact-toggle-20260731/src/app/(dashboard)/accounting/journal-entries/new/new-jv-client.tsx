"use client";

import { Loader2, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { DateInput } from "@/components/monolith/date-input";
import {
  AccountingAction,
  AccountingAlert,
  AccountingField,
  AccountingInput,
  AccountingSection,
  AccountingSelect,
  AccountingTextarea,
} from "@/components/monolith/accounting-workspace";
import { createJournalEntryAction } from "@/modules/accounting/actions";
import {
  addDecimalStrings,
  compareDecimalStrings,
  formatAccountingMoney,
  normalizeDecimalString,
} from "@/modules/accounting/operational-helpers";

interface NewJVClientProps {
  accounts: Array<{ id: string; accountCode: string; accountName: string }>;
  branches: Array<{ id: string; name: string }>;
}

type JournalLine = {
  accountId: string;
  debit: string;
  credit: string;
  remarks: string;
};

const emptyLine = (): JournalLine => ({
  accountId: "",
  debit: "",
  credit: "",
  remarks: "",
});

export function NewJVClient({ accounts, branches }: NewJVClientProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [branchId, setBranchId] = useState("");
  const [remarks, setRemarks] = useState("");
  const [postingDate, setPostingDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [lines, setLines] = useState<JournalLine[]>([emptyLine(), emptyLine()]);

  function decimalOrZero(value: string) {
    try {
      return normalizeDecimalString(value || "0", { maxScale: 8 });
    } catch {
      return "0";
    }
  }

  const totals = {
    debit: addDecimalStrings(...lines.map((line) => decimalOrZero(line.debit))),
    credit: addDecimalStrings(
      ...lines.map((line) => decimalOrZero(line.credit)),
    ),
  };

  const isBalanced =
    compareDecimalStrings(totals.debit, "0") > 0 &&
    compareDecimalStrings(totals.debit, totals.credit) === 0;
  const differenceValue = Math.abs(
    Number(totals.debit || "0") - Number(totals.credit || "0"),
  );

  function updateLine(index: number, field: keyof JournalLine, value: string) {
    setLines((current) =>
      current.map((line, lineIndex) => {
        if (lineIndex !== index) return line;
        const next = { ...line, [field]: value };
        if (field === "debit" && value !== "" && value !== "0") next.credit = "";
        if (field === "credit" && value !== "" && value !== "0") next.debit = "";
        return next;
      }),
    );
  }

  function removeLine(index: number) {
    if (lines.length <= 2) {
      toast.error("At least two journal lines are required");
      return;
    }
    setLines((current) => current.filter((_, lineIndex) => lineIndex !== index));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (lines.some((line) => !line.accountId)) {
      toast.error("Please select an account for every line");
      return;
    }

    let normalizedLines: JournalLine[];
    try {
      normalizedLines = lines.map((line) => ({
        ...line,
        debit: normalizeDecimalString(line.debit || "0", { maxScale: 8 }),
        credit: normalizeDecimalString(line.credit || "0", { maxScale: 8 }),
      }));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Enter valid journal amounts",
      );
      return;
    }

    if (!isBalanced) {
      toast.error("Debit and credit totals must match and be greater than zero");
      return;
    }

    setIsSaving(true);
    try {
      const result = await createJournalEntryAction({
        postingDate: new Date(postingDate),
        remarks: remarks || null,
        branchId: branchId || null,
        lines: normalizedLines.map((line) => ({
          accountId: line.accountId,
          debit: line.debit || "0",
          credit: line.credit || "0",
          remarks: line.remarks || null,
        })),
      });
      if (result.ok) {
        toast.success("Journal draft saved for separate approval");
        router.push("/accounting/journal-entries");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create journal entry",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="mnx-accounting-form" onSubmit={handleSubmit}>
      <AccountingSection
        eyebrow="Voucher setup"
        title="Journal header"
        description="Manual journals stay draft-only at creation time, so the maker can prepare the entry and an independent approver can post it later."
      >
        <div className="mnx-accounting-journal-header-grid">
          <AccountingField label="Location" htmlFor="jv-branch">
            <AccountingSelect
              id="jv-branch"
              value={branchId}
              onChange={(event) => setBranchId(event.target.value)}
            >
              <option value="">Organisation-wide</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </AccountingSelect>
          </AccountingField>
          <AccountingField label="Date" htmlFor="jv-date" required>
            <DateInput
              id="jv-date"
              required
              value={postingDate}
              onChange={(event) => setPostingDate(event.target.value)}
            />
          </AccountingField>
          <AccountingField label="Journal #" htmlFor="jv-number">
            <AccountingInput
              id="jv-number"
              value="Generated on save"
              readOnly
              aria-readonly="true"
            />
          </AccountingField>
          <AccountingField
            className="mnx-accounting-field-span"
            label="Notes"
            htmlFor="jv-remarks"
            required
          >
            <AccountingTextarea
              id="jv-remarks"
              rows={4}
              maxLength={500}
              placeholder="Narration for the journal entry"
              value={remarks}
              onChange={(event) => setRemarks(event.target.value)}
            />
          </AccountingField>
        </div>
      </AccountingSection>

      <AccountingSection
        eyebrow="Line distribution"
        title="Debit and credit lines"
        description="Each line must post to one active account, and the voucher can only be saved when total debits and credits are exactly balanced."
        actions={
          <AccountingAction
            type="button"
            variant="secondary"
            onClick={() => setLines((current) => [...current, emptyLine()])}
          >
            <Plus aria-hidden="true" size={16} />
            Add new row
          </AccountingAction>
        }
      >
        <div className="mnx-accounting-journal-lines">
          <div className="mnx-accounting-journal-lines-header" aria-hidden="true">
            <span>Account</span>
            <span>Description</span>
            <span>Debits</span>
            <span>Credits</span>
            <span>Action</span>
          </div>
          {lines.map((line, index) => (
            <div className="mnx-accounting-journal-line-row" key={index}>
              <AccountingField
                label={`Account ${index + 1}`}
                className="mnx-accounting-journal-field-account"
              >
                <AccountingSelect
                  required
                  value={line.accountId}
                  onChange={(event) =>
                    updateLine(index, "accountId", event.target.value)
                  }
                >
                  <option value="">Select an account</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.accountCode} - {account.accountName}
                    </option>
                  ))}
                </AccountingSelect>
              </AccountingField>
              <AccountingField
                label="Description"
                className="mnx-accounting-journal-field-description"
              >
                <AccountingInput
                  value={line.remarks}
                  placeholder="Line description"
                  onChange={(event) =>
                    updateLine(index, "remarks", event.target.value)
                  }
                />
              </AccountingField>
              <AccountingField
                label="Debits"
                className="mnx-accounting-journal-field-amount"
              >
                <AccountingInput
                  type="number"
                  step="0.01"
                  min="0"
                  value={line.debit}
                  onChange={(event) =>
                    updateLine(index, "debit", event.target.value)
                  }
                />
              </AccountingField>
              <AccountingField
                label="Credits"
                className="mnx-accounting-journal-field-amount"
              >
                <AccountingInput
                  type="number"
                  step="0.01"
                  min="0"
                  value={line.credit}
                  onChange={(event) =>
                    updateLine(index, "credit", event.target.value)
                  }
                />
              </AccountingField>
              <div className="mnx-accounting-journal-line-action">
                <AccountingAction
                  aria-label={`Remove journal line ${index + 1}`}
                  type="button"
                  variant="destructive"
                  onClick={() => removeLine(index)}
                >
                  <Trash2 aria-hidden="true" size={16} />
                  Remove
                </AccountingAction>
              </div>
            </div>
          ))}
        </div>

        <div className="mnx-accounting-journal-summary-card">
          <div>
            <span>Sub Total</span>
            <strong>{formatAccountingMoney(totals.debit, "INR")}</strong>
            <strong>{formatAccountingMoney(totals.credit, "INR")}</strong>
          </div>
          <div className="mnx-accounting-journal-summary-total">
            <span>Total (₹)</span>
            <strong>{formatAccountingMoney(totals.debit, "INR")}</strong>
            <strong>{formatAccountingMoney(totals.credit, "INR")}</strong>
          </div>
          <div
            className={
              isBalanced
                ? "mnx-accounting-journal-summary-difference is-balanced"
                : "mnx-accounting-journal-summary-difference"
            }
          >
            <span>Difference</span>
            <strong>
              {isBalanced
                ? "0.00"
                : formatAccountingMoney(differenceValue.toFixed(2), "INR")}
            </strong>
          </div>
        </div>
      </AccountingSection>

      <AccountingAlert variant={isBalanced ? "success" : "warning"}>
        {isBalanced
          ? "The journal is balanced and ready to be saved as a draft for independent approval."
          : "The journal stays unsaved until debit and credit totals are exactly equal."}
      </AccountingAlert>

      <div className="mnx-accounting-form-actions">
        <AccountingAction disabled={isSaving} type="submit">
          {isSaving ? (
            <Loader2 aria-hidden="true" className="animate-spin" size={16} />
          ) : null}
          {isSaving ? "Saving..." : "Save as draft"}
        </AccountingAction>
        <AccountingAction
          type="button"
          variant="secondary"
          onClick={() => router.push("/accounting/journal-entries")}
        >
          Cancel
        </AccountingAction>
      </div>
    </form>
  );
}
