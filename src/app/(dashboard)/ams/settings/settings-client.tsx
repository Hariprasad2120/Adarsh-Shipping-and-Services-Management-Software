"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import {
  PerformanceSection,
  PerformanceSectionHeader,
} from "@/modules/performance/components/performance-workspace";
import { updateAppraisalSettingsAction } from "./actions";
import type { AppraisalSettings } from "@/modules/ams/settings";

const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type State = { ok: true } | { ok: false; error: string } | null;

function NumberField({
  name,
  label,
  hint,
  defaultValue,
  min = 0,
  max = 60,
}: {
  name: string;
  label: string;
  hint?: string;
  defaultValue: number;
  min?: number;
  max?: number;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input
        name={name}
        type="number"
        step="1"
        min={min}
        max={max}
        defaultValue={defaultValue}
        className="mt-1.5"
        required
      />
      {hint && <p className="mt-1 text-xs text-mono-muted">{hint}</p>}
    </div>
  );
}

function ToggleField({
  name,
  label,
  hint,
  defaultChecked,
}: {
  name: string;
  label: string;
  hint: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex items-start gap-3 rounded-xl border border-mono-border bg-mono-card p-3">
      {/* eslint-disable-next-line no-restricted-syntax -- native checkbox; the Input primitive is a text field */}
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-0.5 h-4 w-4 accent-mono-accent"
      />
      <span>
        <span className="block text-sm font-semibold text-mono-text">{label}</span>
        <span className="block text-xs text-mono-muted">{hint}</span>
      </span>
    </label>
  );
}

export function AppraisalSettingsForm({ settings }: { settings: AppraisalSettings }) {
  const [state, action, pending] = useActionState<State, FormData>(
    async (_prev, fd) => updateAppraisalSettingsAction(fd),
    null,
  );

  return (
    <form action={action} className="space-y-6">
      <PerformanceSection>
        <PerformanceSectionHeader
          eyebrow="Workflow timing"
          title="Deadlines and windows"
          description="Business-day windows the appraisal engine uses to advance each stage automatically."
        />
        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
          <NumberField
            name="availabilityDeadlineDays"
            label="Reviewer availability deadline (days)"
            hint="Days reviewers get to confirm availability before self-assessment can open."
            defaultValue={settings.availabilityDeadlineDays}
            max={30}
          />
          <NumberField
            name="selfAssessmentWindowDays"
            label="Self-assessment window (business days)"
            hint="Time the employee gets to submit their self-assessment."
            defaultValue={settings.selfAssessmentWindowDays}
            min={1}
            max={30}
          />
          <NumberField
            name="reviewerRatingWindowDays"
            label="Reviewer rating window (business days)"
            hint="Time reviewers get to submit ratings after the self-assessment window closes."
            defaultValue={settings.reviewerRatingWindowDays}
            min={1}
            max={30}
          />
          <NumberField
            name="dateVotingWindowDays"
            label="Meeting date-voting window (business days)"
            hint="Used only when meeting date-voting is enabled below."
            defaultValue={settings.dateVotingWindowDays}
            min={1}
            max={30}
          />
          <NumberField
            name="arrearBufferDays"
            label="Arrear buffer (calendar days)"
            hint="If the meeting is held more than this many days after self-assessment submission, an arrear is raised."
            defaultValue={settings.arrearBufferDays}
            max={60}
          />
          <div>
            <Label>Weekly digest day</Label>
            <NativeSelect
              name="digestDayOfWeek"
              defaultValue={String(settings.digestDayOfWeek)}
              className="mt-1.5 flex h-11 w-full rounded-xl border border-mono-border bg-mono-card px-4 py-2.5 text-mono-text focus:outline-none focus:ring-2 focus:ring-primary/15"
            >
              {DAY_LABELS.map((day, index) => (
                <option key={day} value={index} className="bg-mono-card">
                  {day}
                </option>
              ))}
            </NativeSelect>
            <p className="mt-1 text-xs text-mono-muted">Day the pending-actions digest email is sent.</p>
          </div>
        </div>
      </PerformanceSection>

      <PerformanceSection>
        <PerformanceSectionHeader
          eyebrow="Scoring"
          title="Reviewer role weights"
          description="Relative weight of each reviewer type when the weighted reviewer score is computed."
        />
        <div className="grid gap-4 p-5 sm:grid-cols-3">
          <NumberField name="weightHR" label="HR weight" defaultValue={settings.reviewerRoleWeights.HR} max={10} />
          <NumberField name="weightTL" label="TL weight" defaultValue={settings.reviewerRoleWeights.TL} max={10} />
          <NumberField
            name="weightManager"
            label="Manager weight"
            defaultValue={settings.reviewerRoleWeights.MANAGER}
            max={10}
          />
        </div>
      </PerformanceSection>

      <PerformanceSection>
        <PerformanceSectionHeader
          eyebrow="Feature toggles"
          title="Optional workflow steps"
          description="Turn optional stages on per organisation. Existing in-flight appraisals are not retro-changed."
        />
        <div className="grid gap-3 p-5 sm:grid-cols-3">
          <ToggleField
            name="enableDateVoting"
            label="Meeting date-voting"
            hint="Reviewers vote on management-proposed meeting dates before HR confirms."
            defaultChecked={settings.enableDateVoting}
          />
          <ToggleField
            name="enableRatingDisagreement"
            label="Rating disagreement step"
            hint="Reviewers confirm rating accuracy and may submit revised scores once the aggregate is visible."
            defaultChecked={settings.enableRatingDisagreement}
          />
          <ToggleField
            name="useRevisedScores"
            label="Use revised scores in final blend"
            hint="When a reviewer submits revised scores, use them instead of the original for the final score."
            defaultChecked={settings.useRevisedScores}
          />
        </div>
      </PerformanceSection>

      <PerformanceSection>
        <PerformanceSectionHeader
          eyebrow="Escalation"
          title="Overdue escalation ladder"
          description="JSON array of steps. Each step: afterDays (days a stage is overdue) and notify (REVIEWER, TL, HR, or ADMIN)."
        />
        <div className="p-5">
          <textarea
            name="escalationLadder"
            rows={6}
            defaultValue={JSON.stringify(settings.escalationLadder, null, 2)}
            className="w-full rounded-xl border border-mono-border bg-mono-card px-4 py-3 font-mono text-xs text-mono-text focus:outline-none focus:ring-2 focus:ring-primary/15"
          />
        </div>
      </PerformanceSection>

      {state && !state.ok && (
        <p className="text-sm font-semibold text-[var(--mnx-danger)]">{state.error}</p>
      )}
      {state && state.ok && (
        <p className="text-sm font-semibold text-[var(--mnx-success)]">Appraisal settings saved.</p>
      )}

      <Button type="submit" disabled={pending} className="h-11">
        {pending ? "Saving…" : "Save settings"}
      </Button>
    </form>
  );
}
