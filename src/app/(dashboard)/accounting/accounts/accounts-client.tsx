"use client";

import {
  ChevronDown,
  ChevronRight,
  Filter,
  FolderOpen,
  Loader2,
  PencilLine,
  Plus,
  Search,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  AccountingAction,
  AccountingActionLink,
  AccountingBadge,
  AccountingCheckbox,
  AccountingDetail,
  AccountingDetailList,
  AccountingDialog,
  AccountingEmptyTableRow,
  AccountingField,
  AccountingInput,
  AccountingMoney,
  AccountingSection,
  AccountingSelect,
  AccountingTable,
  AccountingTextarea,
} from "@/modules/accounting/components/accounting-workspace";
import {
  createAccountAction,
  updateAccountAction,
} from "@/modules/accounting/actions";

interface AccountNode {
  id: string;
  accountCode: string;
  accountName: string;
  parentAccountId: string | null;
  rootType: string;
  accountType: string;
  isGroup: boolean;
  isActive: boolean;
  allowJournalContact: boolean;
  openingDebit: number;
  openingCredit: number;
  branchId: string | null;
  branchName: string | null;
  children: AccountNode[];
}

interface SelectedAccountSummary extends AccountNode {
  parentAccountName: string | null;
  openingDebit: number;
  openingCredit: number;
  postedDebit: number;
  postedCredit: number;
  closingBalance: number;
  descendantCount: number;
}

interface TransactionRow {
  id: string;
  postingDate: string;
  detail: string;
  reference: string;
  type: string;
  voucherType: string;
  branchName: string;
  accountName: string;
  accountCode: string;
  debit: number;
  credit: number;
}

interface AccountsClientProps {
  initialCoa: AccountNode[];
  branches: Array<{ id: string; name: string }>;
  selectedAccount: SelectedAccountSummary | null;
  recentTransactions: TransactionRow[];
}

const rootTypes = ["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"];
const accountTypes = [
  "CASH",
  "BANK",
  "RECEIVABLE",
  "PAYABLE",
  "TAX",
  "SALES",
  "PURCHASE",
  "EXPENSE",
  "FIXED_ASSET",
  "DEPRECIATION",
  "EQUITY",
  "ROUND_OFF",
  "OTHER",
];

const typeGuidance: Record<string, string> = {
  RECEIVABLE:
    "Tracks money due from customers and internal parties. Use leaf accounts for party-specific postings.",
  PAYABLE:
    "Tracks money owed to suppliers and internal parties. Group structure should mirror your payable control design.",
  BANK: "Use for operative bank ledgers that connect to receipts, payments, and reconciliation workflows.",
  CASH: "Use for cash-on-hand or petty cash ledgers with controlled posting access.",
  FIXED_ASSET:
    "Use for capitalised asset ledgers that connect to depreciation and disposal controls.",
};

function flattenAccounts(nodes: AccountNode[]): AccountNode[] {
  return nodes.flatMap((node) => [node, ...flattenAccounts(node.children || [])]);
}

function collectDescendantIds(node: AccountNode): string[] {
  return [node.id, ...node.children.flatMap((child) => collectDescendantIds(child))];
}

function findAncestorIds(nodes: AccountNode[], targetId: string): string[] {
  function walk(currentNodes: AccountNode[], trail: string[]): string[] | null {
    for (const node of currentNodes) {
      if (node.id === targetId) return trail;
      const next = walk(node.children || [], [...trail, node.id]);
      if (next) return next;
    }
    return null;
  }

  return walk(nodes, []) ?? [];
}

function buildInitialForm(account?: SelectedAccountSummary | null) {
  return {
    accountCode: account?.accountCode ?? "",
    accountName: account?.accountName ?? "",
    parentAccountId: account?.parentAccountId ?? "",
    rootType: account?.rootType ?? "ASSET",
    accountType: account?.accountType ?? "OTHER",
    isGroup: account?.isGroup ?? false,
    isActive: account?.isActive ?? true,
    allowJournalContact: account?.allowJournalContact ?? false,
    openingDebit: account?.openingDebit ?? 0,
    openingCredit: account?.openingCredit ?? 0,
    branchId: account?.branchId ?? "",
    notes: "",
  };
}

