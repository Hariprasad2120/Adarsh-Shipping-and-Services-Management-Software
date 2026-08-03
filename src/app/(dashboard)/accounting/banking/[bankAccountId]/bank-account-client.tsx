"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FileSpreadsheet, Loader2, PencilLine } from "lucide-react";
import { useMemo, useState, useTransition } from "react";

import { DateInput } from "@/components/monolith/date-input";
import {
  AccountingAction,
  AccountingAlert,
  AccountingDetail,
  AccountingDetailList,
  AccountingDialog,
  AccountingEmptyTableRow,
  AccountingField,
  AccountingInput,
  AccountingMoney,
  AccountingSection,
  AccountingSelect,
  AccountingStatus,
  AccountingTable,
  AccountingTextarea,
  AccountingToolbar,
} from "@/components/monolith/accounting-workspace";
import {
  markBankAccountInactiveAction,
  saveManualBankAccountAction,
} from "@/modules/accounting/banking-actions";
import { BANKING_ACCOUNT_KIND_OPTIONS } from "@/modules/accounting/banking-shared";

import { StatementDialog } from "../statement-dialog";

type WorkspaceRow = {
  id: string;
  postingDate: string;
  reference: string;
  voucherType: string;
  voucherId: string;
  status: string;
  locationName: string;
  deposits: string;
  withdrawals: string;
  runningBalance: string;
  remarks: string | null;
  href: string | null;
};

type UncategorizedRow = {
  id: string;
  lineDate: string;
  description: string;
  reference: string | null;
  deposits: string;
  withdrawals: string;
  reviewStatus: string;
  sourceFileName: string;
  sourceImportId: string;
  sourceStatementEnd: string | null;
};

type StatementHistoryRow = {
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
};

type WorkspaceData = {
  bankAccount: {
    id: string;
    ledgerAccountId: string;
    code: string;
    name: string;
    bankName: string;
    branchName: string | null;
    maskedIdentifier: string;
    currencyCode: string;
    accountKind: string;
    description: string | null;
    isActive: boolean;
    locationName: string;
    ledgerAccountCode: string;
    ledgerAccountName: string;
    rowVersion: number;
  };
  filters: {
    dateFrom: string;
    dateTo: string;
    page: number;
    search: string;
    view: "transactions" | "uncategorized";
    direction: "all" | "deposits" | "withdrawals";
  };
  pageSize: number;
  pageCount: number;
  total: number;
  amountInBooks: string;
  amountInBank: string | null;
  amountInBankAsOf: string | null;
  uncategorizedCount: number;
  openingBalance: string;
  currentView: "transactions" | "uncategorized";
  direction: "all" | "deposits" | "withdrawals";
  rows: WorkspaceRow[];
  uncategorizedRows: UncategorizedRow[];
  statementHistory: StatementHistoryRow[];
};

