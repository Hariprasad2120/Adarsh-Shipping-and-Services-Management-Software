import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { WorkbookImportForm } from "./workbook-import-form";
import { Database, FileSpreadsheet } from "lucide-react";

export const metadata = {
  title: "Data Tools | Admin | Adarsh Shipping",
};

export default async function DataToolsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  await requirePermission(session.user.id, "admin.org.manage");

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-sm text-mono-muted dark:text-mono-muted font-medium">
          Manage system data imports, reset operations, and onboarding configurations.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Reset utilities info */}
        <section className="rounded-xl border border-mono-border/60 bg-mono-card p-5 space-y-4">
          <div className="flex items-center gap-2 text-mono-muted dark:text-mono-muted">
            <Database className="size-5 text-[#F9D972]" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-mono-muted">
              Safe Database Reset
            </h2>
          </div>
          <p className="text-xs text-mono-muted dark:text-mono-muted leading-relaxed font-semibold">
            To reset system data and clear transactional appraisal data while preserving main organisation admins, run the standard reset command in the local environment:
          </p>
          <pre className="overflow-x-auto rounded-lg bg-mono-soft/40 p-3 text-[10px] font-mono text-mono-muted dark:text-mono-muted border border-mono-border/40">
{`$env:CONFIRM_RESET="KEEP_ONLY_ADMIN"
$env:RESET_ADMIN_PASSWORD="strong-temp-password"
npm run db:reset:keep-admin`}
          </pre>
        </section>

        {/* Fresh import workbook */}
        <section className="rounded-xl border border-mono-border/60 bg-mono-card p-5 space-y-4">
          <div className="flex items-center gap-2 text-mono-muted dark:text-mono-muted">
            <FileSpreadsheet className="size-5 text-[#F9D972]" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-mono-muted">
              Fresh Import Workbook
            </h2>
          </div>
          <p className="text-xs text-mono-muted dark:text-mono-muted leading-relaxed font-semibold">
            Prepare the company onboarding workbook with the required sheets (Users, Login Access) and column headers before importing fresh data.
          </p>
          <WorkbookImportForm />
        </section>
      </div>
    </div>
  );
}
