"use client";

import { Check, Loader2, RotateCcw, ShieldAlert, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { submitJournalEntryAction } from "@/modules/accounting/actions";
import {
  AccountingAction,
  AccountingActionLink,
  AccountingAlert,
  AccountingDialog,
  AccountingField,
  AccountingInput,
  AccountingTextarea,
} from "./accounting-workspace";
import {
  approveOperationalDocumentAction,
  approveOperationalJournalAction,
  approveOperationalPaymentAction,
  moveOperationalOutboxToReviewAction,
  rejectOperationalDocumentAction,
  rejectOperationalJournalAction,
  rejectOperationalPaymentAction,
  retryOperationalOutboxAction,
  reverseOperationalDocumentAction,
  reverseOperationalPaymentAction,
} from "@/modules/accounting/operational-actions";

export function AccountingJournalApprovalAction({
  expectedVersion,
  id,
}: {
  expectedVersion: number;
  id: string;
}) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);

  async function approve() {
    setPending(true);
    const result = await approveOperationalJournalAction(id, expectedVersion);
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      if (result.code === "STALE_STATE") router.refresh();
      return;
    }
    toast.success("Journal approved and posted through the canonical engine.");
    router.push(`/accounting/journal-entries/${result.data?.id}`);
    router.refresh();
  }

  async function reject(event: React.FormEvent) {
    event.preventDefault();
    if (reason.trim().length < 8) {
      toast.error("Enter a reason of at least 8 characters.");
      return;
    }
    setPending(true);
    const result = await rejectOperationalJournalAction(id, expectedVersion, reason);
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      if (result.code === "STALE_STATE") router.refresh();
      return;
    }
    toast.success("Journal rejected and marked as cancelled.");
    setDialogOpen(false);
    setReason("");
    router.refresh();
  }

  return (
    <>
      <div className="mnx-accounting-inline-actions">
        <AccountingAction disabled={pending} onClick={approve}>
          {pending ? (
            <Loader2 aria-hidden="true" className="animate-spin" size={16} />
          ) : (
            <Check aria-hidden="true" size={16} />
          )}
          Approve and post
        </AccountingAction>
        <AccountingAction
          disabled={pending}
          onClick={() => setDialogOpen(true)}
          variant="destructive"
        >
          <X aria-hidden="true" size={16} />
          Reject
        </AccountingAction>
      </div>
      <AccountingDialog
        open={dialogOpen}
        onClose={() => {
          if (!pending) setDialogOpen(false);
        }}
        title="Reject submitted journal"
        description="Rejecting a submitted manual journal cancels that submitted version and preserves the audit trail."
        footer={
          <>
            <AccountingAction
              disabled={pending}
              onClick={() => setDialogOpen(false)}
              type="button"
              variant="secondary"
            >
              Keep submitted journal
            </AccountingAction>
            <AccountingAction
              disabled={pending || reason.trim().length < 8}
              form="accounting-journal-reject"
              type="submit"
              variant="destructive"
            >
              {pending ? (
                <Loader2 aria-hidden="true" className="animate-spin" size={16} />
              ) : null}
              Reject journal
            </AccountingAction>
          </>
        }
      >
        <form
          className="mnx-accounting-form"
          id="accounting-journal-reject"
          onSubmit={reject}
        >
          <AccountingAlert variant="warning">
            <ShieldAlert aria-hidden="true" size={16} /> This rejection is safe
            only for the current submitted version and will fail if another user
            already acted on it.
          </AccountingAlert>
          <AccountingField label="Rejection reason" required>
            <AccountingTextarea
              autoFocus
              maxLength={500}
              minLength={8}
              required
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </AccountingField>
        </form>
      </AccountingDialog>
    </>
  );
}

