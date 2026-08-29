"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { EllipsisVertical, FileSpreadsheet, Loader2, PencilLine } from "lucide-react";
import { useMemo, useState, useTransition } from "react";

import { DateInput } from "@/components/ui/date-input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/monolith";
import {
  AccountingAction,
  AccountingAlert,
  AccountingDialog,
  AccountingEmptyTableRow,
  AccountingField,
  AccountingInput,
  AccountingMetric,
  AccountingMetrics,
  AccountingMoney,
  AccountingPanel,
  AccountingSection,
  AccountingSelect,
  AccountingStatus,
  AccountingTable,
  AccountingTextarea,
  AccountingToolbar,
} from "@/modules/accounting/components/accounting-workspace";
import {
  markBankAccountInactiveAction,
  saveManualBankAccountAction,
} from "@/modules/accounting/banking-actions";
import { BANKING_ACCOUNT_KIND_OPTIONS } from "@/modules/accounting/banking-shared";
import { formatAccountingMoney } from "@/modules/accounting/operational-helpers";
import { StatementDialog } from "./statement-dialog";

type OverviewRow = {
  id: string;
  code: string;
  name: string;
  bankName: string;
  branchName: string | null;
  maskedIdentifier: string;
  currencyCode: string;
  accountKind: string;
  description: string | null;
  isActive: boolean;
  isPrimary: boolean;
  ledgerAccountId: string;
  ledgerAccountCode: string;
  ledgerAccountName: string;
  locationName: string;
  uncategorizedCount: number;
  amountInBooks: string;
  amountInBank: string | null;
  amountInBankAsOf: string | null;
  lastImportStatus: string | null;
  rowVersion: number;
};

type OverviewSummary = {
  currencyCode: string;
  amount: string;
};

type BankingOverview = {
  filters: {
    dateFrom: string;
    dateTo: string;
    page: number;
    search: string;
    status: "active" | "inactive" | "all";
  };
  pageSize: number;
  pageCount: number;
  total: number;
  summary: {
    cashInHand: OverviewSummary[];
    bankBalance: OverviewSummary[];
  };
  rows: OverviewRow[];
  statementHistory: Array<{
    id: string;
    bankAccountId: string;
    bankAccountName: string;
    sourceFileName: string;
    sourceFileKeyLabel: string | null;
    sourceFormat: string;
    statementStart: string | null;
    statementEnd: string | null;
    importDate: string;
    importedBy: string;
    status: string;
    totalRows: number;
    importedRows: number;
    invalidRows: number;
    duplicateRows: number;
    closingBalance: string | null;
    currencyCode: string;
    failureReason: string | null;
  }>;
  functionalCurrencyCode: string;
};

type BankAccountOption = {
  id: string;
  name: string;
  bankName: string;
  currencyCode: string;
  isActive: boolean;
};

type LedgerAccountOption = {
  id: string;
  legalEntityId: string | null;
  branchId: string | null;
  accountCode: string;
  accountName: string;
  branch: { name: string } | null;
};

type ManageFormState = {
  bankAccountId?: string;
  expectedVersion?: number;
  ledgerAccountId: string;
  name: string;
  bankName: string;
  branchName: string;
  accountNumberMasked: string;
  ifsc: string;
  currencyCode: string;
  accountKind: string;
  description: string;
  isActive: boolean;
  reason: string;
};

function formatMoneyList(values: OverviewSummary[]) {
  if (values.length === 0) return "—";
  return values
    .map((value) => formatAccountingMoney(value.amount, value.currencyCode, 2))
    .join(" · ");
}

function createEmptyForm(functionalCurrencyCode: string): ManageFormState {
  return {
    ledgerAccountId: "",
    name: "",
    bankName: "",
    branchName: "",
    accountNumberMasked: "",
    ifsc: "",
    currencyCode: functionalCurrencyCode,
    accountKind: BANKING_ACCOUNT_KIND_OPTIONS[0].value,
    description: "",
    isActive: true,
    reason: "Bank account created from Banking overview",
  };
}

