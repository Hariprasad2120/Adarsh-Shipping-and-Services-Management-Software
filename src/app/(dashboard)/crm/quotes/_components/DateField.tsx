import type { InputHTMLAttributes } from "react";
import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

type DateFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  error?: boolean;
};

export function DateField({ className, error, ...props }: DateFieldProps) {
  return (
    <div className="relative">
      <input
        type="date"
        className={cn(
          "h-9 w-full rounded-md border bg-white px-3 pr-9 text-[13px] text-[#1f2937] outline-none transition",
          error ? "border-[#fe4242] focus:ring-[#fe4242]/15" : "",
          className,
        )}
        {...props}
      />
      <CalendarDays className="pointer-events-none absolute right-3 top-2.5 size-4 text-[#6b7280]" />
    </div>
  );
}