export function AccountingJournalDraftActions({
  editHref,
  expectedVersion,
  id,
}: {
  editHref: string;
  expectedVersion: number;
  id: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function submit() {
    setPending(true);
    const result = await submitJournalEntryAction(id, expectedVersion);
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      router.refresh();
      return;
    }
    toast.success("Journal submitted for independent approval.");
    router.refresh();
  }

  return (
    <div className="mnx-accounting-inline-actions">
      <AccountingActionLink href={editHref} variant="secondary">
        Edit draft
      </AccountingActionLink>
      <AccountingAction disabled={pending} onClick={submit}>
        {pending ? (
          <Loader2 aria-hidden="true" className="animate-spin" size={16} />
        ) : (
          <Check aria-hidden="true" size={16} />
        )}
        Submit for approval
      </AccountingAction>
    </div>
  );
}

type FinancialActionProps = {
  id: string;
  expectedVersion: number;
  kind: "document" | "payment";
  canApprove?: boolean;
  canReverse?: boolean;
};

export function AccountingFinancialActions({
  canApprove = false,
  canReverse = false,
  expectedVersion,
  id,
  kind,
}: FinancialActionProps) {
  const router = useRouter();
  const [dialog, setDialog] = useState<"reject" | "reverse" | null>(null);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);

  async function approve() {
    setPending(true);
    const result =
      kind === "document"
        ? await approveOperationalDocumentAction(id, expectedVersion)
        : await approveOperationalPaymentAction(id, expectedVersion);
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      if (result.code === "STALE_STATE") router.refresh();
      return;
    }
    toast.success("Approved and posted through the canonical Accounting engine.");
    router.refresh();
  }

  async function submitReasonedAction(event: React.FormEvent) {
    event.preventDefault();
    if (reason.trim().length < 8) {
      toast.error("Enter a reason of at least 8 characters.");
      return;
    }
    setPending(true);
    const result =
      dialog === "reject"
        ? kind === "document"
          ? await rejectOperationalDocumentAction(id, expectedVersion, reason)
          : await rejectOperationalPaymentAction(id, expectedVersion, reason)
        : kind === "document"
          ? await reverseOperationalDocumentAction(id, expectedVersion, reason)
          : await reverseOperationalPaymentAction(id, expectedVersion, reason);
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      if (result.code === "STALE_STATE") router.refresh();
      return;
    }
    toast.success(
      dialog === "reject"
        ? "The prepared record was rejected with an audit reason."
        : "A linked canonical reversal was created.",
    );
    setDialog(null);
    setReason("");
    router.refresh();
  }

  if (!canApprove && !canReverse) return null;

  return (
    <>
      <div className="mnx-accounting-inline-actions">
        {canApprove ? (
          <>
            <AccountingAction disabled={pending} onClick={approve}>
              {pending ? (
                <Loader2 aria-hidden="true" className="animate-spin" size={16} />
              ) : (
                <Check aria-hidden="true" size={16} />
              )}
              Approve and post
            </AccountingAction>
            <AccountingAction
              disabled={pending}
              onClick={() => setDialog("reject")}
              variant="destructive"
            >
              <X aria-hidden="true" size={16} />
              Reject
            </AccountingAction>
          </>
        ) : null}
        {canReverse ? (
          <AccountingAction
            disabled={pending}
            onClick={() => setDialog("reverse")}
            variant="destructive"
          >
            <RotateCcw aria-hidden="true" size={16} />
            Reverse
          </AccountingAction>
        ) : null}
      </div>

      <AccountingDialog
        open={dialog !== null}
        onClose={() => {
          if (!pending) setDialog(null);
        }}
        title={dialog === "reject" ? "Reject prepared record" : "Create reversal"}
        description={
          dialog === "reject"
            ? "Rejection is terminal for this prepared version and is recorded in the audit history."
            : "The posted record stays immutable. Accounting creates an opposite linked journal in the permitted period."
        }
        footer={
          <>
            <AccountingAction
              disabled={pending}
              onClick={() => setDialog(null)}
              type="button"
              variant="secondary"
            >
              Keep current state
            </AccountingAction>
            <AccountingAction
              disabled={pending || reason.trim().length < 8}
              form="accounting-reasoned-action"
              type="submit"
              variant="destructive"
            >
              {pending ? (
                <Loader2 aria-hidden="true" className="animate-spin" size={16} />
              ) : null}
              {dialog === "reject" ? "Reject record" : "Create reversal"}
            </AccountingAction>
          </>
        }
      >
        <form
          className="mnx-accounting-form"
          id="accounting-reasoned-action"
          onSubmit={submitReasonedAction}
        >
          <AccountingAlert variant="warning">
            <ShieldAlert aria-hidden="true" size={16} /> This action uses the
            current row version. If another user has acted, it will fail safely.
          </AccountingAlert>
          <AccountingField
            label={dialog === "reject" ? "Rejection reason" : "Reversal reason"}
            required
          >
            <AccountingTextarea
              autoFocus
              maxLength={500}
              minLength={8}
              required
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </AccountingField>
        </form>
      </AccountingDialog>
    </>
  );
}

