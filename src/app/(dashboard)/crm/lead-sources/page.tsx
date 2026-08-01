import { CrmTable, CrmConfigurationState, CrmPermissionState } from "@/modules/crm/components/workspace/crm-workspace";
import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { getJustdialConfig, getImportLogs, setImportingLock } from "@/modules/crm/lead-source.service";
import { ImportButtons } from "./import-button";
import { JustdialToggle } from "./justdial-toggle";
import {
  Settings,
  History,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  TrendingUp,
} from "lucide-react";

export default async function CrmLeadSourcesPage() {
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
    return <CrmPermissionState description="You do not have permission to view CRM Lead Sources." />;
  }

  let config = await getJustdialConfig(orgId);
  const logs = await getImportLogs(orgId, 5);

  // Auto-recovery: If database lock is true but memory status is not RUNNING, release the lock
  if (config && config.isImporting) {
    const globalForScraper = globalThis as unknown as { justdialStatus?: Record<string, any> };
    const memStatus = globalForScraper.justdialStatus?.[orgId]?.status;
    if (memStatus !== "RUNNING") {
      console.log(`[Justdial Lock Recovery] Resetting stuck database lock for org ${orgId} on page load.`);
      await setImportingLock(orgId, false);
      config = await getJustdialConfig(orgId);
    }
  }

  const isOffline = config?.isActive && logs.length > 0 && logs[0].status === "FAILED";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Source Card: Justdial */}
        <div className="lg:col-span-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)]/55 rounded-xl p-6 shadow-2xl space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-12 rounded-xl bg-[var(--mnx-warning-bg)] text-[var(--mnx-warning)] flex items-center justify-center font-black text-xl">
                  JD
                </div>
                <div>
                  <h3 className="text-lg font-bold text-mono-text">Justdial Importer</h3>
                  <span className="text-xs text-mono-muted">RPA Persistent Browser Automation</span>
                </div>
              </div>

              {/* Status Pill */}
              {!config ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-mono-soft text-mono-muted uppercase tracking-wider">
                  Not Configured
                </span>
              ) : isOffline ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[var(--mnx-danger-bg)] text-[var(--mnx-danger)] border border-[var(--mnx-danger)] uppercase tracking-wider flex items-center gap-1 animate-pulse">
                  <AlertCircle className="size-3" /> Offline (Update Needed)
                </span>
              ) : config.isActive ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[var(--mnx-success-bg)] text-[var(--mnx-success)] uppercase tracking-wider flex items-center gap-1">
                  <CheckCircle className="size-3" /> Active
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[var(--mnx-warning-bg)] text-[var(--mnx-warning)] uppercase tracking-wider flex items-center gap-1">
                  <AlertCircle className="size-3" /> Disabled
                </span>
              )}
            </div>
            {config && (
              <div className="flex justify-end">
                <JustdialToggle initialActive={config.isActive} />
              </div>
            )}

            <p className="text-mono-muted text-xs leading-relaxed">
              Connects to your Justdial business listing dashboard using Playwright browser context, loading injected active session cookies. Automatically expands inquiries detail cards to retrieve client contact information, location, query category, and rating status without mass scraping.
            </p>

            {isOffline && (
              <div className="flex items-start gap-2.5 bg-[var(--mnx-danger-bg)] border border-[var(--mnx-danger)] p-3 rounded-lg text-xs text-[var(--mnx-danger)]">
                <AlertCircle className="size-4 shrink-0 text-[var(--mnx-danger)] mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold">Integration Offline</span>
                  <p className="text-mono-muted leading-relaxed">
                    The latest automation run failed: <span className="text-[var(--mnx-danger)]">"{logs[0].errorMessage || "Unknown scraper error"}"</span>. This usually indicates that the session cookies have expired or the dashboard URL is invalid. Please configure the importer with updated parameters.
                  </p>
                </div>
              </div>
            )}

            {config ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-[var(--mnx-surface)]/50 p-4 rounded-xl border border-[var(--mnx-border)]/30 text-xs">
                <div>
                  <span className="text-mono-muted block">Mode</span>
                  <span className="font-semibold text-mono-text uppercase">{config.importMode}</span>
                </div>
                <div>
                  <span className="text-mono-muted block">Interval</span>
                  <span className="font-semibold text-mono-text">{config.importMode === "SCHEDULED" ? config.scheduleInterval : "Manual Only"}</span>
                </div>
                <div>
                  <span className="text-mono-muted block">Max Leads / Run</span>
                  <span className="font-semibold text-[var(--mnx-accent)]">{config.maxLeads} leads</span>
                </div>
                <div>
                  <span className="text-mono-muted block">Duplicate Handling</span>
                  <span className="font-semibold text-mono-text uppercase">{config.duplicateHandling.replace("_", " ")}</span>
                </div>
                <div>
                  <span className="text-mono-muted block">Last Synced</span>
                  <span className="font-semibold text-mono-text">
                    {config.lastSyncedAt ? new Date(config.lastSyncedAt).toLocaleString("en-IN") : "Never"}
                  </span>
                </div>
                <div>
                  <span className="text-mono-muted block">Default Owner</span>
                  <span className="font-semibold text-mono-text">{config.defaultOwner.name}</span>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-[var(--mnx-surface)]/40 rounded-xl border border-dashed border-[var(--mnx-border)]/60 text-center text-xs text-mono-muted">
                Setup your Justdial parameters to authorize session cookie injection.
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[var(--mnx-border)]/30 pt-5 mt-4">
            <Link
              href="/crm/lead-sources/justdial"
              className="flex items-center gap-1 text-mono-muted hover:text-mono-text text-xs font-bold transition-colors"
            >
              <Settings className="size-4" />
              <span>Configure Importer</span>
            </Link>
            
            {config && (
              <ImportButtons isImporting={config.isImporting} orgId={config.orgId} />
            )}
          </div>
        </div>

        {/* Sidebar Status Info */}
        <div className="bg-[var(--mnx-surface)] border border-[var(--mnx-border)]/55 rounded-xl p-6 shadow-2xl space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-[var(--mnx-border)]/30 pb-2">
              <TrendingUp className="size-4 text-[var(--mnx-accent)]" />
              <h3 className="font-bold text-xs text-mono-text uppercase tracking-wider">Sync Quick Stats</h3>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs py-1.5 border-b border-[var(--mnx-border)]/20">
                <span className="text-mono-muted">Total JD Snapshots</span>
                <span className="font-bold text-mono-text">
                  {logs.length > 0 ? logs.reduce((acc, log) => acc + log.totalScanned, 0) : 0}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs py-1.5 border-b border-[var(--mnx-border)]/20">
                <span className="text-mono-muted">Success Ingestions</span>
                <span className="font-bold text-[var(--mnx-success)]">
                  {logs.length > 0 ? logs.reduce((acc, log) => acc + log.newLeads, 0) : 0}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs py-1.5 border-b border-[var(--mnx-border)]/20">
                <span className="text-mono-muted">Duplicates Handled</span>
                <span className="font-bold text-[var(--mnx-warning)]">
                  {logs.length > 0 ? logs.reduce((acc, log) => acc + log.updatedLeads, 0) : 0}
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-mono-soft0/5 rounded-xl border border-mono-border/40 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-mono-muted">
              <HelpCircle className="size-4 text-[var(--mnx-accent)]" />
              <span>Cookie Synchronization</span>
            </div>
            <p className="text-[11px] text-mono-muted leading-relaxed">
              Playwright uses the cookie JSON saved in your configuration parameters. If login expired warnings appear, export cookies from your authenticated Justdial desktop tab and paste the text block.
            </p>
          </div>
        </div>
      </div>

      {/* Sync Logs Section */}
      <div className="bg-[var(--mnx-surface)] border border-[var(--mnx-border)]/55 rounded-xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--mnx-border)]/30 pb-3">
          <div className="flex items-center gap-2">
            <History className="size-4.5 text-[var(--mnx-accent)]" />
            <h3 className="font-bold text-sm text-mono-text uppercase tracking-wider">Recent Import Runs</h3>
          </div>
          {logs.length > 0 && (
            <Link
              href="/crm/lead-sources/logs"
              className="flex items-center gap-1 text-[var(--mnx-accent)] hover:underline text-xs font-bold transition-all"
            >
              <span>See Full Logs</span>
              <ArrowRight className="size-3.5" />
            </Link>
          )}
        </div>

        {logs.length === 0 ? (
          <div className="p-8 text-center text-mono-muted text-xs">
            No recent import activities found. Trigger a manual sync run above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <CrmTable className="w-full text-left text-xs border-collapse text-mono-muted">
              <thead>
                <tr className="border-b border-[var(--mnx-border)]/60 bg-[var(--mnx-surface)]/50 text-[10px] font-bold uppercase tracking-wider text-mono-muted">
                  <th className="px-4 py-3">Start Date/Time</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-center">Total Scanned</th>
                  <th className="px-4 py-3 text-center">New Leads</th>
                  <th className="px-4 py-3 text-center">Updated</th>
                  <th className="px-4 py-3">Message</th>
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
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                          log.status === "SUCCESS"
                            ? "bg-[var(--mnx-success-bg)] text-[var(--mnx-success)]"
                            : log.status === "RUNNING"
                            ? "bg-[var(--mnx-accent-soft)] text-[var(--mnx-accent-text)]"
                            : "bg-[var(--mnx-danger-bg)] text-[var(--mnx-danger)]"
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-mono-text">{log.totalScanned}</td>
                      <td className="px-4 py-3 text-center font-bold text-[var(--mnx-accent)]">{log.newLeads}</td>
                      <td className="px-4 py-3 text-center font-bold text-[var(--mnx-warning)]">{log.updatedLeads}</td>
                      <td className="px-4 py-3 text-mono-muted truncate max-w-xs" title={log.errorMessage || undefined}>
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
