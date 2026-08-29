"use client";

import { Loader2, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { AccountingAction, AccountingEmptyTableRow, AccountingField, AccountingInput, AccountingMetric, AccountingMetrics, AccountingSection, AccountingSelect, AccountingStatus, AccountingTable, AccountingTextarea, DateInput } from "@/components/monolith";
import {
  cancelCustomerAdvanceRequestAction,
  createCustomerAdvanceReceiptDraftAction,
  createCustomerAdvanceRequestAction,
} from "@/modules/accounting/customer-advance-actions";
import { formatAccountingMoney } from "@/modules/accounting/operational-helpers";

type CustomerOption = { id: string; name: string; email: string | null };
type BranchOption = { id: string; name: string };
type BankAccountOption = {
  id: string;
  accountCode: string;
  accountName: string;
};

type AdvanceRow = {
  id: string;
  requestNumber: string;
  requestType: string;
  postingDate: string;
  dueDate: string | null;
  requestedAmount: string;
  currencyCode: string;
  status: string;
  referenceNo: string | null;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
  customer: CustomerOption;
  branch: BranchOption | null;
  summary: {
    coveredAmount: string;
    draftReceiptAmount: string;
    pendingApprovalReceiptAmount: string;
    postedReceiptAmount: string;
    reversedReceiptAmount: string;
    allocatedAmount: string;
    unappliedAmount: string;
    remainingAmount: string;
    collectionState: string;
  };
  receipts: Array<{
    id: string;
    amount: string;
    createdAt: string;
    paymentEntry: {
      id: string;
      postingDate: string;
      referenceNo: string | null;
      amount: string;
      createdAt: string;
    };
    canonicalPayment: {
      id: string;
      status: string;
      allocatedAmount: string;
      unappliedAmount: string;
      transactionDate: string;
    } | null;
  }>;
};

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

export function CustomerAdvancesClient({
  customers,
  branches,
  bankAccounts,
  requests,
  summary,
  canManage,
}: {
  customers: CustomerOption[];
  branches: BranchOption[];
  bankAccounts: BankAccountOption[];
  requests: AdvanceRow[];
  summary: {
    total: number;
    open: number;
    retainers: number;
    fullyCovered: number;
    needsCollection: number;
  };
  canManage: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [requestType, setRequestType] = useState<
    "CUSTOMER_ADVANCE" | "RETAINER_INVOICE"
  >("CUSTOMER_ADVANCE");
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "");
  const [branchId, setBranchId] = useState("");
  const [postingDate, setPostingDate] = useState(todayString());
  const [dueDate, setDueDate] = useState("");
  const [requestedAmount, setRequestedAmount] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [remarks, setRemarks] = useState("");
  const [receiptAmounts, setReceiptAmounts] = useState<Record<string, string>>({});
  const [receiptAccounts, setReceiptAccounts] = useState<Record<string, string>>(
    {},
  );
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const totals = useMemo(
    () => ({
      totalRequested: requests.reduce(
        (sum, row) => sum + Number(row.requestedAmount),
        0,
      ),
      totalCovered: requests.reduce(
        (sum, row) => sum + Number(row.summary.coveredAmount),
        0,
      ),
      totalUnapplied: requests.reduce(
        (sum, row) => sum + Number(row.summary.unappliedAmount),
        0,
      ),
    }),
    [requests],
  );

  function runAction(key: string, work: () => Promise<void>) {
    setBusyKey(key);
    startTransition(async () => {
      try {
        await work();
        router.refresh();
      } finally {
        setBusyKey(null);
      }
    });
  }

  function createRequest() {
    runAction("create-request", async () => {
      const result = await createCustomerAdvanceRequestAction({
        requestType,
        customerId,
        branchId: branchId || null,
        postingDate,
        dueDate: dueDate || null,
        requestedAmount,
        referenceNo: referenceNo || null,
        remarks: remarks || null,
      });
      if (!result.ok) throw new Error(result.error);
      toast.success(
        requestType === "RETAINER_INVOICE"
          ? "Retainer request created"
          : "Customer advance request created",
      );
      setRequestedAmount("");
      setReferenceNo("");
      setRemarks("");
      setDueDate("");
    });
  }

  function createReceiptDraft(row: AdvanceRow) {
    runAction(`receipt-${row.id}`, async () => {
      const result = await createCustomerAdvanceReceiptDraftAction({
        advanceId: row.id,
        amount: receiptAmounts[row.id] || row.summary.remainingAmount,
        paidToAccountId:
          receiptAccounts[row.id] || bankAccounts[0]?.id || null,
      });
      if (!result.ok) throw new Error(result.error);
      toast.success("Receipt draft created");
      router.push(`/accounting/payment-entries/${result.data.id}`);
    });
  }

  function cancelRequest(id: string) {
    if (!confirm("Cancel this advance request? Existing receipt links will block cancellation.")) {
      return;
    }
    runAction(`cancel-${id}`, async () => {
      const result = await cancelCustomerAdvanceRequestAction(id);
      if (!result.ok) throw new Error(result.error);
      toast.success("Advance request cancelled");
    });
  }

  return (
    <>
      <AccountingMetrics>
        <AccountingMetric label="Requests" value={summary.total.toString()} />
        <AccountingMetric label="Open" value={summary.open.toString()} />
        <AccountingMetric label="Retainers" value={summary.retainers.toString()} />
        <AccountingMetric
          label="Fully covered"
          value={summary.fullyCovered.toString()}
        />
        <AccountingMetric
          label="Needs collection"
          value={summary.needsCollection.toString()}
        />
        <AccountingMetric
          label="Requested"
          value={formatAccountingMoney(totals.totalRequested.toFixed(2), "INR", 4)}
        />
        <AccountingMetric
          label="Covered"
          value={formatAccountingMoney(totals.totalCovered.toFixed(2), "INR", 4)}
        />
        <AccountingMetric
          label="Still unapplied"
          value={formatAccountingMoney(totals.totalUnapplied.toFixed(2), "INR", 4)}
        />
      </AccountingMetrics>

      <AccountingSection
        eyebrow="01"
        title="New retainer or advance request"
        description="Prepare the collection request first, then generate receipt drafts against the remaining balance."
        actions={
          canManage ? (
            <AccountingAction
              disabled={isPending}
              onClick={createRequest}
            >
              {busyKey === "create-request" ? (
                <Loader2 aria-hidden="true" className="animate-spin" size={16} />
              ) : (
                <Plus aria-hidden="true" size={16} />
              )}
              Create request
            </AccountingAction>
          ) : undefined
        }
      >
        <div className="mnx-accounting-form-grid mnx-accounting-form-grid-wide">
          <AccountingField label="Request type" required>
            <AccountingSelect
              value={requestType}
              onChange={(event) =>
                setRequestType(
                  event.target.value as "CUSTOMER_ADVANCE" | "RETAINER_INVOICE",
                )
              }
            >
              <option value="CUSTOMER_ADVANCE">Customer advance</option>
              <option value="RETAINER_INVOICE">Retainer invoice</option>
            </AccountingSelect>
          </AccountingField>
          <AccountingField label="Customer" required>
            <AccountingSelect
              value={customerId}
              onChange={(event) => setCustomerId(event.target.value)}
            >
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </AccountingSelect>
          </AccountingField>
          <AccountingField label="Branch">
            <AccountingSelect
              value={branchId}
              onChange={(event) => setBranchId(event.target.value)}
            >
              <option value="">Global / Head office</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </AccountingSelect>
          </AccountingField>
          <AccountingField label="Posting date" required>
            <DateInput
              value={postingDate}
              onChange={(event) => setPostingDate(event.target.value)}
            />
          </AccountingField>
          <AccountingField label="Due date">
            <DateInput
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
            />
          </AccountingField>
          <AccountingField label="Requested amount" required>
            <AccountingInput
              type="number"
              min="0.01"
              step="0.01"
              value={requestedAmount}
              onChange={(event) => setRequestedAmount(event.target.value)}
            />
          </AccountingField>
          <AccountingField label="Reference number">
            <AccountingInput
              value={referenceNo}
              onChange={(event) => setReferenceNo(event.target.value)}
            />
          </AccountingField>
          <AccountingField label="Remarks">
            <AccountingTextarea
              rows={3}
              value={remarks}
              onChange={(event) => setRemarks(event.target.value)}
            />
          </AccountingField>
        </div>
      </AccountingSection>

      <AccountingSection
        eyebrow="02"
        title="Advance request register"
        description="Create receipt drafts for the uncovered balance, then submit those drafts through the normal canonical approval workflow."
      >
        <AccountingTable>
          <thead>
            <tr>
              <th>Request</th>
              <th>Customer</th>
              <th>Date</th>
              <th>Requested</th>
              <th>Covered</th>
              <th>Remaining</th>
              <th>Unapplied</th>
              <th>Status</th>
              <th>Receipt draft</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {requests.length === 0 ? (
              <AccountingEmptyTableRow colSpan={10}>
                No retainer or advance requests have been recorded yet.
              </AccountingEmptyTableRow>
            ) : (
              requests.map((row) => (
                <tr key={row.id}>
                  <td>
                    <div>
                      <strong>{row.requestNumber}</strong>
                      <div>{row.requestType.replaceAll("_", " ")}</div>
                      {row.referenceNo ? <small>{row.referenceNo}</small> : null}
                    </div>
                  </td>
                  <td>
                    <div>{row.customer.name}</div>
                    <small>{row.branch?.name || "Global / Head office"}</small>
                  </td>
                  <td>
                    <div>{new Date(row.postingDate).toLocaleDateString("en-IN")}</div>
                    <small>
                      Due:{" "}
                      {row.dueDate
                        ? new Date(row.dueDate).toLocaleDateString("en-IN")
                        : "Open"}
                    </small>
                  </td>
                  <td className="mnx-accounting-amount">
                    {formatAccountingMoney(row.requestedAmount, row.currencyCode, 4)}
                  </td>
                  <td className="mnx-accounting-amount">
                    {formatAccountingMoney(
                      row.summary.coveredAmount,
                      row.currencyCode,
                      4,
                    )}
                  </td>
                  <td className="mnx-accounting-amount">
                    {formatAccountingMoney(
                      row.summary.remainingAmount,
                      row.currencyCode,
                      4,
                    )}
                  </td>
                  <td className="mnx-accounting-amount">
                    {formatAccountingMoney(
                      row.summary.unappliedAmount,
                      row.currencyCode,
                      4,
                    )}
                  </td>
                  <td>
                    <AccountingStatus
                      status={`${row.status} / ${row.summary.collectionState}`}
                    />
                  </td>
                  <td>
                    {canManage && row.status === "OPEN" ? (
                      <div className="mnx-accounting-inline-actions">
                        <AccountingInput
                          aria-label={`Receipt amount for ${row.requestNumber}`}
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={receiptAmounts[row.id] ?? row.summary.remainingAmount}
                          onChange={(event) =>
                            setReceiptAmounts((current) => ({
                              ...current,
                              [row.id]: event.target.value,
                            }))
                          }
                        />
                        <AccountingSelect
                          value={receiptAccounts[row.id] ?? bankAccounts[0]?.id ?? ""}
                          onChange={(event) =>
                            setReceiptAccounts((current) => ({
                              ...current,
                              [row.id]: event.target.value,
                            }))
                          }
                        >
                          {bankAccounts.map((account) => (
                            <option key={account.id} value={account.id}>
                              {account.accountCode} — {account.accountName}
                            </option>
                          ))}
                        </AccountingSelect>
                        <AccountingAction
                          disabled={isPending}
                          onClick={() => createReceiptDraft(row)}
                        >
                          {busyKey === `receipt-${row.id}` ? (
                            <Loader2
                              aria-hidden="true"
                              className="animate-spin"
                              size={16}
                            />
                          ) : null}
                          Draft receipt
                        </AccountingAction>
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    <div className="mnx-accounting-inline-actions">
                      <Link
                        className="mnx-button mnx-button-secondary mnx-button-compact"
                        href="/accounting/customer-receipts"
                      >
                        Receipts
                      </Link>
                      {canManage && row.receipts.length === 0 && row.status === "OPEN" ? (
                        <AccountingAction
                          disabled={isPending}
                          variant="secondary"
                          onClick={() => cancelRequest(row.id)}
                        >
                          {busyKey === `cancel-${row.id}` ? (
                            <Loader2
                              aria-hidden="true"
                              className="animate-spin"
                              size={16}
                            />
                          ) : null}
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

      <AccountingSection
        eyebrow="03"
        title="Latest linked receipt drafts"
        description="These links show the receipt drafts and canonical payment records already associated with each request."
      >
        <AccountingTable>
          <thead>
            <tr>
              <th>Request</th>
              <th>Payment draft</th>
              <th>Receipt amount</th>
              <th>Canonical state</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {requests.flatMap((row) =>
              row.receipts.map((receipt) => (
                <tr key={receipt.id}>
                  <td>{row.requestNumber}</td>
                  <td>
                    <div>{receipt.paymentEntry.referenceNo || receipt.paymentEntry.id}</div>
                    <small>
                      {new Date(receipt.paymentEntry.postingDate).toLocaleDateString(
                        "en-IN",
                      )}
                    </small>
                  </td>
                  <td className="mnx-accounting-amount">
                    {formatAccountingMoney(receipt.amount, row.currencyCode, 4)}
                  </td>
                  <td>
                    <AccountingStatus
                      status={receipt.canonicalPayment?.status || "DRAFT_ONLY"}
                    />
                  </td>
                  <td>
                    <div className="mnx-accounting-inline-actions">
                      <Link
                        className="mnx-button mnx-button-secondary mnx-button-compact"
                        href={`/accounting/payment-entries/${receipt.paymentEntry.id}`}
                      >
                        Draft
                      </Link>
                      {receipt.canonicalPayment ? (
                        <Link
                          className="mnx-button mnx-button-secondary mnx-button-compact"
                          href={`/accounting/payments/${receipt.canonicalPayment.id}`}
                        >
                          Canonical
                        </Link>
                      ) : null}
                    </div>
                  </td>
                </tr>
              )),
            ).length === 0 ? (
              <AccountingEmptyTableRow colSpan={5}>
                No linked receipt drafts exist yet.
              </AccountingEmptyTableRow>
            ) : (
              requests.flatMap((row) =>
                row.receipts.map((receipt) => (
                  <tr key={receipt.id}>
                    <td>{row.requestNumber}</td>
                    <td>
                      <div>{receipt.paymentEntry.referenceNo || receipt.paymentEntry.id}</div>
                      <small>
                        {new Date(receipt.paymentEntry.postingDate).toLocaleDateString(
                          "en-IN",
                        )}
                      </small>
                    </td>
                    <td className="mnx-accounting-amount">
                      {formatAccountingMoney(receipt.amount, row.currencyCode, 4)}
                    </td>
                    <td>
                      <AccountingStatus
                        status={receipt.canonicalPayment?.status || "DRAFT_ONLY"}
                      />
                    </td>
                    <td>
                      <div className="mnx-accounting-inline-actions">
                        <Link
                          className="mnx-button mnx-button-secondary mnx-button-compact"
                          href={`/accounting/payment-entries/${receipt.paymentEntry.id}`}
                        >
                          Draft
                        </Link>
                        {receipt.canonicalPayment ? (
                          <Link
                            className="mnx-button mnx-button-secondary mnx-button-compact"
                            href={`/accounting/payments/${receipt.canonicalPayment.id}`}
                          >
                            Canonical
                          </Link>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                )),
              )
            )}
          </tbody>
        </AccountingTable>
      </AccountingSection>
    </>
  );
}
