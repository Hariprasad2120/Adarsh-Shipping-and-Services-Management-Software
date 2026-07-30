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
} from "@/components/monolith/accounting-workspace";
import { createJournalEntryAction } from "@/modules/accounting/actions";

interface NewJVClientProps {
  accounts: Array<{ id: string; accountCode: string; accountName: string }>;
  branches: Array<{ id: string; name: string }>;
}

type JournalLine = {
  accountId: string;
  debit: number | string;
  credit: number | string;
  remarks: string;
};

const emptyLine = (): JournalLine => ({
  accountId: "",
  debit: 0,
  credit: 0,
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

  function updateLine(
    index: number,
    field: keyof JournalLine,
    value: string,
  ) {
    setLines((current) =>
      current.map((line, lineIndex) => {
        if (lineIndex !== index) return line;
        const next = { ...line, [field]: value };
        if (field === "debit" && value !== "" && value !== "0") next.credit = "0";
        if (field === "credit" && value !== "" && value !== "0") next.debit = "0";
        return next;
      }),
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (lines.some((line) => !line.accountId)) {
      toast.error("Please select accounts for all lines");
      return;
    }
    setIsSaving(true);
    try {
      const result = await createJournalEntryAction({
        postingDate: new Date(postingDate),
        remarks: remarks || null,
        branchId: branchId || null,
        lines: lines.map((line) => ({
          accountId: line.accountId,
          debit: String(line.debit || "0"),
          credit: String(line.credit || "0"),
          remarks: line.remarks || null,
        })),
      });
      if (result.ok) {
        toast.success("Journal entry draft saved for separate approval");
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
        eyebrow="01"
        title="Voucher header"
        description="Set the posting date, organisational dimension, and narration."
      >
        <div className="mnx-accounting-form-grid mnx-accounting-form-grid-wide">
          <AccountingField label="Posting date" htmlFor="jv-date" required>
            <DateInput
              id="jv-date"
              required
              value={postingDate}
              onChange={(event) => setPostingDate(event.target.value)}
            />
          </AccountingField>
          <AccountingField label="Branch" htmlFor="jv-branch">
            <AccountingSelect
              id="jv-branch"
              value={branchId}
              onChange={(event) => setBranchId(event.target.value)}
            >
              <option value="">Global / organisation-wide</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </AccountingSelect>
          </AccountingField>
          <AccountingField label="General remarks" htmlFor="jv-remarks">
            <AccountingInput
              id="jv-remarks"
              value={remarks}
              placeholder="Month-end depreciation adjustment"
              onChange={(event) => setRemarks(event.target.value)}
            />
          </AccountingField>
        </div>
      </AccountingSection>

      <AccountingSection
        eyebrow="02"
        title="Debit and credit distribution"
        description="Every voucher needs at least two lines and equal debit and credit totals."
        actions={
          <AccountingAction
            type="button"
            variant="secondary"
            onClick={() => setLines((current) => [...current, emptyLine()])}
          >
            <Plus aria-hidden="true" size={16} />
            Add line
          </AccountingAction>
        }
      >
        <div className="mnx-accounting-form">
          {lines.map((line, index) => (
            <div
              className="mnx-accounting-form-grid mnx-accounting-form-grid-wide"
              key={index}
            >
              <AccountingField label={`Account ${index + 1}`}>
                <AccountingSelect
                  required
                  value={line.accountId}
                  onChange={(event) =>
                    updateLine(index, "accountId", event.target.value)
                  }
                >
                  <option value="">Select account</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.accountCode} — {account.accountName}
                    </option>
                  ))}
                </AccountingSelect>
              </AccountingField>
              <AccountingField label="Debit">
                <AccountingInput
                  type="number"
                  step="0.01"
                  min="0"
                  value={line.debit || ""}
                  onChange={(event) =>
                    updateLine(index, "debit", event.target.value)
                  }
                />
              </AccountingField>
              <AccountingField label="Credit">
                <AccountingInput
                  type="number"
                  step="0.01"
                  min="0"
                  value={line.credit || ""}
                  onChange={(event) =>
                    updateLine(index, "credit", event.target.value)
                  }
                />
              </AccountingField>
              <AccountingField label="Line description">
                <AccountingInput
                  value={line.remarks}
                  onChange={(event) =>
                    updateLine(index, "remarks", event.target.value)
                  }
                />
              </AccountingField>
              <AccountingAction
                aria-label={`Remove line ${index + 1}`}
                type="button"
                variant="destructive"
                onClick={() => {
                  if (lines.length <= 2) {
                    toast.error("At least two lines are required");
                    return;
                  }
                  setLines((current) =>
                    current.filter((_, lineIndex) => lineIndex !== index),
                  );
                }}
              >
                <Trash2 aria-hidden="true" size={16} />
                Remove
              </AccountingAction>
            </div>
          ))}
        </div>
      </AccountingSection>

      <AccountingAlert>
        Amounts are stored as exact decimal strings. Accounting validates exact
        debit and credit equality when a separate approver posts the draft.
      </AccountingAlert>
      <div className="mnx-accounting-form-actions">
        <AccountingAction disabled={isSaving} type="submit">
          {isSaving ? <Loader2 aria-hidden="true" className="animate-spin" size={16} /> : null}
          {isSaving ? "Saving…" : "Save voucher"}
        </AccountingAction>
      </div>
    </form>
  );
}