function filterTree(
  nodes: AccountNode[],
  searchTerm: string,
  rootType: string,
  accountType: string,
): AccountNode[] {
  const normalizedSearch = searchTerm.trim().toLowerCase();

  return nodes.flatMap((node) => {
    const filteredChildren = filterTree(
      node.children || [],
      searchTerm,
      rootType,
      accountType,
    );

    const matchesSearch =
      !normalizedSearch ||
      node.accountName.toLowerCase().includes(normalizedSearch) ||
      node.accountCode.toLowerCase().includes(normalizedSearch) ||
      node.accountType.toLowerCase().includes(normalizedSearch);
    const matchesRootType = !rootType || node.rootType === rootType;
    const matchesAccountType = !accountType || node.accountType === accountType;
    const matchesNode = matchesSearch && matchesRootType && matchesAccountType;

    if (!matchesNode && filteredChildren.length === 0) {
      return [];
    }

    return [
      {
        ...node,
        children: filteredChildren,
      },
    ];
  });
}

function formatBalanceLabel(value: number) {
  if (value === 0) return "Balanced";
  return value > 0 ? "Dr" : "Cr";
}

function prettyEnum(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function AccountsClient({
  initialCoa,
  branches,
  recentTransactions,
  selectedAccount,
}: AccountsClientProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const flatAccounts = flattenAccounts(initialCoa);
  const groupAccounts = flatAccounts.filter((account) => account.isGroup);
  const selectedAccountId = selectedAccount?.id ?? "";

  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>(() => {
    const rootNodes = Object.fromEntries(initialCoa.map((node) => [node.id, true]));
    for (const ancestorId of findAncestorIds(initialCoa, selectedAccountId)) {
      rootNodes[ancestorId] = true;
    }
    if (selectedAccountId) rootNodes[selectedAccountId] = true;
    return rootNodes;
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [rootFilter, setRootFilter] = useState("");
  const [accountTypeFilter, setAccountTypeFilter] = useState("");
  const [transactionFilter, setTransactionFilter] = useState("ALL");
  const [transactionSearch, setTransactionSearch] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [addFormData, setAddFormData] = useState(buildInitialForm());
  const [editFormData, setEditFormData] = useState(buildInitialForm(selectedAccount));

  function updateQuery(nextAccountId: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextAccountId) params.set("accountId", nextAccountId);
    else params.delete("accountId");
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function resetAddDialog() {
    setAddFormData({
      accountCode: "",
      accountName: "",
      parentAccountId: selectedAccount?.isGroup
        ? selectedAccount.id
        : selectedAccount?.parentAccountId ?? "",
      rootType: selectedAccount?.rootType ?? "ASSET",
      accountType: selectedAccount?.accountType ?? "OTHER",
      isGroup: false,
      isActive: true,
      allowJournalContact: false,
      openingDebit: 0,
      openingCredit: 0,
      branchId: selectedAccount?.branchId ?? "",
      notes: "",
    });
  }

  function getEditableParentOptions(account: SelectedAccountSummary | null) {
    if (!account) return groupAccounts;
    const blockedIds = new Set(collectDescendantIds(account));
    return groupAccounts.filter((candidate) => !blockedIds.has(candidate.id));
  }

  async function handleCreateAccount(event: React.FormEvent) {
    event.preventDefault();
    if (!addFormData.accountCode || !addFormData.accountName) {
      toast.error("Please complete the required account fields.");
      return;
    }

    setIsSaving(true);
    try {
      const result = await createAccountAction({
        ...addFormData,
        parentAccountId: addFormData.parentAccountId || null,
        branchId: addFormData.branchId || null,
        openingDebit: Number(addFormData.openingDebit) || 0,
        openingCredit: Number(addFormData.openingCredit) || 0,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Ledger account created successfully.");
      setShowAddDialog(false);
      resetAddDialog();
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create the account.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUpdateAccount(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedAccount) return;
    if (!editFormData.accountCode || !editFormData.accountName) {
      toast.error("Please complete the required account fields.");
      return;
    }

    setIsUpdating(true);
    try {
      const result = await updateAccountAction(selectedAccount.id, {
        ...editFormData,
        parentAccountId: editFormData.parentAccountId || null,
        branchId: editFormData.branchId || null,
        openingDebit: Number(editFormData.openingDebit) || 0,
        openingCredit: Number(editFormData.openingCredit) || 0,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Ledger account updated successfully.");
      setShowEditDialog(false);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update the account.",
      );
    } finally {
      setIsUpdating(false);
    }
  }

  const filteredTree = filterTree(
    initialCoa,
    searchTerm,
    rootFilter,
    accountTypeFilter,
  );
  const filteredTransactions = recentTransactions.filter((transaction) => {
    const matchesTransactionType =
      transactionFilter === "ALL" ||
      (transactionFilter === "DEBIT" && transaction.debit > 0) ||
      (transactionFilter === "CREDIT" && transaction.credit > 0) ||
      transaction.voucherType === transactionFilter;
    const normalizedTransactionSearch = transactionSearch.trim().toLowerCase();
    const matchesTransactionSearch =
      !normalizedTransactionSearch ||
      transaction.detail.toLowerCase().includes(normalizedTransactionSearch) ||
      transaction.reference.toLowerCase().includes(normalizedTransactionSearch) ||
      transaction.accountName.toLowerCase().includes(normalizedTransactionSearch);
    return matchesTransactionType && matchesTransactionSearch;
  });
  const transactionTypeOptions = Array.from(
    new Set(recentTransactions.map((transaction) => transaction.voucherType)),
  );

  function renderAccountNode(node: AccountNode, depth = 0): React.ReactNode {
    const expanded = expandedNodes[node.id] ?? depth < 1;
    const selected = selectedAccountId === node.id;
    const childCount = node.children?.length ?? 0;

    return (
      <div className="mnx-account-structure-node" key={node.id}>
        <button
          className={`mnx-account-structure-row${selected ? " is-selected" : ""}`}
          type="button"
          onClick={() => updateQuery(node.id)}
        >
          <span className="mnx-account-structure-rail" style={{ width: `${depth * 18}px` }} />
          {node.isGroup ? (
            <span
              aria-hidden="true"
              className="mnx-account-structure-toggle"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setExpandedNodes((current) => ({
                  ...current,
                  [node.id]: !expanded,
                }));
              }}
            >
              {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
          ) : (
            <span className="mnx-account-structure-toggle is-spacer" aria-hidden="true" />
          )}
          <span className="mnx-account-structure-icon" aria-hidden="true">
            <FolderOpen size={16} />
          </span>
          <span className="mnx-account-structure-content">
            <span className="mnx-account-structure-heading">
              <span className="mnx-account-structure-code">{node.accountCode}</span>
              <strong>{node.accountName}</strong>
              <AccountingBadge>{prettyEnum(node.accountType)}</AccountingBadge>
              {!node.isActive ? (
                <AccountingBadge variant="danger">Inactive</AccountingBadge>
              ) : null}
            </span>
            <span className="mnx-account-structure-meta">
              <span>{prettyEnum(node.rootType)}</span>
              {node.branchName ? <span>{node.branchName}</span> : null}
              {node.isGroup ? <span>{childCount} sub-accounts</span> : null}
            </span>
          </span>
        </button>
        {node.isGroup && expanded && childCount > 0 ? (
          <div className="mnx-account-structure-children">
            {node.children.map((child) => renderAccountNode(child, depth + 1))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <>
      <AccountingSection
        eyebrow="Ledger hierarchy"
        title="Account structure"
        description="Browse the controlled chart, open any ledger, and review its recent postings with edit-ready controls."
        actions={
          <div className="mnx-account-structure-actions">
            {selectedAccount ? (
              <AccountingAction
                type="button"
                variant="secondary"
                onClick={() => setShowEditDialog(true)}
              >
                <PencilLine aria-hidden="true" size={16} />
                Edit account
              </AccountingAction>
            ) : null}
            <AccountingAction
              type="button"
              onClick={() => {
                resetAddDialog();
                setShowAddDialog(true);
              }}
            >
              <Plus aria-hidden="true" size={16} />
              Add account
            </AccountingAction>
          </div>
        }
      >
        <div className="mnx-account-structure-layout">
          <aside className="mnx-account-structure-sidebar">
            <div className="mnx-account-structure-toolbar">
              <label className="mnx-account-structure-search">
                <Search aria-hidden="true" size={16} />
                <input
                  aria-label="Search accounts"
                  placeholder="Search in chart of accounts"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </label>
              <div className="mnx-account-structure-filter-grid">
                <label>
                  <span>
                    <Filter aria-hidden="true" size={14} />
                    Root type
                  </span>
                  <select
                    value={rootFilter}
                    onChange={(event) => setRootFilter(event.target.value)}
                  >
                    <option value="">All root groups</option>
                    {rootTypes.map((type) => (
                      <option key={type} value={type}>
                        {prettyEnum(type)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Account type</span>
                  <select
                    value={accountTypeFilter}
                    onChange={(event) => setAccountTypeFilter(event.target.value)}
                  >
                    <option value="">All account functions</option>
                    {accountTypes.map((type) => (
                      <option key={type} value={type}>
                        {prettyEnum(type)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="mnx-account-structure-tree">
              {filteredTree.length > 0 ? (
                filteredTree.map((node) => renderAccountNode(node))
              ) : (
                <div className="mnx-account-structure-empty">
                  No accounts match the selected search and filter combination.
                </div>
              )}
            </div>
          </aside>

          <div className="mnx-account-structure-detail">
            {selectedAccount ? (
              <>
                <header className="mnx-account-structure-detail-header">
                  <div>
                    <p className="mnx-account-structure-detail-kicker">
                      {selectedAccount.isGroup
                        ? "Grouped ledger view"
                        : "Posting ledger view"}
                    </p>
                    <h3>
                      {selectedAccount.accountName} ({selectedAccount.accountCode})
                    </h3>
                    <p>
                      {selectedAccount.descendantCount > 0
                        ? `Includes ${selectedAccount.descendantCount} connected sub-accounts in the balance and transaction roll-up.`
                        : "Shows direct postings, opening balances, and linked accountant controls for this ledger."}
                    </p>
                  </div>
                  <div className="mnx-account-structure-detail-header-actions">
                    <AccountingBadge>{prettyEnum(selectedAccount.accountType)}</AccountingBadge>
                    <AccountingBadge variant="success">
                      {prettyEnum(selectedAccount.rootType)}
                    </AccountingBadge>
                  </div>
                </header>

                <div className="mnx-account-balance-hero">
                  <div>
                    <span>Closing balance</span>
                    <strong>
                      <AccountingMoney
                        amount={Math.abs(selectedAccount.closingBalance).toFixed(2)}
                        currencyCode="INR"
                      />
                      <small>{formatBalanceLabel(selectedAccount.closingBalance)}</small>
                    </strong>
                  </div>
                  <p>
                    Opening balances and every posted ledger transaction are included in
                    this running position.
                  </p>
                </div>

                <AccountingDetailList className="mnx-account-structure-detail-grid">
                  <AccountingDetail
                    label="Parent account"
                    value={selectedAccount.parentAccountName ?? "Root account"}
                  />
                  <AccountingDetail
                    label="Branch scope"
                    value={selectedAccount.branchName ?? "Organisation-wide"}
                  />
                  <AccountingDetail
                    label="Opening debit"
                    value={
                      <AccountingMoney
                        amount={selectedAccount.openingDebit.toFixed(2)}
                        currencyCode="INR"
                      />
                    }
                  />
                  <AccountingDetail
                    label="Opening credit"
                    value={
                      <AccountingMoney
                        amount={selectedAccount.openingCredit.toFixed(2)}
                        currencyCode="INR"
                      />
                    }
                  />
                  <AccountingDetail
                    label="Posted debit"
                    value={
                      <AccountingMoney
                        amount={selectedAccount.postedDebit.toFixed(2)}
                        currencyCode="INR"
                      />
                    }
                  />
                  <AccountingDetail
                    label="Posted credit"
                    value={
                      <AccountingMoney
                        amount={selectedAccount.postedCredit.toFixed(2)}
                        currencyCode="INR"
                      />
                    }
                  />
                  <AccountingDetail
                    label="Status"
                    value={selectedAccount.isActive ? "Active" : "Inactive"}
                  />
                  <AccountingDetail
                    label="Journal contacts"
                    value={
                      selectedAccount.allowJournalContact
                        ? "Enabled for manual journals"
                        : "Not enabled"
                    }
                  />
                </AccountingDetailList>

                <div className="mnx-account-transactions-panel">
                  <div className="mnx-account-transactions-header">
                    <div>
                      <h4>Recent transactions</h4>
                      <p>
                        Every posted ledger movement linked to the selected account is
                        listed below in reverse posting order.
                      </p>
                    </div>
                    <AccountingActionLink
                      href={`/accounting/general-ledger?accountId=${selectedAccount.id}`}
                      variant="secondary"
                    >
                      Show more details
                    </AccountingActionLink>
                  </div>

                  <div className="mnx-account-transactions-filters">
                    <label className="mnx-account-structure-search">
                      <Search aria-hidden="true" size={16} />
                      <input
                        aria-label="Search recent transactions"
                        placeholder="Search transaction detail or reference"
                        value={transactionSearch}
                        onChange={(event) => setTransactionSearch(event.target.value)}
                      />
                    </label>
                    <label>
                      <span>Transaction filter</span>
                      <select
                        value={transactionFilter}
                        onChange={(event) => setTransactionFilter(event.target.value)}
                      >
                        <option value="ALL">All transactions</option>
                        <option value="DEBIT">Debit only</option>
                        <option value="CREDIT">Credit only</option>
                        {transactionTypeOptions.map((type) => (
                          <option key={type} value={type}>
                            {prettyEnum(type)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <AccountingTable scrollLabel="Recent transactions">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Transaction details</th>
                        <th>Type</th>
                        <th>Branch</th>
                        <th className="mnx-accounting-amount">Debit</th>
                        <th className="mnx-accounting-amount">Credit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTransactions.length === 0 ? (
                        <AccountingEmptyTableRow colSpan={6}>
                          No transactions match the current filters for this account.
                        </AccountingEmptyTableRow>
                      ) : (
                        filteredTransactions.map((transaction) => (
                          <tr key={transaction.id}>
                            <td>
                              {new Date(transaction.postingDate).toLocaleDateString("en-IN")}
                            </td>
                            <td>
                              <strong>{transaction.detail}</strong>
                              <small>
                                {transaction.reference} · {transaction.accountCode}{" "}
                                {transaction.accountName}
                              </small>
                            </td>
                            <td>{transaction.type}</td>
                            <td>{transaction.branchName}</td>
                            <td className="mnx-accounting-amount">
                              {transaction.debit > 0 ? (
                                <AccountingMoney
                                  amount={transaction.debit.toFixed(2)}
                                  currencyCode="INR"
                                />
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="mnx-accounting-amount">
                              {transaction.credit > 0 ? (
                                <AccountingMoney
                                  amount={transaction.credit.toFixed(2)}
                                  currencyCode="INR"
                                />
                              ) : (
                                "—"
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </AccountingTable>
                </div>
              </>
            ) : (
              <div className="mnx-account-structure-empty">
                Select an account from the chart to view balances and recent
                transactions.
              </div>
            )}
          </div>
        </div>
      </AccountingSection>

      <AccountingDialog
        description="Create a new group or posting account in the controlled chart."
        footer={
          <>
            <AccountingAction
              type="button"
              variant="secondary"
              onClick={() => setShowAddDialog(false)}
            >
              Cancel
            </AccountingAction>
            <AccountingAction disabled={isSaving} form="account-add-form" type="submit">
              {isSaving ? <Loader2 className="animate-spin" size={16} /> : null}
              {isSaving ? "Saving..." : "Save account"}
            </AccountingAction>
          </>
        }
        onClose={() => setShowAddDialog(false)}
        open={showAddDialog}
        size="wide"
        title="Add account"
      >
        <form className="mnx-account-structure-form" id="account-add-form" onSubmit={handleCreateAccount}>
          <div className="mnx-account-structure-form-grid">
            <AccountingField label="Account type" required>
              <AccountingSelect
                required
                value={addFormData.accountType}
                onChange={(event) =>
                  setAddFormData((current) => ({
                    ...current,
                    accountType: event.target.value,
                  }))
                }
              >
                {accountTypes.map((type) => (
                  <option key={type} value={type}>
                    {prettyEnum(type)}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Account code" required>
              <AccountingInput
                required
                value={addFormData.accountCode}
                onChange={(event) =>
                  setAddFormData((current) => ({
                    ...current,
                    accountCode: event.target.value,
                  }))
                }
              />
            </AccountingField>
            <AccountingField label="Account name" required>
              <AccountingInput
                required
                value={addFormData.accountName}
                onChange={(event) =>
                  setAddFormData((current) => ({
                    ...current,
                    accountName: event.target.value,
                  }))
                }
              />
            </AccountingField>
            <AccountingField label="Parent account">
              <AccountingSelect
                value={addFormData.parentAccountId}
                onChange={(event) =>
                  setAddFormData((current) => ({
                    ...current,
                    parentAccountId: event.target.value,
                  }))
                }
              >
                <option value="">None - create as root account</option>
                {groupAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.accountCode} - {account.accountName}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Root type" required>
              <AccountingSelect
                required
                value={addFormData.rootType}
                onChange={(event) =>
                  setAddFormData((current) => ({
                    ...current,
                    rootType: event.target.value,
                  }))
                }
              >
                {rootTypes.map((type) => (
                  <option key={type} value={type}>
                    {prettyEnum(type)}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Branch">
              <AccountingSelect
                value={addFormData.branchId}
                onChange={(event) =>
                  setAddFormData((current) => ({
                    ...current,
                    branchId: event.target.value,
                  }))
                }
              >
                <option value="">Organisation-wide</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Opening debit">
              <AccountingInput
                min={0}
                step="0.01"
                type="number"
                value={addFormData.openingDebit}
                onChange={(event) =>
                  setAddFormData((current) => ({
                    ...current,
                    openingDebit: Number(event.target.value) || 0,
                  }))
                }
              />
            </AccountingField>
            <AccountingField label="Opening credit">
              <AccountingInput
                min={0}
                step="0.01"
                type="number"
                value={addFormData.openingCredit}
                onChange={(event) =>
                  setAddFormData((current) => ({
                    ...current,
                    openingCredit: Number(event.target.value) || 0,
                  }))
                }
              />
            </AccountingField>
            <AccountingField label="Notes">
              <AccountingTextarea
                maxLength={500}
                placeholder="Reference note for the accountant team"
                value={addFormData.notes}
                onChange={(event) =>
                  setAddFormData((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
              />
            </AccountingField>
          </div>
          <div className="mnx-account-structure-form-flags">
            <AccountingCheckbox
              checked={addFormData.isGroup}
              label="Create as group account"
              onChange={(event) =>
                setAddFormData((current) => ({
                  ...current,
                  isGroup: event.target.checked,
                }))
              }
            />
            <AccountingCheckbox
              checked={addFormData.isActive}
              label="Mark account as active"
              onChange={(event) =>
                setAddFormData((current) => ({
                  ...current,
                  isActive: event.target.checked,
                }))
              }
            />
            <AccountingCheckbox
              checked={addFormData.allowJournalContact}
              label="Allow manual journal contact selection"
              onChange={(event) =>
                setAddFormData((current) => ({
                  ...current,
                  allowJournalContact: event.target.checked,
                }))
              }
            />
          </div>
          <p className="mnx-account-structure-guidance">
            {typeGuidance[addFormData.accountType] ??
              "Use group accounts for hierarchy only. Disable group mode when the account should receive direct postings."}
          </p>
        </form>
      </AccountingDialog>

      <AccountingDialog
        description="Update the selected ledger account without leaving the chart."
        footer={
          <>
            <AccountingAction
              type="button"
              variant="secondary"
              onClick={() => setShowEditDialog(false)}
            >
              Cancel
            </AccountingAction>
            <AccountingAction
              disabled={isUpdating || !selectedAccount}
              form="account-edit-form"
              type="submit"
            >
              {isUpdating ? <Loader2 className="animate-spin" size={16} /> : null}
              {isUpdating ? "Saving..." : "Save changes"}
            </AccountingAction>
          </>
        }
        onClose={() => setShowEditDialog(false)}
        open={showEditDialog}
        size="wide"
        title="Edit account"
      >
        {selectedAccount ? (
          <form className="mnx-account-structure-form" id="account-edit-form" onSubmit={handleUpdateAccount}>
            <div className="mnx-account-structure-form-grid">
              <AccountingField label="Account type" required>
                <AccountingSelect
                  required
                  value={editFormData.accountType}
                  onChange={(event) =>
                    setEditFormData((current) => ({
                      ...current,
                      accountType: event.target.value,
                    }))
                  }
                >
                  {accountTypes.map((type) => (
                    <option key={type} value={type}>
                      {prettyEnum(type)}
                    </option>
                  ))}
                </AccountingSelect>
              </AccountingField>
              <AccountingField label="Account code" required>
                <AccountingInput
                  required
                  value={editFormData.accountCode}
                  onChange={(event) =>
                    setEditFormData((current) => ({
                      ...current,
                      accountCode: event.target.value,
                    }))
                  }
                />
              </AccountingField>
              <AccountingField label="Account name" required>
                <AccountingInput
                  required
                  value={editFormData.accountName}
                  onChange={(event) =>
                    setEditFormData((current) => ({
                      ...current,
                      accountName: event.target.value,
                    }))
                  }
                />
              </AccountingField>
              <AccountingField label="Parent account">
                <AccountingSelect
                  value={editFormData.parentAccountId}
                  onChange={(event) =>
                    setEditFormData((current) => ({
                      ...current,
                      parentAccountId: event.target.value,
                    }))
                  }
                >
                  <option value="">None - keep as root account</option>
                  {getEditableParentOptions(selectedAccount).map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.accountCode} - {account.accountName}
                    </option>
                  ))}
                </AccountingSelect>
              </AccountingField>
              <AccountingField label="Root type" required>
                <AccountingSelect
                  required
                  value={editFormData.rootType}
                  onChange={(event) =>
                    setEditFormData((current) => ({
                      ...current,
                      rootType: event.target.value,
                    }))
                  }
                >
                  {rootTypes.map((type) => (
                    <option key={type} value={type}>
                      {prettyEnum(type)}
                    </option>
                  ))}
                </AccountingSelect>
              </AccountingField>
              <AccountingField label="Branch">
                <AccountingSelect
                  value={editFormData.branchId}
                  onChange={(event) =>
                    setEditFormData((current) => ({
                      ...current,
                      branchId: event.target.value,
                    }))
                  }
                >
                  <option value="">Organisation-wide</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </AccountingSelect>
              </AccountingField>
              <AccountingField label="Opening debit">
                <AccountingInput
                  min={0}
                  step="0.01"
                  type="number"
                  value={editFormData.openingDebit}
                  onChange={(event) =>
                    setEditFormData((current) => ({
                      ...current,
                      openingDebit: Number(event.target.value) || 0,
                    }))
                  }
                />
              </AccountingField>
              <AccountingField label="Opening credit">
                <AccountingInput
                  min={0}
                  step="0.01"
                  type="number"
                  value={editFormData.openingCredit}
                  onChange={(event) =>
                    setEditFormData((current) => ({
                      ...current,
                      openingCredit: Number(event.target.value) || 0,
                    }))
                  }
                />
              </AccountingField>
              <AccountingField label="Notes">
                <AccountingTextarea
                  maxLength={500}
                  placeholder="Reference note for the accountant team"
                  value={editFormData.notes}
                  onChange={(event) =>
                    setEditFormData((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                />
              </AccountingField>
            </div>
            <div className="mnx-account-structure-form-flags">
              <AccountingCheckbox
                checked={editFormData.isGroup}
                label="Treat as group account"
                onChange={(event) =>
                  setEditFormData((current) => ({
                    ...current,
                    isGroup: event.target.checked,
                  }))
                }
              />
              <AccountingCheckbox
                checked={editFormData.isActive}
                label="Mark account as active"
                onChange={(event) =>
                  setEditFormData((current) => ({
                    ...current,
                    isActive: event.target.checked,
                  }))
                }
              />
              <AccountingCheckbox
                checked={editFormData.allowJournalContact}
                label="Allow manual journal contact selection"
                onChange={(event) =>
                  setEditFormData((current) => ({
                    ...current,
                    allowJournalContact: event.target.checked,
                  }))
                }
              />
            </div>
            <p className="mnx-account-structure-guidance">
              {typeGuidance[editFormData.accountType] ??
                "Review parent hierarchy and posting mode carefully before saving chart changes."}
            </p>
          </form>
        ) : null}
      </AccountingDialog>
    </>
  );
}
