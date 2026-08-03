"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { WorkspaceAlert } from "@/components/layout/workspace";
import {
  AdminButton,
  AdminField,
  AdminInput,
} from "@/modules/admin/components/admin-workspace";
import { seedAccountingDemoMonthAction } from "@/modules/accounting/actions";
import type { ReviewerRoleWeights } from "@/modules/ams/settings";
import type { AccountingDemoRunResult } from "@/modules/accounting/demo";

export function SettingsClient({
  initialDays,
  initialWeights,
  canManageAccountingDemo,
}: {
  initialDays: number;
  initialWeights: ReviewerRoleWeights;
  canManageAccountingDemo: boolean;
}) {
  const [days, setDays] = useState(initialDays);
  const [weights, setWeights] = useState<ReviewerRoleWeights>(initialWeights);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoResult, setDemoResult] = useState<AccountingDemoRunResult | null>(
    null,
  );
  const [demoError, setDemoError] = useState<string | null>(null);

  async function patch(body: object) {
    setSaving(true);
    setSaved(false);
    const response = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (response.ok) setSaved(true);
  }

  async function runAccountingDemo() {
    if (
      !confirm(
        "Seed the July 2026 Accounting demo dataset for this organisation? This creates or reuses demo accounting users, counterparties, documents, payments, and journals.",
      )
    ) {
      return;
    }

    setDemoLoading(true);
    setDemoError(null);
    try {
      const response = await seedAccountingDemoMonthAction();
      if (!response.ok) {
        setDemoResult(null);
        setDemoError(response.error);
        return;
      }
      setDemoResult(response.data as AccountingDemoRunResult);
    } finally {
      setDemoLoading(false);
    }
  }

  const roles: (keyof ReviewerRoleWeights)[] = ["HR", "TL", "MANAGER"];

  return (
    <div className="mnx-admin-settings-form">
      <section>
        <AdminField
          htmlFor="days"
          label="Reviewer availability deadline"
          hint="Business days reviewers have to confirm availability after being assigned."
        >
          <div className="mnx-admin-inline-field">
            <AdminInput
              id="days"
              type="number"
              min={0}
              max={30}
              value={days}
              onChange={(event) => setDays(Number(event.target.value))}
            />
            <span>business days</span>
          </div>
        </AdminField>
        <div className="mnx-admin-form-actions">
          <AdminButton
            onClick={() => patch({ availabilityDeadlineDays: days })}
            disabled={saving}
            variant="primary"
          >
            {saving ? "Saving…" : "Save deadline"}
          </AdminButton>
          {saved ? <WorkspaceAlert variant="success">Saved.</WorkspaceAlert> : null}
        </div>
      </section>

      <section>
        <div>
          <h3>Reviewer role weights</h3>
          <p>
            Relative weights for each reviewer role within the 70% reviewer
            pool. Higher numbers have more influence; equal values have equal
            weight.
          </p>
        </div>
        <div className="mnx-admin-weight-grid">
          {roles.map((role) => (
            <AdminField key={role} label={role}>
              <AdminInput
                type="number"
                min={0}
                step={0.1}
                value={weights[role]}
                onChange={(event) =>
                  setWeights((current) => ({
                    ...current,
                    [role]: Number.parseFloat(event.target.value) || 0,
                  }))
                }
              />
            </AdminField>
          ))}
        </div>
        <div className="mnx-admin-form-actions">
          <AdminButton
            onClick={() => patch({ reviewerRoleWeights: weights })}
            disabled={saving}
            variant="primary"
          >
            {saving ? "Saving…" : "Save weights"}
          </AdminButton>
          {saved ? <WorkspaceAlert variant="success">Saved.</WorkspaceAlert> : null}
        </div>
      </section>

      {canManageAccountingDemo ? (
        <section>
          <div>
            <h3>Accounting demo workspace</h3>
            <p>
              Generate a dedicated July 2026 Accounting walkthrough for the
              current organisation. The demo uses separate maker and approver
              users so the seeded journals, invoices, and payments pass the live
              maker-checker posting controls.
            </p>
          </div>
          <div className="mnx-admin-form-actions">
            <AdminButton
              onClick={runAccountingDemo}
              disabled={demoLoading}
              variant="primary"
            >
              {demoLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Sparkles className="h-4 w-4" aria-hidden="true" />
              )}
              {demoLoading ? "Seeding Accounting demo…" : "Seed July 2026 Accounting demo"}
            </AdminButton>
          </div>

          {demoError ? (
            <WorkspaceAlert variant="danger">{demoError}</WorkspaceAlert>
          ) : null}

          {demoResult ? (
            <div className="mnx-admin-simulation">
              <WorkspaceAlert variant="success">
                Accounting demo is ready for {demoResult.organisationName}.
              </WorkspaceAlert>
              <div className="mnx-admin-weight-grid">
                <div>
                  <strong>Month</strong>
                  <p>{demoResult.seededForMonth}</p>
                </div>
                <div>
                  <strong>Maker</strong>
                  <p>{demoResult.demoUsers.makerEmail}</p>
                </div>
                <div>
                  <strong>Approver</strong>
                  <p>{demoResult.demoUsers.approverEmail}</p>
                </div>
              </div>
              <div className="mnx-admin-weight-grid">
                <div>
                  <strong>Posted documents</strong>
                  <p>{demoResult.createdOrReused.postedDocuments}</p>
                </div>
                <div>
                  <strong>Posted payments</strong>
                  <p>{demoResult.createdOrReused.postedPayments}</p>
                </div>
                <div>
                  <strong>Posted journals</strong>
                  <p>{demoResult.createdOrReused.postedManualJournals}</p>
                </div>
              </div>
              <div className="mnx-catalogue-audit-list">
                {demoResult.checks.map((check) => (
                  <article key={check.label}>
                    <strong>{check.label}</strong>
                    <p>{check.detail}</p>
                  </article>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