function buildEditForm(
  row: OverviewRow,
  functionalCurrencyCode: string,
): ManageFormState {
  return {
    bankAccountId: row.id,
    expectedVersion: row.rowVersion,
    ledgerAccountId: row.ledgerAccountId,
    name: row.name,
    bankName: row.bankName,
    branchName: row.branchName ?? "",
    accountNumberMasked: row.maskedIdentifier,
    ifsc: "",
    currencyCode: row.currencyCode || functionalCurrencyCode,
    accountKind: row.accountKind,
    description: row.description ?? "",
    isActive: row.isActive,
    reason: "Bank account metadata updated from Banking overview",
  };
}

export function BankingClient({
  bankAccounts,
  canManageBankAccounts,
  functionalCurrencyCode,
  ledgerAccounts,
  mappedLedgerAccountIds,
  overview,
}: {
  bankAccounts: BankAccountOption[];
  canManageBankAccounts: boolean;
  functionalCurrencyCode: string;
  ledgerAccounts: LedgerAccountOption[];
  mappedLedgerAccountIds: string[];
  overview: BankingOverview;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isFiltering, startFiltering] = useTransition();
  const [isSaving, startSaving] = useTransition();
  const [isInactivating, startInactivating] = useTransition();
  const [manageOpen, setManageOpen] = useState(false);
  const [inactiveOpen, setInactiveOpen] = useState(false);
  const [statementOpen, setStatementOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<OverviewRow | null>(null);
  const [inactiveRow, setInactiveRow] = useState<OverviewRow | null>(null);
  const [statementAccountId, setStatementAccountId] = useState<string | null>(null);
  const [form, setForm] = useState<ManageFormState>(() =>
    createEmptyForm(functionalCurrencyCode),
  );
  const [inactiveReason, setInactiveReason] = useState(
    "Bank account marked inactive from Banking overview",
  );
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentQuery = useMemo(
    () => ({
      search: searchParams.get("search") ?? overview.filters.search,
      status: searchParams.get("status") ?? overview.filters.status,
      dateFrom: searchParams.get("dateFrom") ?? overview.filters.dateFrom,
      dateTo: searchParams.get("dateTo") ?? overview.filters.dateTo,
    }),
    [overview.filters, searchParams],
  );
  const createLedgerAccounts = useMemo(
    () =>
      ledgerAccounts.filter((account) => !mappedLedgerAccountIds.includes(account.id)),
    [ledgerAccounts, mappedLedgerAccountIds],
  );
  const selectableLedgerAccounts = editingRow ? ledgerAccounts : createLedgerAccounts;

  function updateQuery(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (!value) params.delete(key);
      else params.set(key, value);
    }
    if (!Object.prototype.hasOwnProperty.call(updates, "page")) {
      params.set("page", "1");
    }
    startFiltering(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  function openCreateDialog() {
    if (createLedgerAccounts.length === 0) {
      setFeedback(null);
      setError(
        "Every available BANK ledger is already linked to a bank account. Create another active BANK ledger in Chart of Accounts before adding a new bank account.",
      );
      return;
    }
    setEditingRow(null);
    setError(null);
    setFeedback(null);
    const nextLedgerAccount = createLedgerAccounts[0] ?? null;
    setForm({
      ...createEmptyForm(functionalCurrencyCode),
      ledgerAccountId: nextLedgerAccount?.id ?? "",
      branchName: nextLedgerAccount?.branch?.name ?? "",
    });
    setManageOpen(true);
  }

  function openStatementDialog(bankAccountId?: string | null) {
    setStatementAccountId(bankAccountId ?? null);
    setStatementOpen(true);
  }

  function openEditDialog(row: OverviewRow) {
    setEditingRow(row);
    setError(null);
    setFeedback(null);
    setForm(buildEditForm(row, functionalCurrencyCode));
    setManageOpen(true);
  }

  function openInactiveDialog(row: OverviewRow) {
    setInactiveRow(row);
    setError(null);
    setFeedback(null);
    setInactiveReason("Bank account marked inactive from Banking overview");
    setInactiveOpen(true);
  }

  function selectedLedgerAccount() {
    return ledgerAccounts.find((account) => account.id === form.ledgerAccountId) ?? null;
  }

  function saveBankAccount() {
    setError(null);
    setFeedback(null);
    startSaving(async () => {
      const result = await saveManualBankAccountAction({
        bankAccountId: form.bankAccountId,
        expectedVersion: form.expectedVersion,
        ledgerAccountId: form.ledgerAccountId,
        name: form.name,
        bankName: form.bankName,
        branchName: form.branchName,
        accountNumberMasked: form.accountNumberMasked,
        ifsc: form.ifsc,
        currencyCode: form.currencyCode,
        accountKind: form.accountKind,
        description: form.description,
        isActive: form.isActive,
        reason: form.reason,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setFeedback(
        form.bankAccountId
          ? "Bank account details updated."
          : "Bank account created.",
      );
      setManageOpen(false);
      router.refresh();
    });
  }

  function markInactive() {
    if (!inactiveRow) return;
    setError(null);
    setFeedback(null);
    startInactivating(async () => {
      const result = await markBankAccountInactiveAction({
        bankAccountId: inactiveRow.id,
        reason: inactiveReason,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setFeedback("Bank account marked inactive.");
      setInactiveOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      {feedback ? <AccountingAlert variant="success">{feedback}</AccountingAlert> : null}
      {error ? <AccountingAlert variant="danger">{error}</AccountingAlert> : null}

      <AccountingSection
        eyebrow="Banking"
        title="Overview"
        description="Live book balances are calculated from posted ledger entries. External bank balances only appear when a reviewed statement import already exists."
        actions={
          <div className="flex items-center gap-2">
            <AccountingAction onClick={() => openStatementDialog()} variant="secondary">
              <FileSpreadsheet aria-hidden="true" size={16} />
              Bank statements
            </AccountingAction>
            {canManageBankAccounts ? (
              <AccountingAction onClick={openCreateDialog}>
                <PencilLine aria-hidden="true" size={16} />
                Add bank account
              </AccountingAction>
            ) : null}
          </div>
        }
      >
        <AccountingToolbar>
          <AccountingField label="Search" className="min-w-[16rem]">
            <AccountingInput
              defaultValue={currentQuery.search}
              onBlur={(event) => updateQuery({ search: event.target.value })}
              placeholder="Search name, bank, code, or masked account"
            />
          </AccountingField>
          <AccountingField label="Status">
            <AccountingSelect
              value={currentQuery.status}
              onChange={(event) => updateQuery({ status: event.target.value })}
            >
              <option value="active">Active accounts</option>
              <option value="inactive">Inactive accounts</option>
              <option value="all">All accounts</option>
            </AccountingSelect>
          </AccountingField>
          <AccountingField label="Date from">
            <DateInput
              value={currentQuery.dateFrom}
              onChange={(event) => updateQuery({ dateFrom: event.target.value })}
            />
          </AccountingField>
          <AccountingField label="Date to">
            <DateInput
              value={currentQuery.dateTo}
              onChange={(event) => updateQuery({ dateTo: event.target.value })}
            />
          </AccountingField>
        </AccountingToolbar>

        <AccountingMetrics aria-live="polite">
          <AccountingMetric
            label="Cash in hand"
            value={formatMoneyList(overview.summary.cashInHand)}
            detail="Active cash ledgers in scope"
          />
          <AccountingMetric
            label="Bank balance"
            value={formatMoneyList(overview.summary.bankBalance)}
            detail="Active bank ledgers from posted books"
          />
          <AccountingMetric
            label="Tracked accounts"
            value={overview.total}
            detail={
              isFiltering
                ? "Refreshing filtered Banking accounts"
                : "Bank accounts registered in Banking"
            }
          />
        </AccountingMetrics>
      </AccountingSection>

      <AccountingSection
        eyebrow="Banking"
        title="Active accounts"
        description="Each row keeps Amount in Bank separate from Amount in Books and shows only actions that work in this repository today."
      >
        <AccountingTable>
          <thead>
            <tr>
              <th>Account details</th>
              <th>Uncategorized</th>
              <th>Amount in Bank</th>
              <th>Amount in Books</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {overview.rows.length === 0 ? (
              <AccountingEmptyTableRow colSpan={5}>
                {canManageBankAccounts
                  ? "No bank accounts match these filters yet."
                  : "No Banking accounts are available in your current scope."}
              </AccountingEmptyTableRow>
            ) : (
              overview.rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <div className="flex flex-col gap-1">
                      <strong>{row.name}</strong>
                      <span>
                        {row.bankName} · {row.accountKind.replaceAll("_", " ")}
                      </span>
                      <span>
                        {row.maskedIdentifier || "Masked identifier unavailable"} ·{" "}
                        {row.currencyCode} · {row.locationName}
                      </span>
                      <span>{row.ledgerAccountCode} · {row.ledgerAccountName}</span>
                    </div>
                  </td>
                  <td>{row.uncategorizedCount}</td>
                  <td>
                    {row.amountInBank ? (
                      <div className="flex flex-col gap-1">
                        <AccountingMoney
                          amount={row.amountInBank}
                          currencyCode={row.currencyCode}
                        />
                        <small>
                          {row.amountInBankAsOf
                            ? `Imported as of ${new Date(row.amountInBankAsOf).toLocaleDateString("en-IN")}`
                            : "Imported balance"}
                        </small>
                      </div>
                    ) : (
                      <span>Unavailable</span>
                    )}
                  </td>
                  <td>
                    <div className="flex flex-col gap-1">
                      <AccountingMoney
                        amount={row.amountInBooks}
                        currencyCode={row.currencyCode}
                      />
                      <small>Posted ledger balance</small>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center justify-end gap-2">
                      <AccountingStatus status={row.isActive ? "ACTIVE" : "INACTIVE"} />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <AccountingAction
                            aria-label={`Open actions for ${row.name}`}
                            variant="secondary"
                            className="mnx-icon-button"
                            type="button"
                          >
                            <EllipsisVertical aria-hidden="true" size={16} />
                          </AccountingAction>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canManageBankAccounts ? (
                            <DropdownMenuItem onSelect={() => openEditDialog(row)}>
                              Edit account
                            </DropdownMenuItem>
                          ) : null}
                          <DropdownMenuItem asChild>
                            <Link
                              href={`/accounting/banking/${row.id}?dateFrom=${overview.filters.dateFrom}&dateTo=${overview.filters.dateTo}`}
                            >
                              View transactions
                            </Link>
                          </DropdownMenuItem>
                          {canManageBankAccounts && row.isActive ? (
                            <DropdownMenuItem onSelect={() => openStatementDialog(row.id)}>
                              Import statement
                            </DropdownMenuItem>
                          ) : null}
                          {canManageBankAccounts && row.isActive ? (
                            <DropdownMenuItem onSelect={() => openInactiveDialog(row)}>
                              Mark as inactive
                            </DropdownMenuItem>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </AccountingTable>

        {overview.pageCount > 1 ? (
          <div className="flex items-center justify-between gap-3">
            <small>
              Page {overview.filters.page} of {overview.pageCount}
            </small>
            <div className="flex items-center gap-2">
              <AccountingAction
                disabled={overview.filters.page <= 1 || isFiltering}
                onClick={() =>
                  updateQuery({
                    page: String(Math.max(1, overview.filters.page - 1)),
                  })
                }
                variant="secondary"
              >
                Previous
              </AccountingAction>
              <AccountingAction
                disabled={overview.filters.page >= overview.pageCount || isFiltering}
                onClick={() =>
                  updateQuery({
                    page: String(Math.min(overview.pageCount, overview.filters.page + 1)),
                  })
                }
                variant="secondary"
              >
                Next
              </AccountingAction>
            </div>
          </div>
        ) : null}
      </AccountingSection>

      <AccountingDialog
        open={manageOpen}
        onClose={() => setManageOpen(false)}
        title={editingRow ? "Edit bank account" : "Add bank account"}
        description="This flow manages the Banking registry metadata only. Book balances continue to come from posted ledger activity."
        footer={
          <>
            <AccountingAction
              type="button"
              variant="secondary"
              onClick={() => setManageOpen(false)}
            >
              Cancel
            </AccountingAction>
            <AccountingAction disabled={isSaving} onClick={saveBankAccount}>
              {isSaving ? <Loader2 aria-hidden="true" className="animate-spin" size={16} /> : null}
              {editingRow ? "Save changes" : "Create account"}
            </AccountingAction>
          </>
        }
      >
        <div className="mnx-accounting-form">
          <AccountingField label="Linked bank ledger" required>
              <AccountingSelect
                disabled={Boolean(editingRow)}
                value={form.ledgerAccountId}
                onChange={(event) => {
                const nextLedgerAccountId = event.target.value;
                const ledger = ledgerAccounts.find(
                  (account) => account.id === nextLedgerAccountId,
                );
                setForm((current) => ({
                  ...current,
                  ledgerAccountId: nextLedgerAccountId,
                  branchName: ledger?.branch?.name ?? current.branchName,
                }));
              }}
              >
                <option value="">Select a bank ledger</option>
              {selectableLedgerAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.accountCode} — {account.accountName}
                </option>
              ))}
            </AccountingSelect>
            {!editingRow && selectableLedgerAccounts.length === 0 ? (
              <small>
                All active BANK ledgers in your scope are already mapped. Create a new
                BANK ledger in Chart of Accounts first.
              </small>
            ) : null}
          </AccountingField>
          <div className="mnx-accounting-form-grid">
            <AccountingField label="Internal account name" required>
              <AccountingInput
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
              />
            </AccountingField>
            <AccountingField label="Institution name" required>
              <AccountingInput
                value={form.bankName}
                onChange={(event) =>
                  setForm((current) => ({ ...current, bankName: event.target.value }))
                }
              />
            </AccountingField>
          </div>
          <div className="mnx-accounting-form-grid">
            <AccountingField label="Masked account identifier" required>
              <AccountingInput
                value={form.accountNumberMasked}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    accountNumberMasked: event.target.value,
                  }))
                }
              />
            </AccountingField>
            <AccountingField label="Account type" required>
              <AccountingSelect
                value={form.accountKind}
                onChange={(event) =>
                  setForm((current) => ({ ...current, accountKind: event.target.value }))
                }
              >
                {BANKING_ACCOUNT_KIND_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
          </div>
          <div className="mnx-accounting-form-grid">
            <AccountingField label="Currency" required>
              <AccountingInput
                disabled={Boolean(editingRow)}
                value={form.currencyCode}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    currencyCode: event.target.value.toUpperCase(),
                  }))
                }
              />
            </AccountingField>
            <AccountingField label="Associated location">
              <AccountingInput
                value={form.branchName || selectedLedgerAccount()?.branch?.name || ""}
                onChange={(event) =>
                  setForm((current) => ({ ...current, branchName: event.target.value }))
                }
              />
            </AccountingField>
          </div>
          <div className="mnx-accounting-form-grid">
            <AccountingField label="IFSC / routing reference">
              <AccountingInput
                value={form.ifsc}
                onChange={(event) =>
                  setForm((current) => ({ ...current, ifsc: event.target.value }))
                }
              />
            </AccountingField>
            <AccountingField label="Status">
              <AccountingSelect
                value={form.isActive ? "active" : "inactive"}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    isActive: event.target.value === "active",
                  }))
                }
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </AccountingSelect>
            </AccountingField>
          </div>
          <AccountingField label="Description">
            <AccountingTextarea
              rows={3}
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
            />
          </AccountingField>
        </div>
      </AccountingDialog>

      <AccountingDialog
        open={inactiveOpen}
        onClose={() => setInactiveOpen(false)}
        title="Mark bank account inactive"
        description="This keeps transaction history and reporting intact while removing the account from normal active Banking lists."
        footer={
          <>
            <AccountingAction
              type="button"
              variant="secondary"
              onClick={() => setInactiveOpen(false)}
            >
              Cancel
            </AccountingAction>
            <AccountingAction
              disabled={isInactivating}
              onClick={markInactive}
              variant="destructive"
            >
              {isInactivating ? <Loader2 aria-hidden="true" className="animate-spin" size={16} /> : null}
              Mark inactive
            </AccountingAction>
          </>
        }
      >
        <AccountingPanel>
          <p>
            {inactiveRow ? (
              <>
                <strong>{inactiveRow.name}</strong> will remain visible in reports and
                transaction history, but it will stop appearing in the active Banking
                overview.
              </>
            ) : null}
          </p>
          <AccountingField label="Reason">
            <AccountingTextarea
              rows={3}
              value={inactiveReason}
              onChange={(event) => setInactiveReason(event.target.value)}
            />
          </AccountingField>
        </AccountingPanel>
      </AccountingDialog>

      <StatementDialog
        key={statementAccountId ?? "all-statements"}
        accountOptions={bankAccounts}
        canManageBankAccounts={canManageBankAccounts}
        history={overview.statementHistory}
        initialAccountId={statementAccountId}
        onClose={() => setStatementOpen(false)}
        onRefreshRequested={() => router.refresh()}
        open={statementOpen}
        title="Bank statements"
      />
    </>
  );
}
