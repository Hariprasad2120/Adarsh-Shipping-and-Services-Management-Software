"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "@/modules/notifications/client";
import {
  AccountingAction,
  AccountingDetail,
  AccountingDetailList,
  AccountingSection,
  AccountingStatus,
  AccountingTable,
} from "@/modules/accounting/components/accounting-workspace";
import {
  cancelJournalEntryAction,
  submitJournalEntryAction,
} from "@/modules/accounting/actions";

export function JournalEntryDetailClient({ jv }: { jv: any }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  async function handleSubmit() {
    if (
      !confirm(
        "Submit this journal entry for independent approval? The draft will become immutable.",
      )
    )
      return;
    setIsSubmitting(true);
    try {
      const result = await submitJournalEntryAction(jv.id, jv.rowVersion);
      if (result.ok) {
        toast.success("Journal entry submitted for approval");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to submit journal entry",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCancel() {
    if (
      !confirm(
        "Cancel this journal entry and write the offset reversal lines?",
      )
    )
      return;
    setIsCancelling(true);
    try {
      const result = await cancelJournalEntryAction(jv.id);
      if (result.ok) {
        toast.success("Journal entry cancelled and reversed");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to cancel journal entry",
      );
    } finally {
      setIsCancelling(false);
    }
  }

  return (
    <>
      <AccountingSection
        eyebrow="Voucher control"
        title="Journal summary"
        description="Header dimensions, narration, balance, and posting state."
        actions={
          <div className="mnx-accounting-inline-actions">
            <AccountingStatus status={jv.status} />
            {jv.status === "DRAFT" ? (
              <AccountingAction disabled={isSubmitting} onClick={handleSubmit}>
                {isSubmitting ? (
                  <Loader2 aria-hidden="true" className="animate-spin" size={16} />
                ) : null}
                Submit for approval
              </AccountingAction>
            ) : null}
            {jv.status === "SUBMITTED" ? (
              <AccountingAction
                disabled={isCancelling}
                onClick={handleCancel}
                variant="destructive"
              >
                {isCancelling ? (
                  <Loader2 aria-hidden="true" className="animate-spin" size={16} />
                ) : null}
                Cancel and reverse
              </AccountingAction>
            ) : null}
          </div>
        }
      >
        <AccountingDetailList>
          <AccountingDetail
            label="Posting date"
            value={new Date(jv.postingDate).toLocaleDateString("en-IN")}
          />
          <AccountingDetail
            label="Branch"
            value={jv.branch?.name || "Global / Head office"}
          />
          <AccountingDetail
            label="Total debit"
            value={`₹${jv.totalDebit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
          />
          <AccountingDetail
            label="Total credit"
            value={`₹${jv.totalCredit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
          />
          <AccountingDetail
            label="Remarks"
            value={jv.remarks || "No description provided"}
          />
        </AccountingDetailList>
      </AccountingSection>

      <AccountingSection
        eyebrow="Double entry"
        title="Debit and credit postings"
        description="The voucher lines used to establish the balanced transaction."
      >
        <AccountingTable>
          <thead>
            <tr>
              <th>Account</th>
              <th>Party details</th>
              <th>Debit</th>
              <th>Credit</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {jv.lines.map((line: any) => (
              <tr key={line.id}>
                <td>
                  <strong>{line.account.accountName}</strong>
                  <small>{line.account.accountCode}</small>
                </td>
                <td>
                  {line.partyType
                    ? `${line.partyType}: ${line.partyId || "—"}`
                    : "—"}
                </td>
                <td className="mnx-accounting-amount">
                  {line.debit > 0
                    ? `₹${line.debit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                    : "—"}
                </td>
                <td className="mnx-accounting-amount">
                  {line.credit > 0
                    ? `₹${line.credit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                    : "—"}
                </td>
                <td>{line.remarks || "—"}</td>
              </tr>
            ))}
          </tbody>
        </AccountingTable>
      </AccountingSection>

      {jv.glEntries?.length > 0 ? (
        <AccountingSection
          eyebrow="Posted ledger"
          title="General ledger entries"
          description="Immutable posting and reversal records generated from this voucher."
        >
          <AccountingTable>
            <thead>
              <tr>
                <th>Account</th>
                <th>Posting date</th>
                <th>Debit</th>
                <th>Credit</th>
                <th>Type</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {jv.glEntries.map((entry: any) => (
                <tr key={entry.id}>
                  <td>
                    <strong>{entry.account.accountName}</strong>
                    <small>{entry.account.accountCode}</small>
                  </td>
                  <td>
                    {new Date(entry.postingDate).toLocaleDateString("en-IN")}
                  </td>
                  <td className="mnx-accounting-amount">
                    {entry.debit > 0
                      ? `₹${entry.debit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                      : "—"}
                  </td>
                  <td className="mnx-accounting-amount">
                    {entry.credit > 0
                      ? `₹${entry.credit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                      : "—"}
                  </td>
                  <td>{entry.voucherType}</td>
                  <td>
                    <AccountingStatus
                      status={entry.isCancelled ? "CANCELLED" : "POSTED"}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </AccountingTable>
        </AccountingSection>
      ) : null}
    </>
  );
}
