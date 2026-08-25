"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import {
  saveDesignSystemGovernanceReview,
  type GovernanceCategory,
  type GovernanceStatus,
} from "@/modules/admin/components/design-system-governance";

async function assertAdminAccess() {
  const session = await getSession();
  if (!session) {
    throw new Error("You must be signed in to review design-system findings.");
  }

  const allowed = await can(session.user.id, "admin.org.manage");
  if (!allowed) {
    throw new Error("You do not have permission to review design-system findings.");
  }

  return session.user.email ?? session.user.id;
}

async function saveReview(input: {
  findingId: string;
  status: GovernanceStatus;
  note: string;
  approvedCategory?: GovernanceCategory | null;
  replacementTargetId?: string | null;
  replacementTargetLabel?: string | null;
}) {
  const actor = await assertAdminAccess();
  await saveDesignSystemGovernanceReview({
    actor,
    ...input,
  });
  revalidatePath("/admin/design-system");
  revalidatePath("/admin/design-system/unverified-designs");
}

export async function approveDesignFindingAction(input: {
  findingId: string;
  approvedCategory: GovernanceCategory;
}) {
  await saveReview({
    findingId: input.findingId,
    status: "approved",
    approvedCategory: input.approvedCategory,
    note: `Approved into Design System -> ${input.approvedCategory}.`,
  });
}

export async function markDesignFindingManualReviewAction(input: {
  findingId: string;
}) {
  await saveReview({
    findingId: input.findingId,
    status: "needs_manual_review",
    note: "Marked for manual design review.",
  });
}

export async function replaceDesignFindingAction(input: {
  findingId: string;
  replacementTargetId: string;
  replacementTargetLabel: string;
}) {
  await saveReview({
    findingId: input.findingId,
    status: "replaced",
    replacementTargetId: input.replacementTargetId,
    replacementTargetLabel: input.replacementTargetLabel,
    note: `Mapped to approved alternative ${input.replacementTargetLabel}; source replacement still requires developer review.`,
  });
}
