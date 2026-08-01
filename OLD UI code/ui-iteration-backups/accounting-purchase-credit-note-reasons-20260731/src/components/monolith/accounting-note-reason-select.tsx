"use client";

import { AccountingField, AccountingSelect } from "./accounting-workspace";

export type AccountingNoteKind =
  | "sales-credit"
  | "sales-debit"
  | "purchase-credit"
  | "purchase-debit";

const creditNoteReasons = [
  "Sales Return",
  "Post-Sale Discount",
  "Deficiency in Service",
  "Correction in Invoice",
  "Change in POS",
  "Finalization of Provisional Assessment",
  "Others",
];

export const salesDebitNoteReasons = [
  "Additional Charges or Underbilling",
  "Price or Rate Increase",
  "Quantity Undercharged",
  "Freight, Handling or Other Recoverable Charges",
  "Tax Short Charged",
  "Interest or Late Payment Charges",
  "Invoice Correction",
  "Others",
];

export const purchaseDebitNoteReasons = [
  "Purchase Return",
  "Quantity Shortage or Short Supply",
  "Damaged or Rejected Goods",
  "Quality Deficiency",
  "Vendor Overbilling or Rate Difference",
  "Post-Purchase Discount or Rebate",
  "Tax Overcharged or Tax Correction",
  "Deficiency in Service",
  "Others",
];

export function noteReasonsFor(kind: AccountingNoteKind) {
  if (kind === "sales-debit") return salesDebitNoteReasons;
  if (kind === "purchase-debit") return purchaseDebitNoteReasons;
  return creditNoteReasons;
}

export function AccountingNoteReasonSelect({
  kind,
  onChange,
  value,
}: {
  kind: AccountingNoteKind;
  onChange: (reason: string) => void;
  value: string;
}) {
  return (
    <AccountingField label="Reason for note">
      <AccountingSelect
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Select reason</option>
        {noteReasonsFor(kind).map((reason) => (
          <option key={reason} value={reason}>
            {reason}
          </option>
        ))}
      </AccountingSelect>
    </AccountingField>
  );
}
