"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/monolith/badge";
import { Button } from "@/components/monolith/button";
import { Textarea } from "@/components/monolith/textarea";
import { respondToPortalQuotationAction } from "@/modules/customer-portal/actions";

type PortalQuotationDecisionPanelProps = {
  quotationId: string;
  status: string;
  rowVersion: number;
  validUntilIso: string;
  currentTimeIso: string;
  acceptedAtIso?: string | null;
  declinedAtIso?: string | null;
  acceptanceComment?: string | null;
  declineReason?: string | null;
};

export function PortalQuotationDecisionPanel({
  quotationId,
  status,
  rowVersion,
  validUntilIso,
  currentTimeIso,
  acceptedAtIso,
  declinedAtIso,
  acceptanceComment,
  declineReason,
}: PortalQuotationDecisionPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeDecision, setActiveDecision] = useState<
    "ACCEPTED" | "DECLINED" | null
  >(null);
  const [acceptanceRemarks, setAcceptanceRemarks] = useState("");
  const [declineRemarks, setDeclineRemarks] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isExpired = useMemo(
    () => new Date(validUntilIso).getTime() < new Date(currentTimeIso).getTime(),
    [currentTimeIso, validUntilIso],
  );
  const canRespond = status === "SENT" && !isExpired;

  const submitDecision = (
    decision: "ACCEPTED" | "DECLINED",
    remarks?: string,
  ) => {
    if (decision === "DECLINED" && !remarks?.trim()) {
      setError("Please share a short reason before declining this quotation.");
      return;
    }

    setError(null);
    setActiveDecision(decision);

    startTransition(async () => {
      const result = await respondToPortalQuotationAction({
        quotationId,
        decision,
        remarks,
        expectedVersion: rowVersion,
      });

      if (!result.ok) {
        setError(result.error);
        setActiveDecision(null);
        return;
      }

      router.refresh();
    });
  };

  return (
    <section className="mnx-portal-panel rounded-xl border border-mono-border/60 bg-mono-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="mnx-portal-eyebrow text-xs tracking-wider">
            Customer decision
          </p>
          <h2 className="mnx-portal-title-3 text-mono-text">
            Respond to this quotation
          </h2>
          <p className="mt-1 text-sm text-mono-muted">
            {canRespond
              ? `This quotation can be accepted or declined until ${formatDateTime(validUntilIso)}.`
              : buildDecisionSummary({
                  status,
                  isExpired,
                  acceptedAtIso,
                  declinedAtIso,
                })}
          </p>
        </div>
        <Badge
          variant={
            status === "DECLINED"
              ? "destructive"
              : status === "ACCEPTED" ||
                  status === "PARTIALLY_CONVERTED" ||
                  status === "CONVERTED"
                ? "success"
                : canRespond
                  ? "warning"
                  : "secondary"
          }
        >
          {status.replaceAll("_", " ")}
        </Badge>
      </div>

      {canRespond ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <h3 className="text-sm font-semibold text-mono-text">
              Accept quotation
            </h3>
            <p className="mt-1 text-xs text-mono-muted">
              Add an optional PO number, approval note, or internal customer
              reference before confirming acceptance.
            </p>
            <Textarea
              value={acceptanceRemarks}
              onChange={(event) => setAcceptanceRemarks(event.target.value)}
              rows={4}
              className="mt-3"
              placeholder="Optional customer reference or note"
              disabled={isPending}
            />
            <div className="mt-3 flex justify-end">
              <Button
                disabled={isPending}
                onClick={() =>
                  submitDecision("ACCEPTED", acceptanceRemarks.trim() || undefined)
                }
              >
                {isPending && activeDecision === "ACCEPTED"
                  ? "Accepting..."
                  : "Accept quotation"}
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
            <h3 className="text-sm font-semibold text-mono-text">
              Decline quotation
            </h3>
            <p className="mt-1 text-xs text-mono-muted">
              Share a short reason so the commercial team can revise and resend
              the quotation if needed.
            </p>
            <Textarea
              value={declineRemarks}
              onChange={(event) => setDeclineRemarks(event.target.value)}
              rows={4}
              className="mt-3"
              placeholder="Reason for declining"
              disabled={isPending}
            />
            <div className="mt-3 flex justify-end">
              <Button
                variant="outline"
                disabled={isPending}
                onClick={() => submitDecision("DECLINED", declineRemarks)}
              >
                {isPending && activeDecision === "DECLINED"
                  ? "Declining..."
                  : "Decline quotation"}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-mono-border/25 bg-mono-soft/30 p-4 text-sm text-mono-muted">
          {status === "ACCEPTED" ||
          status === "PARTIALLY_CONVERTED" ||
          status === "CONVERTED" ? (
            <>
              Accepted {acceptedAtIso ? formatDateTime(acceptedAtIso) : "recently"}.
              {acceptanceComment ? ` Reference: ${acceptanceComment}` : ""}
            </>
          ) : status === "DECLINED" ? (
            <>
              Declined {declinedAtIso ? formatDateTime(declinedAtIso) : "recently"}.
              {declineReason ? ` Reason: ${declineReason}` : ""}
            </>
          ) : isExpired ? (
            <>This quotation has passed its validity date and can no longer be answered from the portal.</>
          ) : (
            <>This quotation is no longer available for a customer portal decision.</>
          )}
        </div>
      )}

      {error ? (
        <div className="mt-3 text-sm text-rose-600">{normalizeDecisionError(error)}</div>
      ) : null}
    </section>
  );
}

function buildDecisionSummary(input: {
  status: string;
  isExpired: boolean;
  acceptedAtIso?: string | null;
  declinedAtIso?: string | null;
}) {
  if (
    input.status === "ACCEPTED" ||
    input.status === "PARTIALLY_CONVERTED" ||
    input.status === "CONVERTED"
  ) {
    return `Accepted${input.acceptedAtIso ? ` on ${formatDateTime(input.acceptedAtIso)}` : ""}.`;
  }
  if (input.status === "DECLINED") {
    return `Declined${input.declinedAtIso ? ` on ${formatDateTime(input.declinedAtIso)}` : ""}.`;
  }
  if (input.isExpired || input.status === "EXPIRED") {
    return "This quotation has expired and is no longer awaiting a customer decision.";
  }
  return "This quotation is not currently awaiting a customer response.";
}

function normalizeDecisionError(error: string) {
  switch (error) {
    case "PORTAL_QUOTATION_ALREADY_ACCEPTED":
      return "This quotation has already been accepted.";
    case "PORTAL_QUOTATION_ALREADY_DECLINED":
      return "This quotation has already been declined.";
    case "PORTAL_QUOTATION_EXPIRED":
      return "This quotation has expired and can no longer be answered.";
    case "PORTAL_QUOTATION_DECISION_UNAVAILABLE":
      return "This quotation is not currently open for a customer decision.";
    case "PORTAL_QUOTATION_NOT_FOUND":
      return "This quotation is no longer available in your portal workspace.";
    case "QUOTATION_ROW_VERSION_CONFLICT":
      return "This quotation changed while you were reviewing it. Refresh and try again.";
    case "QUOTATION_DECLINE_REASON_REQUIRED":
      return "Please add a reason before declining this quotation.";
    case "Unauthorized":
      return "Your portal session has expired. Sign in again and retry.";
    default:
      return error;
  }
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
