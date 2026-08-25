"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  CircleDollarSign,
  Clock3,
  CreditCard,
  Fuel,
  Gauge,
  History,
  Loader2,
  MapPinned,
  RefreshCw,
  Route,
  Settings,
  WalletCards,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import {
  OperationalDataTable,
  OperationalDataTableActions,
  OperationalDataTableFooter,
  OperationalDataTableHeader,
  OperationalDataTableWrap,
  OperationalPrimaryCell,
  OperationalStatus,
  OperationalTable,
  OperationalTableCell,
  OperationalTableEmpty,
  OperationalTableHead,
} from "@/components/data-display/operational-data-table";
import {
  WorkspaceAction,
  WorkspaceAlert,
  WorkspaceBadge,
  WorkspaceField,
  WorkspaceInput,
  WorkspaceMetric,
  WorkspacePanel,
  WorkspacePanelHeader,
  WorkspaceSectionHeading,
  WorkspaceSelect,
  WorkspaceTextarea,
} from "@/components/layout/workspace";
import {
  PeopleErrorState,
  PeopleLoadingState,
  PeoplePerson,
  PeopleSection,
  PeopleSectionHeader,
  PeopleSummary,
  PeopleSummaryGrid,
} from "@/modules/people/components";

type ReimbursementClaim = {
  id: string;
  distanceKm: number;
  ratePerKm: number;
  amount: number;
  status: string;
  createdAt: string;
  approvedAt?: string;
  paidAt?: string;
  rejectedReason?: string;
  notes?: string;
  user: { id: string; name: string; email: string };
  onDutyRequest: {
    id: string;
    fromDate: string;
    toDate: string;
    purpose?: string;
    totalDistanceKm?: number;
  };
};

type ReimbursementPolicy = {
  id?: string;
  ratePerKm: number;
  currency?: string;
  effectiveFrom?: string;
  effectiveTo?: string | null;
  isActive?: boolean;
  createdAt?: string;
};

type ReimbursementView = "overview" | "queue" | "policy";
type ClaimFilter =
  | "all"
  | "PENDING"
  | "APPROVED"
  | "PAID"
  | "REJECTED"
  | "awaiting-payment"
  | "aged";

const AUTO_REFRESH_MS = 60_000;
const AGED_PENDING_DAYS = 3;

function formatCurrency(value: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value?: string | null, options?: Intl.DateTimeFormatOptions) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    ...(options ?? {}),
  }).format(new Date(value));
}

function formatDateTime(value?: string | null) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatDistance(value: number) {
  return `${value.toFixed(value % 1 === 0 ? 0 : 1)} km`;
}

function getClaimPurpose(claim: ReimbursementClaim) {
  return claim.onDutyRequest.purpose?.trim() || "Field movement reimbursement";
}

function getStatusVariant(status: string) {
  switch (status) {
    case "PENDING":
      return "warning" as const;
    case "APPROVED":
      return "accent" as const;
    case "PAID":
      return "success" as const;
    case "REJECTED":
      return "danger" as const;
    default:
      return "neutral" as const;
  }
}

function getStatusTone(status: string) {
  switch (status) {
    case "PENDING":
      return "warning" as const;
    case "APPROVED":
      return "info" as const;
    case "PAID":
      return "success" as const;
    case "REJECTED":
      return "danger" as const;
    default:
      return "neutral" as const;
  }
}

function getClaimAgeDays(createdAt: string) {
  const ageMs = Date.now() - new Date(createdAt).getTime();
  return Math.max(0, Math.floor(ageMs / 86_400_000));
}

function matchesClaimFilter(claim: ReimbursementClaim, filter: ClaimFilter) {
  if (filter === "all") return true;
  if (filter === "awaiting-payment") return claim.status === "APPROVED";
  if (filter === "aged") {
    return claim.status === "PENDING" && getClaimAgeDays(claim.createdAt) >= AGED_PENDING_DAYS;
  }
  return claim.status === filter;
}

