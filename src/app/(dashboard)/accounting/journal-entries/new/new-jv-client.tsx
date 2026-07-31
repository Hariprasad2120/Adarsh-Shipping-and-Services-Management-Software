"use client";

import { ChevronDown, Info, Loader2, Plus, Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { DateInput } from "@/components/monolith/date-input";
import {
  AccountingAction,
  AccountingAlert,
  AccountingCheckbox,
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
  accounts: Array<{
    id: string;
    accountCode: string;
    accountName: string;
    allowJournalContact: boolean;
  }>;
  branches: Array<{ id: string; name: string }>;
  contacts: Array<{
    id: string;
    label: string;
    type: "CUSTOMER" | "SUPPLIER" | "EMPLOYEE";
  }>;
}

type JournalLine = {
  accountId: string;
  debit: string;
  credit: string;
  remarks: string;
  partyKey: string;
};

const emptyLine = (): JournalLine => ({
  accountId: "",
  debit: "",
  credit: "",
  remarks: "",
  partyKey: "",
});

export function NewJVClient({
  accounts,
  branches,
  contacts,
}: NewJVClientProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [branchId, setBranchId] = useState("");
  const [postingDate, setPostingDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [reverseJournalDate, setReverseJournalDate] = useState("");
  const [publishReverseOnlyOnDate, setPublishReverseOnlyOnDate] =
    useState(false);
  const [referenceNumber, setReferenceNumber] = useState("");
  const [remarks, setRemarks] = useState("");
  const [reportingMethod, setReportingMethod] = useState("ACCRUAL_AND_CASH");
  const [currencyCode, setCurrencyCode] = useState("INR");
  const [lines, setLines] = useState<JournalLine[]>([emptyLine(), emptyLine()]);

  function decimalOrZero(value: string) {
    try {
      return normalizeDecimalString(value || "0", { maxScale: 8 });
    } catch {
      return "0";
    }
  }

  const totalDebit = addDecimalStrings(
    ...lines.map((line) => decimalOrZero(line.debit)),
  );
  const totalCredit = addDecimalStrings(
    ...lines.map((line) => decimalOrZero(line.credit)),
  );
  const isBalanced =
    compareDecimalStrings(totalDebit, "0") > 0 &&
    compareDecimalStrings(totalDebit, totalCredit) === 0;
  const difference = Math.abs(
    Number(totalDebit || "0") - Number(totalCredit || "0"),
  ).toFixed(2);

  function accountById(accountId: string) {
    return accounts.find((account) => account.id === accountId) ?? null;
  }

  function lineAllowsContact(line: JournalLine) {
    return Boolean(accountById(line.accountId)?.allowJournalContact);
  }

  function updateLine(index: number, field: keyof JournalLine, value: string) {
    setLines((current) =>
      current.map((line, lineIndex) => {
        if (lineIndex !== index) return line;
        const next = { ...line, [field]: value };
        if (field === "debit" && value !== "" && value !== "0") next.credit = "";
        if (field === "credit" && value !== "" && value !== "0") next.debit = "";
        if (field === "accountId") {
          const selected = accounts.find((account) => account.id === value);
          if (!selected?.allowJournalContact) {
            next.partyKey = "";
          }
        }
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
        lines: normalizedLines.map((line) => {
          const [partyType, partyId] = line.partyKey
            ? line.partyKey.split("::")
            : [null, null];
          return {
            accountId: line.accountId,
            debit: line.debit || "0",
            credit: line.credit || "0",
            partyType,
            partyId,
            remarks: line.remarks || null,
          };
        }),
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
        title="New journal"
        description="Prepare the manual journal in the requested operational layout. Draft creation still persists the currently supported header and line fields only."
        actions={
          <button
            className="mnx-accounting-journal-template-link"
            type="button"
            onClick={() =>
              toast.info("Journal templates are not connected to this draft flow yet")
            }
          >
            Choose Template
          </button>
        }
      >
        <div className="mnx-accounting-journal-reference-layout">
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

          <AccountingField
            label="Reverse Journal Date"
            htmlFor="jv-reverse-date"
          >
            <DateInput
              id="jv-reverse-date"
              value={reverseJournalDate}
              onChange={(event) => setReverseJournalDate(event.target.value)}
            />
          </AccountingField>

          <div className="mnx-accounting-journal-inline-checkbox">
            <AccountingCheckbox
              checked={publishReverseOnlyOnDate}
              onChange={(event) =>
                setPublishReverseOnlyOnDate(event.target.checked)
              }
              label="Publish reverse journal only on the reverse journal date"
            />
            <Info aria-hidden="true" size={14} />
          </div>

          <AccountingField label="Journal #" htmlFor="jv-number" required>
            <AccountingInput
              id="jv-number"
              value="Generated on save"
              readOnly
              aria-readonly="true"
            />
          </AccountingField>

          <AccountingField label="Reference #" htmlFor="jv-reference">
            <AccountingInput
              id="jv-reference"
              value={referenceNumber}
              onChange={(event) => setReferenceNumber(event.target.value)}
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
              placeholder="Max. 500 characters"
              value={remarks}
              onChange={(event) => setRemarks(event.target.value)}
            />
          </AccountingField>

          <div className="mnx-accounting-journal-radio-group">
            <label>Reporting Method</label>
            <div>
              {[
                ["ACCRUAL_AND_CASH", "Accrual and Cash"],
                ["ACCRUAL_ONLY", "Accrual Only"],
                ["CASH_ONLY", "Cash Only"],
              ].map(([value, label]) => (
                <label key={value} className="mnx-accounting-journal-radio-option">
                  <input
                    checked={reportingMethod === value}
                    name="reportingMethod"
                    type="radio"
                    value={value}
                    onChange={(event) => setReportingMethod(event.target.value)}
                  />
                  <span>{label}</span>
                </label>
              ))}
              <Info aria-hidden="true" size={14} />
            </div>
          </div>

          <AccountingField label="Currency" htmlFor="jv-currency">
            <AccountingSelect
              id="jv-currency"
              value={currencyCode}
              onChange={(event) => setCurrencyCode(event.target.value)}
            >
              <option value="INR">INR- Indian Rupee</option>
            </AccountingSelect>
          </AccountingField>
        </div>
      </AccountingSection>

      <AccountingSection
        eyebrow="Line distribution"
        title="Debit and credit lines"
        description="Contact is enabled only for ledgers marked in ledger master with manual-journal contact support."
        actions={
          <AccountingAction
            type="button"
            variant="secondary"
            onClick={() => setLines((current) => [...current, emptyLine()])}
          >
            <Plus aria-hidden="true" size={16} />
            Add New Row
          </AccountingAction>
        }
      >
        <div className="mnx-accounting-journal-table">
          <div className="mnx-accounting-journal-table-header" aria-hidden="true">
            <span>Account</span>
            <span>Description</span>
            <span>Contact (INR)</span>
            <span>Debits</span>
            <span>Credits</span>
            <span />
          </div>
          {lines.map((line, index) => {
            const contactEnabled = lineAllowsContact(line);
            return (
              <div className="mnx-accounting-journal-table-row" key={index}>
                <AccountingField label="Account">
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
                        [{account.accountCode}] {account.accountName}
                      </option>
                    ))}
                  </AccountingSelect>
                </AccountingField>

                <AccountingField label="Description">
                  <AccountingTextarea
                    rows={2}
                    value={line.remarks}
                    placeholder="Description"
                    onChange={(event) =>
                      updateLine(index, "remarks", event.target.value)
                    }
                  />
                </AccountingField>

                <AccountingField label="Contact (INR)">
                  <AccountingSelect
                    disabled={!contactEnabled}
                    value={line.partyKey}
                    onChange={(event) =>
                      updateLine(index, "partyKey", event.target.value)
                    }
                  >
                    <option value="">
                      {contactEnabled
                        ? "Select Contact"
                        : "Enable in ledger master"}
                    </option>
                    {contacts.map((contact) => (
                      <option
                        key={`${contact.type}-${contact.id}`}
                        value={`${contact.type}::${contact.id}`}
                      >
                        {contact.label} ({contact.type})
                      </option>
                    ))}
                  </AccountingSelect>
                </AccountingField>

                <AccountingField label="Debits">
                  <AccountingInput
                    type="number"
                    min="0"
                    step="0.01"
                    value={line.debit}
                    onChange={(event) =>
                      updateLine(index, "debit", event.target.value)
                    }
                  />
                </AccountingField>

                <AccountingField label="Credits">
                  <AccountingInput
                    type="number"
                    min="0"
                    step="0.01"
                    value={line.credit}
                    onChange={(event) =>
                      updateLine(index, "credit", event.target.value)
                    }
                  />
                </AccountingField>

                <div className="mnx-accounting-journal-table-action">
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
            );
          })}
        </div>

        <div className="mnx-accounting-journal-reference-footer">
          <div className="mnx-accounting-journal-attachments">
            <label>Attachments</label>
            <button
              className="mnx-accounting-journal-upload"
              type="button"
              onClick={() =>
                toast.info("Attachment upload is not connected for manual journals yet")
              }
            >
              <Upload aria-hidden="true" size={16} />
              Upload File
              <ChevronDown aria-hidden="true" size={16} />
            </button>
            <p>You can upload a maximum of 5 files, 10MB each</p>
          </div>

          <div className="mnx-accounting-journal-summary-card">
            <div>
              <span>Sub Total</span>
              <strong>{formatAccountingMoney(totalDebit, currencyCode)}</strong>
              <strong>{formatAccountingMoney(totalCredit, currencyCode)}</strong>
            </div>
            <div className="mnx-accounting-journal-summary-total">
              <span>Total (₹)</span>
              <strong>{formatAccountingMoney(totalDebit, currencyCode)}</strong>
              <strong>{formatAccountingMoney(totalCredit, currencyCode)}</strong>
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
                  : formatAccountingMoney(difference, currencyCode)}
              </strong>
            </div>
          </div>
        </div>
      </AccountingSection>

      <AccountingAlert variant={isBalanced ? "success" : "warning"}>
        {isBalanced
          ? "The manual journal is balanced and can be saved as a draft for independent approval."
          : "The manual journal cannot be saved until debit and credit totals match exactly."}
      </AccountingAlert>

      <div className="mnx-accounting-journal-bottom-actions">
        <AccountingAction
          disabled={isSaving}
          type="button"
          onClick={() =>
            toast.info("Publish-after-save is not connected for manual journals yet")
          }
        >
          {isSaving ? (
            <Loader2 aria-hidden="true" className="animate-spin" size={16} />
          ) : null}
          Save and Publish
        </AccountingAction>
        <AccountingAction disabled={isSaving} type="submit" variant="secondary">
          {isSaving ? (
            <Loader2 aria-hidden="true" className="animate-spin" size={16} />
          ) : null}
          Save as Draft
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
