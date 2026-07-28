import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Clock } from "lucide-react";

export default async function TimesheetsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="rounded-2xl border border-mono-border/20 bg-mono-card p-8 text-center shadow-ambient">
      <Clock className="mx-auto size-10 text-mono-muted/40" strokeWidth={1.2} />
      <p className="mt-3 text-sm font-medium text-mono-text">Timesheets coming soon</p>
      <p className="mt-1 text-xs text-mono-muted">
        Weekly timesheet submission and approval will be available here.
      </p>
    </div>
  );
}
