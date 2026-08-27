"use client";

import { Loader2, Save } from "lucide-react";
import { useMemo, useState } from "react";
import { WorkspaceAlert } from "@/components/layout/workspace";
import {
  AdminButton,
  AdminField,
  AdminInput,
  AdminPanel,
  AdminPanelHeader,
  AdminSelect,
  AdminTextarea,
} from "@/modules/admin/components/admin-workspace";
import type {
  MonaAdminSnapshot,
  MonaGovernanceSettings,
} from "@/modules/mona/governance";
import type { MonaModel } from "@/modules/mona/components/mona-provider";

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN").format(value);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function WorkPetAdminClient({
  initialSettings,
  models,
  snapshot,
}: {
  initialSettings: MonaGovernanceSettings;
  models: MonaModel[];
  snapshot: MonaAdminSnapshot;
}) {
  const [settings, setSettings] = useState(initialSettings);
  const [pilotUserIdsText, setPilotUserIdsText] = useState(
    initialSettings.pilotUserIds.join("\n"),
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const helpfulRatio = useMemo(() => {
    const totalFeedback =
      snapshot.summary.feedbackHelpful + snapshot.summary.feedbackUnhelpful;
    if (totalFeedback === 0) {
      return "No feedback yet";
    }

    return `${Math.round((snapshot.summary.feedbackHelpful / totalFeedback) * 100)}% helpful`;
  }, [snapshot.summary.feedbackHelpful, snapshot.summary.feedbackUnhelpful]);

  function updateSettings(
    updates: Partial<MonaGovernanceSettings>,
  ) {
    setSaved(false);
    setSettings((current) => ({ ...current, ...updates }));
  }

  async function saveSettings() {
    setSaving(true);
    setSaved(false);
    setError(null);

    const response = await fetch("/api/admin/work-pet", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...settings,
        pilotUserIds: pilotUserIdsText
          .split(/\r?\n|,/)
          .map((value) => value.trim())
          .filter(Boolean),
      } satisfies MonaGovernanceSettings),
    });

    setSaving(false);

    if (!response.ok) {
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      setError(payload?.error ?? "Failed to save Work Pet governance settings.");
      return;
    }

    const payload = await response.json() as { settings?: MonaGovernanceSettings };
    if (payload.settings) {
      setSettings(payload.settings);
      setPilotUserIdsText(payload.settings.pilotUserIds.join("\n"));
    }
    setSaved(true);
  }

  return (
    <div className="space-y-6">
      <AdminPanel>
        <AdminPanelHeader
          eyebrow="Rollout controls"
          title="Availability and operator defaults"
          description="Control whether Mona is disabled, pilot-only, or generally available, and set the shared assistant identity your organisation wants employees to see."
        />
        <div className="mnx-admin-panel-body">
          <div className="mnx-admin-settings-form">
            <section>
              <div className="mnx-admin-weight-grid">
                <AdminField label="Rollout mode">
                  <AdminSelect
                    value={settings.rolloutMode}
                    onChange={(event) =>
                      updateSettings({
                        rolloutMode: event.target.value as MonaGovernanceSettings["rolloutMode"],
                      })
                    }
                  >
                    <option value="DISABLED">Disabled</option>
                    <option value="PILOT">Pilot only</option>
                    <option value="ENABLED">Enabled</option>
                  </AdminSelect>
                </AdminField>
                <AdminField label="Displayed assistant name">
                  <AdminInput
                    value={settings.enabledName}
                    maxLength={32}
                    onChange={(event) =>
                      updateSettings({ enabledName: event.target.value })
                    }
                  />
                </AdminField>
                <AdminField label="Default proactivity">
                  <AdminSelect
                    value={settings.defaultProactivity}
                    onChange={(event) =>
                      updateSettings({
                        defaultProactivity:
                          event.target.value as MonaGovernanceSettings["defaultProactivity"],
                      })
                    }
                  >
                    <option value="silent">Silent</option>
                    <option value="important-only">Important only</option>
                    <option value="balanced">Balanced</option>
                    <option value="proactive">Proactive</option>
                  </AdminSelect>
                </AdminField>
              </div>
            </section>

            <section>
              <div>
                <h3>Pilot allowlist</h3>
                <p>
                  When rollout mode is set to Pilot only, Mona is available to
                  these user IDs plus administrators with organisation-manage
                  access.
                </p>
              </div>
              <AdminField
                label="Pilot user IDs"
                hint="One user ID per line, or separate values with commas."
              >
                <AdminTextarea
                  rows={6}
                  value={pilotUserIdsText}
                  onChange={(event) => {
                    setSaved(false);
                    setPilotUserIdsText(event.target.value);
                  }}
                />
              </AdminField>
            </section>

            <section>
              <div>
                <h3>Model controls</h3>
                <p>
                  Choose the organisation default model and decide whether users
                  can override it in the chat header.
                </p>
              </div>

              <div className="mnx-admin-weight-grid">
                <AdminField label="Default model">
                  <AdminSelect
                    value={settings.defaultModelId}
                    onChange={(event) =>
                      updateSettings({ defaultModelId: event.target.value })
                    }
                  >
                    {models.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name}
                      </option>
                    ))}
                  </AdminSelect>
                </AdminField>

                <AdminField label="User model switching">
                  <label className="flex items-center gap-3 text-sm text-mono-text">
                    <AdminInput
                      type="checkbox"
                      checked={settings.allowUserModelSwitching}
                      onChange={(event) =>
                        updateSettings({
                          allowUserModelSwitching: event.target.checked,
                        })
                      }
                    />
                    Allow employees to change models inside Mona
                  </label>
                </AdminField>
              </div>

              <div className="mnx-admin-record-list">
                {models.map((model) => {
                  const checked = settings.allowedModelIds.includes(model.id);
                  const disableToggle =
                    checked && settings.allowedModelIds.length === 1;

                  return (
                    <article key={model.id} className="mnx-admin-record">
                      <label className="flex items-start gap-3 text-sm text-mono-text">
                        <AdminInput
                          type="checkbox"
                          checked={checked}
                          disabled={disableToggle}
                          onChange={(event) => {
                            const nextModelIds = event.target.checked
                              ? [...settings.allowedModelIds, model.id]
                              : settings.allowedModelIds.filter((value) => value !== model.id);

                            updateSettings({
                              allowedModelIds: nextModelIds,
                              defaultModelId:
                                settings.defaultModelId === model.id && !event.target.checked
                                  ? nextModelIds[0] ?? settings.defaultModelId
                                  : settings.defaultModelId,
                            });
                          }}
                        />
                        <span>
                          <strong>{model.name}</strong>
                          <small>{model.description}</small>
                        </span>
                      </label>
                    </article>
                  );
                })}
              </div>
            </section>

            <div className="mnx-admin-form-actions">
              <AdminButton
                onClick={() => void saveSettings()}
                disabled={saving}
                variant="primary"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Save className="h-4 w-4" aria-hidden="true" />
                )}
                {saving ? "Saving governance…" : "Save Work Pet controls"}
              </AdminButton>
              {saved ? (
                <WorkspaceAlert variant="success">
                  Work Pet governance was updated.
                </WorkspaceAlert>
              ) : null}
              {error ? <WorkspaceAlert variant="danger">{error}</WorkspaceAlert> : null}
            </div>
          </div>
        </div>
      </AdminPanel>

      <AdminPanel>
        <AdminPanelHeader
          eyebrow="Analytics"
          title={`Last ${snapshot.windowDays} days of Mona usage`}
          description="This summary is derived from persisted Mona conversations and audit events, including success, fallback, rate limiting, latency, token volume, and operator feedback."
        />
        <div className="mnx-admin-panel-body">
          <div className="mnx-admin-weight-grid">
            <div>
              <strong>Total responses</strong>
              <p>{formatNumber(snapshot.summary.totalResponses)}</p>
            </div>
            <div>
              <strong>Successful responses</strong>
              <p>{formatNumber(snapshot.summary.successfulResponses)}</p>
            </div>
            <div>
              <strong>Fallbacks + errors</strong>
              <p>
                {formatNumber(snapshot.summary.fallbackResponses + snapshot.summary.errorResponses)}
              </p>
            </div>
            <div>
              <strong>Active users</strong>
              <p>{formatNumber(snapshot.summary.activeUsers)}</p>
            </div>
            <div>
              <strong>Average latency</strong>
              <p>{formatNumber(snapshot.summary.avgLatencyMs)} ms</p>
            </div>
            <div>
              <strong>Total tokens</strong>
              <p>{formatNumber(snapshot.summary.totalTokens)}</p>
            </div>
            <div>
              <strong>Prompt tokens</strong>
              <p>{formatNumber(snapshot.summary.promptTokens)}</p>
            </div>
            <div>
              <strong>Response tokens</strong>
              <p>{formatNumber(snapshot.summary.responseTokens)}</p>
            </div>
            <div>
              <strong>Feedback signal</strong>
              <p>{helpfulRatio}</p>
            </div>
          </div>

          <div className="mnx-admin-split">
            <div>
              <h3>Most-used routes</h3>
              <div className="mnx-admin-record-list">
                {snapshot.routeUsage.length > 0 ? (
                  snapshot.routeUsage.map((route) => (
                    <article key={route.label} className="mnx-admin-record">
                      <strong>{route.label}</strong>
                      <small>
                        {formatNumber(route.totalResponses)} responses,{" "}
                        {formatNumber(route.successfulResponses)} successful,{" "}
                        {formatNumber(route.errorResponses)} degraded
                      </small>
                    </article>
                  ))
                ) : (
                  <WorkspaceAlert variant="info">
                    No Mona route activity has been captured in this window yet.
                  </WorkspaceAlert>
                )}
              </div>
            </div>

            <div>
              <h3>Model mix</h3>
              <div className="mnx-admin-record-list">
                {snapshot.modelUsage.length > 0 ? (
                  snapshot.modelUsage.map((model) => (
                    <article key={model.id} className="mnx-admin-record">
                      <strong>{model.label}</strong>
                      <small>
                        {formatNumber(model.totalResponses)} responses,{" "}
                        {formatNumber(model.totalTokens)} tokens
                      </small>
                    </article>
                  ))
                ) : (
                  <WorkspaceAlert variant="info">
                    Model activity will appear here after Mona serves requests
                    with token telemetry enabled.
                  </WorkspaceAlert>
                )}
              </div>
            </div>
          </div>
        </div>
      </AdminPanel>

      <AdminPanel>
        <AdminPanelHeader
          eyebrow="Feedback review"
          title="Recent user sentiment"
          description={`Review the most recent Mona response feedback captured since ${formatDateTime(snapshot.since)}.`}
        />
        <div className="mnx-admin-panel-body">
          <div className="mnx-admin-record-list">
            {snapshot.feedback.length > 0 ? (
              snapshot.feedback.map((entry) => (
                <article key={`${entry.createdAt}-${entry.userName}`} className="mnx-admin-record">
                  <strong>
                    {entry.feedback === "helpful" ? "Helpful" : "Needs work"} · {entry.userName}
                  </strong>
                  <small>
                    {entry.routePath} · {formatDateTime(entry.createdAt)}
                  </small>
                  <p>{entry.responseExcerpt}</p>
                  {entry.reason ? <small>Reason: {entry.reason}</small> : null}
                </article>
              ))
            ) : (
              <WorkspaceAlert variant="info">
                No user feedback has been submitted yet.
              </WorkspaceAlert>
            )}
          </div>
        </div>
      </AdminPanel>
    </div>
  );
}
