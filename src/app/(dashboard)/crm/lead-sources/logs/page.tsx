import { CrmTable, CrmConfigurationState, CrmPermissionState } from "@/modules/crm/components/workspace/crm-workspace";
import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { getImportLogs } from "@/modules/crm/lead-source.service";
import { ArrowLeft, History, AlertTriangle, CheckCircle, RefreshCw } from "lucide-react";

export default async function CrmLeadSourcesLogsPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId;
  if (!orgId) {
    return <CrmConfigurationState description="Missing organisation context." />;
  }

  // Permission Guard
  try {
    await requirePermission(session.user.id, "crm.leadSource.read");
  } catch (e) {
    return <CrmPermissionState description="You do not have permission to view CRM Lead Source logs." />;
  }

  const logs = await getImportLogs(orgId, 100);

  return (
    <div className="space-y-6">
      <div className="bg-[var(--mnx-surface)] border border-[var(--mnx-border)]/55 rounded-xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center gap-2 text-mono-muted border-b border-[var(--mnx-border)]/20 pb-2">
          <Link
            href="/crm/lead-sources"
            className="p-1.5 text-mono-muted hover:text-mono-text rounded hover:bg-mono-soft cursor-pointer"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <History className="size-4.5 text-[var(--mnx-accent)]" />
          <h3 className="font-bold text-xs uppercase tracking-wider text-mono-text">Ingestion Run Audit Log</h3>
        </div>

        {logs.length === 0 ? (
          <div className="p-12 text-center text-mono-muted text-xs">
            No sync execution entries found. Trigger an import run to capture metrics.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <CrmTable className="w-full text-left text-xs border-collapse text-mono-muted">
              <thead>
                <tr className="border-b border-[var(--mnx-border)]/60 bg-[var(--mnx-surface)]/50 text-[10px] font-bold uppercase tracking-wider text-mono-muted">
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
              <tbody className="divide-y divide-[var(--mnx-border)]/30">
                {logs.map((log) => {
                  const duration = log.completedAt 
                    ? `${Math.round((new Date(log.completedAt).getTime() - new Date(log.startedAt).getTime()) / 1000)}s` 
                    : "Running";
                  return (
                    <tr key={log.id} className="hover:bg-[var(--mnx-surface)]/35 transition-colors">
                      <td className="px-4 py-3 font-semibold text-mono-text">
                        {new Date(log.startedAt).toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3 text-mono-muted">{duration}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 w-max ${
                          log.status === "SUCCESS"
                            ? "bg-[var(--mnx-success-bg)] text-[var(--mnx-success)]"
                            : log.status === "RUNNING"
                            ? "bg-[var(--mnx-accent-soft)] text-[var(--mnx-accent-text)]"
                            : "bg-[var(--mnx-danger-bg)] text-[var(--mnx-danger)]"
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
                      <td className="px-4 py-3 text-center font-bold text-mono-text">{log.totalScanned}</td>
                      <td className="px-4 py-3 text-center font-bold text-[var(--mnx-accent)]">{log.newLeads}</td>
                      <td className="px-4 py-3 text-center font-bold text-[var(--mnx-warning)]">{log.updatedLeads}</td>
                      <td className="px-4 py-3 text-center font-bold text-[var(--mnx-danger)]">{log.failedLeads}</td>
                      <td className="px-4 py-3 text-mono-muted max-w-sm break-words leading-relaxed">
                        {log.errorMessage || "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </CrmTable>
          </div>
        )}
      </div>
    </div>
  );
}