function ViewTab({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    // eslint-disable-next-line no-restricted-syntax -- This is a tab control button with explicit tab semantics, not a general action button.
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={`mnx-reimbursement-tab${active ? " is-active" : ""}`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

export function ReimbursementAdminView() {
  const [claims, setClaims] = useState<ReimbursementClaim[]>([]);
  const [currentRate, setCurrentRate] = useState<ReimbursementPolicy | null>(null);
  const [policyHistory, setPolicyHistory] = useState<ReimbursementPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeView, setActiveView] = useState<ReimbursementView>("overview");
  const [claimFilter, setClaimFilter] = useState<ClaimFilter>("all");
  const [query, setQuery] = useState("");
  const [selectedClaimId, setSelectedClaimId] = useState<string>("");
  const [showRateModal, setShowRateModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [newRate, setNewRate] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [claimPendingRejection, setClaimPendingRejection] =
    useState<ReimbursementClaim | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const [claimsRes, rateRes, historyRes] = await Promise.all([
        fetch("/api/hrms/reimbursement"),
        fetch("/api/hrms/reimbursement?type=rate"),
        fetch("/api/hrms/reimbursement?type=history"),
      ]);

      const [claimsJson, rateJson, historyJson] = await Promise.all([
        claimsRes.json(),
        rateRes.json(),
        historyRes.json(),
      ]);

      if (!claimsJson.ok) {
        throw new Error(claimsJson.error || "Failed to load reimbursement claims");
      }

      if (!rateJson.ok) {
        throw new Error(rateJson.error || "Failed to load reimbursement policy");
      }

      if (!historyJson.ok) {
        throw new Error(historyJson.error || "Failed to load reimbursement history");
      }

      const nextClaims = claimsJson.data as ReimbursementClaim[];
      const nextRate = rateJson.data as ReimbursementPolicy;
      const nextHistory = historyJson.data as ReimbursementPolicy[];

      setClaims(nextClaims);
      setCurrentRate(nextRate);
      setPolicyHistory(nextHistory);
      setSelectedClaimId((current) => {
        if (current && nextClaims.some((claim) => claim.id === current)) {
          return current;
        }
        return nextClaims[0]?.id ?? "";
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to load reimbursement workspace";
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(fetchData, 0);
    const interval = window.setInterval(fetchData, AUTO_REFRESH_MS);

    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, [fetchData]);

  const filteredClaims = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return claims.filter((claim) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        claim.user.name.toLowerCase().includes(normalizedQuery) ||
        claim.user.email.toLowerCase().includes(normalizedQuery) ||
        getClaimPurpose(claim).toLowerCase().includes(normalizedQuery) ||
        claim.onDutyRequest.id.toLowerCase().includes(normalizedQuery);

      return matchesQuery && matchesClaimFilter(claim, claimFilter);
    });
  }, [claimFilter, claims, query]);

  const selectedClaim =
    filteredClaims.find((claim) => claim.id === selectedClaimId) ||
    claims.find((claim) => claim.id === selectedClaimId) ||
    null;

  const pendingClaims = claims.filter((claim) => claim.status === "PENDING");
  const approvedClaims = claims.filter((claim) => claim.status === "APPROVED");
  const paidClaims = claims.filter((claim) => claim.status === "PAID");
  const rejectedClaims = claims.filter((claim) => claim.status === "REJECTED");
  const agedPendingClaims = pendingClaims.filter(
    (claim) => getClaimAgeDays(claim.createdAt) >= AGED_PENDING_DAYS,
  );
  const distanceTotal = claims.reduce((sum, claim) => sum + claim.distanceKm, 0);
  const pendingAmount = pendingClaims.reduce((sum, claim) => sum + claim.amount, 0);
  const approvedAmount = approvedClaims.reduce((sum, claim) => sum + claim.amount, 0);
  const paidAmount = paidClaims.reduce((sum, claim) => sum + claim.amount, 0);
  const rejectionWithoutReason = rejectedClaims.filter(
    (claim) => !claim.rejectedReason?.trim(),
  ).length;
  const distinctRates = Array.from(
    new Set(claims.map((claim) => claim.ratePerKm.toFixed(2))),
  ).length;
  const currentCurrency = currentRate?.currency || policyHistory[0]?.currency || "INR";
  const averageDistance =
    claims.length > 0 ? distanceTotal / claims.length : 0;
  const averageClaimValue =
    claims.length > 0
      ? claims.reduce((sum, claim) => sum + claim.amount, 0) / claims.length
      : 0;
  const syntheticCurrentPolicy =
    policyHistory.length === 0 && currentRate
      ? [
          {
            ...currentRate,
            isActive: true,
          },
        ]
      : [];
  const visiblePolicyHistory = policyHistory.length > 0 ? policyHistory : syntheticCurrentPolicy;

  const queueAlertVariant =
    agedPendingClaims.length > 0 || rejectionWithoutReason > 0 ? "warning" : "success";

  const handleAction = async (
    claimId: string,
    action: "approve" | "reject" | "pay",
    reason?: string,
  ) => {
    setSubmitting(true);
    try {
      const response = await fetch("/api/hrms/reimbursement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, claimId, reason }),
      });
      const json = await response.json();
      if (!json.ok) {
        throw new Error(json.error || "Action failed");
      }

      toast.success(
        action === "approve"
          ? "Claim approved."
          : action === "pay"
            ? "Claim marked as paid."
            : "Claim rejected.",
      );

      if (action === "reject") {
        setRejectReason("");
        setShowRejectModal(false);
        setClaimPendingRejection(null);
      }

      await fetchData();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Action failed";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateRate = async () => {
    const rate = Number.parseFloat(newRate);
    if (Number.isNaN(rate) || rate <= 0) {
      toast.error("Enter a valid reimbursement rate.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/hrms/reimbursement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_rate", ratePerKm: rate }),
      });
      const json = await response.json();
      if (!json.ok) {
        throw new Error(json.error || "Failed to update reimbursement rate");
      }

      toast.success("Fuel reimbursement policy updated.");
      setNewRate("");
      setShowRateModal(false);
      await fetchData();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update reimbursement rate";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && claims.length === 0 && !currentRate) {
    return (
      <PeopleLoadingState description="Loading reimbursement claims, payout posture, and active mileage policy." />
    );
  }

  if (errorMessage && claims.length === 0 && !currentRate) {
    return <PeopleErrorState description={errorMessage} onRetry={fetchData} />;
  }

  return (
    <div className="mnx-reimbursement-workspace">
      <section className="mnx-workspace-metrics" aria-label="Reimbursement metrics">
        <WorkspaceMetric
          icon={<Clock3 aria-hidden="true" />}
          label="Pending review"
          value={pendingClaims.length}
          detail={`${formatCurrency(pendingAmount, currentCurrency)} waiting for approval`}
        />
        <WorkspaceMetric
          icon={<WalletCards aria-hidden="true" />}
          label="Awaiting payout"
          value={approvedClaims.length}
          detail={`${formatCurrency(approvedAmount, currentCurrency)} approved but unpaid`}
        />
        <WorkspaceMetric
          icon={<CircleDollarSign aria-hidden="true" />}
          label="Paid this ledger"
          value={paidClaims.length}
          detail={`${formatCurrency(paidAmount, currentCurrency)} already disbursed`}
        />
        <WorkspaceMetric
          icon={<Route aria-hidden="true" />}
          label="Tracked distance"
          value={formatDistance(distanceTotal)}
          detail={`Average ${formatDistance(averageDistance)} per claim`}
        />
        <WorkspaceMetric
          icon={<Settings aria-hidden="true" />}
          label="Active rate"
          value={currentRate ? formatCurrency(currentRate.ratePerKm, currentCurrency) : "—"}
          detail={`${visiblePolicyHistory.length} policy version${visiblePolicyHistory.length === 1 ? "" : "s"} on record`}
        />
      </section>

      <PeopleSummaryGrid>
        <PeopleSummary
          icon={<Fuel aria-hidden="true" />}
          label="Claims processed"
          value={claims.length}
          detail={`${rejectedClaims.length} rejected, ${paidClaims.length} paid`}
        />
        <PeopleSummary
          icon={<Gauge aria-hidden="true" />}
          label="Aged pending queue"
          value={agedPendingClaims.length}
          detail={`Claims waiting ${AGED_PENDING_DAYS}+ days for a decision`}
        />
        <PeopleSummary
          icon={<History aria-hidden="true" />}
          label="Rate variations used"
          value={distinctRates}
          detail={
            distinctRates > 1
              ? "Historic claims exist under more than one mileage policy."
              : "All visible claims use the same mileage policy."
          }
        />
        <PeopleSummary
          icon={<CreditCard aria-hidden="true" />}
          label="Average claim value"
          value={formatCurrency(averageClaimValue, currentCurrency)}
          detail="Useful for spotting exceptions and policy drift"
        />
      </PeopleSummaryGrid>

      <PeopleSection className="mnx-reimbursement-command">
        <div className="mnx-reimbursement-command-grid">
          <div className="mnx-reimbursement-command-copy">
            <WorkspaceSectionHeading
              index="01"
              title="Fuel reimbursement control centre"
              description="Frame mileage claims like a mature ERP desk: capture tracked trip evidence, review policy-calculated claims, isolate aged exceptions, and release approved payouts from one connected workspace."
              className="mnx-reimbursement-heading"
              actions={
                <div className="mnx-reimbursement-heading-actions">
                  <WorkspaceAction
                    variant="outline"
                    size="compact"
                    onClick={fetchData}
                    disabled={loading}
                  >
                    <RefreshCw className="size-4" aria-hidden="true" />
                    Refresh
                  </WorkspaceAction>
                  <WorkspaceAction
                    variant="outline"
                    size="compact"
                    onClick={() => setShowRateModal(true)}
                  >
                    <Settings className="size-4" aria-hidden="true" />
                    Update rate
                  </WorkspaceAction>
                </div>
              }
            />

            <div className="mnx-reimbursement-signal-grid">
              <article className="mnx-reimbursement-signal-card">
                <p>Policy-led calculation</p>
                <strong>
                  {currentRate
                    ? `${formatCurrency(currentRate.ratePerKm, currentCurrency)}/km`
                    : "Waiting for policy"}
                </strong>
                <span>Claims inherit the active rate snapshot at submission time.</span>
              </article>
              <article className="mnx-reimbursement-signal-card">
                <p>Approval pressure</p>
                <strong>{agedPendingClaims.length}</strong>
                <span>
                  {agedPendingClaims.length > 0
                    ? "Older pending claims should be reviewed before the next payout cycle."
                    : "No delayed approvals are currently blocking payout readiness."}
                </span>
              </article>
              <article className="mnx-reimbursement-signal-card">
                <p>Payout readiness</p>
                <strong>{formatCurrency(approvedAmount, currentCurrency)}</strong>
                <span>
                  {approvedClaims.length} claim{approvedClaims.length === 1 ? "" : "s"} are ready to move into payment confirmation.
                </span>
              </article>
            </div>
          </div>

          <div className="mnx-reimbursement-policy-strip">
            <WorkspaceBadge variant="accent">GPS-backed distance</WorkspaceBadge>
            <WorkspaceBadge
              variant={agedPendingClaims.length > 0 ? "warning" : "success"}
            >
              {agedPendingClaims.length > 0
                ? `${agedPendingClaims.length} aged approvals`
                : "Approval queue healthy"}
            </WorkspaceBadge>
            <WorkspaceBadge
              variant={approvedClaims.length > 0 ? "accent" : "neutral"}
            >
              {approvedClaims.length > 0
                ? `${approvedClaims.length} ready for payout`
                : "No payout batch pending"}
            </WorkspaceBadge>
            <WorkspaceBadge
              variant={rejectionWithoutReason > 0 ? "warning" : "neutral"}
            >
              {rejectionWithoutReason > 0
                ? `${rejectionWithoutReason} rejected without reason`
                : "Decision notes aligned"}
            </WorkspaceBadge>
          </div>
        </div>

        <WorkspaceAlert variant={queueAlertVariant}>
          {agedPendingClaims.length > 0 || rejectionWithoutReason > 0
            ? `Queue discipline needs attention: ${agedPendingClaims.length} claim${agedPendingClaims.length === 1 ? "" : "s"} have been pending for ${AGED_PENDING_DAYS}+ days, and ${rejectionWithoutReason} rejected claim${rejectionWithoutReason === 1 ? "" : "s"} do not carry a reason.`
            : "The reimbursement desk is operating cleanly. Claims are moving through approval and payout without visible governance gaps."}
        </WorkspaceAlert>

        <div className="mnx-reimbursement-tabs" role="tablist" aria-label="Reimbursement views">
          <ViewTab
            active={activeView === "overview"}
            label="Overview"
            onClick={() => setActiveView("overview")}
          />
          <ViewTab
            active={activeView === "queue"}
            label="Review queue"
            onClick={() => setActiveView("queue")}
          />
          <ViewTab
            active={activeView === "policy"}
            label="Policy & payout"
            onClick={() => setActiveView("policy")}
          />
        </div>
      </PeopleSection>

      {activeView === "overview" ? (
        <div className="mnx-reimbursement-shell">
          <div className="mnx-reimbursement-primary">
            <PeopleSection>
              <PeopleSectionHeader
                eyebrow="Operations"
                title="Reimbursement command board"
                description="Separate review, release, and exception work so finance and HR can clear the queue faster."
              />

              <div className="mnx-reimbursement-board">
                <article className="mnx-reimbursement-board-card">
                  <div className="mnx-reimbursement-board-top">
                    <div>
                      <strong>Pending approvals</strong>
                      <p>Manager or admin decisions needed</p>
                    </div>
                    <WorkspaceBadge variant="warning">
                      {pendingClaims.length} open
                    </WorkspaceBadge>
                  </div>
                  <p className="mnx-reimbursement-board-value">
                    {formatCurrency(pendingAmount, currentCurrency)}
                  </p>
                  <span>
                    {agedPendingClaims.length > 0
                      ? `${agedPendingClaims.length} claim${agedPendingClaims.length === 1 ? "" : "s"} are outside the preferred decision window.`
                      : "No pending claim is currently aging beyond the preferred window."}
                  </span>
                </article>

                <article className="mnx-reimbursement-board-card">
                  <div className="mnx-reimbursement-board-top">
                    <div>
                      <strong>Approved for payout</strong>
                      <p>Finance can close these next</p>
                    </div>
                    <WorkspaceBadge variant="accent">
                      {approvedClaims.length} ready
                    </WorkspaceBadge>
                  </div>
                  <p className="mnx-reimbursement-board-value">
                    {formatCurrency(approvedAmount, currentCurrency)}
                  </p>
                  <span>
                    Move approved claims to paid status once reimbursement has been released.
                  </span>
                </article>

                <article className="mnx-reimbursement-board-card">
                  <div className="mnx-reimbursement-board-top">
                    <div>
                      <strong>Rejected or policy exceptions</strong>
                      <p>Needs communication hygiene</p>
                    </div>
                    <WorkspaceBadge
                      variant={rejectedClaims.length > 0 ? "danger" : "neutral"}
                    >
                      {rejectedClaims.length} rejected
                    </WorkspaceBadge>
                  </div>
                  <p className="mnx-reimbursement-board-value">
                    {rejectionWithoutReason}
                  </p>
                  <span>
                    Rejections should explain what the claimant must fix before resubmission.
                  </span>
                </article>
              </div>
            </PeopleSection>

            <PeopleSection>
              <PeopleSectionHeader
                eyebrow="Selected claim"
                title="Review detail and decision timeline"
                description="Use one claim-focused workbench to validate trip purpose, rate snapshot, approval stage, and payment readiness."
              />

              {selectedClaim ? (
                <div className="mnx-reimbursement-detail">
                  <div className="mnx-reimbursement-detail-top">
                    <PeoplePerson
                      name={selectedClaim.user.name}
                      secondary={`${selectedClaim.user.email} • ${getClaimPurpose(selectedClaim)}`}
                    />
                    <WorkspaceBadge variant={getStatusVariant(selectedClaim.status)}>
                      {selectedClaim.status}
                    </WorkspaceBadge>
                  </div>

                  <div className="mnx-reimbursement-detail-grid">
                    <div>
                      <span>Distance</span>
                      <strong>{formatDistance(selectedClaim.distanceKm)}</strong>
                    </div>
                    <div>
                      <span>Rate snapshot</span>
                      <strong>
                        {formatCurrency(selectedClaim.ratePerKm, currentCurrency)}/km
                      </strong>
                    </div>
                    <div>
                      <span>Claim amount</span>
                      <strong>{formatCurrency(selectedClaim.amount, currentCurrency)}</strong>
                    </div>
                    <div>
                      <span>Trip window</span>
                      <strong>
                        {formatDate(selectedClaim.onDutyRequest.fromDate)} to{" "}
                        {formatDate(selectedClaim.onDutyRequest.toDate)}
                      </strong>
                    </div>
                  </div>

                  <div className="mnx-reimbursement-timeline">
                    <div className="mnx-reimbursement-timeline-item">
                      <span>01</span>
                      <div>
                        <strong>Submitted</strong>
                        <p>{formatDateTime(selectedClaim.createdAt)}</p>
                      </div>
                    </div>
                    <div className="mnx-reimbursement-timeline-item">
                      <span>02</span>
                      <div>
                        <strong>Approved</strong>
                        <p>{formatDateTime(selectedClaim.approvedAt)}</p>
                      </div>
                    </div>
                    <div className="mnx-reimbursement-timeline-item">
                      <span>03</span>
                      <div>
                        <strong>Paid</strong>
                        <p>{formatDateTime(selectedClaim.paidAt)}</p>
                      </div>
                    </div>
                  </div>

                  {selectedClaim.rejectedReason ? (
                    <WorkspaceAlert variant="warning">
                      Rejection reason: {selectedClaim.rejectedReason}
                    </WorkspaceAlert>
                  ) : null}

                  <div className="mnx-reimbursement-detail-actions">
                    {selectedClaim.status === "PENDING" ? (
                      <>
                        <WorkspaceAction
                          onClick={() => handleAction(selectedClaim.id, "approve")}
                          disabled={submitting}
                        >
                          <Check className="size-4" aria-hidden="true" />
                          Approve claim
                        </WorkspaceAction>
                        <WorkspaceAction
                          variant="outline"
                          onClick={() => {
                            setClaimPendingRejection(selectedClaim);
                            setRejectReason(selectedClaim.rejectedReason || "");
                            setShowRejectModal(true);
                          }}
                          disabled={submitting}
                        >
                          <X className="size-4" aria-hidden="true" />
                          Reject with note
                        </WorkspaceAction>
                      </>
                    ) : null}
                    {selectedClaim.status === "APPROVED" ? (
                      <WorkspaceAction
                        onClick={() => handleAction(selectedClaim.id, "pay")}
                        disabled={submitting}
                      >
                        <CircleDollarSign className="size-4" aria-hidden="true" />
                        Mark payout complete
                      </WorkspaceAction>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="mnx-reimbursement-empty">
                  <MapPinned aria-hidden="true" />
                  <div>
                    <strong>No claim selected</strong>
                    <p>Choose a claim from the queue to review its timeline and take action.</p>
                  </div>
                </div>
              )}
            </PeopleSection>
          </div>

          <aside className="mnx-reimbursement-aside">
            <WorkspacePanel className="mnx-reimbursement-side-panel">
              <WorkspacePanelHeader
                eyebrow="Policy"
                title="Current mileage policy"
                description="The active rate is snapped into each claim when it is created."
              />
              <div className="mnx-reimbursement-policy-card">
                <strong>
                  {currentRate
                    ? `${formatCurrency(currentRate.ratePerKm, currentCurrency)}/km`
                    : "Policy not configured"}
                </strong>
                <p>
                  Effective {formatDate(currentRate?.effectiveFrom || currentRate?.createdAt)}
                </p>
                <span>
                  Advanced ERP reimbursement teams usually keep clear rate history so payout audits can explain why older trips use different values.
                </span>
              </div>
            </WorkspacePanel>

            <WorkspacePanel className="mnx-reimbursement-side-panel">
              <WorkspacePanelHeader
                eyebrow="Governance"
                title="What this workspace now controls"
                description="Operational framing inspired by current mileage and expense workflows in tools like Zoho Expense."
              />
              <div className="mnx-reimbursement-watch-list">
                <div className="mnx-reimbursement-watch-item">
                  <span>01</span>
                  <p>Policy-calculated claims based on tracked on-duty distance and a stored per-kilometer rate.</p>
                </div>
                <div className="mnx-reimbursement-watch-item">
                  <span>02</span>
                  <p>Approval queue separation between pending review, approved-for-payout, rejected, and fully paid claims.</p>
                </div>
                <div className="mnx-reimbursement-watch-item">
                  <span>03</span>
                  <p>History-aware policy governance so finance can explain payout differences across older and newer trips.</p>
                </div>
              </div>
            </WorkspacePanel>
          </aside>
        </div>
      ) : null}

      {activeView === "queue" ? (
        <div className="mnx-reimbursement-shell">
          <div className="mnx-reimbursement-primary">
            <OperationalDataTable>
              <OperationalDataTableHeader
                eyebrow="Review queue"
                title="Claims workbench"
                actions={
                  <OperationalDataTableActions>
                    <WorkspaceAction
                      variant="outline"
                      size="compact"
                      onClick={fetchData}
                      disabled={loading}
                    >
                      <RefreshCw className="size-4" aria-hidden="true" />
                      Refresh feed
                    </WorkspaceAction>
                  </OperationalDataTableActions>
                }
              >
                <p>
                  Search claims, isolate payout-ready items, and keep older pending requests from getting buried.
                </p>
              </OperationalDataTableHeader>

              <div className="mnx-reimbursement-toolbar">
                <WorkspaceField
                  className="mnx-reimbursement-toolbar-search"
                  label="Search claim"
                >
                  <WorkspaceInput
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Employee, email, purpose, or trip id"
                  />
                </WorkspaceField>
                <WorkspaceField
                  className="mnx-reimbursement-toolbar-filter"
                  label="Queue focus"
                >
                  <WorkspaceSelect
                    value={claimFilter}
                    onChange={(event) =>
                      setClaimFilter(event.target.value as ClaimFilter)
                    }
                  >
                    <option value="all">All claims</option>
                    <option value="PENDING">Pending approval</option>
                    <option value="awaiting-payment">Approved for payout</option>
                    <option value="PAID">Paid claims</option>
                    <option value="REJECTED">Rejected claims</option>
                    <option value="aged">Aged pending claims</option>
                  </WorkspaceSelect>
                </WorkspaceField>
              </div>

              <OperationalDataTableWrap>
                <OperationalTable>
                  <thead>
                    <tr>
                      <OperationalTableHead>Employee</OperationalTableHead>
                      <OperationalTableHead>Trip and claim</OperationalTableHead>
                      <OperationalTableHead>Distance</OperationalTableHead>
                      <OperationalTableHead>Rate</OperationalTableHead>
                      <OperationalTableHead>Amount</OperationalTableHead>
                      <OperationalTableHead>Status</OperationalTableHead>
                      <OperationalTableHead>Actions</OperationalTableHead>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClaims.length === 0 ? (
                      <OperationalTableEmpty colSpan={7}>
                        No reimbursement claims match the current queue filter.
                      </OperationalTableEmpty>
                    ) : (
                      filteredClaims.map((claim) => (
                        <tr
                          key={claim.id}
                          className={
                            claim.id === selectedClaimId
                              ? "mnx-reimbursement-queue-row is-selected"
                              : "mnx-reimbursement-queue-row"
                          }
                        >
                          <OperationalPrimaryCell
                            primary={claim.user.name}
                            secondary={claim.user.email}
                          />
                          <OperationalTableCell>
                            <div className="mnx-reimbursement-table-copy">
                              <strong>{getClaimPurpose(claim)}</strong>
                              <small>
                                {formatDate(claim.onDutyRequest.fromDate)} to{" "}
                                {formatDate(claim.onDutyRequest.toDate)} • Filed{" "}
                                {getClaimAgeDays(claim.createdAt)} day
                                {getClaimAgeDays(claim.createdAt) === 1 ? "" : "s"} ago
                              </small>
                            </div>
                          </OperationalTableCell>
                          <OperationalTableCell>
                            {formatDistance(claim.distanceKm)}
                          </OperationalTableCell>
                          <OperationalTableCell>
                            {formatCurrency(claim.ratePerKm, currentCurrency)}/km
                          </OperationalTableCell>
                          <OperationalTableCell>
                            {formatCurrency(claim.amount, currentCurrency)}
                          </OperationalTableCell>
                          <OperationalTableCell>
                            <OperationalStatus tone={getStatusTone(claim.status)}>
                              {claim.status}
                            </OperationalStatus>
                          </OperationalTableCell>
                          <OperationalTableCell>
                            <div className="mnx-reimbursement-table-actions">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedClaimId(claim.id)}
                              >
                                Review
                              </Button>
                              {claim.status === "PENDING" ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => handleAction(claim.id, "approve")}
                                  disabled={submitting}
                                >
                                  Approve
                                </Button>
                              ) : null}
                            </div>
                          </OperationalTableCell>
                        </tr>
                      ))
                    )}
                  </tbody>
                </OperationalTable>
              </OperationalDataTableWrap>

              <OperationalDataTableFooter
                summary={`${filteredClaims.length} of ${claims.length} claim${claims.length === 1 ? "" : "s"} visible`}
              />
            </OperationalDataTable>
          </div>

          <aside className="mnx-reimbursement-aside">
            <WorkspacePanel className="mnx-reimbursement-side-panel">
              <WorkspacePanelHeader
                eyebrow="Selected queue item"
                title={selectedClaim ? getClaimPurpose(selectedClaim) : "No claim selected"}
                description={
                  selectedClaim
                    ? `${selectedClaim.user.name} • ${formatDate(selectedClaim.createdAt)}`
                    : "Select a claim to inspect its route and decision context."
                }
              />

              {selectedClaim ? (
                <div className="mnx-reimbursement-side-claim">
                  <div className="mnx-reimbursement-side-facts">
                    <div>
                      <span>Distance</span>
                      <strong>{formatDistance(selectedClaim.distanceKm)}</strong>
                    </div>
                    <div>
                      <span>Amount</span>
                      <strong>{formatCurrency(selectedClaim.amount, currentCurrency)}</strong>
                    </div>
                    <div>
                      <span>Status</span>
                      <strong>{selectedClaim.status}</strong>
                    </div>
                    <div>
                      <span>Approved</span>
                      <strong>{formatDateTime(selectedClaim.approvedAt)}</strong>
                    </div>
                  </div>

                  {selectedClaim.rejectedReason ? (
                    <WorkspaceAlert variant="warning">
                      {selectedClaim.rejectedReason}
                    </WorkspaceAlert>
                  ) : null}

                  <div className="mnx-reimbursement-side-actions">
                    {selectedClaim.status === "PENDING" ? (
                      <>
                        <WorkspaceAction
                          onClick={() => handleAction(selectedClaim.id, "approve")}
                          disabled={submitting}
                        >
                          <Check className="size-4" aria-hidden="true" />
                          Approve
                        </WorkspaceAction>
                        <WorkspaceAction
                          variant="outline"
                          onClick={() => {
                            setClaimPendingRejection(selectedClaim);
                            setRejectReason(selectedClaim.rejectedReason || "");
                            setShowRejectModal(true);
                          }}
                          disabled={submitting}
                        >
                          <X className="size-4" aria-hidden="true" />
                          Reject
                        </WorkspaceAction>
                      </>
                    ) : null}
                    {selectedClaim.status === "APPROVED" ? (
                      <WorkspaceAction
                        onClick={() => handleAction(selectedClaim.id, "pay")}
                        disabled={submitting}
                      >
                        <CircleDollarSign className="size-4" aria-hidden="true" />
                        Mark paid
                      </WorkspaceAction>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="mnx-reimbursement-empty">
                  <AlertTriangle aria-hidden="true" />
                  <div>
                    <strong>Nothing selected</strong>
                    <p>Pick a claim from the queue to take action.</p>
                  </div>
                </div>
              )}
            </WorkspacePanel>
          </aside>
        </div>
      ) : null}

      {activeView === "policy" ? (
        <div className="mnx-reimbursement-shell">
          <div className="mnx-reimbursement-primary">
            <PeopleSection>
              <PeopleSectionHeader
                eyebrow="Policy governance"
                title="Mileage policy and payout framing"
                description="Current ERP expense tools usually separate policy setup from queue handling so rate changes stay auditable."
                actions={
                  <WorkspaceAction
                    variant="outline"
                    size="compact"
                    onClick={() => setShowRateModal(true)}
                  >
                    <Settings className="size-4" aria-hidden="true" />
                    Change active rate
                  </WorkspaceAction>
                }
              />

              <div className="mnx-reimbursement-policy-grid">
                <article className="mnx-reimbursement-policy-card">
                  <p>Active mileage rate</p>
                  <strong>
                    {currentRate
                      ? `${formatCurrency(currentRate.ratePerKm, currentCurrency)}/km`
                      : "Not configured"}
                  </strong>
                  <span>
                    Effective {formatDate(currentRate?.effectiveFrom || currentRate?.createdAt)}
                  </span>
                </article>
                <article className="mnx-reimbursement-policy-card">
                  <p>Awaiting payout amount</p>
                  <strong>{formatCurrency(approvedAmount, currentCurrency)}</strong>
                  <span>
                    {approvedClaims.length} approved claim{approvedClaims.length === 1 ? "" : "s"} ready for release confirmation
                  </span>
                </article>
                <article className="mnx-reimbursement-policy-card">
                  <p>Historic policy versions</p>
                  <strong>{visiblePolicyHistory.length}</strong>
                  <span>
                    Older claims can remain traceable to the rate that was active when they were filed.
                  </span>
                </article>
              </div>
            </PeopleSection>

            <PeopleSection>
              <PeopleSectionHeader
                eyebrow="Policy history"
                title="Rate timeline"
                description="Track how reimbursement policy evolved over time."
              />

              <div className="mnx-reimbursement-history-list">
                {visiblePolicyHistory.length === 0 ? (
                  <div className="mnx-reimbursement-empty">
                    <History aria-hidden="true" />
                    <div>
                      <strong>No policy history yet</strong>
                      <p>The first rate update will create a stored audit trail for future claims.</p>
                    </div>
                  </div>
                ) : (
                  visiblePolicyHistory.map((policy, index) => (
                    <article key={policy.id || `${policy.ratePerKm}-${index}`} className="mnx-reimbursement-history-card">
                      <div className="mnx-reimbursement-history-top">
                        <div>
                          <strong>
                            {formatCurrency(policy.ratePerKm, policy.currency || currentCurrency)}/km
                          </strong>
                          <p>
                            Active from {formatDate(policy.effectiveFrom || policy.createdAt)}
                          </p>
                        </div>
                        <WorkspaceBadge
                          variant={policy.isActive ? "success" : "neutral"}
                        >
                          {policy.isActive ? "Active" : "Historic"}
                        </WorkspaceBadge>
                      </div>
                      <span>
                        {policy.effectiveTo
                          ? `Closed on ${formatDate(policy.effectiveTo)}`
                          : "Open-ended policy window"}
                      </span>
                    </article>
                  ))
                )}
              </div>
            </PeopleSection>
          </div>

          <aside className="mnx-reimbursement-aside">
            <WorkspacePanel className="mnx-reimbursement-side-panel">
              <WorkspacePanelHeader
                eyebrow="Advanced operating model"
                title="ERP-style reimbursement lifecycle"
                description="Useful framing for how admins should run this desk."
              />
              <div className="mnx-reimbursement-watch-list">
                <div className="mnx-reimbursement-watch-item">
                  <span>01</span>
                  <p>Capture route evidence from approved on-duty movement instead of free-form amount entry.</p>
                </div>
                <div className="mnx-reimbursement-watch-item">
                  <span>02</span>
                  <p>Apply the organization’s active rate automatically so employees cannot edit payout logic claim by claim.</p>
                </div>
                <div className="mnx-reimbursement-watch-item">
                  <span>03</span>
                  <p>Clear pending approvals quickly, then release approved claims as a payout-ready batch.</p>
                </div>
                <div className="mnx-reimbursement-watch-item">
                  <span>04</span>
                  <p>Keep policy history visible because revised rates should not rewrite older approved claims.</p>
                </div>
              </div>
            </WorkspacePanel>

            <WorkspacePanel className="mnx-reimbursement-side-panel">
              <WorkspacePanelHeader
                eyebrow="Payout note"
                title="What this page currently manages"
                description="This redesign stays inside the existing backend contract."
              />
              <div className="mnx-reimbursement-watch-list">
                <div className="mnx-reimbursement-watch-item">
                  <span>01</span>
                  <p>Approve or reject claims with a visible review queue.</p>
                </div>
                <div className="mnx-reimbursement-watch-item">
                  <span>02</span>
                  <p>Mark approved claims as paid when reimbursement has been released.</p>
                </div>
                <div className="mnx-reimbursement-watch-item">
                  <span>03</span>
                  <p>Maintain a tracked history of mileage-rate changes for future audit reviews.</p>
                </div>
              </div>
            </WorkspacePanel>
          </aside>
        </div>
      ) : null}

      <Modal
        open={showRateModal}
        title="Update fuel reimbursement rate"
        description="Set the active per-kilometer rate. New claims will snapshot this value when they are created."
        onClose={() => {
          setShowRateModal(false);
          setNewRate("");
        }}
        className="max-w-md"
      >
        <div className="mnx-reimbursement-modal">
          <WorkspaceField label="Current active rate">
            <div className="mnx-reimbursement-rate-value">
              {currentRate
                ? `${formatCurrency(currentRate.ratePerKm, currentCurrency)}/km`
                : "Policy not configured"}
            </div>
          </WorkspaceField>

          <WorkspaceField
            label="New rate"
            hint="Use the amount employees should receive for each tracked kilometer."
          >
            <WorkspaceInput
              type="number"
              step="0.25"
              min="0.01"
              value={newRate}
              onChange={(event) => setNewRate(event.target.value)}
              placeholder="Example: 4.50"
            />
          </WorkspaceField>

          <div className="mnx-reimbursement-modal-actions">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowRateModal(false);
                setNewRate("");
              }}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleUpdateRate} disabled={submitting}>
              Save rate
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={showRejectModal}
        title="Reject reimbursement claim"
        description="Capture a clear reason so the employee knows what to correct before raising another claim."
        onClose={() => {
          setShowRejectModal(false);
          setClaimPendingRejection(null);
          setRejectReason("");
        }}
        className="max-w-lg"
      >
        <div className="mnx-reimbursement-modal">
          {claimPendingRejection ? (
            <div className="mnx-reimbursement-reject-context">
              <strong>{claimPendingRejection.user.name}</strong>
              <span>
                {getClaimPurpose(claimPendingRejection)} •{" "}
                {formatCurrency(claimPendingRejection.amount, currentCurrency)}
              </span>
            </div>
          ) : null}

          <WorkspaceField
            label="Reason"
            hint="A short explanation will be saved with the rejection."
          >
            <WorkspaceTextarea
              rows={4}
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              placeholder="Example: tracked route is incomplete or trip purpose needs clarification"
            />
          </WorkspaceField>

          <div className="mnx-reimbursement-modal-actions">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowRejectModal(false);
                setClaimPendingRejection(null);
                setRejectReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (!claimPendingRejection) return;
                handleAction(
                  claimPendingRejection.id,
                  "reject",
                  rejectReason.trim() || undefined,
                );
              }}
              disabled={submitting}
            >
              Reject claim
            </Button>
          </div>
        </div>
      </Modal>

      {loading && claims.length > 0 ? (
        <div className="mnx-reimbursement-refresh">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Refreshing reimbursement data
        </div>
      ) : null}
    </div>
  );
}
