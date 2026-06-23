"use client";

import { startTransition, useMemo, useState } from "react";
import { Layers3, ShieldCheck, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ModuleControlItem, ToggleableModuleSectionId } from "@/modules/core/organisation/module-config";

export function RootModuleControlClient({
  initialItems,
  initialEnabledModuleIds,
}: {
  initialItems: readonly ModuleControlItem[];
  initialEnabledModuleIds: readonly ToggleableModuleSectionId[];
}) {
  const [enabledModuleIds, setEnabledModuleIds] = useState<ToggleableModuleSectionId[]>(
    [...initialEnabledModuleIds],
  );
  const [savingModuleId, setSavingModuleId] = useState<ToggleableModuleSectionId | null>(null);
  const [message, setMessage] = useState<string>("");

  const enabledSet = useMemo(() => new Set(enabledModuleIds), [enabledModuleIds]);

  async function save(nextEnabled: ToggleableModuleSectionId[], moduleId: ToggleableModuleSectionId) {
    setSavingModuleId(moduleId);
    setMessage("");

    try {
      const response = await fetch("/api/admin/modules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabledModuleIds: nextEnabled }),
      });

      if (!response.ok) {
        throw new Error("Failed to update module visibility.");
      }

      const payload = (await response.json()) as {
        enabledModuleIds: ToggleableModuleSectionId[];
      };

      startTransition(() => {
        setEnabledModuleIds(payload.enabledModuleIds);
        setMessage("Module visibility updated for all users.");
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to update module visibility.");
    } finally {
      setSavingModuleId(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.8fr)]">
        <Card className="card-left-accent">
          <CardHeader className="space-y-3">
            <div className="ds-icon-badge">
              <Layers3 size={18} />
            </div>
            <CardTitle className="text-primary">Global Module Control</CardTitle>
            <p className="text-sm leading-6 text-on-surface-variant">
              Toggle workspace availability across the organisation. Changes update navigation and route access for every user immediately.
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-3 text-sm text-on-surface-variant">
              <span className="rounded-full border border-outline-variant bg-surface-container-low px-3 py-1">
                Enabled
                <span className="ds-numeric ml-2 text-on-surface">{enabledModuleIds.length}</span>
              </span>
              <span className="rounded-full border border-outline-variant bg-surface-container-low px-3 py-1">
                Disabled
                <span className="ds-numeric ml-2 text-on-surface">{initialItems.length - enabledModuleIds.length}</span>
              </span>
            </div>
            {message ? (
              <p className="rounded-xl border border-outline-variant bg-surface-container-low px-4 py-3 text-sm text-on-surface">
                {message}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="card-top-accent">
          <CardHeader className="space-y-3">
            <div className="ds-icon-badge">
              <ShieldCheck size={18} />
            </div>
            <CardTitle className="text-primary">Protected Root</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-on-surface-variant">
              This page is reserved for the root control account and keeps the always-on admin routes outside the toggle list so recovery stays available.
            </p>
          </CardContent>
        </Card>
      </section>

      <div className="space-y-4">
        {initialItems.map((item) => {
          const isEnabled = enabledSet.has(item.id);
          const isSaving = savingModuleId === item.id;
          const nextEnabled = isEnabled
            ? enabledModuleIds.filter((value) => value !== item.id)
            : [...enabledModuleIds, item.id];

          return (
            <Card key={item.id} className={isEnabled ? "card-left-accent" : "card-left-accent-orange"}>
              <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="ds-h3 text-on-surface">{item.label}</h2>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.12em] ${
                        isEnabled
                          ? "border-outline-variant bg-surface-container-low text-on-surface"
                          : "border-outline-variant bg-surface-container text-on-surface-variant"
                      }`}
                    >
                      {isEnabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                  <p className="text-sm leading-6 text-on-surface-variant">{item.description}</p>
                </div>

                <Button
                  variant={isEnabled ? "outline" : "default"}
                  size="lg"
                  onClick={() => void save(nextEnabled, item.id)}
                  disabled={isSaving}
                  className="min-w-36 uppercase tracking-[0.12em]"
                >
                  {isEnabled ? <ToggleRight className="mr-2 size-4" /> : <ToggleLeft className="mr-2 size-4" />}
                  {isSaving ? "Saving" : isEnabled ? "Disable" : "Enable"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
