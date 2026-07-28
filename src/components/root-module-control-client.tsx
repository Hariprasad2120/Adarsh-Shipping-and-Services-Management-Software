"use client";

import { startTransition, useMemo, useState } from "react";
import { Layers3, ShieldCheck, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/monolith/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/monolith/card";
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
        <Card className="monolith-card monolith-accent">
          <CardHeader className="space-y-3">
            <div className="monolith-icon-badge">
              <Layers3 size={18} />
            </div>
            <CardTitle className="text-mono-accent">Global Module Control</CardTitle>
            <p className="text-sm leading-6 text-mono-muted">
              Toggle workspace availability across the organisation. Changes update navigation and route access for every user immediately.
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-3 text-sm text-mono-muted">
              <span className="rounded-full border border-mono-border bg-mono-soft px-3 py-1">
                Enabled
                <span className="monolith-numeric ml-2 text-mono-text">{enabledModuleIds.length}</span>
              </span>
              <span className="rounded-full border border-mono-border bg-mono-soft px-3 py-1">
                Disabled
                <span className="monolith-numeric ml-2 text-mono-text">{initialItems.length - enabledModuleIds.length}</span>
              </span>
            </div>
            {message ? (
              <p className="rounded-xl border border-mono-border bg-mono-soft px-4 py-3 text-sm text-mono-text">
                {message}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="monolith-card monolith-accent">
          <CardHeader className="space-y-3">
            <div className="monolith-icon-badge">
              <ShieldCheck size={18} />
            </div>
            <CardTitle className="text-mono-accent">Protected Root</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-mono-muted">
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
            <Card key={item.id} className={isEnabled ? "monolith-card monolith-accent" : "monolith-card monolith-accent-warning"}>
              <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="monolith-h3 text-mono-text">{item.label}</h2>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.12em] ${
                        isEnabled
                          ? "border-mono-border bg-mono-soft text-mono-text"
                          : "border-mono-border bg-mono-soft text-mono-muted"
                      }`}
                    >
                      {isEnabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                  <p className="text-sm leading-6 text-mono-muted">{item.description}</p>
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
