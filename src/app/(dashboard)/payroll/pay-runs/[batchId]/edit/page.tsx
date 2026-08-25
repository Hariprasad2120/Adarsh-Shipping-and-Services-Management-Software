import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { getTerminationDraft, type TerminationDraftEntry } from "@/modules/hrms/termination-payroll";
import { TerminationDraftEditClient } from "@/modules/payroll/components/termination-draft-edit-client";

// Phase 34 (Zoho pay-run parity, page 00068): pre-finalize termination Edit
// screen. The dynamic segment is named `batchId` to sit alongside
// ../[batchId]/page.tsx (the posted-batch summary), but before finalize it
// actually addresses a TerminationPayrollDraft row, not a PayrollBatch —
// termination batches don't exist pre-GL-posting in this system (see the
// comment above createTerminationPayrollRun in
// src/modules/hrms/termination-payroll.ts). Once finalized this route 404s
// and the same id resolves at ../[batchId] instead.
export default async function TerminationDraftEditPage({
  params,
}: {
  params: Promise<{ batchId: string }>;
}) {
  const session = await getSession();
  if (!session?.user?.orgId) redirect("/login");
  await requirePermission(session.user.id, "hrms.salary.manage");

  const { batchId: draftId } = await params;
  const draft = await getTerminationDraft(session.user.orgId, draftId);
  if (!draft) notFound();

  if (draft.status !== "DRAFT") {
    redirect(draft.batchId ? `/payroll/pay-runs/${draft.batchId}` : "/payroll/pay-runs");
  }

  return (
    <TerminationDraftEditClient
      draftId={draft.id}
      payDate={draft.payDate ? draft.payDate.toISOString() : null}
      notes={draft.notes}
      entries={draft.entries as unknown as TerminationDraftEntry[]}
    />
  );
}
