"use client";

import { PeopleControlButton as MnxAction } from "@/modules/people/components";

import React, { useState, useEffect } from "react";
import { Settings, CheckCircle, AlertCircle, Save } from "lucide-react";
import { toast } from "sonner";

interface SettingsServicesProps {
  onFetchServices: () => Promise<any[]>;
  onUpdateServices: (services: any[]) => Promise<any>;
}

export function SettingsServices({
  onFetchServices,
  onUpdateServices,
}: SettingsServicesProps) {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const fetched = await onFetchServices();
        setServices(fetched);
      } catch (err: any) {
        toast.error("Failed to load settings definitions");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [onFetchServices]);

  const handleToggle = (key: string) => {
    setServices((prev) =>
      prev.map((s) => (s.key === key ? { ...s, enabled: !s.enabled } : s)),
    );
  };

  const handleSave = async () => {
    setUpdating(true);
    try {
      await onUpdateServices(services);
      toast.success("Settings saved successfully.");
    } catch (err: any) {
      toast.error(err.message || "Failed to update service definitions");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="bg-[var(--mnx-card)] border border-[var(--mnx-border)] rounded-2xl p-6 shadow-sm flex flex-col gap-6 select-none animate-in fade-in duration-200">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-[var(--mnx-border)] pb-4">
        <h3 className="text-sm font-bold text-[var(--mnx-text)] flex items-center gap-2">
          <Settings className="size-5 text-[var(--mnx-accent)]" />
          Custom Services Manager
        </h3>
        <MnxAction
          type="button"
          disabled={updating || loading}
          onClick={handleSave}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-[var(--mnx-text)] bg-[var(--mnx-accent)] hover:bg-[var(--mnx-accent-text)] rounded-xl cursor-pointer transition-colors shadow-sm disabled:opacity-50"
        >
          <Save className="size-3.5" />
          Save Configurations
        </MnxAction>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center text-xs text-[var(--mnx-muted)]">
          Loading service configuration list...
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-[var(--mnx-muted)]">
            Use this panel to customize which HRMS services are enabled across
            your tenant workspace. Disabled services are hidden from the sidebar
            modules rail.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {services.map((item) => (
              <div
                key={item.key}
                className={`p-4 border rounded-xl flex items-center justify-between transition-colors ${
                  item.enabled
                    ? "bg-[var(--mnx-card)] border-[var(--mnx-border)]"
                    : "bg-[var(--mnx-card)]/50 border-[var(--mnx-border)] text-[var(--mnx-muted)]"
                }`}
              >
                <div>
                  <h4 className="text-xs font-bold text-[var(--mnx-text)] capitalize">
                    {item.name}
                  </h4>
                  <p className="text-[10px] text-[var(--mnx-muted)] mt-0.5">
                    Key: {item.key}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      item.enabled
                        ? "bg-[var(--mnx-success-bg)] text-[var(--mnx-success)]"
                        : "bg-[var(--mnx-card)] text-[var(--mnx-muted)]"
                    }`}
                  >
                    {item.enabled ? "Active" : "Disabled"}
                  </span>

                  {/* Switch */}
                  <MnxAction
                    type="button"
                    onClick={() => handleToggle(item.key)}
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors focus:outline-none cursor-pointer ${
                      item.enabled
                        ? "bg-[var(--mnx-accent)]"
                        : "bg-[var(--mnx-card)]"
                    }`}
                  >
                    <div
                      className={`size-4 rounded-full bg-[var(--mnx-card)] transition-transform ${
                        item.enabled ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </MnxAction>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
