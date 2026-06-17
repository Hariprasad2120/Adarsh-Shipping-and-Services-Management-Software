"use client";

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
      prev.map((s) => (s.key === key ? { ...s, enabled: !s.enabled } : s))
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
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col gap-6 select-none animate-in fade-in duration-200">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Settings className="size-5 text-[#00c4b6]" />
          Custom Services Manager
        </h3>
        <button
          type="button"
          disabled={updating || loading}
          onClick={handleSave}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#00c4b6] hover:bg-[#00b0a3] rounded-xl cursor-pointer transition-colors shadow-sm disabled:opacity-50"
        >
          <Save className="size-3.5" />
          Save Configurations
        </button>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center text-xs text-slate-400">
          Loading service configuration list...
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Use this panel to customize which HRMS services are enabled across your tenant workspace. Disabled services are hidden from the sidebar modules rail.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {services.map((item) => (
              <div
                key={item.key}
                className={`p-4 border rounded-xl flex items-center justify-between transition-colors ${
                  item.enabled ? "bg-white border-slate-200" : "bg-slate-50/50 border-slate-100 text-slate-400"
                }`}
              >
                <div>
                  <h4 className="text-xs font-bold text-slate-700 capitalize">{item.name}</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Key: {item.key}</p>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    item.enabled ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"
                  }`}>
                    {item.enabled ? "Active" : "Disabled"}
                  </span>
                  
                  {/* Switch */}
                  <button
                    type="button"
                    onClick={() => handleToggle(item.key)}
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors focus:outline-none cursor-pointer ${
                      item.enabled ? "bg-[#00c4b6]" : "bg-slate-200"
                    }`}
                  >
                    <div className={`size-4 rounded-full bg-white transition-transform ${
                      item.enabled ? "translate-x-4" : "translate-x-0"
                    }`} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
