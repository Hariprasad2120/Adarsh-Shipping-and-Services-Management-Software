"use client";

import * as React from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PeopleControlInput } from "@/modules/people/components";
import { submitDeclarationAction } from "@/modules/payroll/investment-declaration-actions";

type DeclarationLine = {
  id: string;
  category: string;
  description: string | null;
  declaredAmount: number;
  approvedAmount: number | null;
  status: string;
};

function formatMoney(value: number) {
  return `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function InvestmentDeclarationClient({
  employeeId,
  fiscalYear,
  declaration,
}: {
  employeeId: string;
  fiscalYear: string;
  declaration: { status: string; lines: DeclarationLine[] } | null;
}) {
  const router = useRouter();
  const [rows, setRows] = React.useState<{ category: string; declaredAmount: string }[]>([
    { category: "", declaredAmount: "" },
  ]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const response = await submitDeclarationAction({
        employeeId,
        fiscalYear,
        lines: rows
          .filter((r) => r.category.trim() && Number(r.declaredAmount) > 0)
          .map((r) => ({ category: r.category, declaredAmount: Number(r.declaredAmount) })),
      });
      if (!response.ok) {
        toast.error(response.error);
        return;
      }
      toast.success("Declaration submitted");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (declaration && declaration.lines.length > 0) {
    return (
      <div className="space-y-2">
        <div className="text-sm text-[var(--mnx-muted)]">
          Fiscal Year {fiscalYear} · {declaration.status === "SUBMITTED" ? "Submitted" : "Draft"}
        </div>
        <ul className="space-y-2">
          {declaration.lines.map((line) => (
            <li
              key={line.id}
              className="flex items-center justify-between rounded-[var(--mn-radius-panel)] border border-[var(--mnx-border)] bg-[var(--mnx-surface-soft)] p-3 text-sm"
            >
              <span className="text-[var(--mnx-text)]">{line.category}</span>
              <span className="text-[var(--mnx-muted)]">
                Declared {formatMoney(line.declaredAmount)}
                {line.approvedAmount != null ? ` · Approved ${formatMoney(line.approvedAmount)}` : ""}
              </span>
              <span className="text-xs text-[var(--mnx-muted)]">{line.status}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-[var(--mnx-muted)]">
        No investment declaration on file for {fiscalYear}. Submit on the employee&apos;s behalf below.
      </p>
      {rows.map((row, index) => (
        <div key={index} className="flex items-center gap-2">
          <PeopleControlInput
            value={row.category}
            onChange={(e) => {
              const next = [...rows];
              next[index]!.category = e.target.value;
              setRows(next);
            }}
            placeholder="Category (e.g. 80C - LIC Premium)"
            className="flex-1"
          />
          <PeopleControlInput
            type="number"
            value={row.declaredAmount}
            onChange={(e) => {
              const next = [...rows];
              next[index]!.declaredAmount = e.target.value;
              setRows(next);
            }}
            placeholder="Declared amount"
            className="w-40"
          />
          <Button type="button" variant="inverse" size="sm" onClick={() => setRows(rows.filter((_, i) => i !== index))} disabled={rows.length === 1}>
            Remove
          </Button>
        </div>
      ))}
      <Button type="button" variant="inverse" size="sm" onClick={() => setRows([...rows, { category: "", declaredAmount: "" }])}>
        Add line
      </Button>
      <div>
        <Button type="button" onClick={() => void handleSubmit()} disabled={isSubmitting}>
          {isSubmitting ? "Submitting…" : "Submit Declaration"}
        </Button>
      </div>
    </div>
  );
}
