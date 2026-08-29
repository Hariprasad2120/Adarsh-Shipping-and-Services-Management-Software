"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import {
  AccountingAction,
  AccountingActionLink,
  AccountingEmptyTableRow,
  AccountingStatus,
  AccountingTable,
} from "@/components/monolith";
import { submitVendorNoteAction } from "@/modules/accounting/actions";
import { formatAccountingMoney } from "@/modules/accounting/operational-helpers";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN");
}

export function VendorCreditDraftsClient({
  notes,
}: {
  notes: Array<{
    id: string;
    noteNumber: string;
    noteType: string;
    postingDate: string;
    grandTotal: string;
    status: string;
    reason: string | null;
    vendor: { name: string };
    originalInvoice: { invoiceNumber: string } | null;
    canonicalDocumentId: string | null;
  }>;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function submitDraft(id: string) {
    setBusyId(id);
    try {
      const result = await submitVendorNoteAction(id);
      if (!result.ok) throw new Error(result.error);
      toast.success("Vendor credit note submitted for canonical approval");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Vendor credit note could not be submitted",
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AccountingTable>
      <thead>
        <tr>
          <th>Note</th>
          <th>Supplier</th>
          <th>Posting date</th>
          <th>Original invoice</th>
          <th>Total</th>
          <th>Status</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        {notes.length === 0 ? (
          <AccountingEmptyTableRow colSpan={7}>
            No vendor credit-note drafts are waiting for submission.
          </AccountingEmptyTableRow>
        ) : (
          notes.map((note) => (
            <tr key={note.id}>
              <td>
                <div>
                  <strong>{note.noteNumber}</strong>
                  <small>{note.reason || "No reason recorded"}</small>
                </div>
              </td>
              <td>{note.vendor.name}</td>
              <td>{formatDate(note.postingDate)}</td>
              <td>{note.originalInvoice?.invoiceNumber || "Standalone"}</td>
              <td className="mnx-accounting-amount">
                {formatAccountingMoney(note.grandTotal, "INR", 4)}
              </td>
              <td>
                <AccountingStatus status={note.status} />
              </td>
              <td>
                <div className="mnx-accounting-inline-actions">
                  {note.status === "DRAFT" ? (
                    <AccountingAction
                      disabled={busyId === note.id}
                      onClick={() => void submitDraft(note.id)}
                    >
                      {busyId === note.id ? (
                        <Loader2 aria-hidden="true" className="animate-spin" size={16} />
                      ) : null}
                      Submit
                    </AccountingAction>
                  ) : null}
                  {note.canonicalDocumentId ? (
                    <AccountingActionLink
                      className="mnx-button-compact"
                      href={`/accounting/documents/${note.canonicalDocumentId}`}
                    >
                      Review canonical
                    </AccountingActionLink>
                  ) : null}
                </div>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </AccountingTable>
  );
}
