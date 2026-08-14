"use client";

import {
  CrmButton,
  CrmInput,
  CrmTextarea,
} from "@/modules/crm/components/workspace/crm-workspace";

import { NativeSelect } from "@/components/ui/native-select";
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
    <form
      onSubmit={handleSubmit}
      className="space-y-6 bg-[var(--mnx-surface)] border border-[var(--mnx-border)]/55 rounded-xl p-6 shadow-2xl max-w-4xl"
    >
      <div className="flex items-center justify-between border-b border-[var(--mnx-border)]/30 pb-4">
        <div className="flex items-center gap-2">
          <Link
            href="/crm/lead-sources"
            className="p-1.5 text-[var(--mnx-muted)] hover:text-[var(--mnx-text-strong)] rounded hover:bg-[var(--mnx-soft)] cursor-pointer"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <h3 className="font-bold text-base text-[var(--mnx-text-strong)]">
            Configure Justdial Lead Importer
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Dashboard URL */}
        <div className="md:col-span-2 space-y-1.5">
          <label className="text-xs font-semibold text-[var(--mnx-muted)]">
            Justdial Leads Dashboard URL
          </label>
          <CrmInput
            type="url"
            name="dashboardUrl"
            required
            defaultValue={
              initialConfig?.dashboardUrl ||
              "https://wap.justdial.com/analytics/leadsdashboard?el=0&min=1&docid=044PXX44.XX44.101103084537.I5S5&hide_header=1&old=1&source=77"
            }
            placeholder="https://wap.justdial.com/analytics/leadsdashboard?el=0&min=1&docid=..."
            className="w-full px-3 py-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-[var(--mnx-text-strong)] placeholder:text-[var(--mnx-muted)] focus:outline-none focus:border-[var(--mnx-accent)]"
          />
          <p className="text-[10px] text-[var(--mnx-muted)]">
            Provide the exact mobile leads URL visible when logged into your
            merchant portal.
          </p>
        </div>

        {/* Import Mode */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[var(--mnx-muted)]">
            Import Trigger Mode
          </label>
          <NativeSelect
            name="importMode"
            defaultValue={initialConfig?.importMode || "MANUAL"}
            className="w-full px-3 py-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)]"
          >
            <option value="MANUAL">Manual Execution Only</option>
            <option value="SCHEDULED">Scheduled Automatic Sync</option>
          </NativeSelect>
        </div>

        {/* Schedule Interval */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[var(--mnx-muted)]">
            Sync Interval (If Scheduled)
          </label>
          <NativeSelect
            name="scheduleInterval"
            defaultValue={initialConfig?.scheduleInterval || "1h"}
            className="w-full px-3 py-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)]"
          >
            <option value="5m">Every 5 Minutes</option>
            <option value="15m">Every 15 Minutes</option>
            <option value="30m">Every 30 Minutes</option>
            <option value="1h">Every 1 Hour</option>
          </NativeSelect>
        </div>

        {/* Max Leads per Run */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[var(--mnx-muted)]">
            Max Leads Per Scan
          </label>
          <CrmInput
            type="number"
            name="maxLeads"
            min={5}
            max={100}
            defaultValue={initialConfig?.maxLeads || 50}
            className="w-full px-3 py-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)]"
          />
        </div>

        {/* Duplicate Handling */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[var(--mnx-muted)]">
            On Duplicate Found
          </label>
          <NativeSelect
            name="duplicateHandling"
            defaultValue={initialConfig?.duplicateHandling || "UPDATE_EXISTING"}
            className="w-full px-3 py-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)]"
          >
            <option value="UPDATE_EXISTING">
              Update Timeline & Last Seen (Recommended)
            </option>
            <option value="SKIP">Skip & Ignore</option>
          </NativeSelect>
        </div>

        {/* Default Owner */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[var(--mnx-muted)]">
            Default Lead Owner
          </label>
          <NativeSelect
            name="defaultOwnerId"
            defaultValue={initialConfig?.defaultOwnerId || ""}
            className="w-full px-3 py-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)]"
          >
            <option value="">Select Assignee...</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </NativeSelect>
        </div>

        {/* Default Stage */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[var(--mnx-muted)]">
            Default Pipeline Stage
          </label>
          <NativeSelect
            name="defaultStage"
            defaultValue={initialConfig?.defaultStage || "NEW"}
            className="w-full px-3 py-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)]"
          >
            <option value="NEW">New Lead</option>
            <option value="CONTACTED">Contacted</option>
            <option value="QUALIFIED">Qualified</option>
          </NativeSelect>
        </div>

        {/* Active Toggle */}
        <div className="md:col-span-2 flex items-center gap-2 py-2">
          <CrmInput
            type="checkbox"
            id="isActive"
            name="isActive"
            value="true"
            defaultChecked={initialConfig ? initialConfig.isActive : true}
            className="h-4 w-4 rounded border-[var(--mnx-border)] bg-[var(--mnx-soft)] text-[var(--mnx-accent)] focus:ring-0 cursor-pointer"
          />
          <label
            htmlFor="isActive"
            className="text-xs font-semibold text-[var(--mnx-muted)] select-none cursor-pointer"
          >
            Enable importer synchronization processes
          </label>
        </div>

        {/* Cookies JSON */}
        <div className="md:col-span-2 space-y-1.5">
          <label className="text-xs font-semibold text-[var(--mnx-muted)]">
            Session Cookies JSON Array
          </label>
          <CrmTextarea
            name="cookiesJson"
            rows={8}
            defaultValue={initialConfig?.cookiesJson || ""}
            placeholder='[{"name": "MP_city", "value": "Chennai", "domain": ".justdial.com", "path": "/"}, ...]'
            className="w-full px-3 py-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-xs font-mono text-[var(--mnx-text-strong)] placeholder:text-[var(--mnx-muted)] focus:outline-none focus:border-[var(--mnx-accent)] leading-relaxed"
          />
          <p className="text-[10px] text-[var(--mnx-muted)]">
            Paste the cookies array exported from your browser. In development,
            it defaults to Cookie.txt in the current user&apos;s Downloads
            folder if left empty.
          </p>
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t border-[var(--mnx-border)]/30 pt-5 mt-4">
        <Link
          href="/crm/lead-sources"
          className="px-4 py-2 bg-[var(--mnx-surface)] hover:bg-[var(--mnx-text-muted)] border border-[var(--mnx-border)] text-[var(--mnx-muted)] rounded-lg text-sm font-semibold transition-all cursor-pointer"
        >
          Cancel
        </Link>
        <CrmButton
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 bg-[var(--mnx-accent)] hover:bg-[var(--mnx-accent)] disabled:opacity-50 text-[var(--mnx-text-strong)] px-5 py-2 rounded-lg text-sm font-bold transition-all mnx-shadow-panel cursor-pointer"
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          <span>{isPending ? "Saving..." : "Save Parameters"}</span>
        </CrmButton>
      </div>
    </form>
  );
}
