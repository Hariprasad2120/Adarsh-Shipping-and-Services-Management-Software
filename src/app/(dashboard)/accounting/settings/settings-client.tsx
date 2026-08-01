"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { Loader2, RefreshCw, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  AccountingAction,
  AccountingAlert,
  AccountingField,
  AccountingSection,
  AccountingSelect,
} from "@/modules/accounting/components/accounting-workspace";
import {
  initializeCOAAction,
  updateAccountingSettingsAction,
} from "@/modules/accounting/actions";

type Account = {
  id: string;
  accountCode: string;
  accountName: string;
  accountType: string;
};

const mappingSections = [
  {
    index: "01",
    title: "Liquidity and cash defaults",
    description: "Accounts used for default cash and bank movement.",
    fields: [
      ["defaultBankAccountId", "Default bank account", ["BANK", "CASH"]],
      ["defaultCashAccountId", "Default cash account", ["CASH", "BANK"]],
    ],
  },
  {
    index: "02",
    title: "Customer billing and vendor payables",
    description: "Control accounts used by sales, purchases, tax, and rounding.",
    fields: [
      ["defaultReceivableAccountId", "Accounts receivable", ["RECEIVABLE"]],
      ["defaultPayableAccountId", "Accounts payable", ["PAYABLE"]],
      ["defaultSalesAccountId", "Default sales account", ["SALES"]],
      [
        "defaultPurchaseAccountId",
        "Default purchase account",
        ["PURCHASE", "EXPENSE"],
      ],
      ["defaultTaxAccountId", "Default tax account", ["TAX"]],
      ["defaultRoundOffAccountId", "Default round-off account", ["ROUND_OFF"]],
    ],
  },
  {
    index: "03",
    title: "HRMS payroll mappings",
    description: "Expense and payable accounts used for payroll posting.",
    fields: [
      ["defaultSalaryExpenseAccountId", "Salary expense account", ["EXPENSE"]],
      ["defaultSalaryPayableAccountId", "Salary payable account", ["PAYABLE"]],
    ],
  },
  {
    index: "04",
    title: "Asset depreciation mappings",
    description: "Accounts used for periodic depreciation and accumulated value.",
    fields: [
      [
        "defaultDepreciationExpenseAccountId",
        "Depreciation expense account",
        ["EXPENSE"],
      ],
      [
        "defaultAccumulatedDepreciationAccountId",
        "Accumulated depreciation account",
        ["DEPRECIATION"],
      ],
    ],
  },
] as const;

export function SettingsClient({
  accounts,
  initialSettings,
}: {
  initialSettings: any;
  accounts: Account[];
}) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [isInitialising, setIsInitialising] = useState(false);
  const [formData, setFormData] = useState({
    defaultReceivableAccountId:
      initialSettings?.defaultReceivableAccountId || "",
    defaultPayableAccountId: initialSettings?.defaultPayableAccountId || "",
    defaultCashAccountId: initialSettings?.defaultCashAccountId || "",
    defaultBankAccountId: initialSettings?.defaultBankAccountId || "",
    defaultSalesAccountId: initialSettings?.defaultSalesAccountId || "",
    defaultPurchaseAccountId: initialSettings?.defaultPurchaseAccountId || "",
    defaultTaxAccountId: initialSettings?.defaultTaxAccountId || "",
    defaultRoundOffAccountId: initialSettings?.defaultRoundOffAccountId || "",
    defaultSalaryExpenseAccountId:
      initialSettings?.defaultSalaryExpenseAccountId || "",
    defaultSalaryPayableAccountId:
      initialSettings?.defaultSalaryPayableAccountId || "",
    defaultDepreciationExpenseAccountId:
      initialSettings?.defaultDepreciationExpenseAccountId || "",
    defaultAccumulatedDepreciationAccountId:
      initialSettings?.defaultAccumulatedDepreciationAccountId || "",
  });

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setIsSaving(true);
    try {
      const result = await updateAccountingSettingsAction(formData);
      if (result.ok) {
        toast.success("Accounting settings updated");
        router.refresh();
      } else toast.error(result.error);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save settings",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function initialiseChart() {
    if (
      !confirm(
        "Ensure every standard account exists in the chart of accounts?",
      )
    )
      return;
    setIsInitialising(true);
    try {
      const result = await initializeCOAAction();
      if (result.ok) {
        toast.success("Chart of accounts initialised");
        router.refresh();
      } else toast.error(result.error);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to initialise chart of accounts",
      );
    } finally {
      setIsInitialising(false);
    }
  }

  return (
    <>
      <form className="mnx-accounting-form" onSubmit={save}>
        {mappingSections.map((section) => (
          <AccountingSection
            eyebrow={section.index}
            title={section.title}
            description={section.description}
            key={section.title}
          >
            <div className="mnx-accounting-form-grid">
              {section.fields.map(([field, label, types]) => (
                <AccountingField label={label} key={field}>
                  <AccountingSelect
                    value={formData[field]}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        [field]: event.target.value,
                      }))
                    }
                  >
                    <option value="">Select account</option>
                    {accounts
                      .filter((account) =>
                        (types as readonly string[]).includes(account.accountType),
                      )
                      .map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.accountCode} — {account.accountName}
                        </option>
                      ))}
                  </AccountingSelect>
                </AccountingField>
              ))}
            </div>
          </AccountingSection>
        ))}
        <div className="mnx-accounting-form-actions">
          <AccountingAction disabled={isSaving} type="submit">
            {isSaving ? (
              <Loader2 aria-hidden="true" className="animate-spin" size={16} />
            ) : (
              <Save aria-hidden="true" size={16} />
            )}
            {isSaving ? "Saving…" : "Save mappings"}
          </AccountingAction>
        </div>
      </form>

      <AccountingSection
        eyebrow="Controlled maintenance"
        title="Standard chart initialisation"
        description="Create any missing standard Asset, Liability, Equity, Income, and Expense accounts without removing existing ledgers."
        actions={
          <AccountingAction
            disabled={isInitialising}
            onClick={initialiseChart}
            variant="destructive"
          >
            {isInitialising ? (
              <Loader2 aria-hidden="true" className="animate-spin" size={16} />
            ) : (
              <RefreshCw aria-hidden="true" size={16} />
            )}
            Seed standard accounts
          </AccountingAction>
        }
      >
        <AccountingAlert variant="warning">
          This operation is additive. Existing posting accounts and balances are
          retained.
        </AccountingAlert>
      </AccountingSection>
    </>
  );
}