export function AccountingOutboxActions({
  canMoveToReview,
  canRetry,
  expectedVersion,
  id,
}: {
  canMoveToReview: boolean;
  canRetry: boolean;
  expectedVersion: number;
  id: string;
}) {
  const router = useRouter();
  const [dialog, setDialog] = useState<"retry" | "review" | null>(null);
  const [reasonCode, setReasonCode] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const code = reasonCode.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_");
    if (!/^[A-Z][A-Z0-9_]{2,63}$/.test(code)) {
      toast.error("Use a stable reason code such as REVIEWED_FOR_RETRY.");
      return;
    }
    setPending(true);
    const result =
      dialog === "retry"
        ? await retryOperationalOutboxAction(id, expectedVersion, code)
        : await moveOperationalOutboxToReviewAction(id, expectedVersion, code);
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      if (result.code === "STALE_STATE") router.refresh();
      return;
    }
    toast.success(
      dialog === "retry"
        ? "The event is eligible for a guarded retry."
        : "The event was moved to manual review.",
    );
    setDialog(null);
    setReasonCode("");
    router.refresh();
  }

  if (!canRetry && !canMoveToReview) return null;
  return (
    <>
      <div className="mnx-accounting-inline-actions">
        {canRetry ? (
          <AccountingAction
            className="mnx-button-compact"
            onClick={() => setDialog("retry")}
            type="button"
          >
            Retry
          </AccountingAction>
        ) : null}
        {canMoveToReview ? (
          <AccountingAction
            className="mnx-button-compact"
            onClick={() => setDialog("review")}
            type="button"
            variant="secondary"
          >
            Review
          </AccountingAction>
        ) : null}
      </div>
      <AccountingDialog
        open={dialog !== null}
        onClose={() => {
          if (!pending) setDialog(null);
        }}
        title={dialog === "retry" ? "Retry outbox event" : "Move to manual review"}
        description="Payloads are immutable. This action records a reason and changes only the canonical operational state."
        footer={
          <>
            <AccountingAction
              disabled={pending}
              onClick={() => setDialog(null)}
              type="button"
              variant="secondary"
            >
              Cancel
            </AccountingAction>
            <AccountingAction
              disabled={pending}
              form="accounting-outbox-action"
              type="submit"
            >
              {pending ? (
                <Loader2 aria-hidden="true" className="animate-spin" size={16} />
              ) : null}
              Confirm
            </AccountingAction>
          </>
        }
      >
        <form
          className="mnx-accounting-form"
          id="accounting-outbox-action"
          onSubmit={submit}
        >
          <AccountingField label="Reason code" required>
            <AccountingInput
              autoFocus
              maxLength={64}
              placeholder="REVIEWED_FOR_RETRY"
              required
              value={reasonCode}
              onChange={(event) => setReasonCode(event.target.value)}
            />
          </AccountingField>
        </form>
      </AccountingDialog>
    </>
  );
}
