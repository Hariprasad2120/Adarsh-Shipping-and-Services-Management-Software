import type { InputHTMLAttributes } from "react";
import { DateInput } from "@/components/ui/date-input";

type DateFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  error?: boolean;
};

export function DateField({ className, error, ...props }: DateFieldProps) {
  return (
    <DateInput
      className={[
        "h-9 rounded-xl border border-[var(--mnx-border)] bg-[var(--mnx-surface)] px-3 pr-9 text-[13px] text-[var(--mnx-text-strong)] outline-none transition",
        error ? "border-[var(--mnx-danger)] focus:ring-[var(--mnx-danger)]/15" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}

