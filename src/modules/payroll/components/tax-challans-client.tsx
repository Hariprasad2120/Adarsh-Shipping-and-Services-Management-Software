"use client";

import * as React from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Modal } from "@/components/ui/modal";
import { WorkspacePanel, WorkspaceSectionHeading } from "@/components/layout/workspace";
import { PeopleControlInput } from "@/modules/people/components";
import { associateChallanAction, recordTaxChallanAction } from "@/modules/payroll/tax-challan-actions";

type Challan = {
  id: string;
  challanNumber: string;
  amount: number;
  paymentDate: string;
  reference: string | null;
  associatedAmount: number;
  unassociatedAmount: number;
  isFullyAssociated: boolean;
};

type LiabilityOption = { month: string; label: string; outstanding: number };

function formatMoney(value: number) {
  return `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(value));
}

export function TaxChallansClient({
  challans,
  liabilityOptions,
}: {
  challans: Challan[];
  liabilityOptions: LiabilityOption[];
}) {
  const router = useRouter();
  const [recordOpen, setRecordOpen] = React.useState(false);
  const [associateChallanId, setAssociateChallanId] = React.useState<string | null>(null);
  const [amount, setAmount] = React.useState("");
  const [paymentDate, setPaymentDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [reference, setReference] = React.useState("");
  const [associateMonth, setAssociateMonth] = React.useState(liabilityOptions[0]?.month ?? "");
  const [associateAmount, setAssociateAmount] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const unassociated = challans.filter((c) => !c.isFullyAssociated);
  const associated = challans.filter((c) => c.isFullyAssociated);

  const handleRecord = async () => {
    setIsSubmitting(true);
    try {
      const response = await recordTaxChallanAction({ amount: Number(amount), paymentDate, reference });
      if (!response.ok) {
        toast.error(response.error);
        return;
      }
      toast.success("Challan recorded");
      setRecordOpen(false);
      setAmount("");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssociate = async () => {
    if (!associateChallanId) return;
    setIsSubmitting(true);
    try {
      const response = await associateChallanAction({
        challanId: associateChallanId,
        liabilityMonth: associateMonth,
        amount: Number(associateAmount),
      });
      if (!response.ok) {
        toast.error(response.error);
        return;
      }
      toast.success("Challan associated");
      setAssociateChallanId(null);
      setAssociateAmount("");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <WorkspacePanel className="space-y-4 p-5">
        <WorkspaceSectionHeading
          index="01"
          title="Unassociated"
          actions={
            <Button type="button" onClick={() => setRecordOpen(true)}>
              Record Challan
            </Button>
          }
        />
        {unassociated.length === 0 ? (
          <>
            <p className="text-sm text-[var(--mnx-muted)]">You have no unassociated Challans as of now.</p>
            <p className="text-sm text-[var(--mnx-muted)]">
              Your Challans will be displayed here if you have payment amount that hasn&apos;t been
              associated to TDS liabilities. Record a new Challan and associate its payment amount to
              TDS liabilities.
            </p>
          </>
        ) : (
          <ul className="space-y-2">
            {unassociated.map((c) => (
              <li key={c.id} className="rounded-[var(--mn-radius-panel)] border border-[var(--mnx-border)] bg-[var(--mnx-surface-soft)] p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-[var(--mnx-text)]">{c.challanNumber} · {formatDate(c.paymentDate)}</span>
                  <span className="text-[var(--mnx-text)]">{formatMoney(c.amount)} (unassociated {formatMoney(c.unassociatedAmount)})</span>
                  <Button
                    type="button"
                    variant="inverse"
                    size="sm"
                    onClick={() => {
                      setAssociateChallanId(c.id);
                      setAssociateAmount(String(c.unassociatedAmount));
                    }}
                    disabled={liabilityOptions.length === 0}
                  >
                    Associate
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </WorkspacePanel>

      <WorkspacePanel className="space-y-4 p-5">
        <WorkspaceSectionHeading index="02" title="Associated" />
        {associated.length === 0 ? (
          <p className="text-sm text-[var(--mnx-muted)]">There are no fully associated challans.</p>
        ) : (
          <ul className="space-y-2">
            {associated.map((c) => (
              <li key={c.id} className="flex items-center justify-between rounded-[var(--mn-radius-panel)] border border-[var(--mnx-border)] bg-[var(--mnx-surface-soft)] p-3 text-sm">
                <span className="font-semibold text-[var(--mnx-text)]">{c.challanNumber} · {formatDate(c.paymentDate)}</span>
                <span className="text-[var(--mnx-text)]">{formatMoney(c.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </WorkspacePanel>

      <Modal open={recordOpen} title="Record Challan" onClose={() => setRecordOpen(false)}>
        <div className="space-y-4">
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-[var(--mnx-text)]">Amount</span>
            <PeopleControlInput type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-[var(--mnx-text)]">Payment date</span>
            <PeopleControlInput type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-[var(--mnx-text)]">Reference (BSR code / CIN)</span>
            <PeopleControlInput value={reference} onChange={(e) => setReference(e.target.value)} />
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="inverse" onClick={() => setRecordOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleRecord()} disabled={isSubmitting || !(Number(amount) > 0)}>
              {isSubmitting ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={associateChallanId != null} title="Associate Challan" onClose={() => setAssociateChallanId(null)}>
        <div className="space-y-4">
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-[var(--mnx-text)]">Liability period</span>
            <NativeSelect value={associateMonth} onChange={(e) => setAssociateMonth(e.target.value)}>
              {liabilityOptions.map((opt) => (
                <option key={opt.month} value={opt.month}>
                  {opt.label} (outstanding {formatMoney(opt.outstanding)})
                </option>
              ))}
            </NativeSelect>
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-[var(--mnx-text)]">Amount to associate</span>
            <PeopleControlInput type="number" value={associateAmount} onChange={(e) => setAssociateAmount(e.target.value)} />
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="inverse" onClick={() => setAssociateChallanId(null)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleAssociate()} disabled={isSubmitting || !(Number(associateAmount) > 0)}>
              {isSubmitting ? "Saving…" : "Associate"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
