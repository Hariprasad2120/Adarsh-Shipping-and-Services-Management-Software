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
import { WorkspaceAlert, WorkspaceBadge, WorkspacePanel, WorkspacePanelHeader } from "@/components/layout/workspace";
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
    <div className="mnx-root-control-content">
      <WorkspacePanel className="mnx-root-policy-panel">
        <WorkspacePanelHeader
          eyebrow="Access policy"
          title="Protected root control"
          description="Module availability is global. Core administration stays outside the toggle list so organisation recovery remains possible."
          actions={<ShieldCheck />}
        />
        {message ? (
          <WorkspaceAlert variant={messageTone}>
            {messageTone === "success" ? <CheckCircle2 /> : <ShieldCheck />}
            {message}
          </WorkspaceAlert>
        ) : null}
      </WorkspacePanel>

      <div className="mnx-root-module-grid">
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
            <WorkspacePanel
              key={item.id}
              className="mnx-root-module-card"
              data-module-enabled={isEnabled}
            >
              <WorkspacePanelHeader
                eyebrow="Operational workspace"
                title={item.label}
                description={item.description}
                actions={
                  <WorkspaceBadge variant={isEnabled ? "success" : "warning"}>
                    {isEnabled ? "Enabled" : "Disabled"}
                  </WorkspaceBadge>
                }
              />
              <Button
                variant={isEnabled ? "outline" : "default"}
                onClick={() => void save(nextEnabled, enabledFeatureIds, item.id)}
                disabled={isSaving}
              >
                {isEnabled ? <ToggleRight /> : <ToggleLeft />}
                {isSaving ? "Saving" : isEnabled ? "Disable" : "Enable"}
              </Button>
              {childFeatures.length > 0 ? (
                <div className="mnx-root-module-features">
                  {childFeatures.map((feature) => {
                    const featureEnabled = enabledFeatureSet.has(feature.id);
                    const featureSaving = savingFeatureId === feature.id;
                    const nextEnabledFeatures = featureEnabled
                      ? enabledFeatureIds.filter((value) => value !== feature.id)
                      : [...enabledFeatureIds, feature.id];

                    return (
                      <div
                        key={feature.id}
                        className="mnx-root-module-feature"
                        data-feature-enabled={featureEnabled}
                      >
                        <div>
                          <span className="mnx-root-module-feature-icon">
                            <Sparkles size={14} />
                          </span>
                          <div>
                            <b>{feature.label}</b>
                            <small>{feature.description}</small>
                          </div>
                        </div>
                        <Button
                          variant={featureEnabled ? "outline" : "default"}
                          onClick={() => void saveFeature(nextEnabledFeatures, feature.id)}
                          disabled={featureSaving || !isEnabled}
                        >
                          {featureEnabled ? <ToggleRight /> : <ToggleLeft />}
                          {featureSaving
                            ? "Saving"
                            : featureEnabled
                              ? "Disable"
                              : "Enable"}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </WorkspacePanel>
          );
        })}
      </div>
    </div>
  );
}
