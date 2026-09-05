"use client";

import { startTransition, useMemo, useState } from "react";
import {
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type {
  FeatureControlItem,
  ManagedFeatureId,
  ModuleControlItem,
  ToggleableModuleSectionId,
} from "@/modules/core/organisation/module-config";

export function RootModuleControlClient({
  initialFeatureItems,
  initialEnabledFeatureIds,
  initialItems,
  initialEnabledModuleIds,
}: {
  initialFeatureItems: readonly FeatureControlItem[];
  initialEnabledFeatureIds: readonly ManagedFeatureId[];
  initialItems: readonly ModuleControlItem[];
  initialEnabledModuleIds: readonly ToggleableModuleSectionId[];
}) {
  const [enabledModuleIds, setEnabledModuleIds] = useState<
    ToggleableModuleSectionId[]
  >([...initialEnabledModuleIds]);
  const [enabledFeatureIds, setEnabledFeatureIds] = useState<ManagedFeatureId[]>(
    [...initialEnabledFeatureIds],
  );
  const [savingModuleId, setSavingModuleId] =
    useState<ToggleableModuleSectionId | null>(null);
  const [savingFeatureId, setSavingFeatureId] =
    useState<ManagedFeatureId | null>(null);
  const [message, setMessage] = useState<string>("");
  const [messageTone, setMessageTone] = useState<"danger" | "success">(
    "success",
  );
  const enabledSet = useMemo(
    () => new Set(enabledModuleIds),
    [enabledModuleIds],
  );
  const enabledFeatureSet = useMemo(
    () => new Set(enabledFeatureIds),
    [enabledFeatureIds],
  );

  async function save(
    nextEnabled: ToggleableModuleSectionId[],
    nextEnabledFeatures: ManagedFeatureId[],
    moduleId: ToggleableModuleSectionId,
  ) {
    setSavingModuleId(moduleId);
    setMessage("");

    try {
      const response = await fetch("/api/admin/modules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabledModuleIds: nextEnabled,
          enabledFeatureIds: nextEnabledFeatures,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update module visibility.");
      }

      const payload = (await response.json()) as {
        enabledFeatureIds: ManagedFeatureId[];
        enabledModuleIds: ToggleableModuleSectionId[];
      };

      startTransition(() => {
        setEnabledModuleIds(payload.enabledModuleIds);
        setEnabledFeatureIds(payload.enabledFeatureIds);
        setMessageTone("success");
        setMessage("Module visibility updated for all users.");
      });
    } catch (error) {
      setMessageTone("danger");
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to update module visibility.",
      );
    } finally {
      setSavingModuleId(null);
    }
  }

  async function saveFeature(
    nextEnabledFeatures: ManagedFeatureId[],
    featureId: ManagedFeatureId,
  ) {
    setSavingFeatureId(featureId);
    setMessage("");

    try {
      const response = await fetch("/api/admin/modules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabledModuleIds,
          enabledFeatureIds: nextEnabledFeatures,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update feature visibility.");
      }

      const payload = (await response.json()) as {
        enabledFeatureIds: ManagedFeatureId[];
        enabledModuleIds: ToggleableModuleSectionId[];
      };

      startTransition(() => {
        setEnabledModuleIds(payload.enabledModuleIds);
        setEnabledFeatureIds(payload.enabledFeatureIds);
        setMessageTone("success");
        setMessage("Module visibility updated for all users.");
      });
    } catch (error) {
      setMessageTone("danger");
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to update feature visibility.",
      );
    } finally {
      setSavingFeatureId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Policy banner */}
      <div className="mnx-panel flex items-start gap-3 p-4">
        <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-md border border-[color:var(--mnx-border)] bg-[color:var(--mnx-surface-soft)]">
          <ShieldCheck size={16} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--mnx-text-muted)]">
            Access policy
          </p>
          <p className="text-sm font-medium">Protected root control</p>
          <p className="mt-1 text-sm text-[color:var(--mnx-text-muted)]">
            Module availability is global. Core administration stays outside the
            toggle list so organisation recovery is always possible.
          </p>
        </div>
      </div>

      {message ? (
        <div
          role="status"
          className={
            "flex items-center gap-2 rounded-md border p-3 text-sm " +
            (messageTone === "success"
              ? "border-[color:var(--mnx-success)] text-[color:var(--mnx-success)]"
              : "border-[color:var(--mnx-danger)] text-[color:var(--mnx-danger)]")
          }
        >
          {messageTone === "success" ? (
            <CheckCircle2 size={15} />
          ) : (
            <ShieldCheck size={15} />
          )}
          {message}
        </div>
      ) : null}

      {/* Module grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {initialItems.map((item) => {
          const isEnabled = enabledSet.has(item.id);
          const isSaving = savingModuleId === item.id;
          const childFeatures = initialFeatureItems.filter(
            (feature) => feature.parentModuleId === item.id,
          );
          const nextEnabled = isEnabled
            ? enabledModuleIds.filter((value) => value !== item.id)
            : [...enabledModuleIds, item.id];

          return (
            <div
              key={item.id}
              data-module-enabled={isEnabled}
              className="mnx-panel flex flex-col gap-3 p-4 data-[module-enabled=false]:border-[color:var(--mnx-warning)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--mnx-text-muted)]">
                    Operational workspace
                  </p>
                  <h3 className="text-base font-semibold">{item.label}</h3>
                </div>
                <Badge variant={isEnabled ? "success" : "warning"}>
                  {isEnabled ? "Enabled" : "Disabled"}
                </Badge>
              </div>

              {item.description ? (
                <p className="text-sm text-[color:var(--mnx-text-muted)]">
                  {item.description}
                </p>
              ) : null}

              <Button
                className="mt-auto w-full justify-center"
                variant={isEnabled ? "outline" : "default"}
                onClick={() => void save(nextEnabled, enabledFeatureIds, item.id)}
                disabled={isSaving}
              >
                {isEnabled ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
                {isSaving ? "Saving…" : isEnabled ? "Disable" : "Enable"}
              </Button>

              {childFeatures.length > 0 ? (
                <div className="mt-1 space-y-2 border-t border-[color:var(--mnx-border)] pt-3">
                  {childFeatures.map((feature) => {
                    const featureEnabled = enabledFeatureSet.has(feature.id);
                    const featureSaving = savingFeatureId === feature.id;
                    const nextEnabledFeatures = featureEnabled
                      ? enabledFeatureIds.filter((value) => value !== feature.id)
                      : [...enabledFeatureIds, feature.id];

                    return (
                      <div
                        key={feature.id}
                        className="flex items-center justify-between gap-3 rounded-md border border-[color:var(--mnx-border)] bg-[color:var(--mnx-surface-soft)] p-3"
                      >
                        <div className="flex min-w-0 items-start gap-2">
                          <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded border border-[color:var(--mnx-border)]">
                            <Sparkles size={12} />
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{feature.label}</p>
                            <p className="text-xs text-[color:var(--mnx-text-muted)]">
                              {feature.description}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          className="shrink-0 whitespace-nowrap"
                          variant={featureEnabled ? "outline" : "default"}
                          onClick={() =>
                            void saveFeature(nextEnabledFeatures, feature.id)
                          }
                          disabled={featureSaving || !isEnabled}
                        >
                          {featureSaving
                            ? "…"
                            : featureEnabled
                              ? "Disable"
                              : "Enable"}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