type ManageFormState = {
  bankAccountId: string;
  expectedVersion: number;
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

function buildEditForm(workspace: WorkspaceData): ManageFormState {
  return {
    bankAccountId: workspace.bankAccount.id,
    expectedVersion: workspace.bankAccount.rowVersion,
    ledgerAccountId: "",
    name: workspace.bankAccount.name,
    bankName: workspace.bankAccount.bankName,
    branchName: workspace.bankAccount.branchName ?? "",
    accountNumberMasked: workspace.bankAccount.maskedIdentifier,
    ifsc: "",
    currencyCode: workspace.bankAccount.currencyCode,
    accountKind: workspace.bankAccount.accountKind,
    description: workspace.bankAccount.description ?? "",
    isActive: workspace.bankAccount.isActive,
    reason: "Bank account metadata updated from the Banking workspace",
  };
}

export function BankAccountClient({
  canManageBankAccounts,
  functionalCurrencyCode,
  workspace,
}: {
  canManageBankAccounts: boolean;
  functionalCurrencyCode: string;
  workspace: WorkspaceData;
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
  const [form, setForm] = useState<ManageFormState>(() => buildEditForm(workspace));
  const [inactiveReason, setInactiveReason] = useState(
    "Bank account marked inactive from the Banking workspace",
  );
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentQuery = useMemo(
    () => ({
      search: searchParams.get("search") ?? workspace.filters.search,
      dateFrom: searchParams.get("dateFrom") ?? workspace.filters.dateFrom,
      dateTo: searchParams.get("dateTo") ?? workspace.filters.dateTo,
      view: searchParams.get("view") ?? workspace.filters.view,
      direction: searchParams.get("direction") ?? workspace.filters.direction,
    }),
    [searchParams, workspace.filters],
  );

  function updateQuery(updates: Record<string, string>, resetPage = true) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (!value) params.delete(key);
      else params.set(key, value);
    }
    if (resetPage) params.set("page", "1");
    startFiltering(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  function saveChanges() {
    setError(null);
    setFeedback(null);
    startSaving(async () => {
      const result = await saveManualBankAccountAction({
        bankAccountId: form.bankAccountId,
        expectedVersion: form.expectedVersion,
        ledgerAccountId: form.ledgerAccountId || workspace.bankAccount.ledgerAccountId,
        name: form.name,
        bankName: form.bankName,
        branchName: form.branchName,
        accountNumberMasked: form.accountNumberMasked,
        ifsc: form.ifsc,
        currencyCode: form.currencyCode || functionalCurrencyCode,
        accountKind: form.accountKind,
        description: form.description,
        isActive: form.isActive,
        reason: form.reason,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setManageOpen(false);
      setFeedback("Bank account details updated.");
      router.refresh();
    });
  }

  function markInactive() {
    setError(null);
    setFeedback(null);
    startInactivating(async () => {
      const result = await markBankAccountInactiveAction({
        bankAccountId: workspace.bankAccount.id,
        reason: inactiveReason,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setInactiveOpen(false);
      setFeedback("Bank account marked inactive.");
      router.refresh();
    });
  }

  return (
    <>
      {feedback ? <AccountingAlert variant="success">{feedback}</AccountingAlert> : null}
      {error ? <AccountingAlert variant="danger">{error}</AccountingAlert> : null}

      <AccountingSection
        eyebrow="Banking"
        title={workspace.bankAccount.name}
        description="The account workspace uses posted ledger entries for book balances and keeps imported bank balances separate."
        actions={
          <div className="flex items-center gap-2">
            <AccountingAction onClick={() => setStatementOpen(true)} variant="secondary">
              <FileSpreadsheet aria-hidden="true" size={16} />
              Bank statements
            </AccountingAction>
            {canManageBankAccounts ? (
              <>
                <AccountingAction onClick={() => setManageOpen(true)} variant="secondary">
                  <PencilLine aria-hidden="true" size={16} />
                  Edit account
                </AccountingAction>
                {workspace.bankAccount.isActive ? (
                  <AccountingAction
                    onClick={() => setInactiveOpen(true)}
                    variant="destructive"
                  >
                    Mark inactive
                  </AccountingAction>
                ) : null}
              </>
            ) : null}
          </div>
        }
      >
        <AccountingDetailList>
          <AccountingDetail label="Institution" value={workspace.bankAccount.bankName} />
          <AccountingDetail
            label="Masked identifier"
            value={workspace.bankAccount.maskedIdentifier || "Unavailable"}
          />
          <AccountingDetail
            label="Account type"
            value={workspace.bankAccount.accountKind.replaceAll("_", " ")}
          />
          <AccountingDetail label="Currency" value={workspace.bankAccount.currencyCode} />
          <AccountingDetail
            label="Status"
            value={
              <AccountingStatus
                status={workspace.bankAccount.isActive ? "ACTIVE" : "INACTIVE"}
              />
            }
          />
          <AccountingDetail
            label="Associated locations"
            value={workspace.bankAccount.locationName}
          />
          <AccountingDetail
            label="Amount in Books"
            value={
              <AccountingMoney
                amount={workspace.amountInBooks}
                currencyCode={workspace.bankAccount.currencyCode}
              />
            }
          />
          <AccountingDetail
            label="Amount in Bank"
            value={
              workspace.amountInBank ? (
                <div className="flex flex-col gap-1">
                  <AccountingMoney
                    amount={workspace.amountInBank}
                    currencyCode={workspace.bankAccount.currencyCode}
                  />
                  <small>
                    {workspace.amountInBankAsOf
                      ? `Imported as of ${new Date(workspace.amountInBankAsOf).toLocaleDateString("en-IN")}`
                      : ""}
                  </small>
                </div>
              ) : (
                "Unavailable"
              )
            }
          />
          <AccountingDetail label="Uncategorized" value={workspace.uncategorizedCount} />
        </AccountingDetailList>
      </AccountingSection>

      <AccountingSection
        eyebrow="Banking"
        title={
          currentQuery.view === "uncategorized"
            ? `Uncategorized transactions (${workspace.uncategorizedCount})`
            : "All transactions"
        }
        description={
          currentQuery.view === "uncategorized"
            ? "Imported statement lines that remain unresolved after Banking import. This phase keeps the list read-only."
            : "Running balances include the opening carry-forward, so each page remains numerically stable."
        }
      >
        <div className="flex items-center gap-2">
          <AccountingAction
            onClick={() => updateQuery({ view: "transactions" })}
            variant={currentQuery.view === "transactions" ? "primary" : "secondary"}
          >
            All transactions
          </AccountingAction>
          <AccountingAction
            onClick={() => updateQuery({ view: "uncategorized" })}
            variant={currentQuery.view === "uncategorized" ? "primary" : "secondary"}
          >
            Uncategorized transactions ({workspace.uncategorizedCount})
          </AccountingAction>
        </div>

        <AccountingToolbar>
          <AccountingField label="Search">
            <AccountingInput
              defaultValue={currentQuery.search}
              onBlur={(event) => updateQuery({ search: event.target.value })}
              placeholder={
                currentQuery.view === "uncategorized"
                  ? "Search description, reference, or source file"
                  : "Search reference, type, or remarks"
              }
            />
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
          {currentQuery.view === "uncategorized" ? (
            <AccountingField label="Direction">
              <AccountingSelect
                value={currentQuery.direction}
                onChange={(event) => updateQuery({ direction: event.target.value })}
              >
                <option value="all">All rows</option>
                <option value="deposits">Deposits</option>
                <option value="withdrawals">Withdrawals</option>
              </AccountingSelect>
            </AccountingField>
          ) : null}
        </AccountingToolbar>

        <AccountingTable>
          <thead>
            {currentQuery.view === "uncategorized" ? (
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Reference</th>
                <th>Deposit</th>
                <th>Withdrawal</th>
                <th>Source statement</th>
                <th>Review status</th>
              </tr>
            ) : (
              <tr>
                <th>Date</th>
                <th>Reference number</th>
                <th>Type</th>
                <th>Status</th>
                <th>Location</th>
                <th>Deposits</th>
                <th>Withdrawals</th>
                <th>Running balance</th>
              </tr>
            )}
          </thead>
          <tbody>
            {currentQuery.view === "uncategorized" ? (
              workspace.uncategorizedRows.length === 0 ? (
                <AccountingEmptyTableRow colSpan={7}>
                  No uncategorized statement lines match this Banking filter.
                </AccountingEmptyTableRow>
              ) : (
                workspace.uncategorizedRows.map((row) => (
                  <tr key={row.id}>
                    <td>{new Date(row.lineDate).toLocaleDateString("en-IN")}</td>
                    <td>{row.description}</td>
                    <td>{row.reference || "—"}</td>
                    <td>
                      {row.deposits !== "0" ? (
                        <AccountingMoney
                          amount={row.deposits}
                          currencyCode={workspace.bankAccount.currencyCode}
                        />
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      {row.withdrawals !== "0" ? (
                        <AccountingMoney
                          amount={row.withdrawals}
                          currencyCode={workspace.bankAccount.currencyCode}
                        />
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      <div className="flex flex-col gap-1">
                        <span>{row.sourceFileName}</span>
                        <small>
                          {row.sourceStatementEnd
                            ? `Statement end ${new Date(row.sourceStatementEnd).toLocaleDateString("en-IN")}`
                            : "Statement date unavailable"}
                        </small>
                      </div>
                    </td>
                    <td>
                      <AccountingStatus status={row.reviewStatus} />
                    </td>
                  </tr>
                ))
              )
            ) : workspace.rows.length === 0 ? (
              <AccountingEmptyTableRow colSpan={8}>
                No posted book transactions match this Banking filter.
              </AccountingEmptyTableRow>
            ) : (
              workspace.rows.map((row) => (
                <tr key={row.id}>
                  <td>{new Date(row.postingDate).toLocaleDateString("en-IN")}</td>
                  <td>{row.href ? <Link href={row.href}>{row.reference}</Link> : row.reference}</td>
                  <td>{row.voucherType.replaceAll("_", " ")}</td>
                  <td>
                    <AccountingStatus status={row.status} />
                  </td>
                  <td>{row.locationName}</td>
                  <td>
                    {row.deposits !== "0" ? (
                      <AccountingMoney
                        amount={row.deposits}
                        currencyCode={workspace.bankAccount.currencyCode}
                      />
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    {row.withdrawals !== "0" ? (
                      <AccountingMoney
                        amount={row.withdrawals}
                        currencyCode={workspace.bankAccount.currencyCode}
                      />
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    <div className="flex flex-col gap-1">
                      <AccountingMoney
                        amount={row.runningBalance}
                        currencyCode={workspace.bankAccount.currencyCode}
                      />
                      {row.remarks ? <small>{row.remarks}</small> : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </AccountingTable>

        {workspace.pageCount > 1 ? (
          <div className="flex items-center justify-between gap-3">
            <small>
              Page {workspace.filters.page} of {workspace.pageCount}
            </small>
            <div className="flex items-center gap-2">
              <AccountingAction
                disabled={workspace.filters.page <= 1 || isFiltering}
                onClick={() =>
                  updateQuery(
                    { page: String(Math.max(1, workspace.filters.page - 1)) },
                    false,
                  )
                }
                variant="secondary"
              >
                Previous
              </AccountingAction>
              <AccountingAction
                disabled={workspace.filters.page >= workspace.pageCount || isFiltering}
                onClick={() =>
                  updateQuery(
                    {
                      page: String(
                        Math.min(workspace.pageCount, workspace.filters.page + 1),
                      ),
                    },
                    false,
                  )
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
        title="Edit bank account"
        description="Critical mappings stay locked in this workspace to preserve accounting history."
        footer={
          <>
            <AccountingAction
              type="button"
              variant="secondary"
              onClick={() => setManageOpen(false)}
            >
              Cancel
            </AccountingAction>
            <AccountingAction disabled={isSaving} onClick={saveChanges}>
              {isSaving ? <Loader2 aria-hidden="true" className="animate-spin" size={16} /> : null}
              Save changes
            </AccountingAction>
          </>
        }
      >
        <div className="mnx-accounting-form">
          <AccountingField label="Linked bank ledger">
            <AccountingInput
              disabled
              value={`${workspace.bankAccount.ledgerAccountCode} — ${workspace.bankAccount.ledgerAccountName}`}
            />
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
            <AccountingField label="Account type">
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
            <AccountingField label="IFSC / routing reference">
              <AccountingInput
                value={form.ifsc}
                onChange={(event) =>
                  setForm((current) => ({ ...current, ifsc: event.target.value }))
                }
              />
            </AccountingField>
            <AccountingField label="Currency">
              <AccountingInput disabled value={form.currencyCode || functionalCurrencyCode} />
            </AccountingField>
          </div>
          <div className="mnx-accounting-form-grid">
            <AccountingField label="Associated location">
              <AccountingInput
                value={form.branchName}
                onChange={(event) =>
                  setForm((current) => ({ ...current, branchName: event.target.value }))
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
        description="History and reporting stay intact after inactivation."
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
        <AccountingField label="Reason">
          <AccountingTextarea
            rows={3}
            value={inactiveReason}
            onChange={(event) => setInactiveReason(event.target.value)}
          />
        </AccountingField>
      </AccountingDialog>

      <StatementDialog
        key={workspace.bankAccount.id}
        accountOptions={[
          {
            id: workspace.bankAccount.id,
            name: workspace.bankAccount.name,
            bankName: workspace.bankAccount.bankName,
            currencyCode: workspace.bankAccount.currencyCode,
            isActive: workspace.bankAccount.isActive,
          },
        ]}
        canManageBankAccounts={canManageBankAccounts}
        history={workspace.statementHistory}
        initialAccountId={workspace.bankAccount.id}
        onClose={() => setStatementOpen(false)}
        onRefreshRequested={() => router.refresh()}
        open={statementOpen}
        title={`${workspace.bankAccount.name} · Bank statements`}
      />
    </>
  );
}
