"use client";

import { startTransition, useMemo, useState } from "react";
import {
  CheckCircle2,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { WorkspaceAlert, WorkspaceBadge, WorkspacePanel, WorkspacePanelHeader } from "@/components/layout/workspace";
import type {
  ModuleControlItem,
  ToggleableModuleSectionId,
} from "@/modules/core/organisation/module-config";

export function RootModuleControlClient({
  initialItems,
  initialEnabledModuleIds,
}: {
  initialItems: readonly ModuleControlItem[];
  initialEnabledModuleIds: readonly ToggleableModuleSectionId[];
}) {
  const [enabledModuleIds, setEnabledModuleIds] = useState<
    ToggleableModuleSectionId[]
  >([...initialEnabledModuleIds]);
  const [savingModuleId, setSavingModuleId] =
    useState<ToggleableModuleSectionId | null>(null);
  const [message, setMessage] = useState<string>("");
  const [messageTone, setMessageTone] = useState<"danger" | "success">(
    "success",
  );
  const enabledSet = useMemo(
    () => new Set(enabledModuleIds),
    [enabledModuleIds],
  );

  async function save(
    nextEnabled: ToggleableModuleSectionId[],
    moduleId: ToggleableModuleSectionId,
  ) {
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
                onClick={() => void save(nextEnabled, item.id)}
                disabled={isSaving}
              >
                {isEnabled ? <ToggleRight /> : <ToggleLeft />}
                {isSaving ? "Saving" : isEnabled ? "Disable" : "Enable"}
              </Button>
            </WorkspacePanel>
          );
        })}
      </div>
    </div>
  );
}
