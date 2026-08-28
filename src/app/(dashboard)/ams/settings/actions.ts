"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import {
  upsertAppraisalSettings,
  type EscalationStep,
} from "@/modules/ams/settings";

type Result = { ok: true } | { ok: false; error: string };

const notifyTarget = z.enum(["REVIEWER", "TL", "HR", "ADMIN"]);

const schema = z.object({
  availabilityDeadlineDays: z.coerce.number().int().min(0).max(30),
  selfAssessmentWindowDays: z.coerce.number().int().min(1).max(30),
  reviewerRatingWindowDays: z.coerce.number().int().min(1).max(30),
  dateVotingWindowDays: z.coerce.number().int().min(1).max(30),
  arrearBufferDays: z.coerce.number().int().min(0).max(60),
  digestDayOfWeek: z.coerce.number().int().min(0).max(6),
  weightHR: z.coerce.number().min(0).max(10),
  weightTL: z.coerce.number().min(0).max(10),
  weightManager: z.coerce.number().min(0).max(10),
  enableDateVoting: z.coerce.boolean(),
  enableRatingDisagreement: z.coerce.boolean(),
  useRevisedScores: z.coerce.boolean(),
  escalationLadder: z.string().optional(),
});

function parseLadder(raw: string | undefined): EscalationStep[] | undefined {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return undefined;
    const steps = parsed
      .map((entry) => entry as Partial<EscalationStep>)
      .filter(
        (entry): entry is EscalationStep =>
          Number.isFinite(entry.afterDays) &&
          notifyTarget.safeParse(entry.notify).success,
      )
      .map((entry) => ({ afterDays: Math.max(0, Math.round(entry.afterDays)), notify: entry.notify }))
      .sort((a, b) => a.afterDays - b.afterDays);
    return steps;
  } catch {
    return undefined;
  }
}

export async function updateAppraisalSettingsAction(fd: FormData): Promise<Result> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    await requirePermission(session.user.id, "ams.cycle.manage");
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Organisation not resolved" };

    const parsed = schema.safeParse({
      availabilityDeadlineDays: fd.get("availabilityDeadlineDays"),
      selfAssessmentWindowDays: fd.get("selfAssessmentWindowDays"),
      reviewerRatingWindowDays: fd.get("reviewerRatingWindowDays"),
      dateVotingWindowDays: fd.get("dateVotingWindowDays"),
      arrearBufferDays: fd.get("arrearBufferDays"),
      digestDayOfWeek: fd.get("digestDayOfWeek"),
      weightHR: fd.get("weightHR"),
      weightTL: fd.get("weightTL"),
      weightManager: fd.get("weightManager"),
      enableDateVoting: fd.get("enableDateVoting") === "on" || fd.get("enableDateVoting") === "true",
      enableRatingDisagreement:
        fd.get("enableRatingDisagreement") === "on" || fd.get("enableRatingDisagreement") === "true",
      useRevisedScores: fd.get("useRevisedScores") === "on" || fd.get("useRevisedScores") === "true",
      escalationLadder: fd.get("escalationLadder") ?? undefined,
    });

    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }

    const d = parsed.data;
    const ladder = parseLadder(d.escalationLadder);
    if (d.escalationLadder && ladder === undefined) {
      return { ok: false, error: "Escalation ladder must be valid JSON: [{ afterDays, notify }]" };
    }

    await upsertAppraisalSettings(orgId, {
      availabilityDeadlineDays: d.availabilityDeadlineDays,
      selfAssessmentWindowDays: d.selfAssessmentWindowDays,
      reviewerRatingWindowDays: d.reviewerRatingWindowDays,
      dateVotingWindowDays: d.dateVotingWindowDays,
      arrearBufferDays: d.arrearBufferDays,
      digestDayOfWeek: d.digestDayOfWeek,
      enableDateVoting: d.enableDateVoting,
      enableRatingDisagreement: d.enableRatingDisagreement,
      useRevisedScores: d.useRevisedScores,
      reviewerRoleWeights: { HR: d.weightHR, TL: d.weightTL, MANAGER: d.weightManager },
      ...(ladder ? { escalationLadder: ladder } : {}),
    });

    revalidatePath("/ams/settings");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to save settings" };
  }
}
