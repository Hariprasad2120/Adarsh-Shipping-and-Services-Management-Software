import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { getJustdialConfig, getImportLogs, setImportingLock } from "@/modules/crm/lead-source.service";
import { ImportButtons } from "./import-button";
import { JustdialToggle } from "./justdial-toggle";
import {
  ShieldAlert,
  Settings,
  History,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  TrendingUp,
} from "lucide-react";

export default async function CrmLeadSourcesPage() {
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
        <p className="text-sm mt-1">You do not have permission to view CRM Lead Sources.</p>
      </div>
    );
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
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Source Card: Justdial */}
        <div className="lg:col-span-2 bg-[#0f1319] border border-[#1c212a]/55 rounded-xl p-6 shadow-2xl space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-12 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center font-black text-xl">
                  JD
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Justdial Importer</h3>
                  <span className="text-xs text-slate-400">RPA Persistent Browser Automation</span>
                </div>
              </div>

              {/* Status Pill */}
              {!config ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 uppercase tracking-wider">
                  Not Configured
                </span>
              ) : isOffline ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/25 uppercase tracking-wider flex items-center gap-1 animate-pulse">
                  <AlertCircle className="size-3" /> Offline (Update Needed)
                </span>
              ) : config.isActive ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                  <CheckCircle className="size-3" /> Active
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 uppercase tracking-wider flex items-center gap-1">
                  <AlertCircle className="size-3" /> Disabled
                </span>
              )}
            </div>
            {config && (
              <div className="flex justify-end">
                <JustdialToggle initialActive={config.isActive} />
              </div>
            )}

            <p className="text-slate-400 text-xs leading-relaxed">
              Connects to your Justdial business listing dashboard using Playwright browser context, loading injected active session cookies. Automatically expands inquiries detail cards to retrieve client contact information, location, query category, and rating status without mass scraping.
            </p>

            {isOffline && (
              <div className="flex items-start gap-2.5 bg-rose-500/10 border border-rose-500/25 p-3 rounded-lg text-xs text-rose-300">
                <AlertCircle className="size-4 shrink-0 text-rose-400 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold">Integration Offline</span>
                  <p className="text-slate-400 leading-relaxed">
                    The latest automation run failed: <span className="text-rose-200">"{logs[0].errorMessage || "Unknown scraper error"}"</span>. This usually indicates that the session cookies have expired or the dashboard URL is invalid. Please configure the importer with updated parameters.
                  </p>
                </div>
              </div>
            )}

            {config ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-[#0a0d12]/50 p-4 rounded-xl border border-[#1c212a]/30 text-xs">
                <div>
                  <span className="text-on-surface-variant block">Mode</span>
                  <span className="font-semibold text-white uppercase">{config.importMode}</span>
                </div>
                <div>
                  <span className="text-on-surface-variant block">Interval</span>
                  <span className="font-semibold text-white">{config.importMode === "SCHEDULED" ? config.scheduleInterval : "Manual Only"}</span>
                </div>
                <div>
                  <span className="text-on-surface-variant block">Max Leads / Run</span>
                  <span className="font-semibold text-[#00c4b6]">{config.maxLeads} leads</span>
                </div>
                <div>
                  <span className="text-on-surface-variant block">Duplicate Handling</span>
                  <span className="font-semibold text-white uppercase">{config.duplicateHandling.replace("_", " ")}</span>
                </div>
                <div>
                  <span className="text-on-surface-variant block">Last Synced</span>
                  <span className="font-semibold text-white">
                    {config.lastSyncedAt ? new Date(config.lastSyncedAt).toLocaleString("en-IN") : "Never"}
                  </span>
                </div>
                <div>
                  <span className="text-on-surface-variant block">Default Owner</span>
                  <span className="font-semibold text-white">{config.defaultOwner.name}</span>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-[#0a0d12]/40 rounded-xl border border-dashed border-[#1c212a]/60 text-center text-xs text-on-surface-variant">
                Setup your Justdial parameters to authorize session cookie injection.
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#1c212a]/30 pt-5 mt-4">
            <Link
              href="/crm/lead-sources/justdial"
              className="flex items-center gap-1 text-slate-400 hover:text-white text-xs font-bold transition-colors"
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
        <div className="bg-[#0f1319] border border-[#1c212a]/55 rounded-xl p-6 shadow-2xl space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-[#1c212a]/30 pb-2">
              <TrendingUp className="size-4 text-[#00c4b6]" />
              <h3 className="font-bold text-xs text-white uppercase tracking-wider">Sync Quick Stats</h3>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs py-1.5 border-b border-[#1c212a]/20">
                <span className="text-slate-400">Total JD Snapshots</span>
                <span className="font-bold text-white">
                  {logs.length > 0 ? logs.reduce((acc, log) => acc + log.totalScanned, 0) : 0}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs py-1.5 border-b border-[#1c212a]/20">
                <span className="text-slate-400">Success Ingestions</span>
                <span className="font-bold text-emerald-400">
                  {logs.length > 0 ? logs.reduce((acc, log) => acc + log.newLeads, 0) : 0}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs py-1.5 border-b border-[#1c212a]/20">
                <span className="text-slate-400">Duplicates Handled</span>
                <span className="font-bold text-amber-400">
                  {logs.length > 0 ? logs.reduce((acc, log) => acc + log.updatedLeads, 0) : 0}
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-surface-container-high0/5 rounded-xl border border-outline-variant/40 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
              <HelpCircle className="size-4 text-[#00c4b6]" />
              <span>Cookie Synchronization</span>
            </div>
            <p className="text-[11px] text-on-surface-variant leading-relaxed">
              Playwright uses the cookie JSON saved in your configuration parameters. If login expired warnings appear, export cookies from your authenticated Justdial desktop tab and paste the text block.
            </p>
          </div>
        </div>
      </div>

      {/* Sync Logs Section */}
      <div className="bg-[#0f1319] border border-[#1c212a]/55 rounded-xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#1c212a]/30 pb-3">
          <div className="flex items-center gap-2">
            <History className="size-4.5 text-[#00c4b6]" />
            <h3 className="font-bold text-sm text-white uppercase tracking-wider">Recent Import Runs</h3>
          </div>
          {logs.length > 0 && (
            <Link
              href="/crm/lead-sources/logs"
              className="flex items-center gap-1 text-[#00c4b6] hover:underline text-xs font-bold transition-all"
            >
              <span>See Full Logs</span>
              <ArrowRight className="size-3.5" />
            </Link>
          )}
        </div>

        {logs.length === 0 ? (
          <div className="p-8 text-center text-on-surface-variant text-xs">
            No recent import activities found. Trigger a manual sync run above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse text-slate-300">
              <thead>
                <tr className="border-b border-[#1c212a]/60 bg-[#0c0f14]/50 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                  <th className="px-4 py-3">Start Date/Time</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-center">Total Scanned</th>
                  <th className="px-4 py-3 text-center">New Leads</th>
                  <th className="px-4 py-3 text-center">Updated</th>
                  <th className="px-4 py-3">Message</th>
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
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                          log.status === "SUCCESS"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : log.status === "RUNNING"
                            ? "bg-blue-500/10 text-blue-400"
                            : "bg-red-500/10 text-red-400"
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-white">{log.totalScanned}</td>
                      <td className="px-4 py-3 text-center font-bold text-[#00c4b6]">{log.newLeads}</td>
                      <td className="px-4 py-3 text-center font-bold text-amber-400">{log.updatedLeads}</td>
                      <td className="px-4 py-3 text-slate-400 truncate max-w-xs" title={log.errorMessage || undefined}>
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
