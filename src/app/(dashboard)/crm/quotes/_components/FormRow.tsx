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
    <div className={cn("grid gap-2 border-b border-[#e8edf3] py-3 md:grid-cols-[190px_minmax(0,1fr)] md:gap-4", className)}>
      <div className="pt-1">
        <label className="text-[12px] font-medium text-[#374151]">
          {label}
          {required ? <span className="ml-1 text-[#fe4242]" aria-hidden="true">*</span> : null}
        </label>
      </div>
      <div className="space-y-1.5">
        {children}
        {error ? <p className="text-[11px] text-[#fe4242]">{error}</p> : null}
        {!error && helperText ? <p className="text-[11px] text-[#6b7280]">{helperText}</p> : null}
      </div>
    </div>
  );
}

