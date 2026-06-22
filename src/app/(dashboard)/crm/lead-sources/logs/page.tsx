import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { getImportLogs } from "@/modules/crm/lead-source.service";
import { ArrowLeft, ShieldAlert, History, AlertTriangle, CheckCircle, RefreshCw } from "lucide-react";

export default async function CrmLeadSourcesLogsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId;
  if (!orgId) {
    return (
      <div className="p-8 text-center text-red-400">
        <ShieldAlert className="size-12 mx-auto mb-4" />
        <h2 className="text-xl font-bold">Configuration Error</h2>
        <p className="text-sm mt-1">Missing organisation context.</p>
      </div>
    );
  }

  // Permission Guard
  try {
    await requirePermission(session.user.id, "crm.leadSource.read");
  } catch (e) {
    return (
      <div className="p-8 text-center text-red-400">
        <ShieldAlert className="size-12 mx-auto mb-4" />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-sm mt-1">You do not have permission to view CRM Lead Source logs.</p>
      </div>
    );
  }

  const logs = await getImportLogs(orgId, 100);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="bg-[#0f1319] border border-[#1c212a]/55 rounded-xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center gap-2 text-slate-300 border-b border-[#1c212a]/20 pb-2">
          <Link
            href="/crm/lead-sources"
            className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800/40 cursor-pointer"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <History className="size-4.5 text-[#00c4b6]" />
          <h3 className="font-bold text-xs uppercase tracking-wider text-white">Ingestion Run Audit Log</h3>
        </div>

        {logs.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No sync execution entries found. Trigger an import run to capture metrics.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse text-slate-300">
              <thead>
                <tr className="border-b border-[#1c212a]/60 bg-[#0c0f14]/50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">Start Date/Time</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-center">Scanned</th>
                  <th className="px-4 py-3 text-center">New Leads</th>
                  <th className="px-4 py-3 text-center">Updated Duplicates</th>
                  <th className="px-4 py-3 text-center">Failed</th>
                  <th className="px-4 py-3">Errors / Messages</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1c212a]/30">
                {logs.map((log) => {
                  const duration = log.completedAt 
                    ? `${Math.round((new Date(log.completedAt).getTime() - new Date(log.startedAt).getTime()) / 1000)}s` 
                    : "Running";
                  return (
                    <tr key={log.id} className="hover:bg-[#161f28]/35 transition-colors">
                      <td className="px-4 py-3 font-semibold text-white">
                        {new Date(log.startedAt).toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3 text-slate-400">{duration}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 w-max ${
                          log.status === "SUCCESS"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : log.status === "RUNNING"
                            ? "bg-blue-500/10 text-blue-400"
                            : "bg-red-500/10 text-red-400"
                        }`}>
                          {log.status === "SUCCESS" ? (
                            <CheckCircle className="size-2.5" />
                          ) : log.status === "RUNNING" ? (
                            <RefreshCw className="size-2.5 animate-spin" />
                          ) : (
                            <AlertTriangle className="size-2.5" />
                          )}
                          <span>{log.status}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-white">{log.totalScanned}</td>
                      <td className="px-4 py-3 text-center font-bold text-[#00c4b6]">{log.newLeads}</td>
                      <td className="px-4 py-3 text-center font-bold text-amber-400">{log.updatedLeads}</td>
                      <td className="px-4 py-3 text-center font-bold text-red-400">{log.failedLeads}</td>
                      <td className="px-4 py-3 text-slate-400 max-w-sm break-words leading-relaxed">
                        {log.errorMessage || "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
