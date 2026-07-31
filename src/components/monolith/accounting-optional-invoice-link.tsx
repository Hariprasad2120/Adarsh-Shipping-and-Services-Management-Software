"use client";

import { Link2 } from "lucide-react";
import { useId, useState } from "react";

import {
  AccountingAction,
  AccountingField,
  AccountingSelect,
} from "./accounting-workspace";

export interface AccountingInvoiceLinkOption {
  id: string;
  label: string;
}

export function AccountingOptionalInvoiceLink({
  disabled = false,
  onChange,
  options,
  value,
}: {
  disabled?: boolean;
  onChange: (invoiceId: string) => void;
  options: AccountingInvoiceLinkOption[];
  value: string;
}) {
  const selectId = useId();
  const [isChoosingInvoice, setIsChoosingInvoice] = useState(Boolean(value));

  return (
    <AccountingField
      htmlFor={isChoosingInvoice ? selectId : undefined}
      label="Original invoice (optional)"
    >
      {isChoosingInvoice ? (
        <AccountingSelect
          aria-label="Choose original invoice"
          disabled={disabled}
          id={selectId}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">
            {options.length > 0 ? "Choose invoice" : "No eligible invoices available"}
          </option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </AccountingSelect>
      ) : (
        <AccountingAction
          className="w-full justify-center"
          disabled={disabled}
          type="button"
          variant="secondary"
          onClick={() => setIsChoosingInvoice(true)}
        >
          <Link2 aria-hidden="true" />
          Link with invoice
        </AccountingAction>
      )}
    </AccountingField>
  );
}
