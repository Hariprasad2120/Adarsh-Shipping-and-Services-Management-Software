"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { saveJustdialConfigAction } from "@/modules/crm/actions";

interface JustdialFormProps {
  initialConfig: any;
  employees: { id: string; name: string }[];
}

export function JustdialForm({ initialConfig, employees }: JustdialFormProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);

    const formData = new FormData(e.currentTarget);
    try {
      const res = await saveJustdialConfigAction(formData);
      if (res.ok) {
        toast.success("Justdial configuration saved successfully!");
        router.push("/crm/lead-sources");
        router.refresh();
      } else {
        toast.error(res.error || "Failed to save configuration.");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred while saving.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-[#0f1319] border border-[#1c212a]/55 rounded-xl p-6 shadow-2xl max-w-4xl">
      <div className="flex items-center justify-between border-b border-[#1c212a]/30 pb-4">
        <div className="flex items-center gap-2">
          <Link
            href="/crm/lead-sources"
            className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800/40 cursor-pointer"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <h3 className="font-bold text-base text-white">Configure Justdial Lead Importer</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Dashboard URL */}
        <div className="md:col-span-2 space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Justdial Leads Dashboard URL</label>
          <input
            type="url"
            name="dashboardUrl"
            required
            defaultValue={initialConfig?.dashboardUrl || "https://wap.justdial.com/analytics/leadsdashboard?el=0&min=1&docid=044PXX44.XX44.101103084537.I5S5&hide_header=1&old=1&source=77"}
            placeholder="https://wap.justdial.com/analytics/leadsdashboard?el=0&min=1&docid=..."
            className="w-full px-3 py-2 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#00c4b6]"
          />
          <p className="text-[10px] text-slate-500">Provide the exact mobile leads URL visible when logged into your merchant portal.</p>
        </div>

        {/* Import Mode */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Import Trigger Mode</label>
          <select
            name="importMode"
            defaultValue={initialConfig?.importMode || "MANUAL"}
            className="w-full px-3 py-2 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00c4b6]"
          >
            <option value="MANUAL">Manual Execution Only</option>
            <option value="SCHEDULED">Scheduled Automatic Sync</option>
          </select>
        </div>

        {/* Schedule Interval */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Sync Interval (If Scheduled)</label>
          <select
            name="scheduleInterval"
            defaultValue={initialConfig?.scheduleInterval || "1h"}
            className="w-full px-3 py-2 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00c4b6]"
          >
            <option value="15m">Every 15 Minutes</option>
            <option value="30m">Every 30 Minutes</option>
            <option value="1h">Every 1 Hour</option>
          </select>
        </div>

        {/* Max Leads per Run */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Max Leads Per Scan</label>
          <input
            type="number"
            name="maxLeads"
            min={5}
            max={100}
            defaultValue={initialConfig?.maxLeads || 50}
            className="w-full px-3 py-2 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00c4b6]"
          />
        </div>

        {/* Duplicate Handling */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">On Duplicate Found</label>
          <select
            name="duplicateHandling"
            defaultValue={initialConfig?.duplicateHandling || "UPDATE_EXISTING"}
            className="w-full px-3 py-2 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00c4b6]"
          >
            <option value="UPDATE_EXISTING">Update Timeline & Last Seen (Recommended)</option>
            <option value="SKIP">Skip & Ignore</option>
          </select>
        </div>

        {/* Default Owner */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Default Lead Owner</label>
          <select
            name="defaultOwnerId"
            defaultValue={initialConfig?.defaultOwnerId || ""}
            className="w-full px-3 py-2 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00c4b6]"
          >
            <option value="">Select Assignee...</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>

        {/* Default Stage */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Default Pipeline Stage</label>
          <select
            name="defaultStage"
            defaultValue={initialConfig?.defaultStage || "NEW"}
            className="w-full px-3 py-2 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00c4b6]"
          >
            <option value="NEW">New Lead</option>
            <option value="CONTACTED">Contacted</option>
            <option value="QUALIFIED">Qualified</option>
          </select>
        </div>

        {/* Active Toggle */}
        <div className="md:col-span-2 flex items-center gap-2 py-2">
          <input
            type="checkbox"
            id="isActive"
            name="isActive"
            value="true"
            defaultChecked={initialConfig ? initialConfig.isActive : true}
            className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-[#00c4b6] focus:ring-0 cursor-pointer"
          />
          <label htmlFor="isActive" className="text-xs font-semibold text-slate-300 select-none cursor-pointer">
            Enable importer synchronization processes
          </label>
        </div>

        {/* Cookies JSON */}
        <div className="md:col-span-2 space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Session Cookies JSON Array</label>
          <textarea
            name="cookiesJson"
            rows={8}
            defaultValue={initialConfig?.cookiesJson || ""}
            placeholder='[{"name": "MP_city", "value": "Chennai", "domain": ".justdial.com", "path": "/"}, ...]'
            className="w-full px-3 py-2 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-[#00c4b6] leading-relaxed"
          />
          <p className="text-[10px] text-slate-500">
            Paste the cookies array exported from your browser. In development, it defaults to reading from C:/Users/Purushothaman/Downloads/Cookie.txt if left empty.
          </p>
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t border-[#1c212a]/30 pt-5 mt-4">
        <Link
          href="/crm/lead-sources"
          className="px-4 py-2 bg-[#161f28] hover:bg-[#1f2d3a] border border-[#1c212a] text-slate-200 rounded-lg text-sm font-semibold transition-all cursor-pointer"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 bg-[#00c4b6] hover:bg-[#00b0a3] disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-bold transition-all shadow-md shadow-[#00c4b6]/10 cursor-pointer"
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          <span>{isPending ? "Saving..." : "Save Parameters"}</span>
        </button>
      </div>
    </form>
  );
}
