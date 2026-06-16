import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Clock } from "lucide-react";

export default async function TimesheetsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="rounded-2xl border border-outline-variant/20 bg-surface p-8 text-center shadow-ambient">
      <Clock className="mx-auto size-10 text-on-surface-variant/40" strokeWidth={1.2} />
      <p className="mt-3 text-sm font-medium text-on-surface">Timesheets coming soon</p>
      <p className="mt-1 text-xs text-on-surface-variant">
        Weekly timesheet submission and approval will be available here.
      </p>
    </div>
  );
}
