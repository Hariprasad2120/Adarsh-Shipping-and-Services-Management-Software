import type { InputHTMLAttributes } from "react";
import { DateInput } from "@/components/monolith/date-input";

type DateFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  error?: boolean;
};

export function DateField({ className, error, ...props }: DateFieldProps) {
  return (
    <DateInput
      className={[
        "h-9 rounded-xl border border-mono-border bg-mono-card px-3 pr-9 text-[13px] text-mono-text outline-none transition",
        error ? "border-[#fe4242] focus:ring-[#fe4242]/15" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}

