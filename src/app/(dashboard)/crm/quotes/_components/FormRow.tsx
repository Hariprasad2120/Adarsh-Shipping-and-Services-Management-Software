import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type FormRowProps = {
  label: string;
  required?: boolean;
  helperText?: string;
  error?: string;
  children: ReactNode;
  className?: string;
};

export function FormRow({ label, required, helperText, error, children, className }: FormRowProps) {
  return (
    <div className={cn("grid gap-2 border-b border-[var(--mnx-border)] py-3 md:grid-cols-[190px_minmax(0,1fr)] md:gap-4", className)}>
      <div className="pt-1">
        <label className="text-[12px] font-medium text-[var(--mnx-text-strong)]">
          {label}
          {required ? <span className="ml-1 text-[var(--mnx-danger)]" aria-hidden="true">*</span> : null}
        </label>
      </div>
      <div className="space-y-1.5">
        {children}
        {error ? <p className="text-[11px] text-[var(--mnx-danger)]">{error}</p> : null}
        {!error && helperText ? <p className="text-[11px] text-[var(--mnx-text-muted)]">{helperText}</p> : null}
      </div>
    </div>
  );
}

