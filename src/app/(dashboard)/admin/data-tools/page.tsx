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
    <div className="max-w-4xl space-y-6">
      <div className="space-y-1">
        <h1 className="ds-h1 flex items-center gap-4 text-gray-900 dark:text-white">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#00cec4]/10 text-[#00cec4]">
            <Database className="size-5" />
          </span>
          Data Tools
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
          Manage system data imports, reset operations, and onboarding configurations.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Reset utilities info */}
        <section className="rounded-xl border border-outline-variant/60 bg-surface p-5 space-y-4">
          <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
            <Database className="size-5 text-[#00cec4]" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Safe Database Reset
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
            To reset system data and clear transactional appraisal data while preserving main organisation admins, run the standard reset command in the local environment:
          </p>
          <pre className="overflow-x-auto rounded-lg bg-surface-container-low/40 p-3 text-[10px] font-mono text-slate-700 dark:text-slate-300 border border-outline-variant/40">
{`$env:CONFIRM_RESET="KEEP_ONLY_ADMIN"
$env:RESET_ADMIN_PASSWORD="strong-temp-password"
npm run db:reset:keep-admin`}
          </pre>
        </section>

        {/* Fresh import workbook */}
        <section className="rounded-xl border border-outline-variant/60 bg-surface p-5 space-y-4">
          <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
            <FileSpreadsheet className="size-5 text-[#00cec4]" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Fresh Import Workbook
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
            Prepare the company onboarding workbook with the required sheets (Users, Login Access) and column headers before importing fresh data.
          </p>
          <WorkbookImportForm />
        </section>
      </div>
    </div>
  );
}
